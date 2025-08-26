/**
 * Module Federation Demo Component
 * Demonstrates dynamic loading of remote modules
 */

import React, { useState, useEffect } from 'react';
import { WindowCard, WindowButton } from '@/components/ui';
import { Play, Download, Loader2, CheckCircle, XCircle, Info } from 'lucide-react';

// Import the runtime API
import { runtime } from '@plataforma/vite-plugin-module-federation';

interface ModuleInfo {
  name: string;
  status: 'unloaded' | 'loading' | 'loaded' | 'error';
  url?: string;
  error?: string;
  metadata?: any;
}

export default function ModuleFederationDemo() {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    // Initialize with some example modules
    setModules([
      {
        name: 'auth-module',
        url: 'http://localhost:3001/remote-entry.js',
        status: 'unloaded'
      },
      {
        name: 'dashboard-module', 
        url: 'http://localhost:3002/remote-entry.js',
        status: 'unloaded'
      },
      {
        name: 'ai-module',
        url: 'http://localhost:3003/remote-entry.js',
        status: 'unloaded'
      }
    ]);

    addLog('Module Federation Demo initialized');
    addLog('Runtime registry available: ' + !!runtime.getRegistry());
  }, []);

  const loadModule = async (moduleInfo: ModuleInfo) => {
    if (!moduleInfo.url) return;
    
    setIsLoading(true);
    setModules(prev => prev.map(m => 
      m.name === moduleInfo.name 
        ? { ...m, status: 'loading' }
        : m
    ));

    addLog(`Loading module: ${moduleInfo.name} from ${moduleInfo.url}`);

    try {
      // Try to load the module
      const module = await runtime.loadModule(moduleInfo.name, moduleInfo.url);
      
      setModules(prev => prev.map(m => 
        m.name === moduleInfo.name 
          ? { ...m, status: 'loaded', metadata: module }
          : m
      ));

      addLog(`✅ Successfully loaded module: ${moduleInfo.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      setModules(prev => prev.map(m => 
        m.name === moduleInfo.name 
          ? { ...m, status: 'error', error: errorMessage }
          : m
      ));

      addLog(`❌ Failed to load module ${moduleInfo.name}: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkModuleStatus = () => {
    addLog('Checking module registry status...');
    
    const registry = runtime.getRegistry();
    const registeredModules = runtime.listModules();
    
    addLog(`Registry modules count: ${registeredModules.length}`);
    
    registeredModules.forEach(module => {
      addLog(`- ${module.name}: ${module.status} (${module.url})`);
    });

    // Update our local state with registry info
    setModules(prev => prev.map(localModule => {
      const registryModule = registeredModules.find(rm => rm.name === localModule.name);
      if (registryModule) {
        return {
          ...localModule,
          status: registryModule.status as any,
          error: registryModule.error
        };
      }
      return localModule;
    }));
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loaded':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'loading':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-600" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <WindowCard title="🔗 Module Federation Demo">
        <div className="space-y-4">
          <p className="text-gray-400">
            This demo shows the Module Federation system in action. You can load remote modules 
            dynamically from different URLs.
          </p>
          
          <div className="flex gap-2">
            <WindowButton 
              variant="primary" 
              icon={<Info />}
              onClick={checkModuleStatus}
            >
              Check Status
            </WindowButton>
            
            <WindowButton 
              variant="secondary" 
              icon={<Download />}
              onClick={clearLogs}
            >
              Clear Logs
            </WindowButton>
          </div>
        </div>
      </WindowCard>

      {/* Module List */}
      <WindowCard title="📦 Remote Modules">
        <div className="space-y-3">
          {modules.map((module) => (
            <div 
              key={module.name}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(module.status)}
                <div>
                  <h3 className="text-white font-medium">{module.name}</h3>
                  <p className="text-xs text-gray-400 truncate max-w-[300px]">
                    {module.url}
                  </p>
                  {module.error && (
                    <p className="text-xs text-red-400 mt-1">
                      Error: {module.error}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <WindowButton
                  size="sm"
                  variant={module.status === 'loaded' ? 'success' : 'primary'}
                  icon={module.status === 'loading' ? <Loader2 className="animate-spin" /> : <Play />}
                  onClick={() => loadModule(module)}
                  disabled={isLoading || module.status === 'loading'}
                >
                  {module.status === 'loaded' ? 'Loaded' : 'Load'}
                </WindowButton>
              </div>
            </div>
          ))}
        </div>
      </WindowCard>

      {/* Registry Info */}
      <WindowCard title="📊 Module Registry">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="text-sm text-gray-400">Total Modules</div>
              <div className="text-2xl font-bold text-white">{modules.length}</div>
            </div>
            
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="text-sm text-gray-400">Loaded</div>
              <div className="text-2xl font-bold text-green-400">
                {modules.filter(m => m.status === 'loaded').length}
              </div>
            </div>
          </div>
        </div>
      </WindowCard>

      {/* Activity Logs */}
      <WindowCard title="📋 Activity Logs">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No activity yet...</p>
          ) : (
            logs.map((log, index) => (
              <div 
                key={index} 
                className="text-xs font-mono text-gray-300 p-2 bg-black/20 rounded"
              >
                {log}
              </div>
            ))
          )}
        </div>
      </WindowCard>

      {/* Debug Info */}
      <WindowCard title="🐛 Debug Information">
        <div className="space-y-2 text-xs text-gray-400 font-mono">
          <div>Runtime Registry: {runtime.getRegistry() ? '✅ Available' : '❌ Not Available'}</div>
          <div>Module Federation Plugin: ✅ Active</div>
          <div>HMR Support: {typeof (import.meta as any).hot !== 'undefined' ? '✅ Enabled' : '⚠️ Disabled'}</div>
          <div>Environment: {import.meta.env.MODE}</div>
          <div>Shared Dependencies: React, React-DOM, @plataforma/* packages</div>
        </div>
      </WindowCard>
    </div>
  );
}