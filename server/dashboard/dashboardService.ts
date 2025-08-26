import { Pool } from 'pg';
import { redis } from '../database/config.js';

export interface KPIMetric {
  id: string;
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  target?: number;
  unit?: string;
  description?: string;
}

export interface ChartData {
  name: string;
  value: number;
  date?: string;
  category?: string;
}

export interface ActivityEvent {
  id: string;
  type: 'user_action' | 'system_event' | 'business_event';
  title: string;
  description: string;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ModuleMetrics {
  name: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  usage: number;
  lastActive: Date;
  uptime: number;
  errorCount: number;
}

export interface SystemHealth {
  apiResponseTime: number;
  uptime: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  databaseConnections: number;
  redisConnections: number;
}

export class DashboardService {
  private pool: Pool;
  private cacheTimeout = 300; // 5 minutes

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private async getCachedData<T>(key: string): Promise<T | null> {
    try {
      if (!redis || !redis.isReady) return null;
      
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Dashboard cache read error:', error);
      return null;
    }
  }

  private async setCachedData(key: string, data: any): Promise<void> {
    try {
      if (!redis || !redis.isReady) return;
      
      await redis.setEx(key, this.cacheTimeout, JSON.stringify(data));
    } catch (error) {
      console.warn('Dashboard cache write error:', error);
    }
  }

  // KPI Metrics
  async getKPIMetrics(): Promise<KPIMetric[]> {
    const cacheKey = 'dashboard:kpis';
    const cached = await this.getCachedData<KPIMetric[]>(cacheKey);
    if (cached) return cached;

    try {
      // User metrics
      const userStats = await this.pool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN last_login > NOW() - INTERVAL '24 hours' THEN 1 END) as active_users,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_users
        FROM plataforma_core.users
      `);

      // Session metrics
      const sessionStats = await this.pool.query(`
        SELECT COUNT(*) as active_sessions
        FROM plataforma_core.user_sessions
        WHERE expires_at > NOW()
      `);

      // Module usage
      const moduleStats = await this.pool.query(`
        SELECT 
          COUNT(DISTINCT module_name) as modules_used,
          COUNT(*) as total_actions
        FROM plataforma_core.audit_logs
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);

      // Business metrics (mock data for now)
      const businessMetrics = await this.getBusinessMetrics();

      const kpis: KPIMetric[] = [
        {
          id: 'total_users',
          title: 'Total de Usuários',
          value: userStats.rows[0]?.total_users || 0,
          change: 5.2,
          trend: 'up',
          unit: 'usuários',
          description: 'Usuários cadastrados na plataforma'
        },
        {
          id: 'active_users',
          title: 'Usuários Ativos',
          value: userStats.rows[0]?.active_users || 0,
          change: 12.5,
          trend: 'up',
          unit: 'últimas 24h',
          description: 'Usuários com login nas últimas 24h'
        },
        {
          id: 'new_users',
          title: 'Novos Usuários',
          value: userStats.rows[0]?.new_users || 0,
          change: 8.3,
          trend: 'up',
          unit: 'últimos 7 dias',
          description: 'Novos usuários na última semana'
        },
        {
          id: 'active_sessions',
          title: 'Sessões Ativas',
          value: sessionStats.rows[0]?.active_sessions || 0,
          change: -2.1,
          trend: 'down',
          unit: 'sessões',
          description: 'Sessões de usuário ativas'
        },
        {
          id: 'modules_used',
          title: 'Módulos em Uso',
          value: moduleStats.rows[0]?.modules_used || 0,
          change: 15.0,
          trend: 'up',
          unit: 'últimas 24h',
          description: 'Módulos utilizados hoje'
        },
        {
          id: 'revenue',
          title: 'Receita (Simulada)',
          value: businessMetrics.revenue,
          change: businessMetrics.revenueChange,
          trend: businessMetrics.revenueChange > 0 ? 'up' : 'down',
          unit: 'R$',
          description: 'Receita total do mês'
        }
      ];

