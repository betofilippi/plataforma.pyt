-- =====================================================================
-- PLATAFORMA.DEV - RBAC ENTERPRISE SCHEMA
-- Sistema Completo de Usuários com Controle de Acesso Baseado em Roles
-- =====================================================================

-- Drop existing schema if exists (be careful in production!)
DROP SCHEMA IF EXISTS plataforma_rbac CASCADE;

-- Create RBAC schema
CREATE SCHEMA plataforma_rbac;

-- =====================================================================
-- 1. ORGANIZATIONS & TENANCY
-- =====================================================================

CREATE TABLE plataforma_rbac.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  CONSTRAINT org_name_unique UNIQUE (name),
  CONSTRAINT org_domain_format CHECK (domain ~ '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]$')
);

-- =====================================================================
-- 2. ROLES HIERARCHY
-- =====================================================================

CREATE TABLE plataforma_rbac.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 99, -- Lower number = higher priority
  parent_id UUID REFERENCES plataforma_rbac.roles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES plataforma_rbac.organizations(id) ON DELETE CASCADE,
  is_system_role BOOLEAN DEFAULT false, -- Cannot be deleted
  is_active BOOLEAN DEFAULT true,
  color VARCHAR(7) DEFAULT '#6366f1', -- Hex color for UI
  icon VARCHAR(50), -- Lucide icon name
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT role_name_org_unique UNIQUE (name, organization_id),
  CONSTRAINT role_level_positive CHECK (level >= 0),
  CONSTRAINT role_color_format CHECK (color ~ '^#[0-9a-fA-F]{6}$')
);

-- =====================================================================
-- 3. PERMISSIONS SYSTEM
-- =====================================================================

CREATE TABLE plataforma_rbac.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  resource VARCHAR(100), -- e.g., 'users', 'modules', 'data:vendas'
  action VARCHAR(50) NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
  is_system_permission BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT permission_format CHECK (name ~ '^[a-z_]+:[a-z_:]+$')
);

-- =====================================================================
-- 4. USERS TABLE (Enhanced)
-- =====================================================================

CREATE TABLE plataforma_rbac.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  email_verified_at TIMESTAMPTZ,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100), 
  avatar_url TEXT,
  phone VARCHAR(20),
  department VARCHAR(100),
  job_title VARCHAR(100),
  manager_id UUID REFERENCES plataforma_rbac.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES plataforma_rbac.organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Security & Status
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  lock_reason TEXT,
  must_change_password BOOLEAN DEFAULT false,
  failed_login_attempts INTEGER DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  last_password_change_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Multi-factor Authentication
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(32),
  mfa_backup_codes TEXT[], -- Encrypted backup codes
  
  -- Preferences & Settings
  timezone VARCHAR(50) DEFAULT 'UTC',
  language VARCHAR(5) DEFAULT 'pt-BR',
  theme VARCHAR(10) DEFAULT 'system', -- 'light', 'dark', 'system'
  preferences JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES plataforma_rbac.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES plataforma_rbac.users(id) ON DELETE SET NULL,
  
  CONSTRAINT user_email_org_unique UNIQUE (email, organization_id),
  CONSTRAINT user_phone_format CHECK (phone ~ '^\+?[1-9]\d{1,14}$' OR phone IS NULL)
);

-- =====================================================================
-- 5. USER-ROLE ASSIGNMENTS
-- =====================================================================

CREATE TABLE plataforma_rbac.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES plataforma_rbac.users(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES plataforma_rbac.roles(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES plataforma_rbac.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ, -- Optional expiration for temporary roles
  is_active BOOLEAN DEFAULT true,
  
  CONSTRAINT user_role_unique UNIQUE (user_id, role_id)
);

-- =====================================================================
-- 6. ROLE-PERMISSION ASSIGNMENTS  
-- =====================================================================

CREATE TABLE plataforma_rbac.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES plataforma_rbac.roles(id) ON DELETE CASCADE NOT NULL,
  permission_id UUID REFERENCES plataforma_rbac.permissions(id) ON DELETE CASCADE NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES plataforma_rbac.users(id) ON DELETE SET NULL,
  
  CONSTRAINT role_permission_unique UNIQUE (role_id, permission_id)
);

