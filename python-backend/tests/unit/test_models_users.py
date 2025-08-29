"""
Unit tests for user models and RBAC functionality.

Tests User, Role, Permission, Organization models and their relationships.
"""

import uuid
from datetime import datetime, timedelta
from typing import List

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.users import (
    User, Role, Permission, Organization, UserPermission,
    Group, GroupMember, UserSession, LoginAttempt, AuditLog
)
from app.core.security import get_password_hash


class TestOrganizationModel:
    """Test Organization model functionality."""
    
    @pytest.mark.asyncio
    async def test_create_organization(self, db_session: AsyncSession):
        """Test creating an organization."""
        org = Organization(
            name="Test Organization",
            description="A test organization",
            domain="test.example.com",
            settings={"feature_flags": {"advanced_auth": True}}
        )
        
        db_session.add(org)
        await db_session.commit()
        await db_session.refresh(org)
        
        assert org.id is not None
        assert org.name == "Test Organization"
        assert org.description == "A test organization"
        assert org.domain == "test.example.com"
        assert org.settings["feature_flags"]["advanced_auth"] is True
        assert org.is_active is True
        assert org.created_at is not None
        assert org.updated_at is not None
    
    @pytest.mark.asyncio
    async def test_organization_unique_domain(self, db_session: AsyncSession):
        """Test that organization domains must be unique."""
        org1 = Organization(
            name="Org 1",
            domain="unique.example.com"
        )
        org2 = Organization(
            name="Org 2",
            domain="unique.example.com"  # Same domain
        )
        
        db_session.add(org1)
        await db_session.commit()
        
        db_session.add(org2)
        
        with pytest.raises(Exception):  # Should raise integrity error
            await db_session.commit()
    
    @pytest.mark.asyncio
    async def test_organization_relationships(self, db_session: AsyncSession, test_organization: Organization):
        """Test organization relationships with users and roles."""
        # Add a user to the organization
        user = User(
            email="user@test.com",
            name="Test User",
            password_hash=get_password_hash("password123"),
            organization_id=test_organization.id
        )
        
        # Add a role to the organization
        role = Role(
            name="test-role",
            description="Test role",
            organization_id=test_organization.id
        )
        
        db_session.add_all([user, role])
        await db_session.commit()
        
        # Refresh to load relationships
        await db_session.refresh(test_organization)
        
        assert len(test_organization.users) == 1
        assert len(test_organization.roles) == 1
        assert test_organization.users[0].email == "user@test.com"
        assert test_organization.roles[0].name == "test-role"


class TestPermissionModel:
    """Test Permission model functionality."""
    
    @pytest.mark.asyncio
    async def test_create_permission(self, db_session: AsyncSession):
        """Test creating a permission."""
        permission = Permission(
            name="user:create",
            description="Create new users",
            category="user_management",
            resource="users",
            action="create"
        )
        
        db_session.add(permission)
        await db_session.commit()
        await db_session.refresh(permission)
        
        assert permission.id is not None
        assert permission.name == "user:create"
        assert permission.category == "user_management"
        assert permission.resource == "users"
        assert permission.action == "create"
        assert permission.is_system_permission is False
    
    @pytest.mark.asyncio
    async def test_permission_full_name_without_module(self, db_session: AsyncSession):
        """Test permission full_name property without module."""
        permission = Permission(
            name="user:read",
            description="Read user data",
            category="user_management",
            resource="users",
            action="read"
        )
        
        assert permission.full_name == "user:read"
    
    @pytest.mark.asyncio
    async def test_permission_full_name_with_module(self, db_session: AsyncSession):
        """Test permission full_name property with module."""
        permission = Permission(
            name="invoice:create",
            description="Create invoices",
            category="billing",
            resource="invoices",
            action="create",
            module_name="billing_module"
        )
        
        assert permission.full_name == "billing_module:invoice:create"
    
    @pytest.mark.asyncio
    async def test_system_permission(self, db_session: AsyncSession):
        """Test system permission creation."""
        permission = Permission(
            name="system:admin",
            description="System administration",
            category="system",
            resource="system",
            action="admin",
            is_system_permission=True
        )
        
        db_session.add(permission)
        await db_session.commit()
        
        assert permission.is_system_permission is True