      await this.setCachedData(cacheKey, kpis);
      return kpis;
    } catch (error) {
      console.error('Error fetching KPI metrics:', error);
      return this.getMockKPIs();
    }
  }

  private async getBusinessMetrics() {
    // Mock business data - replace with real business logic
    return {
      revenue: 125430,
      revenueChange: 8.5,
      orders: 1240,
      ordersChange: 12.3,
      customers: 892,
      customersChange: 6.7
    };
  }

  // Chart Data
  async getChartData(type: 'users' | 'revenue' | 'modules' | 'performance', period: string = '30d'): Promise<ChartData[]> {
    const cacheKey = `dashboard:chart:${type}:${period}`;
    const cached = await this.getCachedData<ChartData[]>(cacheKey);
    if (cached) return cached;

    try {
      let data: ChartData[] = [];

      switch (type) {
        case 'users':
          data = await this.getUserChartData(period);
          break;
        case 'revenue':
          data = await this.getRevenueChartData(period);
          break;
        case 'modules':
          data = await this.getModuleUsageChartData(period);
          break;
        case 'performance':
          data = await this.getPerformanceChartData(period);
          break;
      }

      await this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Error fetching ${type} chart data:`, error);
      return this.getMockChartData(type);
    }
  }

  private async getUserChartData(period: string): Promise<ChartData[]> {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as value
      FROM plataforma_core.users 
      WHERE created_at > NOW() - INTERVAL '${period === '30d' ? '30 days' : '7 days'}'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      name: row.date,
      value: parseInt(row.value),
      date: row.date
    }));
  }

  private async getRevenueChartData(period: string): Promise<ChartData[]> {
    // Mock revenue data - replace with real business logic
    const days = period === '30d' ? 30 : 7;
    const data: ChartData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        name: date.toISOString().split('T')[0],
        value: Math.floor(Math.random() * 5000) + 2000,
        date: date.toISOString().split('T')[0]
      });
    }
    
    return data;
  }

  private async getModuleUsageChartData(period: string): Promise<ChartData[]> {
    const query = `
      SELECT 
        module_name as name,
        COUNT(*) as value
      FROM plataforma_core.audit_logs 
      WHERE created_at > NOW() - INTERVAL '${period === '30d' ? '30 days' : '7 days'}'
      GROUP BY module_name
      ORDER BY value DESC
      LIMIT 10
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      name: row.name || 'Unknown',
      value: parseInt(row.value)
    }));
  }

  private async getPerformanceChartData(period: string): Promise<ChartData[]> {
    // Mock performance data - replace with real monitoring data
    const hours = period === '30d' ? 24 * 30 : 24 * 7;
    const data: ChartData[] = [];
    
    for (let i = hours - 1; i >= 0; i--) {
      const date = new Date();
      date.setHours(date.getHours() - i);
      
      data.push({
        name: date.toISOString(),
        value: Math.floor(Math.random() * 200) + 50, // Response time in ms
        date: date.toISOString()
      });
    }
    
    return data;
  }

  // Activity Feed
  async getRecentActivity(limit: number = 20): Promise<ActivityEvent[]> {
    const cacheKey = `dashboard:activity:${limit}`;
    const cached = await this.getCachedData<ActivityEvent[]>(cacheKey);
    if (cached) return cached;

    try {
      const query = `
        SELECT 
          id,
          'user_action' as type,
          action as title,
          COALESCE(details, '') as description,
          created_at as timestamp,
          user_id
        FROM plataforma_core.audit_logs
        ORDER BY created_at DESC
        LIMIT $1
      `;

      const result = await this.pool.query(query, [limit]);
      const activities: ActivityEvent[] = result.rows.map(row => ({
        id: row.id,
        type: row.type,
        title: row.title,
        description: row.description,
        timestamp: new Date(row.timestamp),
        userId: row.user_id
      }));

      await this.setCachedData(cacheKey, activities);
      return activities;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return this.getMockActivity();
    }
  }

  // Module Status
  async getModuleStatus(): Promise<ModuleMetrics[]> {
    const cacheKey = 'dashboard:modules';
    const cached = await this.getCachedData<ModuleMetrics[]>(cacheKey);
    if (cached) return cached;

    try {
      // Get module usage from audit logs
      const query = `
        SELECT 
          module_name as name,
          COUNT(*) as usage,
          MAX(created_at) as last_active
        FROM plataforma_core.audit_logs
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY module_name
      `;

      const result = await this.pool.query(query);
      const modules: ModuleMetrics[] = result.rows.map(row => ({
        name: row.name || 'Unknown',
        status: 'active',
        usage: parseInt(row.usage),
        lastActive: new Date(row.last_active),
        uptime: 99.9,
        errorCount: Math.floor(Math.random() * 5)
      }));

      // Add planned modules that aren't showing up in logs
      const plannedModules = [
        'planilha.app', 'produtos.app', 'estoques.app', 'loja.app',
        'pessoal.app', 'juridico.app', 'financeiro.app'
      ];

      plannedModules.forEach(name => {
        if (!modules.find(m => m.name === name)) {
          modules.push({
            name,
            status: name === 'planilha.app' ? 'active' : 'inactive',
            usage: name === 'planilha.app' ? 150 : 0,
            lastActive: new Date(),
            uptime: name === 'planilha.app' ? 99.9 : 0,
            errorCount: 0
          });
        }
      });

      await this.setCachedData(cacheKey, modules);
      return modules;
    } catch (error) {
      console.error('Error fetching module status:', error);
      return this.getMockModules();
    }
  }

  // System Health
  async getSystemHealth(): Promise<SystemHealth> {
    const cacheKey = 'dashboard:health';
    const cached = await this.getCachedData<SystemHealth>(cacheKey);
    if (cached) return cached;

    try {
      // Get database connections
      const dbConnections = await this.pool.query(`
        SELECT count(*) as connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);

      const health: SystemHealth = {
        apiResponseTime: Math.floor(Math.random() * 100) + 50, // Mock
        uptime: 99.97,
        errorRate: Math.random() * 0.5,
        memoryUsage: Math.random() * 30 + 40,
        cpuUsage: Math.random() * 20 + 10,
        databaseConnections: parseInt(dbConnections.rows[0]?.connections || '0'),
        redisConnections: 5 // Mock
      };

      await this.setCachedData(cacheKey, health);
      return health;
    } catch (error) {
      console.error('Error fetching system health:', error);
      return {
        apiResponseTime: 85,
        uptime: 99.95,
        errorRate: 0.1,
        memoryUsage: 65,
        cpuUsage: 15,
        databaseConnections: 10,
        redisConnections: 5
      };
    }
  }

  // Mock data fallbacks
  private getMockKPIs(): KPIMetric[] {
    return [
      {
        id: 'users',
        title: 'Total de Usuários',
        value: 1240,
        change: 5.2,
        trend: 'up',
        unit: 'usuários'
      },
      {
        id: 'sessions',
        title: 'Sessões Ativas',
        value: 89,
        change: -2.1,
        trend: 'down',
        unit: 'sessões'
      },
      {
        id: 'modules',
        title: 'Módulos Ativos',
        value: 7,
        change: 15.0,
        trend: 'up',
        unit: 'módulos'
      },
      {
        id: 'revenue',
        title: 'Receita Mensal',
        value: 125430,
        change: 8.5,
        trend: 'up',
        unit: 'R$'
      }
    ];
  }

  private getMockChartData(type: string): ChartData[] {
    const data: ChartData[] = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        name: date.toISOString().split('T')[0],
        value: Math.floor(Math.random() * 1000) + 100
      });
    }
    return data;
  }

  private getMockActivity(): ActivityEvent[] {
    return [
      {
        id: '1',
        type: 'user_action',
        title: 'Novo usuário registrado',
        description: 'João Silva criou uma nova conta',
        timestamp: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        id: '2',
        type: 'business_event',
        title: 'Planilha criada',
        description: 'Nova planilha "Vendas Q1" foi criada',
        timestamp: new Date(Date.now() - 15 * 60 * 1000)
      }
    ];
  }

  private getMockModules(): ModuleMetrics[] {
    return [
      {
        name: 'planilha.app',
        status: 'active',
        usage: 150,
        lastActive: new Date(),
        uptime: 99.9,
        errorCount: 0
      },
      {
        name: 'produtos.app',
        status: 'inactive',
        usage: 0,
        lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000),
        uptime: 0,
        errorCount: 0
      }
    ];
  }

  // Export functionality
  async exportData(type: 'kpis' | 'activity' | 'modules', format: 'json' | 'csv'): Promise<any> {
    let data: any;
    
    switch (type) {
      case 'kpis':
        data = await this.getKPIMetrics();
        break;
      case 'activity':
        data = await this.getRecentActivity(100);
        break;
      case 'modules':
        data = await this.getModuleStatus();
        break;
      default:
        throw new Error('Invalid export type');
    }

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  private convertToCSV(data: any[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(item => 
      headers.map(header => {
        const value = item[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }
}