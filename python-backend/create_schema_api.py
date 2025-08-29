#!/usr/bin/env python3
"""
Create Schema via Supabase Management API
Usa o Access Token para aplicar schema via API de gerenciamento
"""

import os
import requests
from dotenv import load_dotenv
import json

# Carrega variáveis de ambiente
load_dotenv()

def create_schema_via_api():
    """Aplica schema usando Supabase Management API"""
    print("APLICANDO SCHEMA VIA SUPABASE MANAGEMENT API")
    print("=" * 50)
    
    # Pega credenciais
    project_id = "kblvviunzleurqlskeab"
    access_token = "sbp_fd5e2eb5abc7d912bc19cbdf7c99c8e0e7c926db"  # Access token fornecido
    
    # Headers para Management API
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    print(f"Projeto: {project_id}")
    print("Usando Management API...")
    
    # SQL para criar as tabelas
    sql_statements = [
        "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";",
        
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
        
        """CREATE TABLE IF NOT EXISTS user_sessions (
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
        );""",
        
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
        
        """CREATE TABLE IF NOT EXISTS user_modules (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            module_id UUID NOT NULL,
            is_enabled BOOLEAN DEFAULT true,
            config JSONB DEFAULT '{}',
            installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, module_id)
        );""",
        
        """CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            type VARCHAR(50) DEFAULT 'info',
            is_read BOOLEAN DEFAULT false,
            read_at TIMESTAMP WITH TIME ZONE,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );""",
        
        """CREATE TABLE IF NOT EXISTS files (
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
        );""",
        
        """CREATE TABLE IF NOT EXISTS activity_logs (
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
        );""",
        
        # Dados iniciais
        """INSERT INTO roles (name, display_name, description, is_system) 
        VALUES 
            ('admin', 'Administrador', 'Acesso total ao sistema', true),
            ('user', 'Usuario', 'Usuario padrao do sistema', true),
            ('guest', 'Convidado', 'Acesso limitado', true)
        ON CONFLICT (name) DO NOTHING;""",
        
        """INSERT INTO users (email, name, role, is_active) 
        VALUES ('demo@demo.com', 'Demo User', 'admin', true)
        ON CONFLICT (email) DO NOTHING;""",
        
        """INSERT INTO modules (name, display_name, description, version, author, category, is_system) 
        VALUES 
            ('dashboard', 'Dashboard', 'Dashboard principal do sistema', '1.0.0', 'NXT Platform', 'system', true),
            ('user-management', 'Gerenciamento de Usuarios', 'Gerenciar usuarios do sistema', '1.0.0', 'NXT Platform', 'admin', true),
            ('settings', 'Configuracoes', 'Configuracoes do sistema', '1.0.0', 'NXT Platform', 'system', true)
        ON CONFLICT (name) DO NOTHING;"""
    ]
    
    # Tenta executar via Management API
    api_url = f"https://api.supabase.com/v1/projects/{project_id}/database/query"
    
    success_count = 0
    for sql in sql_statements:
        try:
            # Tenta executar o SQL
            response = requests.post(
                api_url,
                headers=headers,
                json={"query": sql}
            )
            
            if response.status_code == 200:
                success_count += 1
                print(f"OK: Comando {success_count} executado")
            else:
                print(f"Erro: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"Erro ao executar SQL: {e}")
    
    if success_count == 0:
        print("\n" + "=" * 50)
        print("Management API nao disponivel para execucao de DDL.")
        print("\nALTERNATIVA: Use o SQL Editor do Supabase")
        print("=" * 50)
        
        # Gera arquivo SQL completo
        sql_file = "schema_completo.sql"
        with open(sql_file, "w", encoding="utf-8") as f:
            f.write("-- SCHEMA COMPLETO PARA SUPABASE\n")
            f.write("-- Execute este SQL no Dashboard do Supabase\n\n")
            for sql in sql_statements:
                f.write(sql + "\n\n")
        
        print(f"\nArquivo SQL criado: {sql_file}")
        print("\nPASSOS PARA APLICAR O SCHEMA:")
        print("1. Acesse: https://supabase.com/dashboard/project/kblvviunzleurqlskeab/sql/new")
        print(f"2. Copie o conteudo do arquivo: {sql_file}")
        print("3. Cole no SQL Editor")
        print("4. Clique em 'RUN'")
        print("\nDepois execute: python simple_test.py")
    else:
        print(f"\n{success_count} comandos executados com sucesso!")
        print("Execute: python simple_test.py para verificar")

if __name__ == "__main__":
    create_schema_via_api()