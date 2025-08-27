# 🗄️ Sistema de Database Enterprise - Suporte para 20+ Módulos

Sistema completo de database enterprise projetado para suportar 20+ módulos simultâneos com alta performance, segurança e escalabilidade.

## 🏗️ Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED DATABASE API                        │
│                     (Type-Safe Query Builder)                  │
├─────────────────────────────────────────────────────────────────┤
│  Migration    │  Module      │  Security    │  Cache      │ Backup │
│  System       │  Isolation   │  Manager     │  Manager    │ Manager│
├─────────────────────────────────────────────────────────────────┤
│              CONNECTION POOL MANAGER                           │
│         (Multi-Pool + Load Balancing + Health Monitor)         │
├─────────────────────────────────────────────────────────────────┤
│                    POSTGRESQL + REDIS                          │
└─────────────────────────────────────────────────────────────────┘
```

## ⚡ Características Principais

### 🔄 **Migration System**
- ✅ Migrations automáticas por módulo
- ✅ Versionamento e dependências
- ✅ Rollback automático
- ✅ Schema registry

### 🔒 **Module Isolation**
- ✅ Schemas isolados por módulo
- ✅ Row-Level Security (RLS)
- ✅ Multi-tenancy automático
- ✅ Audit trail completo

### 🔌 **Connection Pooling**
- ✅ Pools dedicados por módulo
- ✅ Load balancing inteligente
- ✅ Health monitoring
- ✅ Auto-scaling de conexões

### 🚀 **Cache Layer**
- ✅ Redis + Memory caching
- ✅ Invalidação inteligente
- ✅ Compressão automática
- ✅ Multi-level caching

### 🛡️ **Security Manager**
- ✅ Row-Level Security automático
- ✅ Audit trail completo
- ✅ Detecção de atividade suspeita
- ✅ Compliance reports

### 💾 **Backup System**
- ✅ Backup incremental por módulo
- ✅ Point-in-time recovery
- ✅ Compressão + Encryption
- ✅ Verificação de integridade

### 📊 **Partition Manager**
- ✅ Particionamento automático
- ✅ Manutenção automática
- ✅ Performance otimizada
- ✅ Retenção configurável

## 🚀 Quick Start

### 1. Instalação

```bash
npm install @plataforma/database-system
```

### 2. Configuração Básica

```typescript
import { createPlatformaDatabaseSystem, DEVELOPMENT_CONFIG } from '@plataforma/database-system';

// Configurar sistema
const dbSystem = createPlatformaDatabaseSystem({
  ...DEVELOPMENT_CONFIG,
  connectionString: process.env.DATABASE_URL,
  redisConfig: {
    url: process.env.REDIS_URL,
    enabled: true
  }
});

// Inicializar
await dbSystem.initialize();
```

### 3. Criar Módulo

```typescript
// Criar módulo de vendas
const vendas = await dbSystem.createModule('vendas');

// Criar tabela com isolamento automático
await vendas.createTable('clientes', [
  { name: 'id', type: 'UUID', primaryKey: true },
  { name: 'organization_id', type: 'UUID', nullable: false },
  { name: 'nome', type: 'VARCHAR(255)', nullable: false },
  { name: 'email', type: 'VARCHAR(255)', unique: true }
], {
  enableRLS: true,      // Row-Level Security
  enableAudit: true,    // Audit Trail
  partitioning: 'date'  // Particionamento automático
});
```

### 4. Operações Type-Safe

```typescript
interface Cliente {
  id: string;
  organization_id: string;
  nome: string;
  email: string;
}

// INSERT com type safety
const novosClientes = await vendas.insert<Cliente>('clientes', [
  {
    organization_id: 'org-123',
    nome: 'João Silva',
    email: 'joao@email.com'
  }
]);

// SELECT com cache automático
const clientes = await vendas.select<Cliente>('clientes', {
  where: {
    nome: { $ilike: '%silva%' },
    email: { $ne: null }
  },
  orderBy: [{ column: 'nome', direction: 'ASC' }],
  limit: 10,
  cache: true,
  cacheTTL: 300
});

// UPDATE com audit trail
await vendas.update<Cliente>('clientes', 
  { email: 'novo@email.com' },
  { 
    where: { id: 'cliente-123' },
    returning: ['id', 'email']
  }
);
```

## 🔧 Configuração Avançada

### Environment Configurations

```typescript
// Desenvolvimento
export const DEVELOPMENT_CONFIG = {
  connectionString: 'postgresql://localhost:5432/plataforma_dev',
  ssl: false,
  poolConfig: { min: 2, max: 10 },
  features: {
    migrations: true,
    isolation: true,
    caching: true,
    security: true,
    backup: true,
    partitioning: false
  }
};

