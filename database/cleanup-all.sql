-- =====================================================
-- LIMPEZA COMPLETA DO BANCO PARA SISTEMA TEXT
-- =====================================================
-- Este script remove todas as estruturas complexas
-- e prepara o banco para o novo sistema TEXT

-- Desabilitar verificações de chaves estrangeiras temporariamente
SET session_replication_role = replica;

-- =====================================================
-- REMOVER TODOS OS SCHEMAS DOS MÓDULOS
-- =====================================================

-- Lista de schemas a serem removidos
DROP SCHEMA IF EXISTS inteligencia_artificial CASCADE;
DROP SCHEMA IF EXISTS base_de_dados CASCADE;
DROP SCHEMA IF EXISTS sistema CASCADE;
DROP SCHEMA IF EXISTS estoque CASCADE;
DROP SCHEMA IF EXISTS montagem CASCADE;
DROP SCHEMA IF EXISTS vendas CASCADE;
DROP SCHEMA IF EXISTS faturamento CASCADE;
DROP SCHEMA IF EXISTS expedicao CASCADE;
DROP SCHEMA IF EXISTS rh CASCADE;
DROP SCHEMA IF EXISTS administrativo CASCADE;
DROP SCHEMA IF EXISTS financeiro CASCADE;
DROP SCHEMA IF EXISTS juridico CASCADE;
DROP SCHEMA IF EXISTS tributario CASCADE;
DROP SCHEMA IF EXISTS suporte CASCADE;
DROP SCHEMA IF EXISTS comunicacao_app CASCADE;
DROP SCHEMA IF EXISTS marketing CASCADE;
DROP SCHEMA IF EXISTS produtos CASCADE;
DROP SCHEMA IF EXISTS lojas CASCADE;
DROP SCHEMA IF EXISTS cadastros CASCADE;
DROP SCHEMA IF EXISTS notificacoes CASCADE;

-- Outros schemas que podem existir
DROP SCHEMA IF EXISTS auth CASCADE;
DROP SCHEMA IF EXISTS realtime CASCADE;
DROP SCHEMA IF EXISTS grist CASCADE;
DROP SCHEMA IF EXISTS ai CASCADE;
DROP SCHEMA IF EXISTS database CASCADE;

-- =====================================================
-- LIMPAR TABELAS DO SCHEMA PUBLIC
-- =====================================================

-- Buscar e remover todas as tabelas do public
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- =====================================================
-- LIMPAR FUNÇÕES E TRIGGERS
-- =====================================================

-- Remover todas as funções customizadas
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.proname, n.nspname 
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname IN ('public', 'plataforma_core')
        AND p.proowner != 10  -- Não remover funções do sistema
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.nspname) || '.' || quote_ident(r.proname) || ' CASCADE';
    END LOOP;
END $$;

-- =====================================================
-- RECRIAR SCHEMA PLATAFORMA_CORE LIMPO
-- =====================================================

-- Garantir que o schema core existe e está limpo
DROP SCHEMA IF EXISTS plataforma_core CASCADE;
CREATE SCHEMA plataforma_core;

-- Adicionar comentário
COMMENT ON SCHEMA plataforma_core IS 'Schema core da plataforma - configurações e metadados do sistema';

-- =====================================================
-- TABELA PARA METADADOS DE COLUNAS (TYPE HINTS)
-- =====================================================

CREATE TABLE plataforma_core.column_metadata (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    schema_name TEXT NOT NULL DEFAULT 'public',
    table_name TEXT NOT NULL,
    column_name TEXT NOT NULL,
    type_hint TEXT NOT NULL DEFAULT 'text',
    format_options TEXT, -- JSON com opções de formatação
    validation_rules TEXT, -- JSON com regras de validação
    editor_type TEXT, -- Tipo de editor a usar
    confidence DECIMAL DEFAULT 1.0, -- Confiança na detecção automática (0-1)
    is_auto_detected BOOLEAN DEFAULT false, -- Se foi detectado automaticamente
    created_at TEXT DEFAULT CURRENT_TIMESTAMP::text,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP::text,
    created_by TEXT,
    updated_by TEXT,
    UNIQUE(schema_name, table_name, column_name)
);

-- Índices para performance
CREATE INDEX idx_column_metadata_table ON plataforma_core.column_metadata(schema_name, table_name);
CREATE INDEX idx_column_metadata_hint ON plataforma_core.column_metadata(type_hint);
CREATE INDEX idx_column_metadata_auto ON plataforma_core.column_metadata(is_auto_detected);

-- =====================================================
-- TABELA PARA CONFIGURAÇÕES DO SISTEMA
-- =====================================================

CREATE TABLE plataforma_core.system_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    category TEXT NOT NULL, -- 'table_editor', 'ui', 'performance', etc
    key TEXT NOT NULL,
    value TEXT, -- JSON ou texto simples
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP::text,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP::text,
    UNIQUE(category, key)
);

-- Configurações iniciais
INSERT INTO plataforma_core.system_settings (category, key, value, description) VALUES
('table_editor', 'default_rows_per_page', '100', 'Número padrão de linhas por página'),
('table_editor', 'enable_auto_type_detection', 'true', 'Habilitar detecção automática de tipos'),
('table_editor', 'show_type_hints', 'true', 'Mostrar dicas de tipo nas colunas'),
('ui', 'theme', 'dark', 'Tema padrão da interface'),
('performance', 'cache_metadata', 'true', 'Fazer cache dos metadados de coluna');

-- =====================================================
-- HABILITAR RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS nas tabelas core (opcional)
-- ALTER TABLE plataforma_core.column_metadata ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE plataforma_core.system_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- REABILITAR VERIFICAÇÕES
-- =====================================================

SET session_replication_role = DEFAULT;

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON TABLE plataforma_core.column_metadata IS 'Metadados de colunas para sistema de type hints';
COMMENT ON COLUMN plataforma_core.column_metadata.type_hint IS 'Tipo sugerido: text, number, currency, date, boolean, etc';
COMMENT ON COLUMN plataforma_core.column_metadata.format_options IS 'Opções de formatação em JSON';
COMMENT ON COLUMN plataforma_core.column_metadata.confidence IS 'Confiança na detecção automática (0-1)';

COMMENT ON TABLE plataforma_core.system_settings IS 'Configurações globais do sistema';

-- Verificar limpeza
SELECT 'Limpeza concluída! Schemas restantes:' as status;
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
ORDER BY schema_name;

SELECT 'Tabelas no public:' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

SELECT 'Tabelas no plataforma_core:' as status;  
SELECT tablename FROM pg_tables WHERE schemaname = 'plataforma_core';