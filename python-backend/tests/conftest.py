"""
Pytest configuration and shared fixtures for the test suite.

This module provides:
- Database test fixtures with automatic cleanup
- Authentication test utilities
- Mock data generators
- WebSocket testing helpers
- Performance testing utilities
"""

import asyncio
import os
import uuid
from datetime import datetime, timedelta
from typing import AsyncGenerator, Dict, Any, List, Optional
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from app.main import create_app
from app.core.config import get_settings
from app.core.database import get_database_manager, DatabaseManager
from app.models.base import BaseModel
from app.models.users import User, Role, Permission, Organization, UserSession
from app.services.auth import auth_service
from app.core.security import create_access_token, create_refresh_token, get_password_hash


# ================================
# TEST CONFIGURATION
# ================================

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def test_settings():
    """Test settings with overrides for testing."""
    settings = get_settings()
    
    # Override settings for testing
    settings.environment = "testing"
    settings.database_url = "postgresql+asyncpg://test:test@localhost:5432/plataforma_test"
    settings.redis_url = "redis://localhost:6379/1"  # Use different DB for testing
    settings.disable_redis = True  # Disable Redis for most tests
    settings.disable_rate_limiting = True  # Disable rate limiting for tests
    settings.jwt_access_token_expire_minutes = 30
    settings.jwt_refresh_token_expire_days = 1
    
    return settings


# ================================
# DATABASE FIXTURES
# ================================

@pytest_asyncio.fixture(scope="session")
async def test_db_engine(test_settings):
    """Create test database engine for the session."""
    # Use in-memory SQLite for fast tests
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=test_settings.database_echo,
        poolclass=StaticPool,
        connect_args={
            "check_same_thread": False,
        },
    )
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(BaseModel.metadata.create_all)
    
    yield engine
    
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    async_session_maker = async_sessionmaker(
        test_db_engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.rollback()
            await session.close()


@pytest_asyncio.fixture
async def db_manager(test_db_engine, test_settings) -> DatabaseManager:
    """Create test database manager."""
    manager = DatabaseManager(test_settings)
    manager._engine = test_db_engine
    await manager.initialize()
    return manager


# ================================
# APPLICATION FIXTURES
# ================================

@pytest.fixture
def test_app(test_settings, db_manager):
    """Create test FastAPI application."""
    app = create_app()
    
    # Override dependencies for testing
    async def override_get_db_manager():
        return db_manager
        
    app.dependency_overrides[get_database_manager] = override_get_db_manager
    
    return app


@pytest.fixture
def test_client(test_app) -> TestClient:
    """Create test client for synchronous tests."""
    return TestClient(test_app)


@pytest_asyncio.fixture
async def async_client(test_app) -> AsyncGenerator[AsyncClient, None]:
    """Create async test client for async tests."""
    async with AsyncClient(
        app=test_app,
        base_url="http://test",
        headers={"Content-Type": "application/json"}
    ) as client:
        yield client


# ================================
# DATA FIXTURES
# ================================

@pytest_asyncio.fixture
async def test_organization(db_session: AsyncSession) -> Organization:
    """Create a test organization."""
    org = Organization(
        name="Test Organization",
        description="Test organization for testing",
        domain="test.example.com",
        settings={"test": True}
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    return org


@pytest_asyncio.fixture
async def test_permissions(db_session: AsyncSession) -> List[Permission]:
    """Create test permissions."""
    permissions = [
        Permission(
            name="user:read",
            description="Read user information",
            category="user_management",
            resource="users",
            action="read"
        ),
        Permission(
            name="user:write",
            description="Write user information",
            category="user_management",
            resource="users",
            action="write"
        ),
        Permission(
            name="admin:read",
            description="Admin read access",
            category="administration",
            resource="system",
            action="read"
        ),
        Permission(
            name="system:admin_panel",
            description="Access admin panel",
            category="system",
            resource="admin_panel",
            action="access",
            is_system_permission=True
        )
    ]
    
    for perm in permissions:
        db_session.add(perm)
    
    await db_session.commit()
    
    for perm in permissions:
        await db_session.refresh(perm)
    
    return permissions


@pytest_asyncio.fixture
async def test_roles(db_session: AsyncSession, test_organization: Organization, test_permissions: List[Permission]) -> List[Role]:
    """Create test roles with permissions."""
    roles = [
        Role(
            name="admin",
            description="Administrator role",
            level=1,
            organization_id=test_organization.id,
            is_system_role=True,
            color="#ef4444"
        ),
        Role(
            name="user",
            description="Regular user role",
            level=99,
            organization_id=test_organization.id,
            color="#3b82f6"
        )
    ]
    
    for role in roles:
        db_session.add(role)
    
    await db_session.commit()
    
    # Assign permissions
    admin_role, user_role = roles
    admin_role.permissions = test_permissions  # Admin gets all permissions
    user_role.permissions = [test_permissions[0]]  # User gets only read permission
    
    await db_session.commit()
    
    for role in roles:
        await db_session.refresh(role)
    
    return roles


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession, test_organization: Organization, test_roles: List[Role]) -> User:
    """Create a test user."""
    user = User(
        email="test@example.com",
        name="Test User",
        first_name="Test",
        last_name="User",
        password_hash=get_password_hash("testpassword123"),
        organization_id=test_organization.id,
        is_active=True,
        email_verified_at=datetime.utcnow(),
        timezone="UTC",
        language="pt-BR",
        theme="system"
    )
    
    # Assign user role
    user.roles = [test_roles[1]]  # Regular user role
    
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    return user


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession, test_organization: Organization, test_roles: List[Role]) -> User:
    """Create an admin test user."""
    user = User(
        email="admin@example.com",
        name="Admin User",
        first_name="Admin",
        last_name="User",
        password_hash=get_password_hash("adminpassword123"),
        organization_id=test_organization.id,
        is_active=True,
        email_verified_at=datetime.utcnow(),
        timezone="UTC",
        language="pt-BR",
        theme="system"
    )
    
    # Assign admin role
    user.roles = [test_roles[0]]  # Admin role
    
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    return user


