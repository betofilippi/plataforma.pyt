import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  DollarSign, 
  Clock, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Brain,
  BarChart3,
  Settings,
  Bell,
  Eye,
  Users,
  Server,
  Wifi,
  WifiOff,
  Target,
  Gauge
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Treemap
} from 'recharts';
import { WindowCard, WindowButton, WindowInput, WindowToggle } from '@/components/ui';

// Types for AI monitoring data
interface AIMetrics {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  successRate: number;
  cacheHitRate: number;
  errorCount: number;
}

interface ProviderMetrics {
  name: string;
  calls: number;
  tokens: number;
  cost: number;
  avgTime: number;
  successRate: number;
  color: string;
}

interface TimeSeriesData {
  timestamp: string;
  calls: number;
  tokens: number;
  cost: number;
  responseTime: number;
  errors: number;
}

interface ModelPerformance {
  model: string;
  provider: string;
  averageTime: number;
  successRate: number;
  costPerToken: number;
  qualityScore: number;
  userPreference: number;
}

interface SystemHealth {
  service: string;
  status: 'online' | 'degraded' | 'offline';
  uptime: number;
  responseTime: number;
  errorRate: number;
  rateLimit: {
    current: number;
    limit: number;
    resetTime: string;
  };
}

interface BudgetAlert {
  id: string;
  type: 'warning' | 'critical';
  message: string;
  threshold: number;
  current: number;
  timestamp: string;
}

// Mock data generators
const generateMockMetrics = (): AIMetrics => ({
  totalCalls: Math.floor(Math.random() * 10000) + 5000,
  totalTokens: Math.floor(Math.random() * 1000000) + 500000,
  totalCost: Math.random() * 500 + 100,
  avgResponseTime: Math.random() * 2000 + 500,
  successRate: Math.random() * 20 + 80,
  cacheHitRate: Math.random() * 40 + 40,
  errorCount: Math.floor(Math.random() * 100) + 10
});

const generateProviderMetrics = (): ProviderMetrics[] => [
  {
    name: 'OpenAI GPT-4',
    calls: Math.floor(Math.random() * 3000) + 1000,
    tokens: Math.floor(Math.random() * 400000) + 200000,
    cost: Math.random() * 200 + 50,
    avgTime: Math.random() * 1000 + 800,
    successRate: Math.random() * 10 + 90,
    color: '#10B981'
  },
  {
    name: 'Claude 3.5 Sonnet',
    calls: Math.floor(Math.random() * 2500) + 800,
    tokens: Math.floor(Math.random() * 350000) + 150000,
    cost: Math.random() * 150 + 40,
    avgTime: Math.random() * 800 + 600,
    successRate: Math.random() * 8 + 92,
    color: '#8B5CF6'
  },
  {
    name: 'Gemini Pro',
    calls: Math.floor(Math.random() * 2000) + 500,
    tokens: Math.floor(Math.random() * 300000) + 100000,
    cost: Math.random() * 100 + 20,
    avgTime: Math.random() * 1200 + 400,
    successRate: Math.random() * 15 + 85,
    color: '#F59E0B'
  },
  {
    name: 'Mistral Large',
    calls: Math.floor(Math.random() * 1500) + 300,
    tokens: Math.floor(Math.random() * 200000) + 80000,
    cost: Math.random() * 80 + 15,
    avgTime: Math.random() * 900 + 500,
    successRate: Math.random() * 12 + 88,
    color: '#EF4444'
  }
];

const generateTimeSeriesData = (): TimeSeriesData[] => {
  const data = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      timestamp: timestamp.toISOString().slice(11, 16),
      calls: Math.floor(Math.random() * 500) + 100,
      tokens: Math.floor(Math.random() * 50000) + 10000,
      cost: Math.random() * 50 + 10,
      responseTime: Math.random() * 1000 + 500,
      errors: Math.floor(Math.random() * 20)
    });
  }
  
  return data;
};

const generateModelPerformance = (): ModelPerformance[] => [
  {
    model: 'GPT-4 Turbo',
    provider: 'OpenAI',
    averageTime: 1200,
    successRate: 99.2,
    costPerToken: 0.00003,
    qualityScore: 9.4,
    userPreference: 85
  },
  {
    model: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    averageTime: 800,
    successRate: 99.5,
    costPerToken: 0.000015,
    qualityScore: 9.6,
    userPreference: 92
  },
  {
    model: 'Gemini Pro',
    provider: 'Google',
    averageTime: 950,
    successRate: 98.1,
    costPerToken: 0.0000125,
    qualityScore: 8.8,
    userPreference: 78
  },
  {
    model: 'Mistral Large',
    provider: 'Mistral',
    averageTime: 750,
    successRate: 97.8,
    costPerToken: 0.000008,
    qualityScore: 8.5,
    userPreference: 65
  }
];