-- =====================================================================
-- 7. DIRECT USER PERMISSIONS (Override system)
-- =====================================================================

CREATE TABLE plataforma_rbac.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES plataforma_rbac.users(id) ON DELETE CASCADE NOT NULL,
  permission_id UUID REFERENCES plataforma_rbac.permissions(id) ON DELETE CASCADE NOT NULL,
  granted BOOLEAN DEFAULT true, -- true = grant, false = deny (takes precedence)
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES plataforma_rbac.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  reason TEXT, -- Why was this permission granted/denied directly
  
  CONSTRAINT user_permission_unique UNIQUE (user_id, permission_id)
);

-- =====================================================================
-- 8. GROUPS (Team-based permissions)
-- =====================================================================

CREATE TABLE plataforma_rbac.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  organization_id UUID REFERENCES plataforma_rbac.organizations(id) ON DELETE CASCADE NOT NULL,
  parent_group_id UUID REFERENCES plataforma_rbac.groups(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES plataforma_rbac.users(id) ON DELETE SET NULL,
  
  CONSTRAINT group_name_org_unique UNIQUE (name, organization_id)
);

CREATE TABLE plataforma_rbac.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES plataforma_rbac.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES plataforma_rbac.users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(50) DEFAULT 'member', -- 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  joined_by UUID REFERENCES plataforma_rbac.users(id) ON DELETE SET NULL,
  
  CONSTRAINT group_member_unique UNIQUE (group_id, user_id)
);

CREATE TABLE plataforma_rbac.group_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES plataforma_rbac.groups(id) ON DELETE CASCADE NOT NULL,
  permission_id UUID REFERENCES plataforma_rbac.permissions(id) ON DELETE CASCADE NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES plataforma_rbac.users(id) ON DELETE SET NULL,
  
  CONSTRAINT group_permission_unique UNIQUE (group_id, permission_id)
);

-- =====================================================================
-- 9. SESSIONS & SECURITY
-- =====================================================================

CREATE TABLE plataforma_rbac.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES plataforma_rbac.users(id) ON DELETE CASCADE NOT NULL,
  token_family UUID NOT NULL, -- All refresh tokens from same login
  refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revoked_reason VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE plataforma_rbac.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES plataforma_rbac.users(id) ON DELETE SET NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(100),
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  organization_id UUID REFERENCES plataforma_rbac.organizations(id) ON DELETE SET NULL
);

-- =====================================================================
-- 10. AUDIT LOG
-- =====================================================================

CREATE TABLE plataforma_rbac.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES plataforma_rbac.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES plataforma_rbac.organizations(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- 'user.created', 'role.assigned', etc.
  resource_type VARCHAR(50) NOT NULL, -- 'user', 'role', 'permission'
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT audit_action_format CHECK (action ~ '^[a-z_]+\.[a-z_]+$')
);

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================

-- Users indexes
CREATE INDEX idx_users_organization ON plataforma_rbac.users(organization_id);
CREATE INDEX idx_users_email ON plataforma_rbac.users(email);
CREATE INDEX idx_users_active ON plataforma_rbac.users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_manager ON plataforma_rbac.users(manager_id);

-- Roles indexes
CREATE INDEX idx_roles_organization ON plataforma_rbac.roles(organization_id);
CREATE INDEX idx_roles_parent ON plataforma_rbac.roles(parent_id);
CREATE INDEX idx_roles_level ON plataforma_rbac.roles(level);

-- User roles indexes
CREATE INDEX idx_user_roles_user ON plataforma_rbac.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON plataforma_rbac.user_roles(role_id);
CREATE INDEX idx_user_roles_active ON plataforma_rbac.user_roles(user_id, is_active) WHERE is_active = true;

-- Permissions indexes
CREATE INDEX idx_permissions_category ON plataforma_rbac.permissions(category);
CREATE INDEX idx_permissions_resource ON plataforma_rbac.permissions(resource);

