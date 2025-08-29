#!/usr/bin/env python3
"""
Setup Database Script
Conecta diretamente ao PostgreSQL do Supabase e aplica o schema
"""

import os
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv
import sys

# Carrega variáveis de ambiente
load_dotenv()

def setup_database():
    """Aplica schema diretamente no banco PostgreSQL do Supabase"""
    print("CONFIGURANDO BANCO DE DADOS SUPABASE")
    print("=" * 50)
    
    # Constrói a URL de conexão usando as credenciais do Supabase
    # Formato: postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres
    supabase_url = os.getenv("SUPABASE_URL", "")
    service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    # Extrai o project ID da URL
    project_id = "kblvviunzleurqlskeab"
    
    # Usa a senha do banco configurada
    db_password = os.getenv("SUPABASE_DB_PASSWORD", "Bdebola2025@")
    
    # URL encode da senha para caracteres especiais
    from urllib.parse import quote_plus
    db_password_encoded = quote_plus(db_password)
    
    # Constrói a connection string
    # Usando conexão direta ao banco (db.supabase.co ao invés de pooler)
    conn_string = f"postgresql://postgres:{db_password_encoded}@db.{project_id}.supabase.co:5432/postgres"
    
    print(f"Conectando ao projeto: {project_id}")
    print("Usando conexao direta na porta 5432...")
    
    try:
        # Conecta ao banco
        print("\nConectando ao banco de dados...")
        conn = psycopg2.connect(conn_string)
        conn.autocommit = True
        cursor = conn.cursor()
        print("Conexao estabelecida com sucesso!")
        
        # SQL simplificado para criar as tabelas essenciais
        schema_sql = """
        -- Enable UUID extension
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
        -- ========================================
        -- USERS TABLE (para dados adicionais dos usuarios)
        -- ========================================
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255),
            avatar_url TEXT,
            role VARCHAR(50) DEFAULT 'user',
            is_active BOOLEAN DEFAULT true,
            last_login TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- ========================================
        -- ROLES TABLE
        -- ========================================
        CREATE TABLE IF NOT EXISTS roles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(50) UNIQUE NOT NULL,
            display_name VARCHAR(100) NOT NULL,
            description TEXT,
            permissions JSONB DEFAULT '[]',
            is_system BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- ========================================
        -- USER SESSIONS TABLE
        -- ========================================
        CREATE TABLE IF NOT EXISTS user_sessions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            session_token VARCHAR(255) UNIQUE NOT NULL,
            refresh_token VARCHAR(255),
            ip_address VARCHAR(45),
            user_agent TEXT,
            last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- ========================================
        -- MODULES TABLE
        -- ========================================
        CREATE TABLE IF NOT EXISTS modules (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(100) UNIQUE NOT NULL,
            display_name VARCHAR(200) NOT NULL,
            description TEXT,
            icon VARCHAR(100),
            version VARCHAR(20) DEFAULT '1.0.0',
            author VARCHAR(200),
            category VARCHAR(50),
            route VARCHAR(200),
            permissions JSONB DEFAULT '[]',
            config JSONB DEFAULT '{}',
            is_active BOOLEAN DEFAULT true,
            is_system BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- ========================================
        -- USER MODULES TABLE
        -- ========================================
        CREATE TABLE IF NOT EXISTS user_modules (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
            is_enabled BOOLEAN DEFAULT true,
            config JSONB DEFAULT '{}',
            installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, module_id)
        );
        
        -- ========================================
        -- NOTIFICATIONS TABLE
        -- ========================================
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            type VARCHAR(50) DEFAULT 'info',
            is_read BOOLEAN DEFAULT false,
            read_at TIMESTAMP WITH TIME ZONE,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- ========================================
        -- FILES TABLE
        -- ========================================
        CREATE TABLE IF NOT EXISTS files (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            filename VARCHAR(255) NOT NULL,
            original_name VARCHAR(255),
            mime_type VARCHAR(100),
            size BIGINT,
            path TEXT,
            bucket VARCHAR(100),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- ========================================
        -- ACTIVITY LOGS TABLE
        -- ========================================
        CREATE TABLE IF NOT EXISTS activity_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID,
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(100),
            resource_id UUID,
            description TEXT,
            metadata JSONB DEFAULT '{}',
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- ========================================
        -- INDEXES
        -- ========================================
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
        CREATE INDEX IF NOT EXISTS idx_user_modules_user_id ON user_modules(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
        """
        
        # Executa o SQL
        print("\nAplicando schema...")
        cursor.execute(schema_sql)
        print("Schema aplicado com sucesso!")
        
        # Insere dados iniciais
        print("\nInserindo dados iniciais...")
        
        # Insert default roles
        cursor.execute("""
            INSERT INTO roles (name, display_name, description, is_system) 
            VALUES 
                ('admin', 'Administrador', 'Acesso total ao sistema', true),
                ('user', 'Usuario', 'Usuario padrao do sistema', true),
                ('guest', 'Convidado', 'Acesso limitado', true)
            ON CONFLICT (name) DO NOTHING;
        """)
        
        # Insert demo user
        cursor.execute("""
            INSERT INTO users (email, name, role, is_active) 
            VALUES ('demo@demo.com', 'Demo User', 'admin', true)
            ON CONFLICT (email) DO NOTHING;
        """)
        
        # Insert system modules
        cursor.execute("""
            INSERT INTO modules (name, display_name, description, version, author, category, is_system) 
            VALUES 
                ('dashboard', 'Dashboard', 'Dashboard principal do sistema', '1.0.0', 'NXT Platform', 'system', true),
                ('user-management', 'Gerenciamento de Usuarios', 'Gerenciar usuarios do sistema', '1.0.0', 'NXT Platform', 'admin', true),
                ('settings', 'Configuracoes', 'Configuracoes do sistema', '1.0.0', 'NXT Platform', 'system', true)
            ON CONFLICT (name) DO NOTHING;
        """)
        
        print("Dados iniciais inseridos!")
        
        # Verifica as tabelas criadas
        print("\nVerificando tabelas criadas...")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        print(f"\nTabelas no banco ({len(tables)} total):")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Verifica contagem de registros
        print("\nContagem de registros:")
        for table_name in ['users', 'roles', 'modules']:
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"  - {table_name}: {count} registros")
        
        # Fecha conexão
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 50)
        print("BANCO DE DADOS CONFIGURADO COM SUCESSO!")
        print("=" * 50)
        print("\nProximos passos:")
        print("1. Execute: python simple_test.py")
        print("2. Reinicie o backend: npm run backend")
        print("3. Teste a aplicacao!")
        
        return True
        
    except psycopg2.OperationalError as e:
        print(f"\nERRO DE CONEXAO: {e}")
        print("\nPossiveis causas:")
        print("1. Senha do banco incorreta")
        print("2. Projeto Supabase nao existe ou esta pausado")
        print("3. Problemas de rede")
        print("\nTente usar a senha do dashboard Supabase:")
        print("  Settings > Database > Connection string")
        return False
        
    except Exception as e:
        print(f"\nERRO: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = setup_database()
    sys.exit(0 if success else 1)