class TestRoleModel:
    """Test Role model functionality."""
    
    @pytest.mark.asyncio
    async def test_create_role(self, db_session: AsyncSession, test_organization: Organization):
        """Test creating a role."""
        role = Role(
            name="manager",
            description="Manager role",
            level=10,
            organization_id=test_organization.id,
            color="#22c55e",
            icon="users"
        )
        
        db_session.add(role)
        await db_session.commit()
        await db_session.refresh(role)
        
        assert role.id is not None
        assert role.name == "manager"
        assert role.description == "Manager role"
        assert role.level == 10
        assert role.color == "#22c55e"
        assert role.icon == "users"
        assert role.is_system_role is False
    
    @pytest.mark.asyncio
    async def test_role_hierarchy(self, db_session: AsyncSession, test_organization: Organization):
        """Test role hierarchy with parent/child relationships."""
        parent_role = Role(
            name="admin",
            description="Administrator",
            level=1,
            organization_id=test_organization.id
        )
        
        db_session.add(parent_role)
        await db_session.commit()
        await db_session.refresh(parent_role)
        
        child_role = Role(
            name="moderator",
            description="Moderator",
            level=5,
            parent_id=parent_role.id,
            organization_id=test_organization.id
        )
        
        db_session.add(child_role)
        await db_session.commit()
        await db_session.refresh(child_role)
        
        assert child_role.parent_id == parent_role.id
        assert child_role.parent.name == "admin"
        assert len(parent_role.children) == 1
        assert parent_role.children[0].name == "moderator"
    
    @pytest.mark.asyncio
    async def test_role_permissions(self, db_session: AsyncSession, test_organization: Organization, test_permissions: List[Permission]):
        """Test role permission relationships."""
        role = Role(
            name="editor",
            description="Editor role",
            organization_id=test_organization.id
        )
        
        # Assign some permissions to the role
        role.permissions = test_permissions[:2]  # First two permissions
        
        db_session.add(role)
        await db_session.commit()
        await db_session.refresh(role)
        
        assert len(role.permissions) == 2
        assert role.permissions[0].name in ["user:read", "user:write"]
        assert role.permissions[1].name in ["user:read", "user:write"]
    
    @pytest.mark.asyncio
    async def test_get_all_permissions_no_inheritance(self, db_session: AsyncSession, test_organization: Organization, test_permissions: List[Permission]):
        """Test getting role permissions without inheritance."""
        role = Role(
            name="basic",
            description="Basic role",
            organization_id=test_organization.id
        )
        role.permissions = [test_permissions[0]]  # Only first permission
        
        db_session.add(role)
        await db_session.commit()
        
        all_permissions = role.get_all_permissions(include_inherited=False)
        
        assert len(all_permissions) == 1
        assert all_permissions[0].name == test_permissions[0].name
    
    @pytest.mark.asyncio
    async def test_get_all_permissions_with_inheritance(self, db_session: AsyncSession, test_organization: Organization, test_permissions: List[Permission]):
        """Test getting role permissions with inheritance."""
        # Create parent role with permissions
        parent_role = Role(
            name="parent",
            description="Parent role",
            organization_id=test_organization.id
        )
        parent_role.permissions = [test_permissions[0], test_permissions[1]]
        
        db_session.add(parent_role)
        await db_session.commit()
        await db_session.refresh(parent_role)
        
        # Create child role with additional permission
        child_role = Role(
            name="child",
            description="Child role",
            parent_id=parent_role.id,
            organization_id=test_organization.id
        )
        child_role.permissions = [test_permissions[2]]  # Different permission
        
        db_session.add(child_role)
        await db_session.commit()
        
        all_permissions = child_role.get_all_permissions(include_inherited=True)
        
        # Should have own permission + inherited permissions
        assert len(all_permissions) >= 2
        permission_names = [p.name for p in all_permissions]
        assert test_permissions[2].name in permission_names  # Own permission
    
    @pytest.mark.asyncio
    async def test_has_permission(self, db_session: AsyncSession, test_organization: Organization, test_permissions: List[Permission]):
        """Test role permission checking."""
        role = Role(
            name="tester",
            description="Test role",
            organization_id=test_organization.id
        )
        role.permissions = [test_permissions[0]]  # user:read
        
        db_session.add(role)
        await db_session.commit()
        
        assert role.has_permission(test_permissions[0].name) is True
        assert role.has_permission("nonexistent:permission") is False