// Produção
export const PRODUCTION_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  poolConfig: { min: 5, max: 50 },
  features: {
    migrations: true,
    isolation: true,
    caching: true,
    security: true,
    backup: true,
    partitioning: true
  }
};
```

### Module-Specific Configuration

```typescript
// Configurar cache estratégias por módulo
await dbSystem.cache?.registerCacheStrategy({
  module_name: 'vendas',
  table_name: 'clientes',
  ttl: 3600, // 1 hora
  invalidation_strategy: 'write',
  cache_level: 'both', // memory + redis
  compression: true,
  tags: ['clientes', 'vendas']
});

// Configurar backup por módulo
await dbSystem.backup?.configureModuleBackup({
  module_name: 'vendas',
  schema_name: 'module_vendas',
  backup_type: 'incremental',
  schedule: '0 2 * * *', // 2h da manhã
  retention_days: 90,
  compression: true,
  encryption: true,
  storage_path: '/backups/vendas/'
});
```

## 🔍 Monitoramento e Debugging

### Health Check

```typescript
const health = await dbSystem.healthCheck();
console.log('System Health:', {
  overall: health.overall, // healthy | degraded | unhealthy
  database: health.components.database,
  redis: health.components.redis,
  activeConnections: health.metrics.activeConnections,
  cacheHitRate: health.metrics.cacheHitRate
});
```

### Pool Metrics

```typescript
const metrics = dbSystem.pool.getAllMetrics();
Object.entries(metrics).forEach(([module, stats]) => {
  console.log(`${module}:`, {
    connections: `${stats.activeConnections}/${stats.totalConnections}`,
    queries: stats.totalQueries,
    avgResponseTime: `${stats.avgQueryTime.toFixed(2)}ms`
  });
});
```

### Cache Analytics

```typescript
if (dbSystem.cache) {
  const cacheMetrics = await dbSystem.cache.getMetrics();
  console.log('Cache Performance:', {
    hitRate: `${cacheMetrics.hit_rate.toFixed(1)}%`,
    keys: cacheMetrics.total_keys,
    memoryUsage: `${cacheMetrics.memory_usage_mb.toFixed(1)}MB`,
    evictions: cacheMetrics.eviction_count
  });
}
```

## 🛡️ Segurança

### Row-Level Security Automático

```typescript
// RLS é configurado automaticamente para cada tabela
await vendas.createTable('pedidos', columns, {
  enableRLS: true,
  tenantColumn: 'organization_id' // Coluna de isolamento
});

// Contexto de tenant é configurado automaticamente
// Usuários só veem dados da sua organização
```

### Audit Trail Completo

```typescript
// Toda mudança é auditada automaticamente
const auditEntries = await dbSystem.security?.getAuditEntries(
  'module_vendas', 
  'clientes',
  {
    startDate: new Date('2024-01-01'),
    operation: 'U', // UPDATE
    userId: 'user-123'
  }
);
```

### Detecção de Atividade Suspeita

```typescript
// Sistema detecta automaticamente atividade suspeita
const alerts = await dbSystem.security?.detectSuspiciousActivity();
alerts.forEach(alert => {
  console.warn(`Security Alert: ${alert.type} - ${alert.description}`);
});
```

## 📊 Performance Optimization

### Query Performance

```typescript
// Queries são automaticamente otimizadas e cacheadas
const result = await vendas.database.cacheQuery(
  'vendas:relatorio:mensal',
  async () => {
    // Query pesada
    return await vendas.query(`
      SELECT cliente_id, SUM(valor_total) as total
      FROM pedidos 
      WHERE created_at >= $1 
      GROUP BY cliente_id
    `, [startDate]);
  },
  { 
    ttl: 3600,
    tags: ['relatorio', 'vendas']
  }
);
```

### Connection Pooling

```typescript
// Pools são automaticamente gerenciados e otimizados
const pool = dbSystem.pool.getModulePool('vendas');
if (pool) {
  // Reconfigurar pool dinamicamente se necessário
  await pool.reconfigure({ 
    max: 30 // Aumentar máximo de conexões
  });
}
```

## 🔄 Migrations

### Criar Migration

```typescript
// migrations/vendas/001_create_clientes.sql
-- @metadata {"version": "1.0.0", "dependencies": []}

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- @down
DROP TABLE IF EXISTS clientes;
```

### Executar Migrations

```typescript
// Executar migrations de um módulo específico
await dbSystem.migrations?.runModuleMigrations('vendas');

