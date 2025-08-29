# Module Development Guide - plataforma.app

## Module Architecture Overview

plataforma.app uses a **modular architecture** where each module:
- Has its own **isolated PostgreSQL schema**
- Contains frontend components, backend APIs, and database structure
- Can be independently developed, versioned, and deployed
- Is registered in a central registry for management

## Directory Structure

```
plataforma.pyt/
├── modules/                      # All modules live here
│   ├── official/                 # Official platform modules
│   │   └── vendas/              # Example: Sales module
│   ├── community/               # Community-contributed modules
│   └── registry.json            # Local module registry
│
├── module-template/             # Template for new modules
│   ├── frontend/               # React components
│   ├── backend/                # Python API
│   ├── database/               # SQL schemas
│   └── module.json             # Module metadata
│
└── python-backend/
    ├── module_installer.py      # Module installation tool
    └── module_registry.py       # Registry management
```

## Creating a New Module

### Step 1: Copy the Template

```bash
# Copy template to create your module
cp -r module-template modules/community/my-module
cd modules/community/my-module
```

### Step 2: Configure module.json

Edit `module.json` with your module details:

```json
{
  "name": "my_module",
  "display_name": "My Module",
  "description": "What your module does",
  "version": "1.0.0",
  "author": "Your Name",
  "email": "your@email.com",
  "category": "business|utility|integration|etc",
  "database": {
    "schema": "my_module"  // Must match module name
  }
}
```

### Step 3: Define Database Schema

Edit `database/schema.sql`:

```sql
-- All tables must be in your module's schema
CREATE TABLE IF NOT EXISTS my_module.main_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- your columns here
);

-- Can reference platform core tables
CREATE TABLE IF NOT EXISTS my_module.items (
    user_id UUID REFERENCES plataforma.users(id),
    -- your columns
);
```

**Important Rules:**
- ALWAYS use your module's schema (e.g., `my_module.table_name`)
- NEVER create tables in `public` schema
- Can reference `plataforma` schema tables (core system)
- Avoid referencing other modules' schemas

### Step 4: Create Frontend Components

In `frontend/components/`:

```tsx
// ModuleMainPage.tsx
import React from 'react';
import { Card } from '@/components/ui/card';

export const ModuleMainPage: React.FC = () => {
  return (
    <Card>
      <h1>My Module</h1>
      {/* Your UI here */}
    </Card>
  );
};
```

### Step 5: Create Backend API

In `backend/api/routes.py`:

```python
from fastapi import APIRouter

router = APIRouter(prefix="/api/modules/my-module")

@router.get("/")
async def list_items():
    # Your API logic
    return {"items": []}
```

## Installing a Module

### Method 1: Using Module Installer

```bash
cd python-backend
python module_installer.py install my_module
```

This will:
1. Create the database schema
2. Run schema.sql to create tables
3. Load initial data from seeds.sql
4. Apply permissions
5. Register in the system

### Method 2: Using Module Registry

```bash
cd python-backend

# Initialize registry (first time only)
python module_registry.py init

# Register your module
python module_registry.py register ../modules/community/my-module

# List all modules
python module_registry.py list

# Get module info
python module_registry.py info my_module
```

## Module Lifecycle

### Development Phase
1. Create module in `modules/community/`
2. Test locally with development database
3. Iterate on features

### Testing Phase
1. Write tests in `tests/` directory
2. Test database migrations
3. Verify schema isolation

### Publishing Phase
1. Push to GitHub repository
2. Register in module registry
3. Create release version

### Installation Phase
1. Users install via CLI or UI
2. Database schema created automatically
3. Module activated in platform

## Best Practices

### Database Design
- **One schema per module** - Keep everything isolated
- **Use UUIDs for IDs** - Better for distributed systems
- **Add audit fields** - created_at, updated_at, created_by
- **Create indexes** - For frequently queried columns
- **Document with comments** - Use SQL COMMENT ON

### Frontend Development
- **Use platform UI components** - From `@/components/ui/`
- **Follow design system** - Consistent look and feel
- **Lazy load components** - Better performance
- **Handle errors gracefully** - User-friendly messages

### Backend Development
- **Use FastAPI routers** - Modular API structure
- **Implement proper auth** - Check user permissions
- **Validate input data** - Use Pydantic schemas
- **Return consistent responses** - Standard error format

### Version Management
- **Semantic versioning** - MAJOR.MINOR.PATCH
- **Database migrations** - Track schema changes
- **Backward compatibility** - Don't break existing data
- **Changelog** - Document all changes

## Module Categories

- **business** - Business logic modules (sales, inventory, etc.)
- **utility** - Tools and utilities
- **integration** - Third-party integrations
- **reporting** - Analytics and reports
- **communication** - Messaging, notifications
- **admin** - Administration tools

## Module Permissions

Define permissions in module.json:

```json
"permissions": [
  "module_name:view",     // View data
  "module_name:create",   // Create records
  "module_name:edit",     // Edit records
  "module_name:delete",   // Delete records
  "module_name:admin"     // Full admin access
]
```

## GitHub Repository Structure

For publishing modules:

```
github.com/your-username/module-name/
├── README.md           # Module documentation
├── LICENSE            # License file
├── module.json        # Module metadata
├── package.json       # NPM dependencies
├── frontend/          # React components
├── backend/           # Python API
├── database/          # SQL files
├── tests/             # Test suite
└── docs/              # Additional docs
```

## Example: Complete Module

See the **vendas** module as a complete example:

```bash
modules/official/vendas/
```

This module demonstrates:
- Multiple related tables (10 tables)
- Complex relationships
- Full CRUD operations
- Business logic implementation
- Proper schema isolation

## Command Reference

### Module Installer
```bash
python module_installer.py create <name>      # Create new module
python module_installer.py install <name>     # Install module
python module_installer.py uninstall <name>   # Uninstall module
python module_installer.py list              # List installed modules
```

### Module Registry
```bash
python module_registry.py init               # Initialize registry
python module_registry.py scan               # Scan for modules
python module_registry.py register <path>    # Register module
python module_registry.py list               # List registered modules
python module_registry.py info <name>        # Module details
```

### Schema Manager
```bash
python schema_manager.py create <name>       # Create schema
python schema_manager.py list                # List schemas
python schema_manager.py info <name>         # Schema details
```

## Troubleshooting

### Module not found
- Check module is in correct directory
- Verify module.json exists and is valid
- Run registry scan to detect module

### Schema already exists
- Module may be partially installed
- Use `uninstall --remove-data` to clean
- Reinstall module

### Permission denied
- Check database user permissions
- Verify schema ownership
- Review permissions.sql

## Support

- **Documentation**: This guide
- **Examples**: Check module-template and vendas module
- **Issues**: Create issue in main repository
- **Community**: Contribute modules to community/ directory

---

**Remember**: Each module = One schema. This is the fundamental rule of our architecture!