class TestUserModel:
    """Test User model functionality."""
    
    @pytest.mark.asyncio
    async def test_create_user(self, db_session: AsyncSession, test_organization: Organization):
        """Test creating a user."""
        user = User(
            email="testuser@example.com",
            name="Test User",
            first_name="Test",
            last_name="User",
            password_hash=get_password_hash("password123"),
            organization_id=test_organization.id,
            phone="+5511999999999",
            department="Engineering",
            job_title="Developer",
            timezone="America/Sao_Paulo",
            language="pt-BR",
            theme="dark"
        )
        
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        
        assert user.id is not None
        assert user.email == "testuser@example.com"
        assert user.name == "Test User"
        assert user.first_name == "Test"
        assert user.last_name == "User"
        assert user.phone == "+5511999999999"
        assert user.department == "Engineering"
        assert user.job_title == "Developer"
        assert user.timezone == "America/Sao_Paulo"
        assert user.language == "pt-BR"
        assert user.theme == "dark"
        assert user.is_active is True
        assert user.is_locked is False
        assert user.mfa_enabled is False
    
    @pytest.mark.asyncio
    async def test_user_full_name_property(self, db_session: AsyncSession):
        """Test user full_name property."""
        # User with first and last name
        user1 = User(
            email="user1@example.com",
            name="Full Name",
            first_name="John",
            last_name="Doe",
            password_hash=get_password_hash("password")
        )
        
        # User without first/last name
        user2 = User(
            email="user2@example.com",
            name="Single Name",
            password_hash=get_password_hash("password")
        )
        
        assert user1.full_name == "John Doe"
        assert user2.full_name == "Single Name"
    
    @pytest.mark.asyncio
    async def test_user_account_locked_property(self, db_session: AsyncSession, test_organization: Organization):
        """Test user is_account_locked property."""
        # Normal active user
        user1 = User(
            email="active@example.com",
            name="Active User",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id,
            is_active=True,
            is_locked=False
        )
        
        # Locked user
        user2 = User(
            email="locked@example.com",
            name="Locked User",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id,
            is_active=True,
            is_locked=True
        )
        
        # Inactive user
        user3 = User(
            email="inactive@example.com",
            name="Inactive User",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id,
            is_active=False,
            is_locked=False
        )
        
        assert user1.is_account_locked is False
        assert user2.is_account_locked is True
        assert user3.is_account_locked is True
    
    @pytest.mark.asyncio
    async def test_user_role_assignment(self, db_session: AsyncSession, test_organization: Organization, test_roles: List[Role]):
        """Test user role assignment."""
        user = User(
            email="roleuser@example.com",
            name="Role User",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id
        )
        
        # Assign roles
        user.roles = [test_roles[0]]  # Assign admin role
        
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        
        assert len(user.roles) == 1
        assert user.roles[0].name == test_roles[0].name
    
    @pytest.mark.asyncio
    async def test_assign_and_revoke_role(self, db_session: AsyncSession, test_organization: Organization, test_roles: List[Role]):
        """Test assigning and revoking roles."""
        user = User(
            email="assign@example.com",
            name="Assign User",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id
        )
        
        db_session.add(user)
        await db_session.commit()
        
        # Test role assignment
        result = user.assign_role(test_roles[0])
        assert result is True
        assert test_roles[0] in user.roles
        
        # Test duplicate assignment (should fail)
        result = user.assign_role(test_roles[0])
        assert result is False
        
        # Test role revocation
        result = user.revoke_role(test_roles[0])
        assert result is True
        assert test_roles[0] not in user.roles
        
        # Test revoking non-assigned role (should fail)
        result = user.revoke_role(test_roles[0])
        assert result is False
    
    @pytest.mark.asyncio
    async def test_get_max_role_level(self, db_session: AsyncSession, test_organization: Organization):
        """Test getting user's maximum role level."""
        # Create roles with different levels
        high_role = Role(
            name="high",
            description="High priority",
            level=1,  # Lower number = higher priority
            organization_id=test_organization.id
        )
        low_role = Role(
            name="low",
            description="Low priority",
            level=99,
            organization_id=test_organization.id
        )
        
        user = User(
            email="level@example.com",
            name="Level User",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id
        )
        
        user.roles = [high_role, low_role]
        
        db_session.add_all([high_role, low_role, user])
        await db_session.commit()
        
        # Should return the lowest number (highest priority)
        assert user.get_max_role_level() == 1
    
    @pytest.mark.asyncio
    async def test_is_mfa_required(self, db_session: AsyncSession, test_organization: Organization):
        """Test MFA requirement logic."""
        # User with MFA enabled
        user1 = User(
            email="mfa@example.com",
            name="MFA User",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id,
            mfa_enabled=True
        )
        
        # High-privilege user (low role level)
        high_role = Role(
            name="super-admin",
            level=1,  # High privilege
            organization_id=test_organization.id
        )
        
        user2 = User(
            email="admin@example.com",
            name="Admin User",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id,
            mfa_enabled=False
        )
        user2.roles = [high_role]
        
        # Regular user
        regular_role = Role(
            name="regular",
            level=50,
            organization_id=test_organization.id
        )
        
        user3 = User(
            email="regular@example.com",
            name="Regular User",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id,
            mfa_enabled=False
        )
        user3.roles = [regular_role]
        
        db_session.add_all([high_role, regular_role, user1, user2, user3])
        await db_session.commit()
        
        assert user1.is_mfa_required() is True  # MFA enabled
        assert user2.is_mfa_required() is True  # High privilege role
        assert user3.is_mfa_required() is False  # Regular user
    
    @pytest.mark.asyncio
    async def test_manager_relationship(self, db_session: AsyncSession, test_organization: Organization):
        """Test user manager relationship."""
        manager = User(
            email="manager@example.com",
            name="Manager",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id
        )
        
        employee = User(
            email="employee@example.com",
            name="Employee",
            password_hash=get_password_hash("password"),
            organization_id=test_organization.id,
            manager_id=None  # Will set after manager is saved
        )
        
        db_session.add(manager)
        await db_session.commit()
        await db_session.refresh(manager)
        
        employee.manager_id = manager.id
        db_session.add(employee)
        await db_session.commit()
        await db_session.refresh(employee)
        
        assert employee.manager_id == manager.id
        assert employee.manager.name == "Manager"
        assert len(manager.direct_reports) == 1
        assert manager.direct_reports[0].name == "Employee"


