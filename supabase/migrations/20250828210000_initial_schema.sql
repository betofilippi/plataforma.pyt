-- =========================================
-- INITIAL SCHEMA - PLATAFORMA.APP
-- =========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================
-- USERS TABLE
-- =========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Profile information
    timezone VARCHAR(100) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'pt-BR',
    theme VARCHAR(50) DEFAULT 'light',
    preferences JSONB DEFAULT '{}',
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- =========================================
-- USER ROLES & PERMISSIONS
-- =========================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    
    UNIQUE(user_id, role_id)
);

-- =========================================
-- USER SESSIONS (for session persistence)
-- =========================================
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    version VARCHAR(20) DEFAULT '1.0.0',
    current_route VARCHAR(255),
    windows_state JSONB DEFAULT '[]',
    app_state JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    
    UNIQUE(user_id, session_id)
);

-- =========================================
-- MODULES SYSTEM
-- =========================================
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,
    author VARCHAR(255),
    
    -- Module configuration
    component_type VARCHAR(100),
    icon VARCHAR(100),
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    
    -- Module status
    is_active BOOLEAN DEFAULT true,
    is_system_module BOOLEAN DEFAULT false,
    
    -- Module assets and configuration
    config JSONB DEFAULT '{}',
    assets_url TEXT,
    documentation_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    
    -- User-specific module configuration
    is_enabled BOOLEAN DEFAULT true,
    custom_config JSONB DEFAULT '{}',
    install_date TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ,
    
    UNIQUE(user_id, module_id)
);

-- =========================================
-- NOTIFICATIONS SYSTEM
-- =========================================
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type notification_type DEFAULT 'info',
    priority notification_priority DEFAULT 'normal',
    
    -- Notification behavior
    is_read BOOLEAN DEFAULT false,
    is_persistent BOOLEAN DEFAULT false,
    auto_dismiss_after INTEGER, -- seconds
    
    -- Actions and metadata
    actions JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- =========================================
-- FILE STORAGE
-- =========================================
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    
    -- File categorization
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    
    -- Access control
    is_public BOOLEAN DEFAULT false,
    access_permissions JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- ACTIVITY LOGS
-- =========================================
CREATE TYPE activity_action AS ENUM (
    'login', 'logout', 'create', 'read', 'update', 'delete',
    'upload', 'download', 'share', 'install', 'uninstall'
);

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    action activity_action NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- TRIGGERS FOR updated_at
-- =========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see/update their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Sessions policy
CREATE POLICY "Users can manage own sessions" ON user_sessions FOR ALL USING (auth.uid() = user_id);

-- Notifications policy
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Files policy
CREATE POLICY "Users can manage own files" ON files FOR ALL USING (auth.uid() = user_id);

-- Activity logs policy (read-only for users)
CREATE POLICY "Users can view own activity" ON activity_logs FOR SELECT USING (auth.uid() = user_id);

-- =========================================
-- INITIAL DATA
-- =========================================

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
    ('admin', 'System Administrator', ARRAY['*']),
    ('manager', 'Manager with extended permissions', ARRAY['users.read', 'modules.manage', 'reports.view']),
    ('user', 'Standard User', ARRAY['profile.manage', 'modules.use', 'files.manage']);

-- Insert system modules
INSERT INTO modules (name, display_name, description, version, author, component_type, icon, category, is_system_module) VALUES
    ('UserManagement', 'Gerenciamento de Usuários', 'Gerenciar usuários do sistema', '1.0.0', 'NXT Platform', 'UserManagement', 'Users', 'admin', true),
    ('DesignSystemShowcase', 'Design System Showcase', 'Showcase do design system da plataforma', '1.0.0', 'NXT Platform', 'DesignSystemShowcase', 'Palette', 'system', true),
    ('WindowTemplate', 'Template de Janelas', 'Template para criação de janelas', '1.0.0', 'NXT Platform', 'WindowTemplate', 'Layout', 'system', true);

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_activity_logs_user_created ON activity_logs(user_id, created_at);
CREATE INDEX idx_files_user_category ON files(user_id, category);

-- =========================================
-- VIEWS FOR COMMON QUERIES
-- =========================================

-- User profile with roles
CREATE VIEW user_profiles AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.first_name,
    u.last_name,
    u.avatar_url,
    u.is_active,
    u.email_verified_at,
    u.last_login_at,
    u.timezone,
    u.language,
    u.theme,
    u.preferences,
    u.created_at,
    u.updated_at,
    COALESCE(
        ARRAY_AGG(r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL),
        ARRAY[]::VARCHAR[]
    ) as roles,
    COALESCE(
        ARRAY_AGG(DISTINCT permission ORDER BY permission) FILTER (WHERE permission IS NOT NULL),
        ARRAY[]::TEXT[]
    ) as permissions
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN LATERAL UNNEST(r.permissions) AS permission ON true
GROUP BY u.id;

-- Active user sessions
CREATE VIEW active_user_sessions AS
SELECT 
    us.*,
    u.email,
    u.name
FROM user_sessions us
JOIN users u ON us.user_id = u.id
WHERE us.expires_at > NOW();

COMMENT ON TABLE users IS 'Tabela de usuários do sistema';
COMMENT ON TABLE user_sessions IS 'Sessões persistentes dos usuários com estado das janelas';
COMMENT ON TABLE modules IS 'Módulos instaláveis da plataforma';
COMMENT ON TABLE notifications IS 'Sistema de notificações em tempo real';
COMMENT ON TABLE activity_logs IS 'Logs de atividades dos usuários';