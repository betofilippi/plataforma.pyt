#!/usr/bin/env python3
"""
Create Tables Directly in Supabase using Management API
"""

import os
import requests
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

def create_tables():
    """Cria tabelas diretamente via API do Supabase"""
    print("CRIANDO TABELAS NO SUPABASE")
    print("=" * 50)
    
    # Pega credenciais
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not url or not service_key:
        print("ERRO: SUPABASE_URL ou SUPABASE_SERVICE_KEY nao encontrados")
        return
    
    # Headers para API
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json"
    }
    
    # Lista de tabelas SQL para criar (uma por vez para melhor controle)
    tables = [
        # Enable UUID extension
        "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";",
        
        # Users table
        """CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255),
            avatar_url TEXT,
            role VARCHAR(50) DEFAULT 'user',
            is_active BOOLEAN DEFAULT true,
            last_login TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );""",
        
        # Roles table
        """CREATE TABLE IF NOT EXISTS roles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(50) UNIQUE NOT NULL,
            display_name VARCHAR(100) NOT NULL,
            description TEXT,
            permissions JSONB DEFAULT '[]',
            is_system BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );""",
        
        # Insert default roles
        """INSERT INTO roles (name, display_name, description, is_system) 
        VALUES 
            ('admin', 'Administrador', 'Acesso total ao sistema', true),
            ('user', 'Usuario', 'Usuario padrao do sistema', true),
            ('guest', 'Convidado', 'Acesso limitado', true)
        ON CONFLICT (name) DO NOTHING;""",
        
        # User sessions table
        """CREATE TABLE IF NOT EXISTS user_sessions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            session_token VARCHAR(255) UNIQUE NOT NULL,
            refresh_token VARCHAR(255),
            ip_address VARCHAR(45),
            user_agent TEXT,
            last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );""",
        
        # Modules table
        """CREATE TABLE IF NOT EXISTS modules (
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
        );""",
        
        # User modules table
        """CREATE TABLE IF NOT EXISTS user_modules (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
            is_enabled BOOLEAN DEFAULT true,
            config JSONB DEFAULT '{}',
            installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, module_id)
        );""",
        
        # Notifications table
        """CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            type VARCHAR(50) DEFAULT 'info',
            is_read BOOLEAN DEFAULT false,
            read_at TIMESTAMP WITH TIME ZONE,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );""",
        
        # Files table
        """CREATE TABLE IF NOT EXISTS files (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            filename VARCHAR(255) NOT NULL,
            original_name VARCHAR(255),
            mime_type VARCHAR(100),
            size BIGINT,
            path TEXT,
            bucket VARCHAR(100),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );""",
        
        # Activity logs table
        """CREATE TABLE IF NOT EXISTS activity_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(100),
            resource_id UUID,
            description TEXT,
            metadata JSONB DEFAULT '{}',
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );""",
        
        # Create indexes
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
        "CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);",
        "CREATE INDEX IF NOT EXISTS idx_user_modules_user_id ON user_modules(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);",
        
        # Insert test data
        """INSERT INTO users (email, name, role, is_active) 
        VALUES ('demo@demo.com', 'Demo User', 'admin', true)
        ON CONFLICT (email) DO NOTHING;"""
    ]
    
    print("\nINFO: O Supabase nao permite execucao direta de SQL via API REST.")
    print("Voce precisa aplicar o schema manualmente:\n")
    print("1. Acesse o SQL Editor do Supabase:")
    print("   https://supabase.com/dashboard/project/kblvviunzleurqlskeab/sql/new")
    print("\n2. Execute o SQL do arquivo 'apply_schema.py'")
    print("\n3. Ou use o Supabase CLI (necessita senha do banco):")
    print("   supabase db push --db-url postgresql://postgres:[SUA-SENHA]@db.kblvviunzleurqlskeab.supabase.co:5432/postgres")
    
    print("\n" + "=" * 50)
    print("Alternativa: Vamos testar se as tabelas ja existem...")
    
    # Testa se consegue acessar via REST API
    rest_url = f"{url}/rest/v1/users"
    response = requests.get(rest_url, headers=headers, params={"limit": 0})
    
    if response.status_code == 200:
        print("OK: Tabela 'users' encontrada!")
    else:
        print(f"AVISO: Tabela 'users' nao existe ainda.")
        print(f"Status: {response.status_code}")
        if response.text:
            print(f"Resposta: {response.text}")

if __name__ == "__main__":
    create_tables()