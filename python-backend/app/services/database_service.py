"""
Database Service
Handles all database operations with SQLAlchemy
"""

from typing import Optional, List, Dict, Any, TypeVar, Generic
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base, Session
from sqlalchemy import select, update, delete, and_, or_, func
from contextlib import asynccontextmanager
import os
import logging

logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./plataforma.db")

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("DATABASE_ECHO", "false").lower() == "true",
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for models
Base = declarative_base()

T = TypeVar("T")

class DatabaseService(Generic[T]):
    """Generic database service for CRUD operations"""
    
    def __init__(self, model: T):
        self.model = model
    
    @asynccontextmanager
    async def get_session(self):
        """Get database session"""
        async with AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    async def create(self, **kwargs) -> T:
        """Create new record"""
        async with self.get_session() as session:
            instance = self.model(**kwargs)
            session.add(instance)
            await session.flush()
            await session.refresh(instance)
            return instance
    
    async def get(self, id: Any) -> Optional[T]:
        """Get record by ID"""
        async with self.get_session() as session:
            result = await session.get(self.model, id)
            return result
    
    async def get_by(self, **kwargs) -> Optional[T]:
        """Get record by field"""
        async with self.get_session() as session:
            stmt = select(self.model).filter_by(**kwargs)
            result = await session.execute(stmt)
            return result.scalar_one_or_none()
    
    async def get_many(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict] = None,
        order_by: Optional[str] = None
    ) -> List[T]:
        """Get multiple records with pagination"""
        async with self.get_session() as session:
            stmt = select(self.model)
            
            # Apply filters
            if filters:
                for key, value in filters.items():
                    if hasattr(self.model, key):
                        stmt = stmt.filter(getattr(self.model, key) == value)
            
            # Apply ordering
            if order_by:
                if order_by.startswith("-"):
                    stmt = stmt.order_by(getattr(self.model, order_by[1:]).desc())
                else:
                    stmt = stmt.order_by(getattr(self.model, order_by))
            
            # Apply pagination
            stmt = stmt.offset(skip).limit(limit)
            
            result = await session.execute(stmt)
            return result.scalars().all()
    
    async def update(self, id: Any, **kwargs) -> Optional[T]:
        """Update record"""
        async with self.get_session() as session:
            stmt = update(self.model).where(
                self.model.id == id
            ).values(**kwargs).returning(self.model)
            
            result = await session.execute(stmt)
            return result.scalar_one_or_none()
    
    async def delete(self, id: Any) -> bool:
        """Delete record"""
        async with self.get_session() as session:
            stmt = delete(self.model).where(self.model.id == id)
            result = await session.execute(stmt)
            return result.rowcount > 0
    
    async def count(self, filters: Optional[Dict] = None) -> int:
        """Count records"""
        async with self.get_session() as session:
            stmt = select(func.count()).select_from(self.model)
            
            if filters:
                for key, value in filters.items():
                    if hasattr(self.model, key):
                        stmt = stmt.filter(getattr(self.model, key) == value)
            
            result = await session.execute(stmt)
            return result.scalar()
    
    async def exists(self, **kwargs) -> bool:
        """Check if record exists"""
        async with self.get_session() as session:
            stmt = select(self.model).filter_by(**kwargs).exists()
            result = await session.execute(select(stmt))
            return result.scalar()
    
    async def bulk_create(self, items: List[Dict]) -> List[T]:
        """Create multiple records"""
        async with self.get_session() as session:
            instances = [self.model(**item) for item in items]
            session.add_all(instances)
            await session.flush()
            return instances
    
    async def bulk_update(self, updates: List[Dict]) -> int:
        """Update multiple records"""
        async with self.get_session() as session:
            stmt = update(self.model)
            await session.execute(stmt, updates)
            return len(updates)
    
    async def search(
        self,
        query: str,
        fields: List[str],
        skip: int = 0,
        limit: int = 100
    ) -> List[T]:
        """Search records in multiple fields"""
        async with self.get_session() as session:
            conditions = []
            for field in fields:
                if hasattr(self.model, field):
                    conditions.append(
                        getattr(self.model, field).ilike(f"%{query}%")
                    )
            
            if not conditions:
                return []
            
            stmt = select(self.model).filter(or_(*conditions))
            stmt = stmt.offset(skip).limit(limit)
            
            result = await session.execute(stmt)
            return result.scalars().all()
    
    async def execute_raw(self, query: str, params: Optional[Dict] = None):
        """Execute raw SQL query"""
        async with self.get_session() as session:
            result = await session.execute(query, params or {})
            return result.fetchall()

class TransactionManager:
    """Manage database transactions"""
    
    @staticmethod
    @asynccontextmanager
    async def transaction():
        """Create a transaction context"""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    yield session
                except Exception:
                    await session.rollback()
                    raise
                else:
                    await session.commit()

# Initialize database
async def init_database():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized")

async def close_database():
    """Close database connections"""
    await engine.dispose()
    logger.info("Database connections closed")

# Query builder helpers
class QueryBuilder:
    """Helper class for building complex queries"""
    
    @staticmethod
    def paginate(query, page: int = 1, per_page: int = 20):
        """Add pagination to query"""
        return query.offset((page - 1) * per_page).limit(per_page)
    
    @staticmethod
    def filter_by_date_range(query, model, field: str, start_date, end_date):
        """Filter by date range"""
        date_field = getattr(model, field)
        if start_date:
            query = query.filter(date_field >= start_date)
        if end_date:
            query = query.filter(date_field <= end_date)
        return query
    
    @staticmethod
    def order_by_multiple(query, model, orders: List[tuple]):
        """Order by multiple fields"""
        for field, direction in orders:
            if hasattr(model, field):
                if direction == "desc":
                    query = query.order_by(getattr(model, field).desc())
                else:
                    query = query.order_by(getattr(model, field))
        return query