-- Sessions indexes
CREATE INDEX idx_sessions_user ON plataforma_rbac.user_sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON plataforma_rbac.user_sessions(refresh_token_hash);
CREATE INDEX idx_sessions_expires ON plataforma_rbac.user_sessions(expires_at);

-- Audit indexes
CREATE INDEX idx_audit_user ON plataforma_rbac.audit_log(user_id);
CREATE INDEX idx_audit_created ON plataforma_rbac.audit_log(created_at);
CREATE INDEX idx_audit_action ON plataforma_rbac.audit_log(action);
CREATE INDEX idx_audit_resource ON plataforma_rbac.audit_log(resource_type, resource_id);

-- =====================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================================

CREATE OR REPLACE FUNCTION plataforma_rbac.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at column
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON plataforma_rbac.organizations 
    FOR EACH ROW EXECUTE FUNCTION plataforma_rbac.update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON plataforma_rbac.roles 
    FOR EACH ROW EXECUTE FUNCTION plataforma_rbac.update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON plataforma_rbac.users 
    FOR EACH ROW EXECUTE FUNCTION plataforma_rbac.update_updated_at_column();

-- =====================================================================
-- RBAC HELPER FUNCTIONS
-- =====================================================================

-- Check if user has permission
CREATE OR REPLACE FUNCTION plataforma_rbac.user_has_permission(
    p_user_id UUID,
    p_permission_name VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
BEGIN
    -- Check direct user permissions (these override role permissions)
    SELECT granted INTO has_permission
    FROM plataforma_rbac.user_permissions up
    JOIN plataforma_rbac.permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id 
      AND p.name = p_permission_name
      AND (up.expires_at IS NULL OR up.expires_at > NOW());
    
    -- If direct permission found, return it (grant or deny)
    IF FOUND THEN
        RETURN has_permission;
    END IF;
    
    -- Check role-based permissions
    SELECT COUNT(*) > 0 INTO has_permission
    FROM plataforma_rbac.users u
    JOIN plataforma_rbac.user_roles ur ON ur.user_id = u.id
    JOIN plataforma_rbac.roles r ON r.id = ur.role_id
    JOIN plataforma_rbac.role_permissions rp ON rp.role_id = r.id
    JOIN plataforma_rbac.permissions p ON p.id = rp.permission_id
    WHERE u.id = p_user_id
      AND p.name = p_permission_name
      AND u.is_active = TRUE
      AND ur.is_active = TRUE
      AND r.is_active = TRUE
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's effective permissions
CREATE OR REPLACE FUNCTION plataforma_rbac.get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_name VARCHAR, granted BOOLEAN, source VARCHAR) AS $$
BEGIN
    RETURN QUERY
    -- Direct user permissions (highest priority)
    SELECT 
        p.name as permission_name,
        up.granted,
        'direct' as source
    FROM plataforma_rbac.user_permissions up
    JOIN plataforma_rbac.permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id
      AND (up.expires_at IS NULL OR up.expires_at > NOW())
    
    UNION
    
    -- Role-based permissions (only if no direct permission exists)
    SELECT DISTINCT
        p.name as permission_name,
        TRUE as granted,
        r.name as source
    FROM plataforma_rbac.users u
    JOIN plataforma_rbac.user_roles ur ON ur.user_id = u.id
    JOIN plataforma_rbac.roles r ON r.id = ur.role_id
    JOIN plataforma_rbac.role_permissions rp ON rp.role_id = r.id
    JOIN plataforma_rbac.permissions p ON p.id = rp.permission_id
    WHERE u.id = p_user_id
      AND u.is_active = TRUE
      AND ur.is_active = TRUE
      AND r.is_active = TRUE
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      AND NOT EXISTS (
          SELECT 1 FROM plataforma_rbac.user_permissions up2
          JOIN plataforma_rbac.permissions p2 ON p2.id = up2.permission_id
          WHERE up2.user_id = p_user_id AND p2.name = p.name
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- INITIAL DATA SEEDING
-- =====================================================================

-- Create default organization
INSERT INTO plataforma_rbac.organizations (id, name, display_name, domain) 
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    'plataforma', 
    'Plataforma.dev', 
    'plataforma.dev'
);

