-- ===== SCHEMA PARA SISTEMA DE NOTIFICAÇÕES =====
-- Este arquivo contém todas as tabelas necessárias para o sistema de notificações

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===== TABELA PRINCIPAL DE NOTIFICAÇÕES =====
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'critical')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  category VARCHAR(20) NOT NULL CHECK (category IN ('system', 'module', 'security', 'workflow', 'user')),
  module_name VARCHAR(100),
  source_id VARCHAR(255),
  source_type VARCHAR(100),
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_archived ON notifications(archived);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_module ON notifications(module_name);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_archived ON notifications(user_id, archived);

-- Índice composto para consultas comuns
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, read, archived, created_at DESC);

-- Índice para busca de texto
CREATE INDEX IF NOT EXISTS idx_notifications_search ON notifications USING GIN (
  to_tsvector('portuguese', title || ' ' || message)
);

-- ===== TABELA DE TEMPLATES DE NOTIFICAÇÃO =====
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'critical')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  category VARCHAR(20) NOT NULL CHECK (category IN ('system', 'module', 'security', 'workflow', 'user')),
  module_name VARCHAR(100),
  variables TEXT[], -- Array de variáveis que podem ser substituídas
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notification_templates_name ON notification_templates(name);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON notification_templates(category);

-- ===== TABELA DE PREFERÊNCIAS DE USUÁRIO =====
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('system', 'module', 'security', 'workflow', 'user')),
  module_name VARCHAR(100),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  desktop_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Única combinação por usuário/categoria/módulo
  UNIQUE(user_id, category, module_name)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_category ON notification_preferences(category);

-- ===== TABELA DE CANAIS DE NOTIFICAÇÃO =====
CREATE TABLE IF NOT EXISTS notification_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'push', 'webhook', 'sms')),
  endpoint VARCHAR(500) NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notification_channels_user ON notification_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_channels_type ON notification_channels(type);
CREATE INDEX IF NOT EXISTS idx_notification_channels_active ON notification_channels(is_active);

-- ===== TRIGGERS PARA UPDATED_AT =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_channels_updated_at BEFORE UPDATE ON notification_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== TRIGGERS PARA AUTO-MARCAR READ_AT E ARCHIVED_AT =====
CREATE OR REPLACE FUNCTION set_notification_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Se read mudou de false para true, definir read_at
  IF OLD.read = FALSE AND NEW.read = TRUE AND NEW.read_at IS NULL THEN
    NEW.read_at = NOW();
  END IF;
  
  -- Se archived mudou de false para true, definir archived_at
  IF OLD.archived = FALSE AND NEW.archived = TRUE AND NEW.archived_at IS NULL THEN
    NEW.archived_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_notification_timestamps_trigger BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION set_notification_timestamps();

-- ===== FUNÇÕES AUXILIARES =====

-- Função para limpar notificações expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para limpar notificações antigas
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_old;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas de usuário
CREATE OR REPLACE FUNCTION get_user_notification_stats(p_user_id VARCHAR(255))
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user_id', p_user_id,
    'total', COALESCE(total_stats.total, 0),
    'unread', COALESCE(unread_stats.unread, 0),
    'by_type', COALESCE(type_stats.by_type, '{}'),
    'by_category', COALESCE(category_stats.by_category, '{}'),
    'by_priority', COALESCE(priority_stats.by_priority, '{}'),
    'recent_activity', COALESCE(activity_stats.recent_activity, NOW())
  ) INTO result
  FROM (
    SELECT COUNT(*) as total
    FROM notifications 
    WHERE user_id = p_user_id 
      AND archived = FALSE 
      AND (expires_at IS NULL OR expires_at > NOW())
  ) total_stats
  CROSS JOIN (
    SELECT COUNT(*) as unread
    FROM notifications 
    WHERE user_id = p_user_id 
      AND read = FALSE 
      AND archived = FALSE 
      AND (expires_at IS NULL OR expires_at > NOW())
  ) unread_stats
  CROSS JOIN (
    SELECT json_object_agg(type, type_count) as by_type
    FROM (
      SELECT type, COUNT(*) as type_count
      FROM notifications 
      WHERE user_id = p_user_id 
        AND archived = FALSE 
        AND (expires_at IS NULL OR expires_at > NOW())
      GROUP BY type
    ) type_counts
  ) type_stats
  CROSS JOIN (
    SELECT json_object_agg(category, category_count) as by_category
    FROM (
      SELECT category, COUNT(*) as category_count
      FROM notifications 
      WHERE user_id = p_user_id 
        AND archived = FALSE 
        AND (expires_at IS NULL OR expires_at > NOW())
      GROUP BY category
    ) category_counts
  ) category_stats
  CROSS JOIN (
    SELECT json_object_agg(priority, priority_count) as by_priority
    FROM (
      SELECT priority, COUNT(*) as priority_count
      FROM notifications 
      WHERE user_id = p_user_id 
        AND archived = FALSE 
        AND (expires_at IS NULL OR expires_at > NOW())
      GROUP BY priority
    ) priority_counts
  ) priority_stats
  CROSS JOIN (
    SELECT MAX(created_at) as recent_activity
    FROM notifications 
    WHERE user_id = p_user_id
  ) activity_stats;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ===== TEMPLATES PADRÃO DE NOTIFICAÇÃO =====
