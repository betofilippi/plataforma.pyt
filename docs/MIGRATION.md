# Migration Guide

Complete guide for migrating from the monolithic Plataforma.dev v1 to the new distributed OS architecture in v2.

## 📋 Table of Contents

- [Migration Overview](#migration-overview)
- [Breaking Changes](#breaking-changes)
- [Pre-Migration Checklist](#pre-migration-checklist)
- [Migration Steps](#migration-steps)
- [Module Migration](#module-migration)
- [Database Migration](#database-migration)
- [Configuration Updates](#configuration-updates)
- [Testing Migration](#testing-migration)
- [Rollback Plan](#rollback-plan)
- [Post-Migration](#post-migration)

## 🎯 Migration Overview

Plataforma.dev v2 represents a fundamental architectural shift from a monolithic application to a distributed operating system. This migration provides:

### Benefits of Migration
- **Improved Scalability**: Independent module scaling
- **Better Performance**: Optimized module loading and caching
- **Enhanced Security**: Isolated module execution environments
- **Developer Experience**: Modern development tools and APIs
- **Future-Proof Architecture**: Ready for cloud-native deployment

### Migration Scope
- **Application Architecture**: Monolithic → Distributed OS
- **Module System**: Integrated → Independent packages
- **Database**: Single schema → Multi-schema with isolation
- **Authentication**: Session-based → JWT + modern auth
- **UI Framework**: Legacy components → Glassmorphism design system
- **Build System**: Webpack → Vite with module federation

## 💥 Breaking Changes

### API Changes

#### Authentication
```typescript
// ❌ v1 - Session-based
app.get('/api/user', requireAuth, (req, res) => {
  res.json(req.user);
});

// ✅ v2 - JWT-based
app.get('/api/users/me', authenticateJWT, (req, res) => {
  res.json(req.user);
});
```

#### Database Access
```typescript
// ❌ v1 - Direct database access
const users = await db.query('SELECT * FROM users');

// ✅ v2 - Platform API
const users = await platform.database.query({
  table: 'users',
  schema: 'public'
});
```

#### Module Registration
```typescript
// ❌ v1 - Static imports
import VendasModule from './modules/vendas';

// ✅ v2 - Dynamic module system
const vendasModule = await platform.modules.load('vendas-module');
```

### UI Component Changes

#### Component Structure
```tsx
// ❌ v1 - Legacy components
import { Card, Button } from './components/ui';

<Card title="My Module">
  <Button variant="primary">Action</Button>
</Card>

// ✅ v2 - Design system
import { WindowCard, WindowButton } from '@plataforma/design-system';

<WindowCard title="My Module">
  <WindowButton variant="primary">Action</WindowButton>
</WindowCard>
```

#### Styling System
```css
/* ❌ v1 - Custom CSS */
.module-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* ✅ v2 - Design tokens */
.module-card {
  @apply bg-white/5 backdrop-blur-xl border border-white/10;
}
```

### Configuration Changes

#### Environment Variables
```bash
# ❌ v1
DATABASE_URL=postgresql://...
SESSION_SECRET=secret
REDIS_URL=redis://...

# ✅ v2
DATABASE_URL=postgresql://...
JWT_SECRET=secret  # Renamed
REDIS_URL=redis://...
SUPABASE_URL=https://...  # Added
SUPABASE_ANON_KEY=...     # Added
```

#### Module Configuration
```json
// ❌ v1 - module.config.js
module.exports = {
  name: 'vendas',
  routes: ['./routes'],
  database: true
};

// ✅ v2 - module.json
{
  "id": "vendas-module",
  "name": "Sales Management",
  "version": "2.0.0",
  "permissions": {
    "required": ["sales.read", "sales.write"]
  },
  "dependencies": {
    "modules": ["auth-system"]
  }
}
```

## ✅ Pre-Migration Checklist

### Environment Preparation
- [ ] **Node.js Version**: Ensure Node.js 18+ is installed
- [ ] **Database Backup**: Create full backup of existing database
- [ ] **Environment Variables**: Document all current environment variables
- [ ] **Dependencies**: List all current package dependencies
- [ ] **Custom Code**: Identify all custom modules and integrations

### Infrastructure Readiness
- [ ] **Supabase Account**: Set up Supabase project for new database
- [ ] **Storage Setup**: Configure object storage (Supabase Storage or S3)
- [ ] **CDN Configuration**: Set up CDN for static assets
- [ ] **Monitoring**: Prepare monitoring and logging systems
- [ ] **SSL Certificates**: Ensure valid SSL certificates

### Development Environment
- [ ] **New Repository**: Clone v2 repository
- [ ] **Build Tools**: Install new build system (Vite)
- [ ] **SDK Installation**: Install `@plataforma/sdk`
- [ ] **Testing Environment**: Set up testing infrastructure
- [ ] **CI/CD Pipeline**: Update deployment pipeline

### Data Assessment
- [ ] **Schema Analysis**: Document current database schema
- [ ] **Data Volume**: Assess data migration requirements
- [ ] **Custom Tables**: Identify custom tables and relationships
- [ ] **File Assets**: Catalog all uploaded files and assets
- [ ] **User Data**: Plan user account migration strategy

## 🚀 Migration Steps

### Phase 1: Environment Setup (Week 1)

#### Step 1: Install New Platform
```bash
# Clone v2 repository
git clone https://github.com/betofilippi/plataforma.dev.git plataforma-v2
cd plataforma-v2

# Install dependencies
npm install

# Install SDK globally
npm install -g @plataforma/sdk
```

#### Step 2: Configure Environment
```bash
# Copy environment template
cp .env.example .env.migration

# Configure database connection
DATABASE_URL=postgresql://user:pass@host:5432/plataforma_v2

# Set up Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Configure JWT
JWT_SECRET=your-new-jwt-secret-min-32-chars
JWT_EXPIRES_IN=24h
```

#### Step 3: Database Setup
```sql
-- Create new database for v2
CREATE DATABASE plataforma_v2;

-- Set up multi-schema structure
CREATE SCHEMA auth;
CREATE SCHEMA vendas;
CREATE SCHEMA financeiro;
CREATE SCHEMA estoque;
-- ... other modules

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Phase 2: Data Migration (Week 2)

#### Step 1: Export V1 Data
```bash
# Export v1 database
pg_dump plataforma_v1 > v1_backup.sql

# Export user files
tar -czf v1_files.tar.gz /path/to/v1/uploads
```

#### Step 2: Transform Data Structure
Create migration scripts for each module:

```javascript
// scripts/migrate-users.js
const { createClient } = require('@supabase/supabase-js');

async function migrateUsers() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Read v1 users
  const v1Users = await readV1Users();
  
  // Transform to v2 format
  for (const user of v1Users) {
    const v2User = {
      id: user.id,
      email: user.email,
      name: user.name,
      // Hash passwords with new algorithm
      password: await hashPasswordV2(user.password),
      roles: transformRoles(user.roles),
      created_at: user.created_at,
      updated_at: new Date().toISOString()
    };
    
    await supabase.from('users').insert(v2User);
  }
}
```

#### Step 3: Migrate Module Data
```javascript
// scripts/migrate-vendas.js
async function migrateVendasData() {
  const v1Data = await queryV1Database(`
    SELECT * FROM vendas_clientes, vendas_pedidos, vendas_produtos
  `);
  
  // Transform and insert into v2 schema
  await insertIntoV2Schema('vendas', transformedData);
}
```

### Phase 3: Module Migration (Week 3-4)

#### Step 1: Create Module Packages
```bash
# Create each module as separate package
plataforma create vendas-module --template business
plataforma create financeiro-module --template business
plataforma create estoque-module --template business
```

#### Step 2: Migrate Module Code
Convert v1 modules to v2 structure:

```typescript
// v1 module structure
// modules/vendas/index.js
module.exports = {
  routes: require('./routes'),
  models: require('./models'),
  views: require('./views')
};

// v2 module structure
// vendas-module/src/index.ts
import { ModuleDefinition } from '@plataforma/sdk';
import VendasComponent from './components/VendasComponent';

const vendasModule: ModuleDefinition = {
  id: 'vendas-module',
  name: 'Sales Management',
  version: '2.0.0',
  component: VendasComponent,
  
  async onActivate(platform) {
    // Initialize module
  },
  
  api: {
    getCustomers: async () => {
      // Implementation
    },
    createSale: async (saleData) => {
      // Implementation
    }
  }
};

export default vendasModule;
```

#### Step 3: Update Component Code
```tsx
// Convert v1 React components to v2 design system
// v1 component
function CustomerList({ customers }) {
  return (
    <div className="customer-list">
      <h2>Customers</h2>
      {customers.map(customer => (
        <div key={customer.id} className="customer-card">
          <h3>{customer.name}</h3>
          <p>{customer.email}</p>
        </div>
      ))}
    </div>
  );
}

// v2 component with design system
import { WindowCard } from '@plataforma/design-system';
import { usePlatform } from '@plataforma/sdk';

function CustomerList() {
  const platform = usePlatform();
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const result = await platform.database.query({
      table: 'customers',
      schema: 'vendas'
    });
    setCustomers(result.data);
  };

  return (
    <WindowCard title="Customers">
      <div className="space-y-4">
        {customers.map(customer => (
          <div key={customer.id} className="bg-white/5 p-4 rounded-lg">
            <h3 className="text-white font-medium">{customer.name}</h3>
            <p className="text-white/70">{customer.email}</p>
          </div>
        ))}
      </div>
    </WindowCard>
  );
}
```

### Phase 4: Testing & Validation (Week 5)

#### Step 1: Unit Testing
```bash
# Test each migrated module
cd vendas-module
npm test

cd ../financeiro-module  
npm test
```

#### Step 2: Integration Testing
```typescript
// Test module integration
describe('Module Migration Integration', () => {
  test('vendas module loads correctly', async () => {
    const platform = createTestPlatform();
    const module = await platform.modules.load('vendas-module');
    
    expect(module.isActive).toBe(true);
    expect(module.api.getCustomers).toBeDefined();
  });
  
  test('data migration successful', async () => {
    const customers = await platform.database.query({
      table: 'customers',
      schema: 'vendas'
    });
    
    expect(customers.length).toBeGreaterThan(0);
    expect(customers[0]).toHaveProperty('id');
    expect(customers[0]).toHaveProperty('name');
  });
});
```

#### Step 3: User Acceptance Testing
Create test scenarios for each migrated feature:

```markdown
## Test Scenario: Customer Management

### Prerequisites
- User has admin role
- Sample customer data is loaded

### Test Steps
1. Login to v2 platform
2. Open Sales module
3. Navigate to Customers section
4. Verify customer list displays
5. Create new customer
6. Edit existing customer
7. Delete customer (if permitted)

### Expected Results
- All customers from v1 are visible
- CRUD operations work correctly
- Permissions are enforced
- Real-time updates work
```

### Phase 5: Production Migration (Week 6)

#### Step 1: Maintenance Mode
```bash
# Put v1 in maintenance mode
echo "maintenance" > /var/www/plataforma-v1/maintenance.flag

# Display maintenance page
# (configure web server to show maintenance page)
```

#### Step 2: Final Data Sync
```bash
# Export final v1 data
pg_dump --data-only plataforma_v1 > final_v1_data.sql

# Import incremental changes to v2
node scripts/sync-incremental-data.js
```

#### Step 3: Switch DNS/Load Balancer
```bash
# Update DNS to point to v2
# Or configure load balancer to route to v2

# Monitor for issues
tail -f /var/log/plataforma-v2/application.log
```

#### Step 4: Verify Production
```bash
# Run production health checks
curl https://plataforma.example.com/health
curl https://plataforma.example.com/api/health

# Test critical user flows
npm run test:smoke
```

## 🧪 Testing Migration

### Automated Testing

#### Module Loading Test
```typescript
describe('Module Migration Tests', () => {
  test('all v1 modules load in v2', async () => {
    const v1Modules = ['vendas', 'financeiro', 'estoque', 'rh'];
    const platform = createTestPlatform();
    
    for (const moduleName of v1Modules) {
      const module = await platform.modules.load(`${moduleName}-module`);
      expect(module.isLoaded).toBe(true);
    }
  });
});
```

#### Data Integrity Test
```typescript
test('data migration maintains integrity', async () => {
  // Compare v1 and v2 data counts
  const v1UserCount = await getV1RecordCount('users');
  const v2UserCount = await getV2RecordCount('users');
  
  expect(v2UserCount).toBe(v1UserCount);
  
  // Verify data consistency
  const sampleUsers = await platform.database.query({
    table: 'users',
    limit: 10
  });
  
  for (const user of sampleUsers.data) {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user.email).toMatch(/@/);
  }
});
```

### Manual Testing

#### User Flow Testing
1. **Authentication Flow**
   - [ ] Login with existing credentials
   - [ ] Password reset works
   - [ ] MFA setup (if applicable)
   - [ ] Session persistence

2. **Core Functionality**
   - [ ] All modules load correctly
   - [ ] Data displays properly
   - [ ] CRUD operations work
   - [ ] File uploads function
   - [ ] Real-time updates work

3. **Permissions**
   - [ ] Role-based access works
   - [ ] Module permissions enforced
   - [ ] Data isolation correct

#### Performance Testing
```bash
# Load testing with k6
k6 run --vus 50 --duration 5m tests/load-test.js

# Memory usage monitoring
node --inspect server/index.js

# Database performance
EXPLAIN ANALYZE SELECT * FROM vendas.customers;
```

## 🔄 Rollback Plan

### Automated Rollback
```bash
#!/bin/bash
# rollback-to-v1.sh

echo "Starting rollback to v1..."

# 1. Point traffic back to v1
# Update load balancer or DNS
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${DNS_RECORD_ID}" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"content":"old-server-ip"}'

# 2. Restore v1 database if needed
if [ "$RESTORE_DATABASE" = "true" ]; then
  psql plataforma_v1 < v1_backup_before_migration.sql
fi

# 3. Start v1 services
systemctl start plataforma-v1
systemctl start nginx-v1

# 4. Remove maintenance mode
rm /var/www/plataforma-v1/maintenance.flag

echo "Rollback completed"
```

### Manual Rollback Steps

#### Immediate Rollback (< 30 minutes)
1. **Switch traffic back to v1**
   - Update DNS records
   - Or reconfigure load balancer
   - Verify v1 is responding

2. **Restore v1 database** (if corrupted)
   ```bash
   # Stop v1 application
   systemctl stop plataforma-v1
   
   # Restore database
   psql plataforma_v1 < v1_backup.sql
   
   # Restart application
   systemctl start plataforma-v1
   ```

3. **Notify users**
   - Send notification about temporary rollback
   - Estimate time to resolve issues

#### Data Recovery Rollback (> 30 minutes)
If data was corrupted during migration:

1. **Assess data corruption**
   ```sql
   -- Check data integrity
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM vendas_customers;
   SELECT COUNT(*) FROM financeiro_transactions;
   ```

2. **Restore from backups**
   ```bash
   # Restore full database backup
   dropdb plataforma_v1
   createdb plataforma_v1
   psql plataforma_v1 < full_backup_before_migration.sql
   ```

3. **Sync recent changes** (if possible)
   - Identify changes made during migration
   - Manually restore critical recent data

### Rollback Decision Matrix

| Scenario | Time to Rollback | Actions Required |
|----------|------------------|------------------|
| **Site completely down** | < 5 minutes | Switch DNS/LB to v1 |
| **Major functionality broken** | < 15 minutes | Switch traffic + notify users |
| **Performance issues** | < 30 minutes | Switch traffic + investigate |
| **Data corruption** | < 2 hours | Full database restore |
| **Security vulnerability** | Immediate | Emergency rollback + patch |

## ✅ Post-Migration

### Immediate Tasks (Day 1)

#### Monitor System Health
```bash
# Check application logs
tail -f /var/log/plataforma/application.log

# Monitor database performance
SELECT * FROM pg_stat_activity;

# Check memory usage
free -h

# Monitor disk space
df -h
```

#### Verify Core Functions
- [ ] User authentication works
- [ ] All modules load correctly
- [ ] Database operations function
- [ ] File uploads/downloads work
- [ ] Real-time features active
- [ ] API endpoints respond

#### User Support
- [ ] Monitor support channels for issues
- [ ] Document common migration-related problems
- [ ] Prepare FAQ for users
- [ ] Train support team on v2 differences

### Week 1 Tasks

#### Performance Optimization
```sql
-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM vendas.customers 
WHERE created_at >= '2024-01-01';

-- Add missing indexes
CREATE INDEX idx_customers_created_at 
ON vendas.customers(created_at);

-- Update table statistics
ANALYZE vendas.customers;
```

#### Security Review
- [ ] Review all user permissions
- [ ] Verify JWT token expiration
- [ ] Check API rate limiting
- [ ] Audit file access permissions
- [ ] Validate database row-level security

#### Documentation Updates
- [ ] Update user documentation
- [ ] Create v2 feature guides
- [ ] Document new APIs
- [ ] Update development guides

### Month 1 Tasks

#### Feature Enhancement
- [ ] Enable advanced v2 features
- [ ] Optimize module loading
- [ ] Implement advanced caching
- [ ] Enable advanced monitoring

#### Clean Up
- [ ] Remove v1 compatibility code
- [ ] Clean up old database schemas
- [ ] Archive v1 backups
- [ ] Update CI/CD pipelines

#### Training & Education
- [ ] Train development team on v2
- [ ] Update coding standards
- [ ] Create video tutorials
- [ ] Host webinars for users

### Success Metrics

#### Technical Metrics
- **Performance**: Page load time < 2s
- **Availability**: 99.9% uptime
- **Database**: Query response time < 100ms
- **Memory**: Memory usage < 2GB per instance
- **Errors**: Error rate < 0.1%

#### User Metrics
- **Adoption**: 90% of users actively using v2
- **Support**: Support tickets < 5% of user base
- **Satisfaction**: User satisfaction > 8/10
- **Productivity**: User task completion time improved

#### Business Metrics
- **Downtime**: Total migration downtime < 4 hours
- **Data Loss**: Zero data loss during migration
- **Cost**: Infrastructure costs within budget
- **Development**: New feature development velocity increased

---

## 🆘 Emergency Contacts

### Migration Team
- **Migration Lead**: [Name] - [Phone] - [Email]
- **Database Admin**: [Name] - [Phone] - [Email]  
- **DevOps Lead**: [Name] - [Phone] - [Email]
- **QA Lead**: [Name] - [Phone] - [Email]

### Escalation Matrix
1. **Technical Issues**: Migration Lead → CTO
2. **Business Issues**: Project Manager → CEO
3. **Security Issues**: Security Lead → CISO
4. **Data Issues**: Database Admin → CTO

---

This migration guide provides a comprehensive framework for moving from Plataforma.dev v1 to v2. Adjust timelines and procedures based on your specific environment and requirements.

**Remember**: Always test the migration process in a staging environment before executing in production!