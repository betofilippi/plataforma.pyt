#!/usr/bin/env python3
"""
Schema Manager for Modular Architecture
Sistema para gerenciar schemas isolados por módulo
Regra: Cada módulo tem seu próprio schema PostgreSQL
"""

import os
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv
from datetime import datetime
from urllib.parse import quote_plus
import json
from typing import List, Dict, Optional, Any

# Carrega variáveis de ambiente
load_dotenv()

class SchemaManager:
    """
    Gerenciador de Schemas PostgreSQL
    Implementa a arquitetura de schemas isolados por módulo
    """
    
    def __init__(self):
        self.project_id = "kblvviunzleurqlskeab"
        self.db_password = os.getenv("SUPABASE_DB_PASSWORD", "Bdebola2025@")
        self.db_password_encoded = quote_plus(self.db_password)
        self.conn_string = f"postgresql://postgres:{self.db_password_encoded}@db.{self.project_id}.supabase.co:5432/postgres"
        
        # Schemas reservados do sistema
        self.system_schemas = ['public', 'pg_catalog', 'information_schema', 'pg_toast']
        
        # Schema principal da plataforma
        self.platform_schema = 'plataforma'
    
    def connect(self):
        """Conecta ao banco de dados"""
        return psycopg2.connect(self.conn_string)
    
    def create_schema(self, schema_name: str, description: str = None) -> bool:
        """
        Cria um novo schema para um módulo
        
        Args:
            schema_name: Nome do schema (nome do módulo)
            description: Descrição do módulo
        
        Returns:
            True se criado com sucesso
        """
        try:
            conn = self.connect()
            conn.autocommit = True
            cursor = conn.cursor()
            
            # Valida nome do schema
            if not self._validate_schema_name(schema_name):
                print(f"ERRO: Nome de schema inválido: {schema_name}")
                return False
            
            # Cria o schema
            cursor.execute(
                sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(
                    sql.Identifier(schema_name)
                )
            )
            print(f"Schema '{schema_name}' criado com sucesso")
            
            # Adiciona comentário com descrição
            if description:
                cursor.execute(
                    sql.SQL("COMMENT ON SCHEMA {} IS %s").format(
                        sql.Identifier(schema_name)
                    ),
                    (description,)
                )
            
            # Registra o módulo na tabela de controle
            self._register_module(cursor, schema_name, description)
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Erro ao criar schema '{schema_name}': {e}")
            return False
    
    def drop_schema(self, schema_name: str, cascade: bool = False) -> bool:
        """
        Remove um schema (cuidado: operação destrutiva)
        
        Args:
            schema_name: Nome do schema
            cascade: Se True, remove todas as tabelas do schema
        
        Returns:
            True se removido com sucesso
        """
        if schema_name in self.system_schemas or schema_name == self.platform_schema:
            print(f"ERRO: Não é permitido remover o schema '{schema_name}'")
            return False
        
        try:
            conn = self.connect()
            conn.autocommit = True
            cursor = conn.cursor()
            
            # Remove o schema
            cascade_clause = "CASCADE" if cascade else "RESTRICT"
            cursor.execute(
                sql.SQL("DROP SCHEMA IF EXISTS {} {}").format(
                    sql.Identifier(schema_name),
                    sql.SQL(cascade_clause)
                )
            )
            print(f"Schema '{schema_name}' removido com sucesso")
            
            # Remove do registro de módulos
            cursor.execute(
                "DELETE FROM public.module_registry WHERE schema_name = %s",
                (schema_name,)
            )
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Erro ao remover schema '{schema_name}': {e}")
            return False
    
    def list_schemas(self) -> List[Dict[str, Any]]:
        """
        Lista todos os schemas (módulos) do banco
        
        Returns:
            Lista de schemas com suas informações
        """
        try:
            conn = self.connect()
            cursor = conn.cursor()
            
            # Busca todos os schemas exceto os do sistema
            cursor.execute("""
                SELECT 
                    schema_name,
                    schema_owner,
                    obj_description(n.oid, 'pg_namespace') as description
                FROM information_schema.schemata s
                LEFT JOIN pg_namespace n ON n.nspname = s.schema_name
                WHERE schema_name NOT IN %s
                ORDER BY schema_name
            """, (tuple(self.system_schemas),))
            
            schemas = []
            for row in cursor.fetchall():
                schema_info = {
                    'name': row[0],
                    'owner': row[1],
                    'description': row[2] or 'Sem descrição',
                    'tables': self._get_schema_tables(cursor, row[0])
                }
                schemas.append(schema_info)
            
            cursor.close()
            conn.close()
            return schemas
            
        except Exception as e:
            print(f"Erro ao listar schemas: {e}")
            return []
    
    def create_table_in_schema(self, schema_name: str, table_name: str, 
                              columns_def: str, comment: str = None) -> bool:
        """
        Cria uma tabela em um schema específico
        
        Args:
            schema_name: Nome do schema
            table_name: Nome da tabela
            columns_def: Definição das colunas
            comment: Comentário sobre a tabela
        
        Returns:
            True se criada com sucesso
        """
        try:
            conn = self.connect()
            conn.autocommit = True
            cursor = conn.cursor()
            
            # Cria a tabela no schema especificado
            create_sql = sql.SQL("""
                CREATE TABLE IF NOT EXISTS {}.{} (
                    {}
                )
            """).format(
                sql.Identifier(schema_name),
                sql.Identifier(table_name),
                sql.SQL(columns_def)
            )
            
            cursor.execute(create_sql)
            print(f"Tabela '{schema_name}.{table_name}' criada com sucesso")
            
            # Adiciona comentário se fornecido
            if comment:
                cursor.execute(
                    sql.SQL("COMMENT ON TABLE {}.{} IS %s").format(
                        sql.Identifier(schema_name),
                        sql.Identifier(table_name)
                    ),
                    (comment,)
                )
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Erro ao criar tabela '{schema_name}.{table_name}': {e}")
            return False
    
    def get_schema_tables(self, schema_name: str) -> List[Dict[str, Any]]:
        """
        Lista todas as tabelas de um schema
        
        Args:
            schema_name: Nome do schema
        
        Returns:
            Lista de tabelas com suas informações
        """
        try:
            conn = self.connect()
            cursor = conn.cursor()
            
            tables = self._get_schema_tables(cursor, schema_name)
            
            cursor.close()
            conn.close()
            return tables
            
        except Exception as e:
            print(f"Erro ao listar tabelas do schema '{schema_name}': {e}")
            return []
    
    def _get_schema_tables(self, cursor, schema_name: str) -> List[Dict[str, Any]]:
        """Helper para obter tabelas de um schema"""
        cursor.execute("""
            SELECT 
                table_name,
                obj_description(c.oid, 'pg_class') as description,
                pg_size_pretty(pg_total_relation_size(c.oid)) as size,
                n_live_tup as row_count
            FROM information_schema.tables t
            LEFT JOIN pg_class c ON c.relname = t.table_name
            LEFT JOIN pg_stat_user_tables s ON s.schemaname = t.table_schema 
                AND s.relname = t.table_name
            WHERE t.table_schema = %s
                AND t.table_type = 'BASE TABLE'
            ORDER BY table_name
        """, (schema_name,))
        
        tables = []
        for row in cursor.fetchall():
            tables.append({
                'name': row[0],
                'description': row[1] or '',
                'size': row[2] or '0 bytes',
                'rows': row[3] or 0
            })
        return tables
    
    def _validate_schema_name(self, name: str) -> bool:
        """Valida nome do schema"""
        import re
        # Permite apenas letras minúsculas, números e underscore
        pattern = r'^[a-z][a-z0-9_]*$'
        return bool(re.match(pattern, name)) and name not in self.system_schemas
    
    def _register_module(self, cursor, schema_name: str, description: str = None):
        """Registra módulo na tabela de controle"""
        # Cria tabela de registro se não existir
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS public.module_registry (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                schema_name VARCHAR(100) UNIQUE NOT NULL,
                display_name VARCHAR(200),
                description TEXT,
                version VARCHAR(20) DEFAULT '1.0.0',
                installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                is_active BOOLEAN DEFAULT true,
                metadata JSONB DEFAULT '{}'
            )
        """)
        
        # Registra o módulo
        cursor.execute("""
            INSERT INTO public.module_registry (schema_name, display_name, description)
            VALUES (%s, %s, %s)
            ON CONFLICT (schema_name) DO UPDATE
            SET description = EXCLUDED.description,
                is_active = true
        """, (schema_name, schema_name.replace('_', ' ').title(), description))
    
    def setup_platform_schema(self) -> bool:
        """
        Configura o schema principal da plataforma
        Move tabelas existentes do public para o schema plataforma
        """
        try:
            conn = self.connect()
            conn.autocommit = True
            cursor = conn.cursor()
            
            # Cria schema plataforma
            cursor.execute(
                sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(
                    sql.Identifier(self.platform_schema)
                )
            )
            
            cursor.execute(
                sql.SQL("COMMENT ON SCHEMA {} IS %s").format(
                    sql.Identifier(self.platform_schema)
                ),
                ("Schema principal do sistema plataforma.app - Componentes core",)
            )
            
            print(f"Schema '{self.platform_schema}' configurado")
            
            # Lista de tabelas core para mover
            core_tables = [
                'users', 'roles', 'user_sessions', 'notifications',
                'activity_logs', 'files', 'user_preferences',
                'user_modules', 'modules'
            ]
            
            # Move tabelas para schema plataforma (se existirem no public)
            for table in core_tables:
                try:
                    cursor.execute(
                        sql.SQL("ALTER TABLE IF EXISTS public.{} SET SCHEMA {}").format(
                            sql.Identifier(table),
                            sql.Identifier(self.platform_schema)
                        )
                    )
                    print(f"  Tabela '{table}' movida para schema '{self.platform_schema}'")
                except Exception as e:
                    print(f"  Aviso: Não foi possível mover '{table}': {e}")
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Erro ao configurar schema plataforma: {e}")
            return False
    
    def get_schema_info(self, schema_name: str) -> Dict[str, Any]:
        """
        Obtém informações detalhadas sobre um schema
        
        Args:
            schema_name: Nome do schema
        
        Returns:
            Dicionário com informações do schema
        """
        try:
            conn = self.connect()
            cursor = conn.cursor()
            
            # Informações básicas do schema
            cursor.execute("""
                SELECT 
                    n.nspname as schema_name,
                    pg_catalog.pg_get_userbyid(n.nspowner) as owner,
                    obj_description(n.oid, 'pg_namespace') as description,
                    pg_size_pretty(sum(pg_total_relation_size(c.oid))::bigint) as total_size
                FROM pg_namespace n
                LEFT JOIN pg_class c ON c.relnamespace = n.oid
                WHERE n.nspname = %s
                GROUP BY n.nspname, n.nspowner, n.oid
            """, (schema_name,))
            
            row = cursor.fetchone()
            if not row:
                return {}
            
            info = {
                'name': row[0],
                'owner': row[1],
                'description': row[2] or 'Sem descrição',
                'total_size': row[3] or '0 bytes',
                'tables': self._get_schema_tables(cursor, schema_name),
                'table_count': len(self._get_schema_tables(cursor, schema_name))
            }
            
            cursor.close()
            conn.close()
            return info
            
        except Exception as e:
            print(f"Erro ao obter info do schema '{schema_name}': {e}")
            return {}

def main():
    """CLI para gerenciar schemas"""
    import sys
    
    manager = SchemaManager()
    
    if len(sys.argv) < 2:
        print("Uso: python schema_manager.py <comando> [argumentos]")
        print("\nComandos disponíveis:")
        print("  list                           - Lista todos os schemas")
        print("  create <nome> [descrição]      - Cria novo schema")
        print("  drop <nome> [--cascade]        - Remove schema")
        print("  info <nome>                    - Informações do schema")
        print("  tables <schema>                - Lista tabelas do schema")
        print("  create-table <schema.tabela> <colunas> - Cria tabela em schema")
        print("  setup-platform                 - Configura schema plataforma")
        return
    
    command = sys.argv[1]
    
    if command == "list":
        schemas = manager.list_schemas()
        print("\n" + "=" * 60)
        print("SCHEMAS (MÓDULOS) NO BANCO")
        print("=" * 60)
        for schema in schemas:
            print(f"\n[SCHEMA] {schema['name']}")
            print(f"   Descrição: {schema['description']}")
            print(f"   Tabelas: {len(schema['tables'])}")
            if schema['tables']:
                for table in schema['tables'][:3]:
                    print(f"     - {table['name']} ({table['rows']} rows)")
                if len(schema['tables']) > 3:
                    print(f"     ... e mais {len(schema['tables']) - 3} tabelas")
    
    elif command == "create" and len(sys.argv) >= 3:
        name = sys.argv[2]
        description = sys.argv[3] if len(sys.argv) > 3 else None
        if manager.create_schema(name, description):
            print(f"OK: Schema '{name}' criado com sucesso!")
    
    elif command == "drop" and len(sys.argv) >= 3:
        name = sys.argv[2]
        cascade = "--cascade" in sys.argv
        if manager.drop_schema(name, cascade):
            print(f"OK: Schema '{name}' removido!")
    
    elif command == "info" and len(sys.argv) >= 3:
        name = sys.argv[2]
        info = manager.get_schema_info(name)
        if info:
            print(f"\n[INFO] INFORMAÇÕES DO SCHEMA '{name}'")
            print("=" * 50)
            print(f"Owner: {info['owner']}")
            print(f"Descrição: {info['description']}")
            print(f"Tamanho total: {info['total_size']}")
            print(f"Tabelas: {info['table_count']}")
            if info['tables']:
                print("\nTabelas:")
                for table in info['tables']:
                    print(f"  - {table['name']} ({table['rows']} rows, {table['size']})")
    
    elif command == "tables" and len(sys.argv) >= 3:
        schema = sys.argv[2]
        tables = manager.get_schema_tables(schema)
        print(f"\nTabelas no schema '{schema}':")
        for table in tables:
            print(f"  - {table['name']} ({table['rows']} rows)")
    
    elif command == "create-table" and len(sys.argv) >= 4:
        full_name = sys.argv[2]
        if '.' in full_name:
            schema, table = full_name.split('.', 1)
            columns = sys.argv[3]
            comment = sys.argv[4] if len(sys.argv) > 4 else None
            if manager.create_table_in_schema(schema, table, columns, comment):
                print(f"OK: Tabela '{full_name}' criada!")
        else:
            print("Erro: Use formato schema.tabela")
    
    elif command == "setup-platform":
        if manager.setup_platform_schema():
            print("OK: Schema plataforma configurado!")
    
    else:
        print("Comando inválido ou argumentos insuficientes")

if __name__ == "__main__":
    main()