#!/usr/bin/env python3
"""
Module Installer for plataforma.app
Sistema para instalar e configurar novos módulos com schemas isolados
"""

import os
import json
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv
from datetime import datetime
from urllib.parse import quote_plus
from pathlib import Path
from typing import Dict, Any, Optional

# Carrega variáveis de ambiente
load_dotenv()

class ModuleInstaller:
    """
    Instalador de módulos com schemas isolados
    Implementa a regra: cada módulo tem seu próprio schema
    """
    
    def __init__(self):
        self.project_id = "kblvviunzleurqlskeab"
        self.db_password = os.getenv("SUPABASE_DB_PASSWORD", "Bdebola2025@")
        self.db_password_encoded = quote_plus(self.db_password)
        self.conn_string = f"postgresql://postgres:{self.db_password_encoded}@db.{self.project_id}.supabase.co:5432/postgres"
        
        # Diretório base para módulos
        self.modules_dir = Path("modules")
        if not self.modules_dir.exists():
            self.modules_dir.mkdir()
    
    def connect(self):
        """Conecta ao banco de dados"""
        return psycopg2.connect(self.conn_string)
    
    def create_module(self, module_name: str, display_name: str = None, 
                     description: str = None, author: str = "plataforma.app") -> bool:
        """
        Cria estrutura completa de um novo módulo
        
        Args:
            module_name: Nome do módulo (será o nome do schema)
            display_name: Nome de exibição
            description: Descrição do módulo
            author: Autor do módulo
        
        Returns:
            True se criado com sucesso
        """
        try:
            # Valida nome
            if not self._validate_module_name(module_name):
                print(f"ERRO: Nome de módulo inválido: {module_name}")
                return False
            
            display_name = display_name or module_name.replace('_', ' ').title()
            
            print(f"\nCriando módulo '{module_name}'...")
            
            # 1. Cria diretório do módulo
            module_path = self.modules_dir / module_name
            if module_path.exists():
                print(f"ERRO: Módulo '{module_name}' já existe")
                return False
            
            module_path.mkdir()
            print(f"OK: Diretório criado: {module_path}")
            
            # 2. Cria arquivos do módulo
            self._create_module_files(module_path, module_name, display_name, description, author)
            
            # 3. Cria schema no banco
            if not self._create_module_schema(module_name, description):
                print(f"ERRO: Erro ao criar schema")
                return False
            
            # 4. Registra módulo
            if not self._register_module(module_name, display_name, description, author):
                print(f"ERRO: Erro ao registrar módulo")
                return False
            
            print(f"\nOK: Módulo '{module_name}' criado com sucesso!")
            print(f"Localização: {module_path}")
            print(f"Schema: {module_name}")
            
            return True
            
        except Exception as e:
            print(f"ERRO: Erro ao criar módulo: {e}")
            return False
    
    def install_module(self, module_name: str) -> bool:
        """
        Instala um módulo existente no banco
        
        Args:
            module_name: Nome do módulo
        
        Returns:
            True se instalado com sucesso
        """
        try:
            module_path = self.modules_dir / module_name
            
            if not module_path.exists():
                print(f"ERRO: Módulo '{module_name}' não encontrado em {self.modules_dir}")
                return False
            
            print(f"\nInstalando módulo '{module_name}'...")
            
            # 1. Lê configuração do módulo
            config_file = module_path / "module.json"
            if not config_file.exists():
                print(f"ERRO: Arquivo module.json não encontrado")
                return False
            
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # 2. Cria schema
            if not self._create_module_schema(module_name, config.get('description')):
                return False
            
            # 3. Executa schema.sql
            schema_file = module_path / "schema.sql"
            if schema_file.exists():
                print(f"Executando schema.sql...")
                if not self._execute_sql_file(schema_file, module_name):
                    return False
            
            # 4. Executa seeds.sql (dados iniciais)
            seeds_file = module_path / "seeds.sql"
            if seeds_file.exists():
                print(f"Inserindo dados iniciais...")
                if not self._execute_sql_file(seeds_file, module_name):
                    print(f"AVISO: Erro ao inserir seeds")
            
            # 5. Executa permissions.sql
            perms_file = module_path / "permissions.sql"
            if perms_file.exists():
                print(f"Configurando permissões...")
                if not self._execute_sql_file(perms_file, module_name):
                    print(f"AVISO: Erro ao configurar permissões")
            
            # 6. Registra módulo
            self._register_module(
                module_name,
                config.get('display_name', module_name),
                config.get('description'),
                config.get('author', 'unknown')
            )
            
            print(f"\nOK: Módulo '{module_name}' instalado com sucesso!")
            return True
            
        except Exception as e:
            print(f"ERRO: Erro ao instalar módulo: {e}")
            return False
    
    def uninstall_module(self, module_name: str, keep_data: bool = True) -> bool:
        """
        Desinstala um módulo
        
        Args:
            module_name: Nome do módulo
            keep_data: Se True, mantém o schema (apenas desativa)
        
        Returns:
            True se desinstalado com sucesso
        """
        if module_name == 'plataforma':
            print(f"ERRO: Não é permitido desinstalar o módulo core 'plataforma'")
            return False
        
        try:
            conn = self.connect()
            conn.autocommit = True
            cursor = conn.cursor()
            
            print(f"\nDesinstalando módulo '{module_name}'...")
            
            if keep_data:
                # Apenas desativa o módulo
                cursor.execute("""
                    UPDATE public.module_registry 
                    SET is_active = false, 
                        updated_at = NOW()
                    WHERE schema_name = %s
                """, (module_name,))
                print(f"OK: Módulo desativado (dados preservados)")
            else:
                # Remove schema completamente
                cursor.execute(
                    sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(
                        sql.Identifier(module_name)
                    )
                )
                
                # Remove do registro
                cursor.execute("""
                    DELETE FROM public.module_registry 
                    WHERE schema_name = %s
                """, (module_name,))
                
                print(f"OK: Módulo e dados removidos completamente")
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"ERRO: Erro ao desinstalar módulo: {e}")
            return False
    
    def list_modules(self, only_active: bool = True) -> list:
        """Lista módulos instalados"""
        try:
            conn = self.connect()
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    schema_name,
                    display_name,
                    description,
                    version,
                    is_active,
                    installed_at
                FROM public.module_registry
            """
            
            if only_active:
                query += " WHERE is_active = true"
            
            query += " ORDER BY schema_name"
            
            cursor.execute(query)
            modules = []
            
            for row in cursor.fetchall():
                modules.append({
                    'schema': row[0],
                    'name': row[1],
                    'description': row[2],
                    'version': row[3],
                    'active': row[4],
                    'installed': row[5]
                })
            
            cursor.close()
            conn.close()
            return modules
            
        except Exception as e:
            print(f"Erro ao listar módulos: {e}")
            return []
    
    def _validate_module_name(self, name: str) -> bool:
        """Valida nome do módulo"""
        import re
        pattern = r'^[a-z][a-z0-9_]*$'
        reserved = ['public', 'plataforma', 'pg_catalog', 'information_schema']
        return bool(re.match(pattern, name)) and name not in reserved
    
    def _create_module_schema(self, schema_name: str, description: str = None) -> bool:
        """Cria schema do módulo"""
        try:
            conn = self.connect()
            conn.autocommit = True
            cursor = conn.cursor()
            
            # Cria schema
            cursor.execute(
                sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(
                    sql.Identifier(schema_name)
                )
            )
            
            # Adiciona comentário
            if description:
                cursor.execute(
                    sql.SQL("COMMENT ON SCHEMA {} IS %s").format(
                        sql.Identifier(schema_name)
                    ),
                    (description,)
                )
            
            print(f"OK: Schema '{schema_name}' criado")
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Erro ao criar schema: {e}")
            return False
    
    def _register_module(self, schema_name: str, display_name: str, 
                        description: str, author: str) -> bool:
        """Registra módulo na tabela de controle"""
        try:
            conn = self.connect()
            conn.autocommit = True
            cursor = conn.cursor()
            
            # Cria tabela se não existir
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS public.module_registry (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    schema_name VARCHAR(100) UNIQUE NOT NULL,
                    display_name VARCHAR(200),
                    description TEXT,
                    author VARCHAR(200),
                    version VARCHAR(20) DEFAULT '1.0.0',
                    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    is_active BOOLEAN DEFAULT true,
                    metadata JSONB DEFAULT '{}'
                )
            """)
            
            # Registra módulo
            cursor.execute("""
                INSERT INTO public.module_registry 
                (schema_name, display_name, description, author)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (schema_name) DO UPDATE
                SET display_name = EXCLUDED.display_name,
                    description = EXCLUDED.description,
                    is_active = true,
                    updated_at = NOW()
            """, (schema_name, display_name, description, author))
            
            print(f"OK: Módulo registrado")
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Erro ao registrar módulo: {e}")
            return False
    
    def _execute_sql_file(self, file_path: Path, schema_name: str) -> bool:
        """Executa arquivo SQL"""
        try:
            conn = self.connect()
            conn.autocommit = True
            cursor = conn.cursor()
            
            # Define schema padrão para a sessão
            cursor.execute(
                sql.SQL("SET search_path TO {}, public").format(
                    sql.Identifier(schema_name)
                )
            )
            
            # Lê e executa SQL
            with open(file_path, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            cursor.execute(sql_content)
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Erro ao executar {file_path.name}: {e}")
            return False
    
    def _create_module_files(self, module_path: Path, module_name: str,
                            display_name: str, description: str, author: str):
        """Cria arquivos padrão do módulo"""
        
        # module.json
        config = {
            "name": module_name,
            "display_name": display_name,
            "description": description or f"Módulo {display_name}",
            "version": "1.0.0",
            "author": author,
            "created_at": datetime.now().isoformat()
        }
        
        with open(module_path / "module.json", 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        # schema.sql
        schema_sql = f"""-- Schema SQL para módulo {module_name}
-- Criado em: {datetime.now().strftime('%Y-%m-%d %H:%M')}

-- Tabela principal do módulo
CREATE TABLE IF NOT EXISTS {module_name}.main (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES plataforma.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_{module_name}_main_user_id ON {module_name}.main(user_id);
CREATE INDEX idx_{module_name}_main_created_at ON {module_name}.main(created_at);

-- Comentário na tabela
COMMENT ON TABLE {module_name}.main IS 'Tabela principal do módulo {display_name}';
"""
        
        with open(module_path / "schema.sql", 'w', encoding='utf-8') as f:
            f.write(schema_sql)
        
        # seeds.sql
        seeds_sql = f"""-- Dados iniciais para módulo {module_name}
-- Adicione aqui INSERT statements para dados padrão

-- Exemplo:
-- INSERT INTO {module_name}.main (name, description) 
-- VALUES ('Exemplo', 'Registro de exemplo');
"""
        
        with open(module_path / "seeds.sql", 'w', encoding='utf-8') as f:
            f.write(seeds_sql)
        
        # permissions.sql
        perms_sql = f"""-- Permissões para módulo {module_name}

-- Criar role específica do módulo (opcional)
-- CREATE ROLE {module_name}_user;
-- CREATE ROLE {module_name}_admin;

-- Conceder permissões
-- GRANT USAGE ON SCHEMA {module_name} TO {module_name}_user;
-- GRANT SELECT ON ALL TABLES IN SCHEMA {module_name} TO {module_name}_user;
"""
        
        with open(module_path / "permissions.sql", 'w', encoding='utf-8') as f:
            f.write(perms_sql)
        
        # README.md
        readme = f"""# Módulo {display_name}

## Descrição
{description or 'Adicione uma descrição do módulo aqui'}

## Schema
`{module_name}`

## Tabelas
- `{module_name}.main` - Tabela principal

## Instalação
```bash
python module_installer.py install {module_name}
```

## Autor
{author}

## Criado em
{datetime.now().strftime('%d/%m/%Y')}
"""
        
        with open(module_path / "README.md", 'w', encoding='utf-8') as f:
            f.write(readme)
        
        print(f"OK: Arquivos do módulo criados")

def main():
    """CLI para gerenciar módulos"""
    import sys
    
    installer = ModuleInstaller()
    
    if len(sys.argv) < 2:
        print("Uso: python module_installer.py <comando> [argumentos]")
        print("\nComandos disponíveis:")
        print("  create <nome> [display] [descrição] - Cria novo módulo")
        print("  install <nome>                      - Instala módulo existente")
        print("  uninstall <nome> [--remove-data]    - Desinstala módulo")
        print("  list                                 - Lista módulos instalados")
        print("\nExemplos:")
        print("  python module_installer.py create vendas 'Vendas' 'Módulo de vendas'")
        print("  python module_installer.py install vendas")
        print("  python module_installer.py uninstall vendas --remove-data")
        return
    
    command = sys.argv[1]
    
    if command == "create" and len(sys.argv) >= 3:
        name = sys.argv[2]
        display = sys.argv[3] if len(sys.argv) > 3 else None
        desc = sys.argv[4] if len(sys.argv) > 4 else None
        installer.create_module(name, display, desc)
    
    elif command == "install" and len(sys.argv) >= 3:
        name = sys.argv[2]
        installer.install_module(name)
    
    elif command == "uninstall" and len(sys.argv) >= 3:
        name = sys.argv[2]
        remove_data = "--remove-data" in sys.argv
        installer.uninstall_module(name, keep_data=not remove_data)
    
    elif command == "list":
        modules = installer.list_modules()
        print("\nMÓDULOS INSTALADOS")
        print("=" * 60)
        for mod in modules:
            status = "[OK]" if mod['active'] else "[OFF]"
            print(f"\n{status} {mod['name']} ({mod['schema']})")
            print(f"   {mod['description']}")
            print(f"   Versão: {mod['version']}")
            print(f"   Instalado: {mod['installed'].strftime('%d/%m/%Y')}")
    
    else:
        print("Comando inválido ou argumentos insuficientes")

if __name__ == "__main__":
    main()