const generateSystemHealth = (): SystemHealth[] => [
  {
    service: 'OpenAI API',
    status: 'online',
    uptime: 99.9,
    responseTime: 234,
    errorRate: 0.1,
    rateLimit: { current: 4500, limit: 5000, resetTime: '15:30' }
  },
  {
    service: 'Claude API',
    status: 'online',
    uptime: 99.8,
    responseTime: 189,
    errorRate: 0.2,
    rateLimit: { current: 890, limit: 1000, resetTime: '16:00' }
  },
  {
    service: 'Gemini API',
    status: 'degraded',
    uptime: 97.5,
    responseTime: 450,
    errorRate: 2.5,
    rateLimit: { current: 1200, limit: 1500, resetTime: '15:45' }
  },
  {
    service: 'Mistral API',
    status: 'online',
    uptime: 99.1,
    responseTime: 156,
    errorRate: 0.9,
    rateLimit: { current: 678, limit: 800, resetTime: '16:15' }
  }
];

const generateBudgetAlerts = (): BudgetAlert[] => [
  {
    id: '1',
    type: 'warning',
    message: 'Monthly budget 75% consumed',
    threshold: 75,
    current: 78,
    timestamp: new Date().toISOString()
  },
  {
    id: '2',
    type: 'critical',
    message: 'OpenAI daily spend limit approaching',
    threshold: 90,
    current: 92,
    timestamp: new Date().toISOString()
  }
];