class TestUserPermissionModel:
    """Test UserPermission (direct permission overrides) model."""
    
    @pytest.mark.asyncio
    async def test_create_user_permission_override(self, db_session: AsyncSession, test_user: User, test_permissions: List[Permission]):
        """Test creating direct user permission override."""
        user_perm = UserPermission(
            user_id=test_user.id,
            permission_id=test_permissions[0].id,
            granted=True,
            reason="Special access granted by admin",
            expires_at=datetime.utcnow() + timedelta(days=30)
        )
        
        db_session.add(user_perm)
        await db_session.commit()
        await db_session.refresh(user_perm)
        
        assert user_perm.id is not None
        assert user_perm.user_id == test_user.id
        assert user_perm.permission_id == test_permissions[0].id
        assert user_perm.granted is True
        assert user_perm.reason == "Special access granted by admin"
        assert user_perm.is_active is True
        assert user_perm.expires_at > datetime.utcnow()
    
    @pytest.mark.asyncio
    async def test_user_permission_deny_override(self, db_session: AsyncSession, test_user: User, test_permissions: List[Permission]):
        """Test creating deny permission override."""
        user_perm = UserPermission(
            user_id=test_user.id,
            permission_id=test_permissions[0].id,
            granted=False,  # Deny permission
            reason="Temporary access restriction"
        )
        
        db_session.add(user_perm)
        await db_session.commit()
        
        assert user_perm.granted is False
    
    @pytest.mark.asyncio
    async def test_is_expired_property(self, db_session: AsyncSession):
        """Test UserPermission is_expired property."""
        # Non-expiring permission
        perm1 = UserPermission(
            user_id=uuid.uuid4(),
            permission_id=uuid.uuid4(),
            granted=True
        )
        
        # Expired permission
        perm2 = UserPermission(
            user_id=uuid.uuid4(),
            permission_id=uuid.uuid4(),
            granted=True,
            expires_at=datetime.utcnow() - timedelta(hours=1)  # 1 hour ago
        )
        
        # Future expiring permission
        perm3 = UserPermission(
            user_id=uuid.uuid4(),
            permission_id=uuid.uuid4(),
            granted=True,
            expires_at=datetime.utcnow() + timedelta(hours=1)  # 1 hour from now
        )
        
        assert perm1.is_expired is False
        assert perm2.is_expired is True
        assert perm3.is_expired is False