# ================================
# AUTHENTICATION FIXTURES
# ================================

@pytest.fixture
def test_user_tokens(test_user: User) -> Dict[str, str]:
    """Create test tokens for user."""
    access_token = create_access_token(
        data={
            "sub": str(test_user.id),
            "email": test_user.email,
            "username": test_user.name,
            "roles": [role.name for role in test_user.roles],
            "permissions": test_user.get_effective_permissions()
        }
    )
    
    refresh_token = create_refresh_token(
        data={"sub": str(test_user.id)}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@pytest.fixture
def admin_user_tokens(admin_user: User) -> Dict[str, str]:
    """Create test tokens for admin user."""
    access_token = create_access_token(
        data={
            "sub": str(admin_user.id),
            "email": admin_user.email,
            "username": admin_user.name,
            "roles": [role.name for role in admin_user.roles],
            "permissions": admin_user.get_effective_permissions()
        }
    )
    
    refresh_token = create_refresh_token(
        data={"sub": str(admin_user.id)}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@pytest.fixture
def auth_headers(test_user_tokens: Dict[str, str]) -> Dict[str, str]:
    """Create authorization headers for test user."""
    return {
        "Authorization": f"Bearer {test_user_tokens['access_token']}"
    }


@pytest.fixture
def admin_auth_headers(admin_user_tokens: Dict[str, str]) -> Dict[str, str]:
    """Create authorization headers for admin user."""
    return {
        "Authorization": f"Bearer {admin_user_tokens['access_token']}"
    }


# ================================
# MOCK FIXTURES
# ================================

@pytest.fixture
def mock_redis():
    """Mock Redis client for testing."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None
    mock_redis.set.return_value = True
    mock_redis.setex.return_value = True
    mock_redis.incr.return_value = 1
    mock_redis.delete.return_value = True
    mock_redis.ping.return_value = True
    mock_redis.close.return_value = None
    return mock_redis


@pytest.fixture
def mock_email_service():
    """Mock email service for testing."""
    mock_service = AsyncMock()
    mock_service.send_email.return_value = True
    mock_service.send_password_reset_email.return_value = True
    mock_service.send_verification_email.return_value = True
    return mock_service


# ================================
# WEBSOCKET FIXTURES
# ================================

@pytest_asyncio.fixture
async def websocket_client(test_app):
    """Create WebSocket test client."""
    from fastapi.testclient import TestClient
    
    client = TestClient(test_app)
    return client


# ================================
# UTILITY FIXTURES
# ================================

@pytest.fixture
def sample_user_data() -> Dict[str, Any]:
    """Sample user registration data."""
    return {
        "email": "newuser@example.com",
        "name": "New User",
        "first_name": "New",
        "last_name": "User",
        "password": "newpassword123",
        "confirm_password": "newpassword123",
        "timezone": "America/Sao_Paulo",
        "language": "pt-BR"
    }


@pytest.fixture
def sample_login_data() -> Dict[str, Any]:
    """Sample login data."""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "remember_me": False
    }


@pytest.fixture
def performance_config() -> Dict[str, Any]:
    """Configuration for performance tests."""
    return {
        "concurrent_users": 10,
        "requests_per_user": 100,
        "ramp_up_time": 30,  # seconds
        "test_duration": 300,  # seconds
        "acceptable_response_time": 2.0,  # seconds
        "acceptable_error_rate": 0.05  # 5%
    }


# ================================
# TEST UTILITIES
# ================================

class TestDataFactory:
    """Factory class for creating test data."""
    
    @staticmethod
    def create_user_data(email: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """Create user data for testing."""
        defaults = {
            "email": email or f"user-{uuid.uuid4().hex[:8]}@example.com",
            "name": "Test User",
            "first_name": "Test",
            "last_name": "User",
            "password": "testpassword123",
            "confirm_password": "testpassword123",
            "timezone": "UTC",
            "language": "pt-BR",
            "theme": "system"
        }
        defaults.update(kwargs)
        return defaults
    
    @staticmethod
    def create_organization_data(**kwargs) -> Dict[str, Any]:
        """Create organization data for testing."""
        defaults = {
            "name": f"Test Org {uuid.uuid4().hex[:8]}",
            "description": "Test organization",
            "domain": f"test-{uuid.uuid4().hex[:8]}.example.com",
            "settings": {"test": True}
        }
        defaults.update(kwargs)
        return defaults
    
    @staticmethod
    def create_role_data(organization_id: uuid.UUID, **kwargs) -> Dict[str, Any]:
        """Create role data for testing."""
        defaults = {
            "name": f"test-role-{uuid.uuid4().hex[:8]}",
            "description": "Test role",
            "level": 50,
            "organization_id": organization_id,
            "color": "#6366f1"
        }
        defaults.update(kwargs)
        return defaults


@pytest.fixture
def test_data_factory() -> TestDataFactory:
    """Test data factory fixture."""
    return TestDataFactory()


# ================================
# CLEANUP FIXTURES
# ================================

@pytest_asyncio.fixture
async def cleanup_database(db_session: AsyncSession):
    """Fixture to ensure database is cleaned up after tests."""
    yield
    
    # Clean up all test data
    await db_session.execute("DELETE FROM user_sessions")
    await db_session.execute("DELETE FROM login_attempts")
    await db_session.execute("DELETE FROM audit_logs")
    await db_session.execute("DELETE FROM user_permissions")
    await db_session.execute("DELETE FROM user_roles")
    await db_session.execute("DELETE FROM role_permissions")
    await db_session.execute("DELETE FROM users")
    await db_session.execute("DELETE FROM roles")
    await db_session.execute("DELETE FROM permissions")
    await db_session.execute("DELETE FROM organizations")
    await db_session.commit()


# ================================
# MARKERS CONFIGURATION
# ================================

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.filterwarnings("ignore::DeprecationWarning"),
    pytest.mark.filterwarnings("ignore::PendingDeprecationWarning")
]