export function AIMonitor() {
  const [metrics, setMetrics] = useState<AIMetrics>(generateMockMetrics());
  const [providers, setProviders] = useState<ProviderMetrics[]>(generateProviderMetrics());
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>(generateTimeSeriesData());
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>(generateModelPerformance());
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>(generateSystemHealth());
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>(generateBudgetAlerts());
  
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [monthlyBudget, setMonthlyBudget] = useState(1000);
  const [realTimeMode, setRealTimeMode] = useState(true);

  // Simulated real-time updates
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setMetrics(generateMockMetrics());
      setProviders(generateProviderMetrics());
      setTimeSeriesData(generateTimeSeriesData());
      setSystemHealth(generateSystemHealth());
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(amount);

  const formatNumber = (num: number) => 
    new Intl.NumberFormat('pt-BR').format(Math.round(num));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'offline': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4" />;
      case 'offline': return <XCircle className="w-4 h-4" />;
      default: return <RefreshCw className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-purple-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">AI Monitoring Dashboard</h1>
            <p className="text-gray-400">Real-time AI performance and cost analytics</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <WindowToggle
            label="Auto Refresh"
            checked={autoRefresh}
            onChange={setAutoRefresh}
          />
          <WindowToggle
            label="Real-time"
            checked={realTimeMode}
            onChange={setRealTimeMode}
          />
          <WindowButton variant="secondary" icon={<Settings />}>
            Settings
          </WindowButton>
        </div>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <WindowCard title="Budget Alerts">
          <div className="space-y-3">
            {budgetAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  alert.type === 'critical' 
                    ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">{alert.message}</span>
                </div>
                <div className="text-sm">
                  {alert.current}% of {alert.threshold}%
                </div>
              </div>
            ))}
          </div>
        </WindowCard>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <WindowCard title="Total API Calls">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white">{formatNumber(metrics.totalCalls)}</div>
              <div className="text-sm text-gray-400">Today</div>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
          <div className="mt-2 text-sm text-green-400">
            +12.5% from yesterday
          </div>
        </WindowCard>

        <WindowCard title="Total Cost">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white">{formatCurrency(metrics.totalCost)}</div>
              <div className="text-sm text-gray-400">This month</div>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
          <div className="mt-2 text-sm text-yellow-400">
            {((metrics.totalCost / monthlyBudget) * 100).toFixed(1)}% of budget
          </div>
        </WindowCard>

        <WindowCard title="Avg Response Time">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white">{Math.round(metrics.avgResponseTime)}ms</div>
              <div className="text-sm text-gray-400">Last 24h</div>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
          <div className="mt-2 text-sm text-green-400">
            -5.2% improvement
          </div>
        </WindowCard>

        <WindowCard title="Success Rate">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white">{metrics.successRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Overall</div>
            </div>
            <Zap className="w-8 h-8 text-purple-500" />
          </div>
          <div className="mt-2 text-sm text-green-400">
            +0.3% this week
          </div>
        </WindowCard>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Usage Over Time */}
        <WindowCard title="API Usage Trends">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="timestamp" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="calls" 
                  stackId="1" 
                  stroke="#8B5CF6" 
                  fill="#8B5CF6" 
                  fillOpacity={0.3}
                  name="API Calls"
                />
                <Area 
                  type="monotone" 
                  dataKey="errors" 
                  stackId="2" 
                  stroke="#EF4444" 
                  fill="#EF4444" 
                  fillOpacity={0.3}
                  name="Errors"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </WindowCard>

        {/* Cost Breakdown by Provider */}
        <WindowCard title="Cost by Provider">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={providers}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="cost"
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                >
                  {providers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </WindowCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Usage Trends */}
        <WindowCard title="Token Usage & Response Time">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="timestamp" stroke="#9CA3AF" />
                <YAxis yAxisId="left" stroke="#9CA3AF" />
                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="tokens" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Tokens"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  name="Response Time (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </WindowCard>

        {/* Provider Performance Comparison */}
        <WindowCard title="Provider Performance">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={providers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="successRate" fill="#10B981" name="Success Rate %" />
                <Bar dataKey="avgTime" fill="#8B5CF6" name="Avg Time (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WindowCard>
      </div>

      {/* Model Performance Table */}
      <WindowCard title="Model Performance Comparison">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400">Model</th>
                <th className="text-left py-3 px-4 text-gray-400">Provider</th>
                <th className="text-left py-3 px-4 text-gray-400">Avg Time</th>
                <th className="text-left py-3 px-4 text-gray-400">Success Rate</th>
                <th className="text-left py-3 px-4 text-gray-400">Cost/Token</th>
                <th className="text-left py-3 px-4 text-gray-400">Quality</th>
                <th className="text-left py-3 px-4 text-gray-400">Preference</th>
              </tr>
            </thead>
            <tbody>
              {modelPerformance.map((model, index) => (
                <tr key={index} className="border-b border-gray-700/50">
                  <td className="py-3 px-4 text-white font-medium">{model.model}</td>
                  <td className="py-3 px-4 text-gray-300">{model.provider}</td>
                  <td className="py-3 px-4 text-gray-300">{model.averageTime}ms</td>
                  <td className="py-3 px-4">
                    <span className="text-green-400">{model.successRate}%</span>
                  </td>
                  <td className="py-3 px-4 text-gray-300">${model.costPerToken.toFixed(6)}</td>
                  <td className="py-3 px-4">
                    <span className="text-purple-400">{model.qualityScore}/10</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-12 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${model.userPreference}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400">{model.userPreference}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WindowCard>

      {/* System Health Status */}
      <WindowCard title="System Health & Status">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemHealth.map((service, index) => (
            <div key={index} className="bg-black/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-white">{service.service}</h3>
                <div className={`flex items-center space-x-1 ${getStatusColor(service.status)}`}>
                  {getStatusIcon(service.status)}
                  <span className="text-sm capitalize">{service.status}</span>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Uptime:</span>
                  <span className="text-green-400">{service.uptime}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Response:</span>
                  <span className="text-blue-400">{service.responseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Error Rate:</span>
                  <span className="text-red-400">{service.errorRate}%</span>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Rate Limit</span>
                    <span>{service.rateLimit.current}/{service.rateLimit.limit}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${(service.rateLimit.current / service.rateLimit.limit) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Resets at {service.rateLimit.resetTime}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </WindowCard>

      {/* Budget Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WindowCard title="Budget Management">
          <div className="space-y-4">
            <WindowInput
              label="Monthly Budget"
              type="number"
              value={monthlyBudget.toString()}
              onChange={(e) => setMonthlyBudget(Number(e.target.value))}
              description="Set your monthly AI spending limit"
            />
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current Spend</span>
                <span className="text-white">{formatCurrency(metrics.totalCost)}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${
                    (metrics.totalCost / monthlyBudget) > 0.9 
                      ? 'bg-red-500' 
                      : (metrics.totalCost / monthlyBudget) > 0.75 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((metrics.totalCost / monthlyBudget) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>0%</span>
                <span>75%</span>
                <span>90%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">
                  {formatCurrency(monthlyBudget - metrics.totalCost)}
                </div>
                <div className="text-xs text-gray-400">Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">
                  {formatCurrency(metrics.totalCost / new Date().getDate())}
                </div>
                <div className="text-xs text-gray-400">Daily Avg</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">
                  {Math.round(((monthlyBudget - metrics.totalCost) / (30 - new Date().getDate())))}
                </div>
                <div className="text-xs text-gray-400">Days Left</div>
              </div>
            </div>
          </div>
        </WindowCard>

        <WindowCard title="Cost Optimization Suggestions">
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Target className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <div className="font-medium text-blue-400">Use Claude for longer texts</div>
                <div className="text-sm text-gray-400">
                  Claude 3.5 Sonnet has better cost/token ratio for complex tasks
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <Gauge className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <div className="font-medium text-green-400">Enable caching</div>
                <div className="text-sm text-gray-400">
                  Current cache hit rate: {metrics.cacheHitRate.toFixed(1)}% - could be improved
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <TrendingUp className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <div className="font-medium text-yellow-400">Monitor peak hours</div>
                <div className="text-sm text-gray-400">
                  Consider scheduling heavy workloads during off-peak times
                </div>
              </div>
            </div>
          </div>
        </WindowCard>
      </div>
    </div>
  );
}