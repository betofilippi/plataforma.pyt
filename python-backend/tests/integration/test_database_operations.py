"""
Integration tests for database operations and transactions.

Tests database connectivity, model relationships, transactions, and data integrity.
"""

import uuid
from datetime import datetime, timedelta
from typing import List

import pytest
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.core.database import DatabaseManager, get_database_manager
from app.models.users import (
    User, Role, Permission, Organization, UserPermission,
    UserSession, LoginAttempt, AuditLog, user_roles_table
)
from app.core.security import get_password_hash


class TestDatabaseConnectivity:
    """Test basic database connectivity and setup."""
    
    @pytest.mark.asyncio
    async def test_database_connection(self, db_manager: DatabaseManager):
        """Test database connection is working."""
        assert db_manager is not None
        health_check = await db_manager.health_check()
        assert health_check is True
    
    @pytest.mark.asyncio
    async def test_database_session_creation(self, db_session: AsyncSession):
        """Test database session creation."""
        assert db_session is not None
        
        # Test basic query
        result = await db_session.execute(text("SELECT 1 as test"))
        row = result.fetchone()
        assert row.test == 1
    
    @pytest.mark.asyncio
    async def test_database_tables_exist(self, db_session: AsyncSession):
        """Test that all required tables exist."""
        tables_to_check = [
            'organizations', 'users', 'roles', 'permissions',
            'user_roles', 'role_permissions', 'user_permission_overrides',
            'user_sessions', 'login_attempts', 'audit_logs'
        ]
        
        for table_name in tables_to_check:
            # Try to query the table (this will fail if table doesn't exist)
            result = await db_session.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            count = result.scalar()
            assert count >= 0  # Should not raise an exception


class TestTransactionHandling:
    """Test database transaction handling."""
    
    @pytest.mark.asyncio
    async def test_successful_transaction(self, db_session: AsyncSession):
        """Test successful transaction commit."""
        org = Organization(name="Transaction Test Org")
        
        db_session.add(org)
        await db_session.commit()
        
        # Verify the organization was saved
        result = await db_session.execute(
            select(Organization).where(Organization.name == "Transaction Test Org")
        )
        saved_org = result.scalar_one_or_none()
        
        assert saved_org is not None
        assert saved_org.name == "Transaction Test Org"
    
    @pytest.mark.asyncio
    async def test_transaction_rollback(self, db_session: AsyncSession):
        """Test transaction rollback on error."""
        org1 = Organization(name="Rollback Test Org")
        db_session.add(org1)
        await db_session.commit()
        
        # Start a new transaction that should fail
        org2 = Organization(name="Rollback Test Org", domain="test.com")
        org3 = Organization(name="Another Org", domain="test.com")  # Duplicate domain
        
        db_session.add(org2)
        db_session.add(org3)
        
        with pytest.raises(IntegrityError):
            await db_session.commit()
        
        await db_session.rollback()
        
        # Verify that neither org2 nor org3 were saved
        result = await db_session.execute(
            select(func.count(Organization.id))
            .where(Organization.domain == "test.com")
        )
        count = result.scalar()
        assert count == 0  # Neither should be saved due to rollback
    
    @pytest.mark.asyncio
    async def test_nested_transaction_operations(self, db_session: AsyncSession, test_organization: Organization):
        """Test complex operations within a single transaction."""
        # Create multiple related objects in one transaction
        permission = Permission(
            name="test:permission",
            description="Test permission",
            category="test",
            action="test"
        )
        
        role = Role(
            name="test-role",
            description="Test role",
            organization_id=test_organization.id
        )
        
        user = User(
            email="nested@example.com",
            name="Nested Test User",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id
        )
        
        # Add all objects to session
        db_session.add_all([permission, role, user])
        await db_session.commit()
        
        # Now create relationships
        role.permissions = [permission]
        user.roles = [role]
        
        await db_session.commit()
        
        # Verify all relationships were created
        await db_session.refresh(user, ['roles'])
        await db_session.refresh(role, ['permissions'])
        
        assert len(user.roles) == 1
        assert user.roles[0].name == "test-role"
        assert len(role.permissions) == 1
        assert role.permissions[0].name == "test:permission"


