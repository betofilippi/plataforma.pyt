// =====================================================================
// EXEMPLO DE USO DO SISTEMA DE DATABASE PARA 20+ MÓDULOS
// Demonstração prática de como utilizar toda a infraestrutura
// =====================================================================

import { 
  createPlatformaDatabaseSystem, 
  DEVELOPMENT_CONFIG,
  PRODUCTION_CONFIG,
  PlatformaDatabaseSystem,
  ModuleDatabase
} from './index';

// ==================== EXAMPLE 1: INICIALIZAÇÃO DO SISTEMA ====================

async function initializeDatabaseSystem(): Promise<PlatformaDatabaseSystem> {
  console.log('📚 Exemplo: Inicializando sistema de database...');
  
  // Usar configuração baseada no ambiente
  const config = process.env.NODE_ENV === 'production' 
    ? PRODUCTION_CONFIG 
    : DEVELOPMENT_CONFIG;
  
  // Criar sistema
  const dbSystem = createPlatformaDatabaseSystem(config);
  
  // Inicializar
  await dbSystem.initialize();
  
  console.log('✅ Sistema inicializado com sucesso');
  
  return dbSystem;
}

// ==================== EXAMPLE 2: CRIAÇÃO DE MÓDULOS ====================

async function setupModules(dbSystem: PlatformaDatabaseSystem) {
  console.log('📦 Exemplo: Configurando módulos...');
  
  // Módulo de Vendas
  const vendas = await dbSystem.createModule('vendas');
  await setupVendasModule(vendas);
  
  // Módulo de RH
  const rh = await dbSystem.createModule('rh');
  await setupRHModule(rh);
  
  // Módulo de Estoque
  const estoque = await dbSystem.createModule('estoque');
  await setupEstoqueModule(estoque);
  
  console.log('✅ Módulos configurados');
}

// ==================== EXAMPLE 3: CONFIGURAÇÃO DO MÓDULO VENDAS ====================

