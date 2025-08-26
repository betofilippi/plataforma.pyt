import express, { Request, Response } from 'express';
import { DashboardService } from '../dashboard/dashboardService.js';
import { requireAuth } from '../auth/middleware.js';
import { db as pool } from '../database/config.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const dashboardService = new DashboardService(pool);

// Rate limiting for dashboard endpoints
const dashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { error: 'Too many dashboard requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting and auth to all dashboard routes
router.use(dashboardLimiter);
router.use(requireAuth);

// KPI Metrics
router.get('/kpis', async (req: Request, res: Response) => {
  try {
    const kpis = await dashboardService.getKPIMetrics();
    res.json({
      success: true,
      data: kpis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KPI metrics'
    });
  }
});

// Chart Data
router.get('/charts/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { period = '30d' } = req.query;

    if (!['users', 'revenue', 'modules', 'performance'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chart type'
      });
    }

    const data = await dashboardService.getChartData(
      type as 'users' | 'revenue' | 'modules' | 'performance',
      period as string
    );

    res.json({
      success: true,
      data,
      type,
      period,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chart data'
    });
  }
});

// Recent Activity
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit cannot exceed 100'
      });
    }

    const activities = await dashboardService.getRecentActivity(limit);
    
    res.json({
      success: true,
      data: activities,
      limit,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity'
    });
  }
});

// Module Status
router.get('/modules', async (req: Request, res: Response) => {
  try {
    const modules = await dashboardService.getModuleStatus();
    
    res.json({
      success: true,
      data: modules,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching module status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch module status'
    });
  }
});

// System Health
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await dashboardService.getSystemHealth();
    
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system health'
    });
  }
});

// Real-time dashboard summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const [kpis, modules, health, activity] = await Promise.all([
      dashboardService.getKPIMetrics(),
      dashboardService.getModuleStatus(),
      dashboardService.getSystemHealth(),
      dashboardService.getRecentActivity(5)
    ]);

    res.json({
      success: true,
      data: {
        kpis: kpis.slice(0, 4), // Top 4 KPIs
        modules: modules.slice(0, 6), // Top 6 modules
        health,
        recentActivity: activity
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard summary'
    });
  }
});

// Export Data
router.get('/export/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;

    if (!['kpis', 'activity', 'modules'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export type'
      });
    }

    if (!['json', 'csv'].includes(format as string)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Use json or csv'
      });
    }

    const data = await dashboardService.exportData(
      type as 'kpis' | 'activity' | 'modules',
      format as 'json' | 'csv'
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-export-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(data);
    } else {
      res.json({
        success: true,
        data,
        exportType: type,
        format,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data'
    });
  }
});

// Dashboard settings (user preferences)
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Get user dashboard preferences
    const result = await pool.query(`
      SELECT preferences 
      FROM plataforma_core.user_preferences 
      WHERE user_id = $1 AND type = 'dashboard'
    `, [userId]);

    const preferences = result.rows[0]?.preferences || {
      refreshInterval: 30000, // 30 seconds
      defaultChartPeriod: '30d',
      widgetOrder: ['kpis', 'charts', 'modules', 'activity'],
      showSystemHealth: true,
      compactMode: false
    };

    res.json({
      success: true,
      data: preferences,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dashboard settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard settings'
    });
  }
});

// Update dashboard settings
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { preferences } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid preferences object'
      });
    }

    // Update user dashboard preferences
    await pool.query(`
      INSERT INTO plataforma_core.user_preferences (user_id, type, preferences, updated_at)
      VALUES ($1, 'dashboard', $2, NOW())
      ON CONFLICT (user_id, type)
      DO UPDATE SET preferences = $2, updated_at = NOW()
    `, [userId, JSON.stringify(preferences)]);

    res.json({
      success: true,
      message: 'Dashboard settings updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating dashboard settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update dashboard settings'
    });
  }
});

// Performance metrics endpoint for monitoring
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const { period = '24h' } = req.query;
    
    const performanceData = await dashboardService.getChartData('performance', period as string);
    
    res.json({
      success: true,
      data: performanceData,
      period,
      averageResponseTime: performanceData.reduce((acc, curr) => acc + curr.value, 0) / performanceData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance data'
    });
  }
});

export default router;