class TestModelRelationships:
    """Test complex model relationships and foreign key constraints."""
    
    @pytest.mark.asyncio
    async def test_organization_cascade_delete(self, db_session: AsyncSession):
        """Test that deleting an organization cascades to users and roles."""
        # Create organization with users and roles
        org = Organization(name="Cascade Test Org")
        db_session.add(org)
        await db_session.commit()
        
        user = User(
            email="cascade@example.com",
            name="Cascade User",
            password_hash=get_password_hash("password"),
            organization_id=org.id
        )
        
        role = Role(
            name="cascade-role",
            description="Cascade role",
            organization_id=org.id
        )
        
        db_session.add_all([user, role])
        await db_session.commit()
        
        user_id = user.id
        role_id = role.id
        org_id = org.id
        
        # Delete the organization
        await db_session.delete(org)
        await db_session.commit()
        
        # Verify cascade deletion
        result = await db_session.execute(select(User).where(User.id == user_id))
        assert result.scalar_one_or_none() is None
        
        result = await db_session.execute(select(Role).where(Role.id == role_id))
        assert result.scalar_one_or_none() is None
        
        result = await db_session.execute(select(Organization).where(Organization.id == org_id))
        assert result.scalar_one_or_none() is None
    
    @pytest.mark.asyncio
    async def test_user_role_many_to_many(self, db_session: AsyncSession, test_organization: Organization):
        """Test user-role many-to-many relationship."""
        # Create users and roles
        user1 = User(
            email="user1@example.com",
            name="User 1",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id
        )
        
        user2 = User(
            email="user2@example.com",
            name="User 2",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id
        )
        
        role1 = Role(
            name="role1",
            description="Role 1",
            organization_id=test_organization.id
        )
        
        role2 = Role(
            name="role2",
            description="Role 2",
            organization_id=test_organization.id
        )
        
        db_session.add_all([user1, user2, role1, role2])
        await db_session.commit()
        
        # Create many-to-many relationships
        user1.roles = [role1, role2]  # User1 has both roles
        user2.roles = [role1]         # User2 has only role1
        
        await db_session.commit()
        
        # Verify relationships
        await db_session.refresh(user1, ['roles'])
        await db_session.refresh(user2, ['roles'])
        await db_session.refresh(role1, ['users'])
        await db_session.refresh(role2, ['users'])
        
        assert len(user1.roles) == 2
        assert len(user2.roles) == 1
        assert len(role1.users) == 2  # Both users have role1
        assert len(role2.users) == 1  # Only user1 has role2
    
    @pytest.mark.asyncio
    async def test_role_permission_many_to_many(self, db_session: AsyncSession, test_organization: Organization):
        """Test role-permission many-to-many relationship."""
        # Create permissions
        perm1 = Permission(
            name="test:read",
            description="Test read",
            category="test",
            action="read"
        )
        
        perm2 = Permission(
            name="test:write",
            description="Test write",
            category="test",
            action="write"
        )
        
        # Create role
        role = Role(
            name="test-role-perm",
            description="Test role permissions",
            organization_id=test_organization.id
        )
        
        db_session.add_all([perm1, perm2, role])
        await db_session.commit()
        
        # Assign permissions to role
        role.permissions = [perm1, perm2]
        await db_session.commit()
        
        # Verify relationship
        await db_session.refresh(role, ['permissions'])
        
        assert len(role.permissions) == 2
        permission_names = [p.name for p in role.permissions]
        assert "test:read" in permission_names
        assert "test:write" in permission_names
    
    @pytest.mark.asyncio
    async def test_user_session_relationship(self, db_session: AsyncSession, test_user: User):
        """Test user-session one-to-many relationship."""
        # Create multiple sessions for the user
        session1 = UserSession(
            user_id=test_user.id,
            token_family=uuid.uuid4(),
            refresh_token_hash="token1",
            expires_at=datetime.utcnow() + timedelta(days=1)
        )
        
        session2 = UserSession(
            user_id=test_user.id,
            token_family=uuid.uuid4(),
            refresh_token_hash="token2",
            expires_at=datetime.utcnow() + timedelta(days=1)
        )
        
        db_session.add_all([session1, session2])
        await db_session.commit()
        
        # Verify relationship
        await db_session.refresh(test_user, ['sessions'])
        
        assert len(test_user.sessions) >= 2  # May have other sessions from fixtures
        session_tokens = [s.refresh_token_hash for s in test_user.sessions]
        assert "token1" in session_tokens
        assert "token2" in session_tokens
    
    @pytest.mark.asyncio
    async def test_audit_log_relationships(self, db_session: AsyncSession, test_user: User, test_organization: Organization):
        """Test audit log relationships."""
        audit_log = AuditLog(
            user_id=test_user.id,
            organization_id=test_organization.id,
            action="test.action",
            resource_type="test",
            resource_id=uuid.uuid4(),
            new_values={"test": "value"}
        )
        
        db_session.add(audit_log)
        await db_session.commit()
        
        # Verify relationships work
        await db_session.refresh(audit_log, ['user', 'organization'])
        
        assert audit_log.user.email == test_user.email
        assert audit_log.organization.name == test_organization.name


