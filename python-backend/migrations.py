#!/usr/bin/env python3
"""
Database Migrations System
Sistema para gerenciar alterações no banco de dados
"""

import os
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv
from datetime import datetime
from urllib.parse import quote_plus
import sys

# Carrega variáveis de ambiente
load_dotenv()

class MigrationSystem:
    """Sistema de migrations para o banco Supabase"""
    
    def __init__(self):
        self.project_id = "kblvviunzleurqlskeab"
        self.db_password = os.getenv("SUPABASE_DB_PASSWORD", "Bdebola2025@")
        self.db_password_encoded = quote_plus(self.db_password)
        self.conn_string = f"postgresql://postgres:{self.db_password_encoded}@db.{self.project_id}.supabase.co:5432/postgres"
        
    def connect(self):
        """Conecta ao banco de dados"""
        return psycopg2.connect(self.conn_string)
    
    def create_migrations_table(self):
        """Cria tabela de controle de migrations"""
        try:
            conn = self.connect()
            conn.autocommit = True
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS migrations (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL,
                    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """)
            
            print("Tabela de migrations criada/verificada")
            cursor.close()
            conn.close()
            return True
        except Exception as e:
            print(f"Erro ao criar tabela de migrations: {e}")
            return False
    
    def is_migration_applied(self, name):
        """Verifica se uma migration já foi aplicada"""
        try:
            conn = self.connect()
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT COUNT(*) FROM migrations WHERE name = %s",
                (name,)
            )
            count = cursor.fetchone()[0]
            
            cursor.close()
            conn.close()
            return count > 0
        except:
            return False
    
    def apply_migration(self, name, sql_commands):
        """Aplica uma migration"""
        if self.is_migration_applied(name):
            print(f"Migration '{name}' já aplicada, pulando...")
            return True
        
        try:
            conn = self.connect()
            conn.autocommit = False
            cursor = conn.cursor()
            
            print(f"Aplicando migration: {name}")
            
            # Executa os comandos SQL
            if isinstance(sql_commands, str):
                cursor.execute(sql_commands)
            else:
                for cmd in sql_commands:
                    cursor.execute(cmd)
            
            # Registra a migration
            cursor.execute(
                "INSERT INTO migrations (name) VALUES (%s)",
                (name,)
            )
            
            conn.commit()
            print(f"Migration '{name}' aplicada com sucesso!")
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Erro ao aplicar migration '{name}': {e}")
            if conn:
                conn.rollback()
            return False
    
    def create_table(self, table_name, columns_def):
        """Helper para criar nova tabela"""
        migration_name = f"create_table_{table_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        sql = f"""
        CREATE TABLE IF NOT EXISTS {table_name} (
            {columns_def}
        );
        """
        return self.apply_migration(migration_name, sql)
    
    def add_column(self, table_name, column_name, column_type, default=None):
        """Helper para adicionar coluna"""
        migration_name = f"add_column_{table_name}_{column_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        sql = f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {column_name} {column_type}"
        if default:
            sql += f" DEFAULT {default}"
        sql += ";"
        return self.apply_migration(migration_name, sql)
    
    def create_index(self, index_name, table_name, columns):
        """Helper para criar índice"""
        migration_name = f"create_index_{index_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        columns_str = ", ".join(columns) if isinstance(columns, list) else columns
        sql = f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({columns_str});"
        return self.apply_migration(migration_name, sql)
    
    def list_tables(self):
        """Lista todas as tabelas do banco"""
        try:
            conn = self.connect()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """)
            
            tables = [row[0] for row in cursor.fetchall()]
            
            cursor.close()
            conn.close()
            return tables
            
        except Exception as e:
            print(f"Erro ao listar tabelas: {e}")
            return []
    
    def get_table_info(self, table_name):
        """Obtém informações sobre uma tabela"""
        try:
            conn = self.connect()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_name = %s
                AND table_schema = 'public'
                ORDER BY ordinal_position;
            """, (table_name,))
            
            columns = []
            for row in cursor.fetchall():
                columns.append({
                    'name': row[0],
                    'type': row[1],
                    'nullable': row[2] == 'YES',
                    'default': row[3]
                })
            
            cursor.close()
            conn.close()
            return columns
            
        except Exception as e:
            print(f"Erro ao obter info da tabela: {e}")
            return []

# Migrations pré-definidas
def apply_initial_migrations():
    """Aplica migrations iniciais necessárias"""
    migrator = MigrationSystem()
    
    # Cria tabela de controle
    if not migrator.create_migrations_table():
        return False
    
    # Exemplo de migration para adicionar campos futuros
    migrations = [
        # Adiciona campo de configuração nos módulos
        {
            'name': 'add_modules_settings_2024',
            'sql': """
                ALTER TABLE modules 
                ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
            """
        },
        # Adiciona tabela de preferências de usuário
        {
            'name': 'create_user_preferences_2024',
            'sql': """
                CREATE TABLE IF NOT EXISTS user_preferences (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    theme VARCHAR(50) DEFAULT 'light',
                    language VARCHAR(10) DEFAULT 'pt-BR',
                    notifications_enabled BOOLEAN DEFAULT true,
                    settings JSONB DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    UNIQUE(user_id)
                );
            """
        },
        # Índice para melhorar performance
        {
            'name': 'add_activity_logs_user_action_index',
            'sql': """
                CREATE INDEX IF NOT EXISTS idx_activity_logs_user_action 
                ON activity_logs(user_id, action);
            """
        }
    ]
    
    # Aplica cada migration
    for migration in migrations:
        migrator.apply_migration(migration['name'], migration['sql'])
    
    return True

def show_database_status():
    """Mostra status do banco de dados"""
    migrator = MigrationSystem()
    
    print("\n" + "=" * 50)
    print("STATUS DO BANCO DE DADOS")
    print("=" * 50)
    
    tables = migrator.list_tables()
    print(f"\nTabelas existentes ({len(tables)}):")
    for table in tables:
        print(f"  - {table}")
    
    # Mostra contagem de registros principais
    try:
        conn = migrator.connect()
        cursor = conn.cursor()
        
        print("\nContagem de registros:")
        for table in ['users', 'modules', 'roles']:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  - {table}: {count}")
        
        cursor.close()
        conn.close()
    except:
        pass
    
    print("\n" + "=" * 50)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "status":
            show_database_status()
        elif command == "migrate":
            print("Aplicando migrations...")
            if apply_initial_migrations():
                print("Migrations aplicadas com sucesso!")
                show_database_status()
            else:
                print("Erro ao aplicar migrations")
        elif command == "create-table" and len(sys.argv) > 3:
            table_name = sys.argv[2]
            columns_def = sys.argv[3]
            migrator = MigrationSystem()
            migrator.create_migrations_table()
            if migrator.create_table(table_name, columns_def):
                print(f"Tabela {table_name} criada com sucesso!")
        else:
            print("Comando não reconhecido")
            print("\nComandos disponíveis:")
            print("  python migrations.py status      - Mostra status do banco")
            print("  python migrations.py migrate     - Aplica migrations pendentes")
            print("  python migrations.py create-table <nome> <definição> - Cria nova tabela")
    else:
        # Por padrão, mostra status
        show_database_status()