-- Create system permissions
INSERT INTO plataforma_rbac.permissions (name, display_name, description, category, resource, action, is_system_permission) VALUES
-- System permissions
('system:admin_panel', 'Admin Panel', 'Access to admin panel', 'system', 'system', 'admin_panel', true),
('system:system_settings', 'System Settings', 'Manage system configuration', 'system', 'system', 'settings', true),
('system:audit_logs', 'Audit Logs', 'View system audit logs', 'system', 'audit', 'read', true),

-- User management
('users:create', 'Create Users', 'Create new user accounts', 'user_management', 'users', 'create', true),
('users:read', 'View Users', 'View user accounts', 'user_management', 'users', 'read', true),
('users:update', 'Update Users', 'Edit user accounts', 'user_management', 'users', 'update', true),
('users:delete', 'Delete Users', 'Delete user accounts', 'user_management', 'users', 'delete', true),
('users:manage_roles', 'Manage User Roles', 'Assign/remove user roles', 'user_management', 'user_roles', 'manage', true),

-- Role management
('roles:create', 'Create Roles', 'Create new roles', 'user_management', 'roles', 'create', true),
('roles:read', 'View Roles', 'View roles', 'user_management', 'roles', 'read', true),
('roles:update', 'Update Roles', 'Edit roles', 'user_management', 'roles', 'update', true),
('roles:delete', 'Delete Roles', 'Delete roles', 'user_management', 'roles', 'delete', true),
('roles:manage_permissions', 'Manage Role Permissions', 'Assign permissions to roles', 'user_management', 'role_permissions', 'manage', true),

-- Module management
('modules:install', 'Install Modules', 'Install new modules', 'module_management', 'modules', 'install', true),
('modules:configure', 'Configure Modules', 'Configure module settings', 'module_management', 'modules', 'configure', true),
('modules:uninstall', 'Uninstall Modules', 'Remove modules', 'module_management', 'modules', 'uninstall', true),

-- Data access (examples)
('data:read', 'Read Data', 'Read data from database', 'data_access', 'data', 'read', true),
('data:write', 'Write Data', 'Write data to database', 'data_access', 'data', 'write', true),
('data:delete', 'Delete Data', 'Delete data from database', 'data_access', 'data', 'delete', true);

-- Create system roles
INSERT INTO plataforma_rbac.roles (id, name, display_name, description, level, organization_id, is_system_role, color, icon) VALUES
('10000000-0000-0000-0000-000000000001', 'super_admin', 'Super Admin', 'System super administrator with full access', 0, '00000000-0000-0000-0000-000000000001', true, '#dc2626', 'Crown'),
('10000000-0000-0000-0000-000000000002', 'admin', 'Administrator', 'Organization administrator', 1, '00000000-0000-0000-0000-000000000001', true, '#ea580c', 'Shield'),
('10000000-0000-0000-0000-000000000003', 'manager', 'Manager', 'Department manager', 2, '00000000-0000-0000-0000-000000000001', true, '#2563eb', 'Users'),
('10000000-0000-0000-0000-000000000004', 'user', 'User', 'Standard user', 3, '00000000-0000-0000-0000-000000000001', true, '#16a34a', 'User'),
('10000000-0000-0000-0000-000000000005', 'readonly', 'Read Only', 'Read-only access', 4, '00000000-0000-0000-0000-000000000001', true, '#6b7280', 'Eye');

-- Assign all permissions to super_admin role
INSERT INTO plataforma_rbac.role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000001', id FROM plataforma_rbac.permissions;

-- Assign basic permissions to admin role
INSERT INTO plataforma_rbac.role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000002', id 
FROM plataforma_rbac.permissions 
WHERE name IN (
    'system:admin_panel', 'users:create', 'users:read', 'users:update', 
    'users:manage_roles', 'roles:read', 'modules:configure', 'data:read', 'data:write'
);