class TestDataIntegrity:
    """Test data integrity constraints and validation."""
    
    @pytest.mark.asyncio
    async def test_unique_email_per_organization(self, db_session: AsyncSession, test_organization: Organization):
        """Test that users can't have duplicate emails within the same organization."""
        user1 = User(
            email="duplicate@example.com",
            name="User 1",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id
        )
        
        user2 = User(
            email="duplicate@example.com",  # Same email
            name="User 2",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id  # Same organization
        )
        
        db_session.add(user1)
        await db_session.commit()
        
        db_session.add(user2)
        
        with pytest.raises(IntegrityError):
            await db_session.commit()
    
    @pytest.mark.asyncio
    async def test_same_email_different_organizations(self, db_session: AsyncSession):
        """Test that users can have same email in different organizations."""
        org1 = Organization(name="Org 1")
        org2 = Organization(name="Org 2")
        
        db_session.add_all([org1, org2])
        await db_session.commit()
        
        user1 = User(
            email="same@example.com",
            name="User in Org 1",
            password_hash=get_password_hash("password"),
            organization_id=org1.id
        )
        
        user2 = User(
            email="same@example.com",  # Same email
            name="User in Org 2",
            password_hash=get_password_hash("password"),
            organization_id=org2.id  # Different organization
        )
        
        db_session.add_all([user1, user2])
        await db_session.commit()  # Should not raise an error
        
        # Verify both users exist
        result = await db_session.execute(
            select(func.count(User.id))
            .where(User.email == "same@example.com")
        )
        count = result.scalar()
        assert count == 2
    
    @pytest.mark.asyncio
    async def test_role_level_constraint(self, db_session: AsyncSession, test_organization: Organization):
        """Test that role level must be non-negative."""
        role = Role(
            name="invalid-level-role",
            description="Role with invalid level",
            level=-1,  # Invalid negative level
            organization_id=test_organization.id
        )
        
        db_session.add(role)
        
        with pytest.raises(IntegrityError):
            await db_session.commit()
    
    @pytest.mark.asyncio
    async def test_user_theme_constraint(self, db_session: AsyncSession, test_organization: Organization):
        """Test user theme constraint validation."""
        user = User(
            email="theme@example.com",
            name="Theme User",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id,
            theme="invalid_theme"  # Invalid theme
        )
        
        db_session.add(user)
        
        with pytest.raises(IntegrityError):
            await db_session.commit()
    
    @pytest.mark.asyncio
    async def test_valid_user_theme(self, db_session: AsyncSession, test_organization: Organization):
        """Test valid user themes are accepted."""
        valid_themes = ["light", "dark", "system"]
        
        for i, theme in enumerate(valid_themes):
            user = User(
                email=f"theme{i}@example.com",
                name=f"Theme User {i}",
                password_hash=get_password_hash("password"),
                organization_id=test_organization.id,
                theme=theme
            )
            
            db_session.add(user)
            await db_session.commit()  # Should not raise an error
            
            assert user.theme == theme
    
    @pytest.mark.asyncio
    async def test_login_attempt_relationships(self, db_session: AsyncSession, test_user: User, test_organization: Organization):
        """Test login attempt foreign key relationships."""
        # Successful login attempt
        success_attempt = LoginAttempt(
            email=test_user.email,
            user_id=test_user.id,
            ip_address="192.168.1.1",
            success=True,
            organization_id=test_organization.id
        )
        
        # Failed login attempt (no user)
        failed_attempt = LoginAttempt(
            email="nonexistent@example.com",
            user_id=None,
            ip_address="192.168.1.1",
            success=False,
            failure_reason="User not found",
            organization_id=test_organization.id
        )
        
        db_session.add_all([success_attempt, failed_attempt])
        await db_session.commit()
        
        # Verify the attempts were saved correctly
        await db_session.refresh(success_attempt, ['user', 'organization'])
        await db_session.refresh(failed_attempt, ['organization'])
        
        assert success_attempt.user.email == test_user.email
        assert success_attempt.organization.name == test_organization.name
        assert failed_attempt.user is None
        assert failed_attempt.organization.name == test_organization.name


