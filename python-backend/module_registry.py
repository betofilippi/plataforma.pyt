#!/usr/bin/env python3
"""
Module Registry System for plataforma.app
Central registry for managing all installed modules
"""

import os
import json
import psycopg2
from psycopg2 import sql
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()

class ModuleRegistry:
    """
    Central registry for module management
    Tracks installed modules, versions, dependencies, and status
    """
    
    def __init__(self):
        self.project_id = "kblvviunzleurqlskeab"
        self.db_password = os.getenv("SUPABASE_DB_PASSWORD", "Bdebola2025@")
        self.db_password_encoded = quote_plus(self.db_password)
        self.conn_string = f"postgresql://postgres:{self.db_password_encoded}@db.{self.project_id}.supabase.co:5432/postgres"
        
        # Module directories - check parent directory if in python-backend
        current_dir = Path.cwd()
        if current_dir.name == "python-backend":
            self.modules_root = current_dir.parent / "modules"
        else:
            self.modules_root = Path("modules")
        self.official_dir = self.modules_root / "official"
        self.community_dir = self.modules_root / "community"
        
        # Registry file (local cache)
        self.registry_file = self.modules_root / "registry.json"
        
        # Ensure directories exist
        self.official_dir.mkdir(parents=True, exist_ok=True)
        self.community_dir.mkdir(parents=True, exist_ok=True)
    
    def connect(self):
        """Connect to database"""
        return psycopg2.connect(self.conn_string)
    
    def initialize_registry(self) -> bool:
        """
        Initialize the module registry system
        Creates necessary tables and directories
        """
        try:
            conn = self.connect()
            conn.autocommit = True
            cursor = conn.cursor()
            
            # Create enhanced module registry table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS public.module_registry (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(100) UNIQUE NOT NULL,
                    display_name VARCHAR(200),
                    description TEXT,
                    version VARCHAR(20) NOT NULL,
                    author VARCHAR(200),
                    email VARCHAR(255),
                    repository VARCHAR(500),
                    category VARCHAR(50),
                    tags TEXT[],
                    icon VARCHAR(100),
                    color VARCHAR(20),
                    schema_name VARCHAR(100),
                    install_path VARCHAR(500),
                    is_official BOOLEAN DEFAULT false,
                    is_active BOOLEAN DEFAULT true,
                    is_installed BOOLEAN DEFAULT false,
                    dependencies JSONB DEFAULT '{}',
                    routes JSONB DEFAULT '[]',
                    permissions TEXT[],
                    settings JSONB DEFAULT '{}',
                    features JSONB DEFAULT '{}',
                    installed_at TIMESTAMP WITH TIME ZONE,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    metadata JSONB DEFAULT '{}'
                )
            """)
            
            # Create module dependencies table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS public.module_dependencies (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    module_name VARCHAR(100) NOT NULL,
                    depends_on VARCHAR(100) NOT NULL,
                    version_constraint VARCHAR(50),
                    is_required BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    UNIQUE(module_name, depends_on)
                )
            """)
            
            # Create module installations log
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS public.module_installations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    module_name VARCHAR(100) NOT NULL,
                    version VARCHAR(20) NOT NULL,
                    action VARCHAR(20) NOT NULL, -- install, update, uninstall
                    status VARCHAR(20) NOT NULL, -- success, failed, partial
                    user_id UUID REFERENCES plataforma.users(id),
                    error_message TEXT,
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """)
            
            print("OK: Registry tables created")
            
            # Initialize local registry file
            if not self.registry_file.exists():
                self._save_local_registry({
                    "version": "1.0.0",
                    "updated_at": datetime.now().isoformat(),
                    "modules": {}
                })
                print("OK: Local registry initialized")
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"ERRO: Failed to initialize registry: {e}")
            return False
    
    def scan_modules(self) -> List[Dict[str, Any]]:
        """
        Scan local module directories and return module information
        """
        modules = []
        
        # Scan official modules
        for module_dir in self.official_dir.iterdir():
            if module_dir.is_dir():
                module_info = self._read_module_info(module_dir, is_official=True)
                if module_info:
                    modules.append(module_info)
        
        # Scan community modules
        for module_dir in self.community_dir.iterdir():
            if module_dir.is_dir():
                module_info = self._read_module_info(module_dir, is_official=False)
                if module_info:
                    modules.append(module_info)
        
        return modules
    
    def register_module(self, module_path: Path, is_official: bool = False) -> bool:
        """
        Register a module in the registry
        """
        try:
            module_info = self._read_module_info(module_path, is_official)
            if not module_info:
                print(f"ERRO: Invalid module at {module_path}")
                return False
            
            conn = self.connect()
            conn.autocommit = True
            cursor = conn.cursor()
            
            # Insert or update module in registry
            cursor.execute("""
                INSERT INTO public.module_registry (
                    name, display_name, description, version, author, email,
                    repository, category, tags, icon, color, schema_name,
                    install_path, is_official, dependencies, routes, permissions,
                    settings, features, metadata
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (name) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    description = EXCLUDED.description,
                    version = EXCLUDED.version,
                    author = EXCLUDED.author,
                    email = EXCLUDED.email,
                    repository = EXCLUDED.repository,
                    category = EXCLUDED.category,
                    tags = EXCLUDED.tags,
                    icon = EXCLUDED.icon,
                    color = EXCLUDED.color,
                    settings = EXCLUDED.settings,
                    features = EXCLUDED.features,
                    updated_at = NOW()
            """, (
                module_info['name'],
                module_info.get('display_name'),
                module_info.get('description'),
                module_info.get('version', '1.0.0'),
                module_info.get('author'),
                module_info.get('email'),
                module_info.get('repository'),
                module_info.get('category'),
                module_info.get('tags', []),
                module_info.get('icon'),
                module_info.get('color'),
                module_info.get('database', {}).get('schema'),
                str(module_path),
                is_official,
                json.dumps(module_info.get('dependencies', {})),
                json.dumps(module_info.get('routes', [])),
                module_info.get('permissions', []),
                json.dumps(module_info.get('settings', {})),
                json.dumps(module_info.get('features', {})),
                json.dumps(module_info.get('metadata', {}))
            ))
            
            print(f"OK: Module '{module_info['name']}' registered")
            
            # Update local registry
            self._update_local_registry(module_info)
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"ERRO: Failed to register module: {e}")
            return False
    
    def list_modules(self, only_installed: bool = False) -> List[Dict[str, Any]]:
        """
        List all registered modules
        """
        try:
            conn = self.connect()
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    name, display_name, description, version, author,
                    category, tags, icon, color, schema_name,
                    is_official, is_active, is_installed,
                    installed_at, updated_at
                FROM public.module_registry
            """
            
            if only_installed:
                query += " WHERE is_installed = true"
            
            query += " ORDER BY is_official DESC, name"
            
            cursor.execute(query)
            
            modules = []
            for row in cursor.fetchall():
                modules.append({
                    'name': row[0],
                    'display_name': row[1],
                    'description': row[2],
                    'version': row[3],
                    'author': row[4],
                    'category': row[5],
                    'tags': row[6],
                    'icon': row[7],
                    'color': row[8],
                    'schema': row[9],
                    'is_official': row[10],
                    'is_active': row[11],
                    'is_installed': row[12],
                    'installed_at': row[13],
                    'updated_at': row[14]
                })
            
            cursor.close()
            conn.close()
            return modules
            
        except Exception as e:
            print(f"ERRO: Failed to list modules: {e}")
            return []
    
    def get_module_info(self, module_name: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific module
        """
        try:
            conn = self.connect()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    name, display_name, description, version, author, email,
                    repository, category, tags, icon, color, schema_name,
                    install_path, is_official, is_active, is_installed,
                    dependencies, routes, permissions, settings, features,
                    installed_at, updated_at, metadata
                FROM public.module_registry
                WHERE name = %s
            """, (module_name,))
            
            row = cursor.fetchone()
            if not row:
                return None
            
            module_info = {
                'name': row[0],
                'display_name': row[1],
                'description': row[2],
                'version': row[3],
                'author': row[4],
                'email': row[5],
                'repository': row[6],
                'category': row[7],
                'tags': row[8],
                'icon': row[9],
                'color': row[10],
                'schema': row[11],
                'install_path': row[12],
                'is_official': row[13],
                'is_active': row[14],
                'is_installed': row[15],
                'dependencies': row[16],
                'routes': row[17],
                'permissions': row[18],
                'settings': row[19],
                'features': row[20],
                'installed_at': row[21],
                'updated_at': row[22],
                'metadata': row[23]
            }
            
            cursor.close()
            conn.close()
            return module_info
            
        except Exception as e:
            print(f"ERRO: Failed to get module info: {e}")
            return None
    
    def _read_module_info(self, module_path: Path, is_official: bool) -> Optional[Dict[str, Any]]:
        """
        Read module.json from a module directory
        """
        module_json = module_path / "module.json"
        if not module_json.exists():
            return None
        
        try:
            with open(module_json, 'r', encoding='utf-8') as f:
                module_info = json.load(f)
                module_info['is_official'] = is_official
                module_info['install_path'] = str(module_path)
                return module_info
        except Exception as e:
            print(f"ERRO: Failed to read {module_json}: {e}")
            return None
    
    def _save_local_registry(self, registry_data: Dict[str, Any]):
        """Save registry data to local file"""
        with open(self.registry_file, 'w', encoding='utf-8') as f:
            json.dump(registry_data, f, indent=2, ensure_ascii=False)
    
    def _load_local_registry(self) -> Dict[str, Any]:
        """Load registry data from local file"""
        if self.registry_file.exists():
            with open(self.registry_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"version": "1.0.0", "modules": {}}
    
    def _update_local_registry(self, module_info: Dict[str, Any]):
        """Update local registry with module info"""
        registry = self._load_local_registry()
        registry['modules'][module_info['name']] = {
            'version': module_info.get('version'),
            'path': module_info.get('install_path'),
            'updated_at': datetime.now().isoformat()
        }
        registry['updated_at'] = datetime.now().isoformat()
        self._save_local_registry(registry)

def main():
    """CLI for module registry management"""
    import sys
    
    registry = ModuleRegistry()
    
    if len(sys.argv) < 2:
        print("Module Registry Manager")
        print("=" * 50)
        print("\nUsage: python module_registry.py <command>")
        print("\nCommands:")
        print("  init           - Initialize registry system")
        print("  scan           - Scan for local modules")
        print("  list           - List all registered modules")
        print("  installed      - List installed modules only")
        print("  info <name>    - Get module information")
        print("  register <path> - Register a module")
        return
    
    command = sys.argv[1]
    
    if command == "init":
        if registry.initialize_registry():
            print("\nRegistry system initialized successfully!")
    
    elif command == "scan":
        modules = registry.scan_modules()
        print(f"\nFound {len(modules)} modules:")
        for mod in modules:
            status = "[OFFICIAL]" if mod.get('is_official') else "[COMMUNITY]"
            print(f"  {status} {mod['name']} v{mod.get('version', '?')} - {mod.get('description', 'No description')}")
    
    elif command == "list":
        modules = registry.list_modules()
        print(f"\nRegistered modules ({len(modules)}):")
        for mod in modules:
            status = "[OFFICIAL]" if mod['is_official'] else "[COMMUNITY]"
            installed = "[INSTALLED]" if mod['is_installed'] else "[AVAILABLE]"
            print(f"  {status} {installed} {mod['name']} v{mod['version']}")
            print(f"    {mod['description']}")
    
    elif command == "installed":
        modules = registry.list_modules(only_installed=True)
        print(f"\nInstalled modules ({len(modules)}):")
        for mod in modules:
            print(f"  - {mod['display_name']} ({mod['name']}) v{mod['version']}")
    
    elif command == "info" and len(sys.argv) > 2:
        name = sys.argv[2]
        info = registry.get_module_info(name)
        if info:
            print(f"\nModule: {info['display_name']} ({info['name']})")
            print(f"Version: {info['version']}")
            print(f"Author: {info['author']}")
            print(f"Description: {info['description']}")
            print(f"Category: {info['category']}")
            print(f"Schema: {info['schema']}")
            print(f"Official: {'Yes' if info['is_official'] else 'No'}")
            print(f"Installed: {'Yes' if info['is_installed'] else 'No'}")
            if info['tags']:
                print(f"Tags: {', '.join(info['tags'])}")
        else:
            print(f"Module '{name}' not found")
    
    elif command == "register" and len(sys.argv) > 2:
        path = Path(sys.argv[2])
        if path.exists():
            is_official = "official" in str(path)
            if registry.register_module(path, is_official):
                print("Module registered successfully!")
        else:
            print(f"Path not found: {path}")
    
    else:
        print("Invalid command or missing arguments")

if __name__ == "__main__":
    main()