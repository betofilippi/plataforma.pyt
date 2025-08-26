import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

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
  userName?: string;
  userAvatar?: string;
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

export interface UserActivityData {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: string;
  timestamp: Date;
  device?: 'desktop' | 'mobile' | 'tablet';
  module?: string;
}

interface DashboardState {
  kpis: KPIMetric[];
  charts: Record<string, ChartData[]>;
  activities: ActivityEvent[];
  modules: ModuleMetrics[];
  health: SystemHealth | null;
  userActivities: UserActivityData[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface DashboardSettings {
  refreshInterval: number;
  defaultChartPeriod: string;
  showSystemHealth: boolean;
  compactMode: boolean;
}

export function useDashboard() {
  const [state, setState] = useState<DashboardState>({
    kpis: [],
    charts: {},
    activities: [],
    modules: [],
    health: null,
    userActivities: [],
    loading: true,
    error: null,
    lastUpdated: null
  });

  const [settings, setSettings] = useState<DashboardSettings>({
    refreshInterval: 30000, // 30 seconds
    defaultChartPeriod: '30d',
    showSystemHealth: true,
    compactMode: false
  });

  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      // Fetch all dashboard data in parallel
      const [
        kpisResponse,
        activitiesResponse,
        modulesResponse,
        healthResponse,
        settingsResponse
      ] = await Promise.all([
        axios.get('/api/dashboard/kpis'),
        axios.get('/api/dashboard/activity?limit=50'),
        axios.get('/api/dashboard/modules'),
        axios.get('/api/dashboard/health'),
        axios.get('/api/dashboard/settings').catch(() => ({ data: { data: settings } })) // Fallback to default settings
      ]);

      // Parse timestamps
      const activities = activitiesResponse.data.data.map((activity: any) => ({
        ...activity,
        timestamp: new Date(activity.timestamp)
      }));

      const modules = modulesResponse.data.data.map((module: any) => ({
        ...module,
        lastActive: new Date(module.lastActive)
      }));

      // Generate mock user activities (replace with real API later)
      const userActivities: UserActivityData[] = activities.slice(0, 20).map((activity: any, index: number) => ({
        id: `user-${activity.id}`,
        userId: activity.userId || `user-${index}`,
        userName: activity.userName || `User ${index + 1}`,
        userAvatar: activity.userAvatar,
        action: activity.title,
        timestamp: activity.timestamp,
        device: ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)] as 'desktop' | 'mobile' | 'tablet',
        module: activity.module || 'plataforma'
      }));

      setState(prev => ({
        ...prev,
        kpis: kpisResponse.data.data,
        activities,
        modules,
        health: healthResponse.data.data,
        userActivities,
        loading: false,
        error: null,
        lastUpdated: new Date()
      }));

      // Update settings if fetched from server
      if (settingsResponse.data.data) {
        setSettings(settingsResponse.data.data);
      }

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.error || 'Erro ao carregar dados do dashboard'
      }));
    }
  }, [settings]);

  const fetchChartData = useCallback(async (type: string, period = '30d') => {
    try {
      const response = await axios.get(`/api/dashboard/charts/${type}?period=${period}`);
      
      const chartData = response.data.data.map((item: any) => ({
        ...item,
        date: item.date ? new Date(item.date) : undefined
      }));

      setState(prev => ({
        ...prev,
        charts: {
          ...prev.charts,
          [`${type}_${period}`]: chartData
        }
      }));

      return chartData;
    } catch (error) {
      console.error(`Error fetching ${type} chart data:`, error);
      return [];
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData(false);
    setRefreshing(false);
  }, [fetchDashboardData]);

  const exportData = useCallback(async (type: 'kpis' | 'activity' | 'modules', format: 'json' | 'csv' = 'json') => {
    try {
      const response = await axios.get(`/api/dashboard/export/${type}?format=${format}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-${type}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const dataStr = JSON.stringify(response.data.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-${type}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<DashboardSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      await axios.put('/api/dashboard/settings', {
        preferences: updatedSettings
      });

      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating dashboard settings:', error);
      throw error;
    }
  }, [settings]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Auto-refresh based on settings
  useEffect(() => {
    if (settings.refreshInterval > 0) {
      const interval = setInterval(() => {
        refreshDashboard();
      }, settings.refreshInterval);

      return () => clearInterval(interval);
    }
  }, [settings.refreshInterval, refreshDashboard]);

  return {
    // State
    kpis: state.kpis,
    charts: state.charts,
    activities: state.activities,
    modules: state.modules,
    health: state.health,
    userActivities: state.userActivities,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    refreshing,
    settings,

    // Actions
    refreshDashboard,
    fetchChartData,
    exportData,
    updateSettings,

    // Computed values
    isHealthy: state.health ? 
      state.health.uptime > 95 && 
      state.health.errorRate < 1 && 
      state.health.apiResponseTime < 500 : false,
    
    activeModulesCount: state.modules.filter(m => m.status === 'active').length,
    totalUsers: state.kpis.find(k => k.id === 'total_users')?.value || 0,
    activeUsers: state.kpis.find(k => k.id === 'active_users')?.value || 0
  };
}