class TestConcurrentOperations:
    """Test concurrent database operations and locking."""
    
    @pytest.mark.asyncio
    async def test_concurrent_user_creation(self, db_manager: DatabaseManager, test_organization: Organization):
        """Test concurrent user creation doesn't cause issues."""
        import asyncio
        
        async def create_user(session: AsyncSession, email: str):
            user = User(
                email=email,
                name=f"User {email}",
                password_hash=get_password_hash("password"),
                organization_id=test_organization.id
            )
            session.add(user)
            await session.commit()
            return user
        
        # Create multiple sessions and try to create users concurrently
        sessions = []
        for _ in range(3):
            session = db_manager.get_session()
            sessions.append(session)
        
        try:
            tasks = [
                create_user(sessions[0], "concurrent1@example.com"),
                create_user(sessions[1], "concurrent2@example.com"),
                create_user(sessions[2], "concurrent3@example.com")
            ]
            
            users = await asyncio.gather(*tasks)
            
            # All users should be created successfully
            assert len(users) == 3
            for user in users:
                assert user.id is not None
        
        finally:
            for session in sessions:
                await session.close()
    
    @pytest.mark.asyncio
    async def test_concurrent_role_assignment(self, db_session: AsyncSession, test_user: User, test_roles: List[Role]):
        """Test concurrent role assignments."""
        import asyncio
        
        async def assign_role(user: User, role: Role):
            if role not in user.roles:
                user.roles.append(role)
                await db_session.commit()
        
        # Try to assign multiple roles concurrently
        tasks = [
            assign_role(test_user, test_roles[0]),
            assign_role(test_user, test_roles[1]) if len(test_roles) > 1 else assign_role(test_user, test_roles[0])
        ]
        
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # Refresh user and check roles
        await db_session.refresh(test_user, ['roles'])
        
        # Should have at least one role assigned
        assert len(test_user.roles) >= 1


class TestDatabasePerformance:
    """Test database performance and optimization."""
    
    @pytest.mark.asyncio
    async def test_bulk_insert_performance(self, db_session: AsyncSession, test_organization: Organization):
        """Test bulk insert operations for performance."""
        import time
        
        # Create many users at once
        users = []
        for i in range(100):
            user = User(
                email=f"bulk{i}@example.com",
                name=f"Bulk User {i}",
                password_hash=get_password_hash("password"),
                organization_id=test_organization.id
            )
            users.append(user)
        
        start_time = time.time()
        
        # Bulk add and commit
        db_session.add_all(users)
        await db_session.commit()
        
        end_time = time.time()
        
        # Should be reasonably fast (less than 5 seconds for 100 users)
        assert (end_time - start_time) < 5.0
        
        # Verify all users were created
        result = await db_session.execute(
            select(func.count(User.id))
            .where(User.email.like("bulk%@example.com"))
        )
        count = result.scalar()
        assert count == 100
    
    @pytest.mark.asyncio
    async def test_query_performance_with_joins(self, db_session: AsyncSession, test_user: User):
        """Test query performance with complex joins."""
        import time
        
        start_time = time.time()
        
        # Complex query with multiple joins
        result = await db_session.execute(
            select(User)
            .join(User.organization)
            .join(User.roles)
            .join(Role.permissions)
            .where(User.id == test_user.id)
            .options(
                # Eager load relationships
                # Note: options syntax may vary based on SQLAlchemy version
            )
        )
        
        user_with_relations = result.scalar_one_or_none()
        
        end_time = time.time()
        
        # Should be reasonably fast (less than 1 second)
        assert (end_time - start_time) < 1.0
        assert user_with_relations is not None