INSERT INTO notification_templates (name, title, message, type, priority, category, variables) VALUES
-- Sistema
('system_backup_success', 'Backup Concluído', 'Backup {{type}} foi concluído com sucesso em {{duration}}.', 'success', 'normal', 'system', ARRAY['type', 'duration']),
('system_backup_failed', 'Falha no Backup', 'Backup {{type}} falhou. Erro: {{error}}', 'error', 'high', 'system', ARRAY['type', 'error']),
('system_update_available', 'Atualização Disponível', 'Nova versão {{version}} está disponível para {{component}}.', 'info', 'normal', 'system', ARRAY['version', 'component']),
('system_maintenance', 'Manutenção Programada', 'Manutenção do sistema programada para {{date}} às {{time}}.', 'warning', 'normal', 'system', ARRAY['date', 'time']),
('system_disk_space_low', 'Espaço em Disco Baixo', 'Espaço em disco em {{path}} está em {{usage}}%. Limite crítico atingido.', 'warning', 'high', 'system', ARRAY['path', 'usage']),

-- Segurança
('security_login_attempt', 'Tentativa de Login', 'Nova tentativa de login de {{ip}} para usuário {{username}}.', 'warning', 'high', 'security', ARRAY['ip', 'username']),
('security_password_changed', 'Senha Alterada', 'Senha foi alterada com sucesso para {{username}}.', 'success', 'normal', 'security', ARRAY['username']),
('security_suspicious_activity', 'Atividade Suspeita', 'Atividade suspeita detectada: {{description}}', 'error', 'critical', 'security', ARRAY['description']),
('security_account_locked', 'Conta Bloqueada', 'Conta {{username}} foi bloqueada devido a múltiplas tentativas de login falhadas.', 'error', 'high', 'security', ARRAY['username']),

-- Usuários
('user_welcome', 'Bem-vindo!', 'Bem-vindo ao sistema, {{name}}! Sua conta foi criada com sucesso.', 'success', 'normal', 'user', ARRAY['name']),
('user_profile_updated', 'Perfil Atualizado', 'Seu perfil foi atualizado com sucesso.', 'success', 'normal', 'user', ARRAY[]),
('user_password_reset', 'Redefinição de Senha', 'Um link para redefinir sua senha foi enviado para {{email}}.', 'info', 'normal', 'user', ARRAY['email']),

-- Workflow
('workflow_completed', 'Workflow Concluído', 'Workflow {{name}} foi concluído com sucesso.', 'success', 'normal', 'workflow', ARRAY['name']),
('workflow_failed', 'Workflow Falhou', 'Workflow {{name}} falhou na etapa {{step}}. Erro: {{error}}', 'error', 'high', 'workflow', ARRAY['name', 'step', 'error']),
('workflow_approval_needed', 'Aprovação Necessária', 'Workflow {{name}} precisa de aprovação na etapa {{step}}.', 'info', 'normal', 'workflow', ARRAY['name', 'step']),

-- Módulos
('module_installed', 'Módulo Instalado', 'Módulo {{name}} foi instalado com sucesso.', 'success', 'normal', 'module', ARRAY['name']),
('module_updated', 'Módulo Atualizado', 'Módulo {{name}} foi atualizado para versão {{version}}.', 'success', 'normal', 'module', ARRAY['name', 'version']),
('module_error', 'Erro no Módulo', 'Módulo {{name}} encontrou um erro: {{error}}', 'error', 'high', 'module', ARRAY['name', 'error']),
('module_disabled', 'Módulo Desabilitado', 'Módulo {{name}} foi desabilitado devido a {{reason}}.', 'warning', 'normal', 'module', ARRAY['name', 'reason'])

ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  message = EXCLUDED.message,
  type = EXCLUDED.type,
  priority = EXCLUDED.priority,
  category = EXCLUDED.category,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- ===== COMENTÁRIOS PARA DOCUMENTAÇÃO =====
COMMENT ON TABLE notifications IS 'Tabela principal de notificações do sistema';
COMMENT ON TABLE notification_templates IS 'Templates reutilizáveis para criação de notificações';
COMMENT ON TABLE notification_preferences IS 'Preferências de notificação por usuário e categoria';
COMMENT ON TABLE notification_channels IS 'Canais de entrega de notificações (email, push, etc.)';

COMMENT ON COLUMN notifications.type IS 'Tipo visual da notificação (info, success, warning, error, critical)';
COMMENT ON COLUMN notifications.priority IS 'Prioridade da notificação (low, normal, high, critical)';
COMMENT ON COLUMN notifications.category IS 'Categoria funcional (system, module, security, workflow, user)';
COMMENT ON COLUMN notifications.data IS 'Dados adicionais da notificação em formato JSON';
COMMENT ON COLUMN notifications.expires_at IS 'Data de expiração da notificação (opcional)';

-- ===== PERMISSÕES =====
-- Ajustar conforme o usuário da aplicação
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;