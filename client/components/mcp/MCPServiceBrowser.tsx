/**
 * MCP Service Browser - React component for browsing and executing MCP services
 * Demonstrates the unified MCP integration
 */

import React, { useState, useEffect } from 'react';
import { useMCP, useMCPServices, useMCPHealth, MCP_CATEGORIES } from '../../lib/api/mcp-client';
import { WindowCard, WindowButton, WindowInput, WindowToggle } from '../ui';
import { 
  Cloud, 
  Settings, 
  Play, 
  BarChart3, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Zap,
  Github,
  Database,
  MessageSquare,
  Globe,
  Image,
  FileText,
  Music,
  ShoppingCart,
  Bot
} from 'lucide-react';

// Category icons mapping
const CATEGORY_ICONS = {
  ecommerce: ShoppingCart,
  social: MessageSquare,
  development: Github,
  database: Database,
  storage: Cloud,
  ai: Bot,
  google: Globe,
  communication: MessageSquare,
  whatsapp: MessageSquare,
  documents: FileText,
  images: Image,
  music: Music,
  utilities: Settings,
  brasil: Globe
};

interface MCPServiceBrowserProps {
  onServiceExecute?: (service: string, tool: string, result: any) => void;
}

export function MCPServiceBrowser({ onServiceExecute }: MCPServiceBrowserProps) {
  const { services, loading, error } = useMCPServices();
  const { health } = useMCPHealth();
  const mcp = useMCP();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [serviceTools, setServiceTools] = useState<any[]>([]);
  const [toolParams, setToolParams] = useState<Record<string, any>>({});
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executing, setExecuting] = useState(false);
  const [usageStats, setUsageStats] = useState<any>(null);

  // Load categories
  const categories = services ? Array.from(new Set(Object.values(services).map(s => s.category))) : [];

  // Filter services by category
  const filteredServices = services 
    ? selectedCategory === 'all' 
      ? services
      : Object.fromEntries(
          Object.entries(services).filter(([, service]) => service.category === selectedCategory)
        )
    : {};

  // Load tools when service is selected
  useEffect(() => {
    if (selectedService && services?.[selectedService]?.available) {
      mcp.getServiceTools(selectedService)
        .then(tools => {
          setServiceTools(tools);
          setSelectedTool('');
        })
        .catch(console.error);
    }
  }, [selectedService, mcp]);

  // Load usage stats
  useEffect(() => {
    mcp.getUsageStats().then(setUsageStats).catch(console.error);
  }, [mcp]);

  const handleExecuteTool = async () => {
    if (!selectedService || !selectedTool) return;

    setExecuting(true);
    try {
      const result = await mcp.executeTool(selectedService, selectedTool, toolParams);
      setExecutionResult(result);
      
      if (onServiceExecute) {
        onServiceExecute(selectedService, selectedTool, result);
      }

      // Refresh usage stats
      const newStats = await mcp.getUsageStats();
      setUsageStats(newStats);
    } catch (error) {
      console.error('Tool execution failed:', error);
      setExecutionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed'
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleParamChange = (paramName: string, value: any) => {
    setToolParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const getHealthIcon = (serviceName: string) => {
    const serviceHealth = health?.[serviceName];
    if (!serviceHealth?.available) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (!serviceHealth?.authenticated) return <Clock className="w-4 h-4 text-yellow-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getCategoryIcon = (category: string) => {
    const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Settings;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <WindowCard title="MCP Services">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="ml-2 text-gray-400">Loading MCP services...</span>
        </div>
      </WindowCard>
    );
  }

  if (error) {
    return (
      <WindowCard title="MCP Services">
        <div className="flex items-center text-red-400 py-4">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>Failed to load MCP services: {error}</span>
        </div>
      </WindowCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">MCP Service Browser</h2>
        <div className="flex items-center space-x-2">
          <WindowButton variant="secondary" icon={<BarChart3 />}>
            Usage Stats
          </WindowButton>
          <WindowButton variant="secondary" icon={<Settings />}>
            Configure
          </WindowButton>
        </div>
      </div>

      {/* Service Categories */}
      <WindowCard title="Categories">
        <div className="flex flex-wrap gap-2">
          <WindowButton
            variant={selectedCategory === 'all' ? 'primary' : 'secondary'}
            onClick={() => setSelectedCategory('all')}
          >
            All Services
          </WindowButton>
          {categories.map(category => (
            <WindowButton
              key={category}
              variant={selectedCategory === category ? 'primary' : 'secondary'}
              icon={getCategoryIcon(category)}
              onClick={() => setSelectedCategory(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </WindowButton>
          ))}
        </div>
      </WindowCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services List */}
        <WindowCard title={`Services ${selectedCategory !== 'all' ? `(${selectedCategory})` : ''}`}>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {Object.entries(filteredServices).map(([serviceName, serviceInfo]) => (
              <div
                key={serviceName}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedService === serviceName
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => setSelectedService(serviceName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getHealthIcon(serviceName)}
                    <span className="font-medium text-white">{serviceName}</span>
                    {serviceInfo.requiresAuth && (
                      <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-300 rounded">
                        Auth Required
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{serviceInfo.category}</span>
                </div>
                {selectedService === serviceName && (
                  <div className="mt-2 text-sm text-gray-400">
                    Available: {serviceInfo.available ? 'Yes' : 'No'}
                    {serviceInfo.rateLimit && (
                      <span className="ml-4">
                        Rate Limit: {serviceInfo.rateLimit.requestsPerMinute}/min
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </WindowCard>

        {/* Tools & Execution */}
        <WindowCard title="Tools & Execution">
          {selectedService ? (
            <div className="space-y-4">
              {/* Tools List */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Available Tools
                </label>
                <select
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500"
                  value={selectedTool}
                  onChange={(e) => setSelectedTool(e.target.value)}
                >
                  <option value="">Select a tool...</option>
                  {serviceTools.map(tool => (
                    <option key={tool.name} value={tool.name}>
                      {tool.name} - {tool.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tool Parameters */}
              {selectedTool && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Parameters (JSON)
                  </label>
                  <textarea
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    placeholder='{"key": "value"}'
                    value={JSON.stringify(toolParams, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value || '{}');
                        setToolParams(parsed);
                      } catch {
                        // Invalid JSON, ignore
                      }
                    }}
                  />
                </div>
              )}

              {/* Execute Button */}
              <WindowButton
                variant="success"
                icon={executing ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Play />}
                onClick={handleExecuteTool}
                disabled={!selectedTool || executing}
              >
                {executing ? 'Executing...' : 'Execute Tool'}
              </WindowButton>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              Select a service to view its tools
            </div>
          )}
        </WindowCard>
      </div>

      {/* Execution Results */}
      {executionResult && (
        <WindowCard title="Execution Result">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              {executionResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <span className={`font-medium ${
                executionResult.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {executionResult.success ? 'Success' : 'Failed'}
              </span>
              <span className="text-gray-400">
                ({executionResult.executionTime}ms)
              </span>
            </div>

            <pre className="bg-black/30 border border-white/20 rounded-lg p-4 text-sm text-white overflow-x-auto">
              {JSON.stringify(executionResult, null, 2)}
            </pre>
          </div>
        </WindowCard>
      )}

      {/* Usage Statistics */}
      {usageStats && (
        <WindowCard title="Usage Statistics">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(usageStats).slice(0, 8).map(([serviceName, stats]: [string, any]) => (
              <div key={serviceName} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{serviceName}</span>
                  {getHealthIcon(serviceName)}
                </div>
                <div className="space-y-1 text-xs text-gray-400">
                  <div>Requests: {stats.totalRequests}</div>
                  <div>Success: {stats.successfulRequests}</div>
                  <div>Avg Time: {Math.round(stats.averageExecutionTime)}ms</div>
                </div>
              </div>
            ))}
          </div>
        </WindowCard>
      )}
    </div>
  );
}

export default MCPServiceBrowser;