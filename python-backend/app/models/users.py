"""
User and authentication models with Role-Based Access Control (RBAC).

This module implements a comprehensive user management system with:
- User accounts with security features
- Hierarchical role system
- Granular permissions
- Multi-factor authentication
- Session management
- Audit trails
- Organization/tenant support
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column, String, DateTime, Boolean, Text, UUID, JSON, Integer, 
    ForeignKey, UniqueConstraint, CheckConstraint, Index, ARRAY, Table
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.dialects.postgresql import INET
import sqlalchemy as sa

from .base import (
    BaseModel, EnhancedBaseModel, NamedEntityModel, 
    DatabaseConstraints, AuditMixin, SoftDeleteMixin
)


# Association table for user-role many-to-many relationship
user_roles_table = Table(
    'user_roles',
    BaseModel.metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
    Column('role_id', UUID(as_uuid=True), ForeignKey('roles.id', ondelete='CASCADE'), nullable=False),
    Column('assigned_at', DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    Column('assigned_by_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    Column('expires_at', DateTime(timezone=True), nullable=True),
    Column('is_active', Boolean, default=True, nullable=False),
    Column('module_name', String(100), nullable=True, comment="Optional module-specific role assignment"),
    Column('reason', Text, nullable=True, comment="Reason for role assignment"),
    UniqueConstraint('user_id', 'role_id', 'module_name', name='uq_user_role_module'),
    Index('idx_user_roles_user', 'user_id'),
    Index('idx_user_roles_role', 'role_id'),
    Index('idx_user_roles_active', 'user_id', 'is_active'),
    Index('idx_user_roles_expires', 'expires_at'),
)

# Association table for role-permission many-to-many relationship
role_permissions_table = Table(
    'role_permissions',
    BaseModel.metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('role_id', UUID(as_uuid=True), ForeignKey('roles.id', ondelete='CASCADE'), nullable=False),
    Column('permission_id', UUID(as_uuid=True), ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False),
    Column('granted_at', DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    Column('granted_by_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    Column('is_active', Boolean, default=True, nullable=False),
    UniqueConstraint('role_id', 'permission_id', name='uq_role_permission'),
    Index('idx_role_permissions_role', 'role_id'),
    Index('idx_role_permissions_permission', 'permission_id'),
)

# Association table for user-permission direct assignments
user_permissions_table = Table(
    'user_permissions',
    BaseModel.metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
    Column('permission_id', UUID(as_uuid=True), ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False),
    Column('granted', Boolean, default=True, nullable=False, comment="True=grant, False=deny (overrides role)"),
    Column('granted_at', DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    Column('granted_by_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    Column('expires_at', DateTime(timezone=True), nullable=True),
    Column('reason', Text, nullable=True, comment="Reason for direct permission grant/deny"),
    Column('is_active', Boolean, default=True, nullable=False),
    UniqueConstraint('user_id', 'permission_id', name='uq_user_permission'),
    Index('idx_user_permissions_user', 'user_id'),
    Index('idx_user_permissions_permission', 'permission_id'),
    Index('idx_user_permissions_active', 'user_id', 'is_active'),
)


class Organization(NamedEntityModel):
    """
    Organization/Tenant model for multi-tenancy support.
    Each organization is a separate tenant with its own users, roles, etc.
    """
    __tablename__ = 'organizations'

    domain = Column(String(255), unique=True, nullable=True, comment="Organization domain")
    logo_url = Column(String(DatabaseConstraints.MAX_URL_LENGTH), nullable=True)
    settings = Column(JSON, default={}, nullable=False)
    
    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    roles = relationship("Role", back_populates="organization", cascade="all, delete-orphan")
    groups = relationship("Group", back_populates="organization", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint(
            "domain ~ '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]$' OR domain IS NULL",
            name='ck_organization_domain_format'
        ),
        Index('idx_organizations_domain', 'domain'),
        Index('idx_organizations_active', 'is_active'),
    )


class Permission(NamedEntityModel):
    """
    Permission model for granular access control.
    Permissions define what actions can be performed on what resources.
    """
    __tablename__ = 'permissions'

    category = Column(String(50), nullable=False, comment="Permission category (system, user_management, etc.)")
    resource = Column(String(100), nullable=True, comment="Resource type (users, modules, data, etc.)")
    action = Column(String(50), nullable=False, comment="Action type (create, read, update, delete, etc.)")
    module_name = Column(String(100), nullable=True, comment="Optional module this permission belongs to")
    is_system_permission = Column(Boolean, default=False, nullable=False, comment="System permissions cannot be deleted")
    
    # Relationships
    roles = relationship("Role", secondary=role_permissions_table, back_populates="permissions")
    user_permissions = relationship("UserPermission", back_populates="permission", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint(
            "name ~ '^[a-z_]+:[a-z_:]+$'",
            name='ck_permission_name_format'
        ),
        Index('idx_permissions_category', 'category'),
        Index('idx_permissions_resource', 'resource'),
        Index('idx_permissions_module', 'module_name'),
        Index('idx_permissions_system', 'is_system_permission'),
    )

    @property
    def full_name(self) -> str:
        """Get the full permission name including module prefix."""
        if self.module_name:
            return f"{self.module_name}:{self.name}"
        return self.name


class Role(NamedEntityModel):
    """
    Role model for hierarchical role-based access control.
    Roles can inherit from parent roles and have different priority levels.
    """
    __tablename__ = 'roles'

    level = Column(Integer, default=99, nullable=False, comment="Role level (lower number = higher priority)")
    parent_id = Column(UUID(as_uuid=True), ForeignKey('roles.id', ondelete='SET NULL'), nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    is_system_role = Column(Boolean, default=False, nullable=False, comment="System roles cannot be deleted")
    color = Column(String(7), default='#6366f1', nullable=False, comment="UI color for role")
    icon = Column(String(50), nullable=True, comment="Lucide icon name for UI")

    # Relationships
    organization = relationship("Organization", back_populates="roles")
    parent = relationship("Role", remote_side="Role.id", backref=backref("children", cascade="all, delete-orphan"))
    users = relationship("User", secondary=user_roles_table, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions_table, back_populates="roles")

    __table_args__ = (
        CheckConstraint('level >= 0', name='ck_role_level_positive'),
        DatabaseConstraints.get_color_constraint('color'),
        UniqueConstraint('name', 'organization_id', name='uq_role_name_org'),
        Index('idx_roles_organization', 'organization_id'),
        Index('idx_roles_parent', 'parent_id'),
        Index('idx_roles_level', 'level'),
        Index('idx_roles_system', 'is_system_role'),
    )

    def get_all_permissions(self, include_inherited: bool = True) -> List[Permission]:
        """
        Get all permissions for this role, optionally including inherited permissions.
        
        Args:
            include_inherited: Whether to include permissions from parent roles
            
        Returns:
            List of Permission objects
        """
        permissions = list(self.permissions)
        
        if include_inherited and self.parent:
            parent_permissions = self.parent.get_all_permissions(include_inherited=True)
            # Avoid duplicates
            permission_ids = {p.id for p in permissions}
            for perm in parent_permissions:
                if perm.id not in permission_ids:
                    permissions.append(perm)
        
        return permissions

    def has_permission(self, permission_name: str, include_inherited: bool = True) -> bool:
        """
        Check if role has a specific permission.
        
        Args:
            permission_name: Name of the permission to check
            include_inherited: Whether to check parent roles
            
        Returns:
            True if role has the permission
        """
        all_permissions = self.get_all_permissions(include_inherited)
        return any(p.name == permission_name or p.full_name == permission_name for p in all_permissions)


class User(EnhancedBaseModel):
    """
    Enhanced user model with comprehensive security and profile features.
    Supports MFA, session management, preferences, and full audit trail.
    """
    __tablename__ = 'users'

    # Basic profile information
    email = Column(String(DatabaseConstraints.MAX_EMAIL_LENGTH), nullable=False)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    password_hash = Column(String(255), nullable=True)  # Nullable for SSO-only users
    name = Column(String(DatabaseConstraints.MAX_NAME_LENGTH), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    avatar_url = Column(String(DatabaseConstraints.MAX_URL_LENGTH), nullable=True)
    phone = Column(String(20), nullable=True)
    
    # Organizational information
    department = Column(String(100), nullable=True)
    job_title = Column(String(100), nullable=True)
    manager_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    
    # Security and status
    is_locked = Column(Boolean, default=False, nullable=False)
    lock_reason = Column(Text, nullable=True)
    must_change_password = Column(Boolean, default=False, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    last_login_ip = Column(INET, nullable=True)
    last_password_change_at = Column(DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    
    # Multi-factor authentication
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    mfa_secret = Column(String(32), nullable=True)
    mfa_backup_codes = Column(ARRAY(String), nullable=True, comment="Encrypted backup codes")
    
    # Preferences and settings
    timezone = Column(String(50), default='UTC', nullable=False)
    language = Column(String(5), default='pt-BR', nullable=False)
    theme = Column(String(10), default='system', nullable=False)  # light, dark, system
    preferences = Column(JSON, default={}, nullable=False)
    
    # Relationships
    organization = relationship("Organization", back_populates="users")
    manager = relationship("User", remote_side="User.id", backref=backref("direct_reports", cascade="all"))
    roles = relationship("Role", secondary=user_roles_table, back_populates="users")
    user_permissions = relationship("UserPermission", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    login_attempts = relationship("LoginAttempt", back_populates="user", cascade="all, delete-orphan")
    group_memberships = relationship("GroupMember", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    
    # Module-related relationships
    module_installations = relationship("ModuleInstallation", back_populates="user", cascade="all, delete-orphan")
    module_configurations = relationship("ModuleConfiguration", back_populates="user", cascade="all, delete-orphan")
    module_permissions = relationship("ModuleUserPermission", back_populates="user", cascade="all, delete-orphan")
    module_reviews = relationship("ModuleReview", back_populates="user", cascade="all, delete-orphan")
    
    # Dashboard-related relationships
    dashboards = relationship("Dashboard", back_populates="owner", cascade="all, delete-orphan")
    dashboard_folders = relationship("DashboardFolder", back_populates="owner", cascade="all, delete-orphan")
    dashboard_permissions = relationship("DashboardPermission", back_populates="user", cascade="all, delete-orphan")
    dashboard_templates = relationship("DashboardTemplate", back_populates="creator", cascade="all, delete-orphan")
    
    # File-related relationships
    owned_files = relationship("File", foreign_keys="File.owner_id", back_populates="owner", cascade="all, delete-orphan")
    uploaded_files = relationship("File", foreign_keys="File.uploaded_by", back_populates="uploader")
    file_folders = relationship("FileFolder", back_populates="owner", cascade="all, delete-orphan")
    storage_quotas = relationship("StorageQuota", back_populates="user", cascade="all, delete-orphan")
    
    # Window-related relationships
    windows = relationship("Window", back_populates="user", cascade="all, delete-orphan")
    window_layouts = relationship("WindowLayout", back_populates="user", cascade="all, delete-orphan")
    window_sessions = relationship("WindowSession", back_populates="user", cascade="all, delete-orphan")
    window_workspaces = relationship("WindowWorkspace", back_populates="user", cascade="all, delete-orphan")
    
    # Admin-related relationships
    maintenance_windows = relationship("MaintenanceWindow", back_populates="creator", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('email', 'organization_id', name='uq_user_email_org'),
        DatabaseConstraints.get_email_constraint('email'),
        DatabaseConstraints.get_phone_constraint('phone'),
        CheckConstraint("theme IN ('light', 'dark', 'system')", name='ck_user_theme_valid'),
        CheckConstraint("failed_login_attempts >= 0", name='ck_user_failed_attempts_positive'),
        Index('idx_users_organization', 'organization_id'),
        Index('idx_users_email', 'email'),
        Index('idx_users_manager', 'manager_id'),
        Index('idx_users_active', 'is_active'),
        Index('idx_users_locked', 'is_locked'),
        Index('idx_users_department', 'department'),
    )

    @hybrid_property
    def full_name(self) -> str:
        """Get the user's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.name

    @hybrid_property
    def is_account_locked(self) -> bool:
        """Check if account is locked due to security reasons."""
        return self.is_locked or not self.is_active or self.is_deleted

    def get_effective_permissions(self) -> List[str]:
        """
        Get all effective permissions for the user from roles and direct assignments.
        Direct permissions can grant or deny access, overriding role permissions.
        
        Returns:
            List of permission names the user has access to
        """
        permissions = set()
        denied_permissions = set()
        
        # Get permissions from direct user permissions (highest priority)
        for user_perm in self.user_permissions:
            if user_perm.is_active and not user_perm.is_expired:
                if user_perm.granted:
                    permissions.add(user_perm.permission.name)
                else:
                    denied_permissions.add(user_perm.permission.name)
        
        # Get permissions from roles (only if not explicitly denied)
        for role in self.get_active_roles():
            for permission in role.get_all_permissions():
                if permission.name not in denied_permissions:
                    permissions.add(permission.name)
        
        return list(permissions)

    def has_permission(self, permission_name: str, module_name: Optional[str] = None) -> bool:
        """
        Check if user has a specific permission.
        
        Args:
            permission_name: Name of permission to check
            module_name: Optional module name for scoped permissions
            
        Returns:
            True if user has the permission
        """
        # Check direct user permissions first (can grant or deny)
        for user_perm in self.user_permissions:
            if (user_perm.is_active and 
                not user_perm.is_expired and 
                (user_perm.permission.name == permission_name or 
                 user_perm.permission.full_name == permission_name)):
                return user_perm.granted
        
        # Check role-based permissions
        for role in self.get_active_roles():
            if role.has_permission(permission_name):
                return True
        
        return False

    def get_active_roles(self) -> List[Role]:
        """Get all active (non-expired) roles for the user."""
        active_roles = []
        for role in self.roles:
            # Check if role assignment is still valid
            role_assignment = self._get_role_assignment(role.id)
            if (role_assignment and 
                role_assignment['is_active'] and 
                not self._is_role_expired(role_assignment)):
                active_roles.append(role)
        return active_roles

    def get_max_role_level(self) -> int:
        """Get the maximum (lowest number = highest priority) role level for the user."""
        active_roles = self.get_active_roles()
        if not active_roles:
            return 999  # Default low priority
        return min(role.level for role in active_roles)

    def assign_role(self, role: Role, assigned_by: Optional[uuid.UUID] = None, 
                   expires_at: Optional[datetime] = None, reason: Optional[str] = None,
                   module_name: Optional[str] = None) -> bool:
        """
        Assign a role to the user.
        
        Args:
            role: Role to assign
            assigned_by: ID of user making the assignment
            expires_at: Optional expiration date
            reason: Reason for assignment
            module_name: Optional module scope
            
        Returns:
            True if role was assigned successfully
        """
        if role not in self.roles:
            self.roles.append(role)
            # Note: Additional assignment details would be handled by the association table
            return True
        return False

    def revoke_role(self, role: Role, revoked_by: Optional[uuid.UUID] = None, 
                   reason: Optional[str] = None) -> bool:
        """
        Revoke a role from the user.
        
        Args:
            role: Role to revoke
            revoked_by: ID of user making the revocation
            reason: Reason for revocation
            
        Returns:
            True if role was revoked successfully
        """
        if role in self.roles:
            self.roles.remove(role)
            return True
        return False

    def is_mfa_required(self) -> bool:
        """Check if MFA is required for this user."""
        # Could be based on role level, organization policy, etc.
        return self.mfa_enabled or self.get_max_role_level() <= 2

    def can_manage_user(self, target_user: 'User') -> bool:
        """
        Check if this user can manage another user based on role hierarchy.
        
        Args:
            target_user: User to check management permissions for
            
        Returns:
            True if this user can manage the target user
        """
        # Super admin can manage anyone
        if self.has_permission('system:admin_panel'):
            return True
        
        # Check role hierarchy - can only manage users with lower role levels
        my_max_level = self.get_max_role_level()
        target_max_level = target_user.get_max_role_level()
        
        return my_max_level < target_max_level

    def _get_role_assignment(self, role_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Get role assignment details from the association table."""
        # This would typically be done via a query to the user_roles table
        # Implementation depends on how the association table is handled
        return None

    def _is_role_expired(self, role_assignment: Dict[str, Any]) -> bool:
        """Check if a role assignment has expired."""
        expires_at = role_assignment.get('expires_at')
        return expires_at is not None and expires_at <= datetime.utcnow()


class UserPermission(BaseModel, AuditMixin):
    """
    Direct user permissions that can override role-based permissions.
    These can grant or deny specific permissions to users.
    """
    __tablename__ = 'user_permission_overrides'

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    permission_id = Column(UUID(as_uuid=True), ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False)
    granted = Column(Boolean, default=True, nullable=False, comment="True=grant, False=deny")
    expires_at = Column(DateTime(timezone=True), nullable=True)
    reason = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="user_permissions")
    permission = relationship("Permission", back_populates="user_permissions")

    __table_args__ = (
        UniqueConstraint('user_id', 'permission_id', name='uq_user_permission_override'),
        Index('idx_user_permission_overrides_user', 'user_id'),
        Index('idx_user_permission_overrides_permission', 'permission_id'),
        Index('idx_user_permission_overrides_expires', 'expires_at'),
    )

    @property
    def is_expired(self) -> bool:
        """Check if this permission override has expired."""
        return self.expires_at is not None and self.expires_at <= datetime.utcnow()


class Group(NamedEntityModel):
    """
    Groups for team-based permission management.
    Users can belong to multiple groups, and groups can have permissions.
    """
    __tablename__ = 'groups'

    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    parent_group_id = Column(UUID(as_uuid=True), ForeignKey('groups.id', ondelete='SET NULL'), nullable=True)
    group_type = Column(String(50), default='general', nullable=False)  # general, department, project, etc.

    # Relationships
    organization = relationship("Organization", back_populates="groups")
    parent_group = relationship("Group", remote_side="Group.id", backref=backref("child_groups", cascade="all"))
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    permissions = relationship("GroupPermission", back_populates="group", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('name', 'organization_id', name='uq_group_name_org'),
        Index('idx_groups_organization', 'organization_id'),
        Index('idx_groups_parent', 'parent_group_id'),
        Index('idx_groups_type', 'group_type'),
    )


class GroupMember(BaseModel, AuditMixin):
    """
    Group membership with roles within the group.
    """
    __tablename__ = 'group_members'

    group_id = Column(UUID(as_uuid=True), ForeignKey('groups.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = Column(String(50), default='member', nullable=False)  # admin, member, viewer
    joined_at = Column(DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="group_memberships")

    __table_args__ = (
        UniqueConstraint('group_id', 'user_id', name='uq_group_member'),
        CheckConstraint("role IN ('admin', 'member', 'viewer')", name='ck_group_member_role'),
        Index('idx_group_members_group', 'group_id'),
        Index('idx_group_members_user', 'user_id'),
    )


class GroupPermission(BaseModel, AuditMixin):
    """
    Permissions assigned to groups.
    """
    __tablename__ = 'group_permissions'

    group_id = Column(UUID(as_uuid=True), ForeignKey('groups.id', ondelete='CASCADE'), nullable=False)
    permission_id = Column(UUID(as_uuid=True), ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    group = relationship("Group", back_populates="permissions")
    permission = relationship("Permission")

    __table_args__ = (
        UniqueConstraint('group_id', 'permission_id', name='uq_group_permission'),
        Index('idx_group_permissions_group', 'group_id'),
        Index('idx_group_permissions_permission', 'permission_id'),
    )


class UserSession(BaseModel):
    """
    User session tracking for security and analytics.
    Supports token families for refresh token rotation.
    """
    __tablename__ = 'user_sessions'

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    token_family = Column(UUID(as_uuid=True), nullable=False, comment="All refresh tokens from same login")
    refresh_token_hash = Column(String(255), nullable=False, unique=True)
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    device_info = Column(JSON, default={}, nullable=False)
    last_activity = Column(DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_reason = Column(String(100), nullable=True)

    # Relationships
    user = relationship("User", back_populates="sessions")

    __table_args__ = (
        Index('idx_user_sessions_user', 'user_id'),
        Index('idx_user_sessions_token', 'refresh_token_hash'),
        Index('idx_user_sessions_expires', 'expires_at'),
        Index('idx_user_sessions_family', 'token_family'),
        Index('idx_user_sessions_active', 'is_active'),
    )

    @property
    def is_expired(self) -> bool:
        """Check if session has expired."""
        return datetime.utcnow() > self.expires_at

    def revoke(self, reason: str = "Manual revocation"):
        """Revoke this session."""
        self.is_active = False
        self.revoked_at = datetime.utcnow()
        self.revoked_reason = reason


class LoginAttempt(BaseModel):
    """
    Login attempt tracking for security monitoring.
    """
    __tablename__ = 'login_attempts'

    email = Column(String(DatabaseConstraints.MAX_EMAIL_LENGTH), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    ip_address = Column(INET, nullable=False)
    user_agent = Column(Text, nullable=True)
    success = Column(Boolean, nullable=False)
    failure_reason = Column(String(100), nullable=True)
    attempted_at = Column(DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True)

    # Relationships
    user = relationship("User", back_populates="login_attempts")
    organization = relationship("Organization")

    __table_args__ = (
        Index('idx_login_attempts_email', 'email'),
        Index('idx_login_attempts_user', 'user_id'),
        Index('idx_login_attempts_ip', 'ip_address'),
        Index('idx_login_attempts_attempted', 'attempted_at'),
        Index('idx_login_attempts_success', 'success'),
    )


class AuditLog(BaseModel):
    """
    Comprehensive audit log for tracking all system changes.
    """
    __tablename__ = 'audit_logs'

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True)
    action = Column(String(100), nullable=False, comment="Action performed (e.g., user.created, role.assigned)")
    resource_type = Column(String(50), nullable=False, comment="Type of resource (user, role, permission)")
    resource_id = Column(UUID(as_uuid=True), nullable=True, comment="ID of affected resource")
    old_values = Column(JSON, nullable=True, comment="Previous values before change")
    new_values = Column(JSON, nullable=True, comment="New values after change")
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    session_id = Column(UUID(as_uuid=True), nullable=True, comment="Session ID for request tracking")

    # Relationships
    user = relationship("User")
    organization = relationship("Organization")

    __table_args__ = (
        CheckConstraint("action ~ '^[a-z_]+\\.[a-z_]+$'", name='ck_audit_action_format'),
        Index('idx_audit_logs_user', 'user_id'),
        Index('idx_audit_logs_created', 'created_at'),
        Index('idx_audit_logs_action', 'action'),
        Index('idx_audit_logs_resource', 'resource_type', 'resource_id'),
        Index('idx_audit_logs_organization', 'organization_id'),
    )