-- Assign basic permissions to user role
INSERT INTO plataforma_rbac.role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000004', id 
FROM plataforma_rbac.permissions 
WHERE name IN ('data:read');

-- Create default super admin user
INSERT INTO plataforma_rbac.users (
    id, email, name, password_hash, organization_id, is_active, created_at
) VALUES (
    '20000000-0000-0000-0000-000000000001',
    'admin@plataforma.dev',
    'Super Administrator',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewgQbVz5z0IFqhUu', -- 'admin123'
    '00000000-0000-0000-0000-000000000001',
    true,
    NOW()
);

-- Assign super_admin role to default user
INSERT INTO plataforma_rbac.user_roles (user_id, role_id, assigned_by) VALUES (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001'
);

-- =====================================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================================

-- User permissions view
CREATE VIEW plataforma_rbac.v_user_permissions AS
SELECT DISTINCT
    u.id as user_id,
    u.email,
    u.name as user_name,
    p.name as permission_name,
    p.display_name as permission_display_name,
    p.category as permission_category,
    CASE 
        WHEN up.granted IS NOT NULL THEN 
            CASE WHEN up.granted THEN 'direct_grant' ELSE 'direct_deny' END
        ELSE 'role_based'
    END as permission_source,
    COALESCE(up.granted, TRUE) as granted
FROM plataforma_rbac.users u
LEFT JOIN plataforma_rbac.user_permissions up ON up.user_id = u.id
LEFT JOIN plataforma_rbac.permissions p ON p.id = up.permission_id
WHERE u.is_active = TRUE
  AND (up.expires_at IS NULL OR up.expires_at > NOW())

UNION

SELECT DISTINCT
    u.id as user_id,
    u.email,
    u.name as user_name,
    p.name as permission_name,
    p.display_name as permission_display_name,
    p.category as permission_category,
    'role_based' as permission_source,
    TRUE as granted
FROM plataforma_rbac.users u
JOIN plataforma_rbac.user_roles ur ON ur.user_id = u.id
JOIN plataforma_rbac.roles r ON r.id = ur.role_id
JOIN plataforma_rbac.role_permissions rp ON rp.role_id = r.id
JOIN plataforma_rbac.permissions p ON p.id = rp.permission_id
WHERE u.is_active = TRUE
  AND ur.is_active = TRUE
  AND r.is_active = TRUE
  AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  AND NOT EXISTS (
      SELECT 1 FROM plataforma_rbac.user_permissions up2
      WHERE up2.user_id = u.id AND up2.permission_id = p.id
  );

-- =====================================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================================

COMMENT ON SCHEMA plataforma_rbac IS 'RBAC Enterprise system for Plataforma.dev - Complete role-based access control with hierarchical roles, permissions, organizations, and audit trail';

COMMENT ON TABLE plataforma_rbac.organizations IS 'Organizations/tenants in the system';
COMMENT ON TABLE plataforma_rbac.roles IS 'Hierarchical roles with level-based priority system';
COMMENT ON TABLE plataforma_rbac.permissions IS 'Granular permissions for system resources';
COMMENT ON TABLE plataforma_rbac.users IS 'Enhanced user accounts with security and preference settings';
COMMENT ON TABLE plataforma_rbac.user_roles IS 'Many-to-many relationship between users and roles';
COMMENT ON TABLE plataforma_rbac.role_permissions IS 'Many-to-many relationship between roles and permissions';
COMMENT ON TABLE plataforma_rbac.user_permissions IS 'Direct user permissions that override role-based permissions';
COMMENT ON TABLE plataforma_rbac.audit_log IS 'Complete audit trail of all system changes';

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ RBAC Enterprise schema created successfully!';
    RAISE NOTICE '📊 Created % tables with full RBAC support', (
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'plataforma_rbac'
    );
    RAISE NOTICE '🔐 Default super admin user: admin@plataforma.dev / admin123';
    RAISE NOTICE '🏗️  Schema ready for production use with full audit trail';
END $$;