"""
Database configuration and management with SQLAlchemy async support.

This module handles:
- SQLAlchemy async engine setup
- Database session management
- Connection pooling configuration
- Health checks
- Migration support
"""

import asyncio
import contextlib
from typing import Any, AsyncGenerator, Dict, Optional

import structlog
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, MappedAsDataclass
from sqlalchemy.pool import QueuePool

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class Base(MappedAsDataclass, DeclarativeBase):
    """Base class for all database models with dataclass support."""
    pass


class DatabaseManager:
    """Database manager class for handling connections and sessions."""
    
    def __init__(self, settings=None):
        self.settings = settings or get_settings()
        self._engine: Optional[AsyncEngine] = None
        self._session_factory: Optional[async_sessionmaker[AsyncSession]] = None
        self._is_initialized = False
    
    async def initialize(self) -> None:
        """Initialize the database connection and session factory."""
        if self._is_initialized:
            logger.warning("DatabaseManager already initialized")
            return
        
        try:
            # Create async engine with connection pooling
            self._engine = create_async_engine(
                str(self.settings.database_url),
                
                # Connection pool settings
                poolclass=QueuePool,
                pool_size=self.settings.database_pool_size,
                max_overflow=self.settings.database_max_overflow,
                pool_timeout=self.settings.database_pool_timeout,
                pool_recycle=self.settings.database_pool_recycle,
                
                # Async settings
                future=True,
                echo=self.settings.database_echo,
                
                # Connection arguments
                connect_args={
                    "server_settings": {
                        "jit": "off",  # Disable JIT for better compatibility
                        "application_name": f"{self.settings.app_name}_v{self.settings.app_version}",
                    },
                    "command_timeout": 60,  # 60 seconds timeout
                },
            )
            
            # Create session factory
            self._session_factory = async_sessionmaker(
                self._engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=True,
                autocommit=False,
            )
            
            # Test the connection
            await self.health_check()
            
            self._is_initialized = True
            logger.info(
                "Database initialized successfully",
                pool_size=self.settings.database_pool_size,
                max_overflow=self.settings.database_max_overflow,
            )
            
        except Exception as e:
            logger.error("Failed to initialize database", error=str(e))
            await self.close()
            raise
    
    async def health_check(self) -> bool:
        """Perform a health check on the database connection."""
        if not self._engine:
            return False
        
        try:
            async with self._engine.begin() as conn:
                result = await conn.execute(text("SELECT 1 as health_check"))
                row = result.fetchone()
                return row is not None and row[0] == 1
                
        except SQLAlchemyError as e:
            logger.error("Database health check failed", error=str(e))
            return False
        except Exception as e:
            logger.error("Unexpected error during health check", error=str(e))
            return False
    
    async def get_session(self) -> AsyncSession:
        """Get a new database session."""
        if not self._is_initialized or not self._session_factory:
            raise RuntimeError("DatabaseManager not initialized. Call initialize() first.")
        
        return self._session_factory()
    
    @contextlib.asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Context manager for database sessions with automatic cleanup."""
        if not self._is_initialized or not self._session_factory:
            raise RuntimeError("DatabaseManager not initialized. Call initialize() first.")
        
        session = self._session_factory()
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
    
    @contextlib.asynccontextmanager
    async def transaction(self) -> AsyncGenerator[AsyncSession, None]:
        """Context manager for database transactions with automatic rollback on error."""
        if not self._is_initialized or not self._session_factory:
            raise RuntimeError("DatabaseManager not initialized. Call initialize() first.")
        
        session = self._session_factory()
        try:
            async with session.begin():
                yield session
        finally:
            await session.close()
    
    async def execute_raw(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> Any:
        """Execute a raw SQL query."""
        if not self._engine:
            raise RuntimeError("DatabaseManager not initialized. Call initialize() first.")
        
        try:
            async with self._engine.begin() as conn:
                result = await conn.execute(text(query), parameters or {})
                return result
        except SQLAlchemyError as e:
            logger.error("Failed to execute raw query", query=query, error=str(e))
            raise
    
    async def get_connection_info(self) -> Dict[str, Any]:
        """Get information about the current database connection."""
        if not self._engine:
            return {"status": "not_initialized"}
        
        try:
            async with self._engine.begin() as conn:
                # Get basic database info
                db_info = {}
                
                # PostgreSQL version
                result = await conn.execute(text("SELECT version()"))
                version_row = result.fetchone()
                if version_row:
                    db_info["version"] = version_row[0]
                
                # Current database name
                result = await conn.execute(text("SELECT current_database()"))
                db_row = result.fetchone()
                if db_row:
                    db_info["database"] = db_row[0]
                
                # Current user
                result = await conn.execute(text("SELECT current_user"))
                user_row = result.fetchone()
                if user_row:
                    db_info["user"] = user_row[0]
                
                # Connection count
                result = await conn.execute(text(
                    "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()"
                ))
                conn_row = result.fetchone()
                if conn_row:
                    db_info["active_connections"] = conn_row[0]
                
                # Pool information
                pool_info = {}
                if hasattr(self._engine.pool, 'size'):
                    pool_info["pool_size"] = self._engine.pool.size()
                if hasattr(self._engine.pool, 'checked_in'):
                    pool_info["checked_in"] = self._engine.pool.checked_in()
                if hasattr(self._engine.pool, 'checked_out'):
                    pool_info["checked_out"] = self._engine.pool.checked_out()
                if hasattr(self._engine.pool, 'invalid'):
                    pool_info["invalid"] = self._engine.pool.invalid()
                
                return {
                    "status": "connected",
                    "database_info": db_info,
                    "pool_info": pool_info,
                    "url_safe": self.settings.database_url_safe,
                }
                
        except Exception as e:
            logger.error("Failed to get connection info", error=str(e))
            return {
                "status": "error",
                "error": str(e),
            }
    
    async def create_tables(self) -> None:
        """Create all database tables (for development/testing)."""
        if not self._engine:
            raise RuntimeError("DatabaseManager not initialized. Call initialize() first.")
        
        try:
            async with self._engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error("Failed to create database tables", error=str(e))
            raise
    
    async def drop_tables(self) -> None:
        """Drop all database tables (for development/testing only)."""
        if self.settings.is_production:
            raise RuntimeError("Cannot drop tables in production environment")
        
        if not self._engine:
            raise RuntimeError("DatabaseManager not initialized. Call initialize() first.")
        
        try:
            async with self._engine.begin() as conn:
                await conn.run_sync(Base.metadata.drop_all)
            logger.warning("Database tables dropped")
        except Exception as e:
            logger.error("Failed to drop database tables", error=str(e))
            raise
    
    async def close(self) -> None:
        """Close the database connection and cleanup resources."""
        if self._engine:
            try:
                await self._engine.dispose()
                logger.info("Database connections closed")
            except Exception as e:
                logger.error("Error closing database connections", error=str(e))
            finally:
                self._engine = None
                self._session_factory = None
                self._is_initialized = False
    
    def __del__(self):
        """Cleanup method called when the object is destroyed."""
        if self._engine and not self._engine.is_disposed:
            # Create a new event loop if one doesn't exist
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            if loop.is_running():
                # Schedule cleanup for later if loop is running
                loop.create_task(self.close())
            else:
                # Run cleanup now if loop is not running
                loop.run_until_complete(self.close())


# Global database manager instance
_database_manager: Optional[DatabaseManager] = None


def get_database_manager() -> DatabaseManager:
    """Get the global database manager instance."""
    global _database_manager
    
    if _database_manager is None:
        _database_manager = DatabaseManager()
    
    return _database_manager


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for getting database sessions.
    
    Usage:
        @app.get("/users")
        async def get_users(db: AsyncSession = Depends(get_db)):
            # Use db session here
            pass
    """
    db_manager = get_database_manager()
    
    if not db_manager._is_initialized:
        await db_manager.initialize()
    
    async with db_manager.session() as session:
        yield session


async def get_db_transaction() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for getting database sessions with transaction support.
    
    Usage:
        @app.post("/users")
        async def create_user(user_data: dict, db: AsyncSession = Depends(get_db_transaction)):
            # All operations will be in a transaction
            # Automatic rollback on error
            pass
    """
    db_manager = get_database_manager()
    
    if not db_manager._is_initialized:
        await db_manager.initialize()
    
    async with db_manager.transaction() as session:
        yield session


# Utility functions for common database operations
async def execute_query(query: str, parameters: Optional[Dict[str, Any]] = None) -> Any:
    """Execute a raw SQL query using the global database manager."""
    db_manager = get_database_manager()
    
    if not db_manager._is_initialized:
        await db_manager.initialize()
    
    return await db_manager.execute_raw(query, parameters)


async def health_check() -> bool:
    """Perform a health check using the global database manager."""
    try:
        db_manager = get_database_manager()
        
        if not db_manager._is_initialized:
            await db_manager.initialize()
        
        return await db_manager.health_check()
    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        return False