async function setupVendasModule(vendas: ModuleDatabase) {
  console.log('🛒 Configurando módulo de vendas...');
  
  // 1. Criar tabelas com isolamento automático
  await vendas.createTable('clientes', [
    { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'organization_id', type: 'UUID', nullable: false },
    { name: 'nome', type: 'VARCHAR(255)', nullable: false },
    { name: 'email', type: 'VARCHAR(255)', unique: true },
    { name: 'telefone', type: 'VARCHAR(20)' },
    { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMPTZ', default: 'NOW()' }
  ], {
    enableRLS: true,
    enableAudit: true,
    tenantColumn: 'organization_id'
  });
  
  await vendas.createTable('pedidos', [
    { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'organization_id', type: 'UUID', nullable: false },
    { name: 'cliente_id', type: 'UUID', nullable: false, references: { table: 'clientes', column: 'id' } },
    { name: 'numero_pedido', type: 'VARCHAR(50)', nullable: false },
    { name: 'valor_total', type: 'DECIMAL(10,2)', nullable: false },
    { name: 'status', type: 'VARCHAR(20)', default: "'pendente'" },
    { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMPTZ', default: 'NOW()' }
  ], {
    enableRLS: true,
    enableAudit: true,
    tenantColumn: 'organization_id',
    partitioning: 'date'
  });
  
  // 2. Executar migrations específicas
  await vendas.runMigrations();
  
  console.log('✅ Módulo vendas configurado');
}

// ==================== EXAMPLE 4: CONFIGURAÇÃO DO MÓDULO RH ====================

async function setupRHModule(rh: ModuleDatabase) {
  console.log('👥 Configurando módulo de RH...');
  
  await rh.createTable('funcionarios', [
    { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'organization_id', type: 'UUID', nullable: false },
    { name: 'nome_completo', type: 'VARCHAR(255)', nullable: false },
    { name: 'email', type: 'VARCHAR(255)', unique: true },
    { name: 'cpf', type: 'VARCHAR(14)', unique: true },
    { name: 'cargo', type: 'VARCHAR(100)' },
    { name: 'salario', type: 'DECIMAL(10,2)' },
    { name: 'data_admissao', type: 'DATE', nullable: false },
    { name: 'ativo', type: 'BOOLEAN', default: 'true' },
    { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMPTZ', default: 'NOW()' }
  ], {
    enableRLS: true,
    enableAudit: true,
    tenantColumn: 'organization_id'
  });
  
  await rh.runMigrations();
  console.log('✅ Módulo RH configurado');
}

// ==================== EXAMPLE 5: CONFIGURAÇÃO DO MÓDULO ESTOQUE ====================

async function setupEstoqueModule(estoque: ModuleDatabase) {
  console.log('📦 Configurando módulo de estoque...');
  
  await estoque.createTable('produtos', [
    { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'organization_id', type: 'UUID', nullable: false },
    { name: 'codigo', type: 'VARCHAR(50)', nullable: false },
    { name: 'nome', type: 'VARCHAR(255)', nullable: false },
    { name: 'descricao', type: 'TEXT' },
    { name: 'preco', type: 'DECIMAL(10,2)', nullable: false },
    { name: 'categoria', type: 'VARCHAR(100)' },
    { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMPTZ', default: 'NOW()' }
  ], {
    enableRLS: true,
    enableAudit: true,
    tenantColumn: 'organization_id'
  });
  
  await estoque.createTable('movimentacoes', [
    { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'organization_id', type: 'UUID', nullable: false },
    { name: 'produto_id', type: 'UUID', nullable: false, references: { table: 'produtos', column: 'id' } },
    { name: 'tipo', type: 'VARCHAR(20)', nullable: false }, // entrada/saida
    { name: 'quantidade', type: 'INTEGER', nullable: false },
    { name: 'preco_unitario', type: 'DECIMAL(10,2)' },
    { name: 'observacoes', type: 'TEXT' },
    { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' }
  ], {
    enableRLS: true,
    enableAudit: true,
    tenantColumn: 'organization_id',
    partitioning: 'date'
  });
  
  await estoque.runMigrations();
  console.log('✅ Módulo estoque configurado');
}

// ==================== EXAMPLE 6: OPERAÇÕES DE CRUD TYPE-SAFE ====================

interface Cliente {
  id: string;
  organization_id: string;
  nome: string;
  email: string;
  telefone?: string;
  created_at: Date;
  updated_at: Date;
}

interface Pedido {
  id: string;
  organization_id: string;
  cliente_id: string;
  numero_pedido: string;
  valor_total: number;
  status: 'pendente' | 'processando' | 'enviado' | 'entregue' | 'cancelado';
  created_at: Date;
  updated_at: Date;
}

async function demonstrarOperacoesCRUD(dbSystem: PlatformaDatabaseSystem) {
  console.log('🔄 Exemplo: Operações CRUD type-safe...');
  
  const vendas = dbSystem.getModuleDatabase('vendas');
  if (!vendas) return;
  
  // 1. INSERT com type safety
  const novosClientes = await vendas.insert<Cliente>('clientes', [
    {
      organization_id: '00000000-0000-0000-0000-000000000001',
      nome: 'João Silva',
      email: 'joao@email.com',
      telefone: '(11) 99999-9999'
    },
    {
      organization_id: '00000000-0000-0000-0000-000000000001',
      nome: 'Maria Santos',
      email: 'maria@email.com'
    }
  ]);
  
  console.log('👥 Clientes criados:', novosClientes.length);
  
  // 2. SELECT com type safety e cache automático
  const clientes = await vendas.select<Cliente>('clientes', {
    where: {
      organization_id: '00000000-0000-0000-0000-000000000001'
    },
    orderBy: [{ column: 'nome', direction: 'ASC' }],
    cache: true,
    cacheTTL: 300 // 5 minutos
  });
  
  console.log('📋 Clientes encontrados:', clientes.length);
  
  // 3. SELECT ONE com condições complexas
  const clienteJoao = await vendas.selectOne<Cliente>('clientes', {
    where: {
      email: { $like: '%joao%' },
      nome: { $ilike: '%silva%' }
    }
  });
  
  if (clienteJoao) {
    console.log('👤 Cliente encontrado:', clienteJoao.nome);
    
    // 4. UPDATE com condições
    const clienteAtualizado = await vendas.update<Cliente>('clientes', 
      {
        telefone: '(11) 88888-8888'
      },
      {
        where: { id: clienteJoao.id },
        returning: ['id', 'nome', 'telefone']
      }
    );
    
    console.log('✏️ Cliente atualizado:', clienteAtualizado[0]);
    
    // 5. INSERT de pedido relacionado
    const novoPedido = await vendas.insert<Pedido>('pedidos', {
      organization_id: clienteJoao.organization_id,
      cliente_id: clienteJoao.id,
      numero_pedido: 'PED-001',
      valor_total: 299.99,
      status: 'pendente'
    });
    
    console.log('📦 Pedido criado:', novoPedido[0].numero_pedido);
  }
  
  console.log('✅ Operações CRUD demonstradas');
}

// ==================== EXAMPLE 7: CONSULTAS COMPLEXAS COM CACHE ====================

async function demonstrarConsultasComplexas(dbSystem: PlatformaDatabaseSystem) {
  console.log('🔍 Exemplo: Consultas complexas com cache...');
  
  const vendas = dbSystem.getModuleDatabase('vendas');
  if (!vendas) return;
  
  // Query complexa com cache automático
  const relatorio = await vendas.database.query(`
    SELECT 
      c.nome as cliente_nome,
      c.email,
      COUNT(p.id) as total_pedidos,
      SUM(p.valor_total) as valor_total,
      AVG(p.valor_total) as valor_medio,
      MAX(p.created_at) as ultimo_pedido
    FROM module_vendas.clientes c
    LEFT JOIN module_vendas.pedidos p ON c.id = p.cliente_id
    WHERE c.organization_id = $1
      AND c.created_at >= $2
    GROUP BY c.id, c.nome, c.email
    HAVING COUNT(p.id) > 0
    ORDER BY valor_total DESC
    LIMIT 10
  `, [
    '00000000-0000-0000-0000-000000000001',
    new Date('2024-01-01')
  ], {
    cache: true,
    cacheTTL: 600, // 10 minutos
    moduleName: 'vendas'
  });
  
  console.log('📊 Relatório de vendas:', relatorio.rows.length, 'clientes');
  
  // Query com fallback automático
  const estatisticas = await vendas.database.cacheQuery(
    'vendas:estatisticas:mensais',
    async () => {
      console.log('🔄 Calculando estatísticas (não cacheado)...');
      
      const result = await vendas.query(`
        SELECT 
          DATE_TRUNC('month', created_at) as mes,
          COUNT(*) as total_pedidos,
          SUM(valor_total) as faturamento,
          AVG(valor_total) as ticket_medio
        FROM pedidos
        WHERE organization_id = $1
          AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY mes DESC
      `, ['00000000-0000-0000-0000-000000000001']);
      
      return result;
    },
    {
      ttl: 3600, // 1 hora
      moduleName: 'vendas',
      tags: ['estatisticas', 'vendas', 'mensal']
    }
  );
  
  console.log('📈 Estatísticas mensais:', estatisticas.length, 'meses');
  
  console.log('✅ Consultas complexas demonstradas');
}

// ==================== EXAMPLE 8: MONITORAMENTO E HEALTH CHECK ====================

async function monitorarSistema(dbSystem: PlatformaDatabaseSystem) {
  console.log('📊 Exemplo: Monitoramento do sistema...');
  
  // Health check completo
  const health = await dbSystem.healthCheck();
  console.log('🏥 Status do sistema:', {
    overall: health.overall,
    database: health.components.database,
    redis: health.components.redis,
    connections: `${health.metrics.activeConnections}/${health.metrics.totalConnections}`,
    cacheHitRate: health.metrics.cacheHitRate ? `${health.metrics.cacheHitRate.toFixed(1)}%` : 'N/A'
  });
  
  // Métricas do pool
  const poolMetrics = dbSystem.pool.getAllMetrics();
  console.log('🔌 Métricas dos pools:');
  for (const [moduleName, metrics] of Object.entries(poolMetrics)) {
    console.log(`  ${moduleName}: ${metrics.activeConnections}/${metrics.totalConnections} conexões, ${metrics.totalQueries} queries`);
  }
  
  // Métricas do cache
  if (dbSystem.cache) {
    const cacheMetrics = await dbSystem.cache.getMetrics();
    console.log('💾 Métricas do cache:', {
      keys: cacheMetrics.total_keys,
      memory: `${cacheMetrics.memory_usage_mb.toFixed(1)}MB`,
      hitRate: `${cacheMetrics.hit_rate.toFixed(1)}%`,
      evictions: cacheMetrics.eviction_count
    });
  }
  
  console.log('✅ Monitoramento concluído');
}

// ==================== EXAMPLE 9: BACKUP E RECOVERY ====================

async function demonstrarBackupRecovery(dbSystem: PlatformaDatabaseSystem) {
  console.log('💾 Exemplo: Backup e recovery...');
  
  if (dbSystem.backup) {
    // Backup do módulo vendas
    const vendas = dbSystem.getModuleDatabase('vendas');
    if (vendas) {
      await vendas.backup();
      console.log('💾 Backup do módulo vendas concluído');
    }
    
    // Listar backups disponíveis
    const backups = await dbSystem.backup.listModuleBackups('vendas', 10);
    console.log('📋 Backups disponíveis:', backups.length);
    
    // Criar ponto de restauração
    const restorePoint = await dbSystem.backup.createRestorePoint(
      'vendas',
      'Antes da migração v2.0'
    );
    console.log('📍 Ponto de restauração criado:', restorePoint.id);
  }
  
  console.log('✅ Backup e recovery demonstrado');
}

// ==================== EXAMPLE 10: LIMPEZA E SHUTDOWN ====================

async function demonstrarShutdown(dbSystem: PlatformaDatabaseSystem) {
  console.log('🔄 Exemplo: Shutdown graceful...');
  
  // Limpar caches específicos
  const vendas = dbSystem.getModuleDatabase('vendas');
  if (vendas) {
    await vendas.clearCache();
    console.log('🧹 Cache do módulo vendas limpo');
  }
  
  // Executar limpeza de dados antigos se configurado
  if (dbSystem.isolation) {
    await dbSystem.isolation.cleanupExpiredData();
    console.log('🗑️ Dados expirados removidos');
  }
  
  // Shutdown completo
  await dbSystem.shutdown();
  console.log('👋 Sistema finalizado');
}

// ==================== EXEMPLO PRINCIPAL ====================

export async function runDatabaseSystemExample() {
  try {
    console.log('🚀 EXECUTANDO EXEMPLO COMPLETO DO SISTEMA DE DATABASE');
    console.log('=' .repeat(60));
    
    // 1. Inicializar sistema
    const dbSystem = await initializeDatabaseSystem();
    
    // 2. Configurar módulos
    await setupModules(dbSystem);
    
    // 3. Demonstrar operações CRUD
    await demonstrarOperacoesCRUD(dbSystem);
    
    // 4. Consultas complexas
    await demonstrarConsultasComplexas(dbSystem);
    
    // 5. Monitoramento
    await monitorarSistema(dbSystem);
    
    // 6. Backup e recovery
    await demonstrarBackupRecovery(dbSystem);
    
    // 7. Shutdown
    await demonstrarShutdown(dbSystem);
    
    console.log('=' .repeat(60));
    console.log('✅ EXEMPLO CONCLUÍDO COM SUCESSO!');
    
  } catch (error) {
    console.error('❌ ERRO NO EXEMPLO:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runDatabaseSystemExample().catch(console.error);
}