// Ou executar todas as migrations pendentes
await dbSystem.migrations?.runAllMigrations();

// Status das migrations
const status = await dbSystem.migrations?.getModuleStatus('vendas');
```

## 💾 Backup e Recovery

### Backup Automático

```typescript
// Executar backup manual
const backup = await dbSystem.backup?.executeBackup('vendas');
console.log(`Backup created: ${backup.file_path} (${backup.file_size} bytes)`);

// Criar ponto de restauração
const restorePoint = await dbSystem.backup?.createRestorePoint(
  'vendas',
  'Before major update v2.0'
);
```

### Recovery

```typescript
// Plano de recovery
const recoveryPlan = await dbSystem.backup?.getRecoveryPlan(
  'vendas',
  new Date('2024-01-15T10:00:00Z')
);

console.log('Recovery Plan:', {
  targetTime: recoveryPlan.target_time,
  requiredBackups: recoveryPlan.required_backups.length,
  estimatedTime: `${recoveryPlan.estimated_time}ms`,
  dataLossWarning: recoveryPlan.data_loss_warning
});

// Executar restore
await dbSystem.backup?.restoreFromBackup(
  'vendas',
  backup.id,
  'vendas_restore_temp'
);
```

## 📈 Particionamento

### Configurar Particionamento

```typescript
await dbSystem.partition?.registerTablePartitioning({
  schema: 'module_vendas',
  table: 'pedidos',
  strategy: {
    type: 'range_date',
    column: 'created_at',
    interval: 'monthly'
  },
  retention_policy: {
    enabled: true,
    keep_months: 24
  },
  maintenance: {
    auto_create: true,
    auto_drop: true,
    auto_analyze: true,
    pre_create_count: 3
  }
});
```

### Manutenção Automática

```typescript
// Executar manutenção de partições
const results = await dbSystem.partition?.runMaintenance('vendas');
results.forEach(metrics => {
  console.log(`${metrics.table}:`, {
    partitions: metrics.total_partitions,
    size: `${metrics.total_size_mb}MB`,
    rows: metrics.total_rows,
    maintenance: metrics.maintenance_needed
  });
});
```

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Cache Miss Alto
```typescript
// Verificar estratégia de cache
const strategy = dbSystem.cache?.getModuleStrategy('vendas');
console.log('Cache Strategy:', strategy);

// Ajustar TTL
await dbSystem.cache?.registerCacheStrategy({
  module_name: 'vendas',
  ttl: 7200, // Aumentar para 2 horas
  invalidation_strategy: 'hybrid'
});
```

#### 2. Pool Saturation
```typescript
// Verificar métricas do pool
const metrics = dbSystem.pool.getModulePool('vendas')?.getMetrics();
if (metrics && metrics.waitingClients > 0) {
  console.warn('Pool saturated, increasing max connections');
  await dbSystem.pool.getModulePool('vendas')?.reconfigure({ max: 40 });
}
```

#### 3. Slow Queries
```typescript
// Analisar performance
const performance = dbSystem.pool.getModulePool('vendas')?.getPerformanceStats();
console.log('Slow Queries:', performance?.slowQueries);

// Forçar análise de tabelas
await dbSystem.partition?.analyzePartitions('module_vendas', 'pedidos');
```

## 📚 API Reference

### Core Classes
- `PlatformaDatabaseSystem` - Sistema principal
- `ModuleDatabase` - Interface por módulo
- `UnifiedDatabase` - API unificada type-safe

### Managers
- `MigrationSystem` - Gerenciamento de migrations
- `ModuleIsolationManager` - Isolamento de módulos
- `CacheManager` - Sistema de cache
- `SecurityManager` - Segurança e auditoria
- `BackupManager` - Backup e recovery
- `PartitionManager` - Particionamento automático
- `MultiPoolManager` - Gerenciamento de pools

### Utilities
- `QueryBuilder` - Query builder type-safe
- `TransactionWrapper` - Wrapper para transações

## 🤝 Contribuindo

Para contribuir com o sistema:

1. Fork o repositório
2. Crie uma branch para sua feature
3. Adicione testes para nova funcionalidade
4. Execute `npm test` para verificar
5. Commit suas mudanças
6. Abra um Pull Request

## 📄 Licença

MIT License - veja LICENSE.md para detalhes.

---

**Sistema desenvolvido para Plataforma.dev - Suporte empresarial para 20+ módulos simultâneos**