class TestUserSessionModel:
    """Test UserSession model functionality."""
    
    @pytest.mark.asyncio
    async def test_create_user_session(self, db_session: AsyncSession, test_user: User):
        """Test creating a user session."""
        token_family = uuid.uuid4()
        session = UserSession(
            user_id=test_user.id,
            token_family=token_family,
            refresh_token_hash="hashed_token_123",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0 Test Browser",
            device_info={
                "os": "Windows",
                "browser": "Chrome",
                "device_type": "desktop"
            },
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)
        
        assert session.id is not None
        assert session.user_id == test_user.id
        assert session.token_family == token_family
        assert session.refresh_token_hash == "hashed_token_123"
        assert session.ip_address is not None
        assert session.device_info["browser"] == "Chrome"
        assert session.is_active is True
        assert session.revoked_at is None
    
    @pytest.mark.asyncio
    async def test_session_is_expired_property(self, db_session: AsyncSession):
        """Test UserSession is_expired property."""
        # Expired session
        expired_session = UserSession(
            user_id=uuid.uuid4(),
            token_family=uuid.uuid4(),
            refresh_token_hash="expired_token",
            expires_at=datetime.utcnow() - timedelta(hours=1)
        )
        
        # Valid session
        valid_session = UserSession(
            user_id=uuid.uuid4(),
            token_family=uuid.uuid4(),
            refresh_token_hash="valid_token",
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        
        assert expired_session.is_expired is True
        assert valid_session.is_expired is False
    
    @pytest.mark.asyncio
    async def test_session_revoke_method(self, db_session: AsyncSession):
        """Test UserSession revoke method."""
        session = UserSession(
            user_id=uuid.uuid4(),
            token_family=uuid.uuid4(),
            refresh_token_hash="token_to_revoke",
            expires_at=datetime.utcnow() + timedelta(days=1)
        )
        
        assert session.is_active is True
        assert session.revoked_at is None
        
        session.revoke("User logged out")
        
        assert session.is_active is False
        assert session.revoked_at is not None
        assert session.revoked_reason == "User logged out"


class TestLoginAttemptModel:
    """Test LoginAttempt model functionality."""
    
    @pytest.mark.asyncio
    async def test_create_login_attempt(self, db_session: AsyncSession, test_user: User, test_organization: Organization):
        """Test creating a login attempt record."""
        attempt = LoginAttempt(
            email=test_user.email,
            user_id=test_user.id,
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0 Test",
            success=True,
            organization_id=test_organization.id
        )
        
        db_session.add(attempt)
        await db_session.commit()
        await db_session.refresh(attempt)
        
        assert attempt.id is not None
        assert attempt.email == test_user.email
        assert attempt.user_id == test_user.id
        assert attempt.success is True
        assert attempt.failure_reason is None
        assert attempt.attempted_at is not None
    
    @pytest.mark.asyncio
    async def test_failed_login_attempt(self, db_session: AsyncSession, test_organization: Organization):
        """Test creating a failed login attempt."""
        attempt = LoginAttempt(
            email="nonexistent@example.com",
            user_id=None,  # User not found
            ip_address="192.168.1.100",
            success=False,
            failure_reason="Invalid credentials",
            organization_id=test_organization.id
        )
        
        db_session.add(attempt)
        await db_session.commit()
        
        assert attempt.success is False
        assert attempt.failure_reason == "Invalid credentials"
        assert attempt.user_id is None


class TestAuditLogModel:
    """Test AuditLog model functionality."""
    
    @pytest.mark.asyncio
    async def test_create_audit_log(self, db_session: AsyncSession, test_user: User, test_organization: Organization):
        """Test creating an audit log entry."""
        log_entry = AuditLog(
            user_id=test_user.id,
            organization_id=test_organization.id,
            action="user.login",
            resource_type="user",
            resource_id=test_user.id,
            old_values=None,
            new_values={"last_login": datetime.utcnow().isoformat()},
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0 Test",
            session_id=uuid.uuid4()
        )
        
        db_session.add(log_entry)
        await db_session.commit()
        await db_session.refresh(log_entry)
        
        assert log_entry.id is not None
        assert log_entry.user_id == test_user.id
        assert log_entry.action == "user.login"
        assert log_entry.resource_type == "user"
        assert log_entry.resource_id == test_user.id
        assert log_entry.new_values["last_login"] is not None
        assert log_entry.created_at is not None
