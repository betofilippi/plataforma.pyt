/**
 * Basic usage example for the Dynamic Module Loader
 */

import React, { useState } from 'react';
import {
  ModuleProvider,
  DynamicModuleLoader,
  LoadingFallback,
  ModuleErrorBoundary,
  useModuleLoader,
  useCommunication,
  useModuleState,
  ModuleRegistryStatus
} from '@plataforma/module-loader';

// Example module URLs (these would be real remote modules in practice)
const EXAMPLE_MODULES = {
  'user-dashboard': 'https://cdn.example.com/modules/user-dashboard/index.js',
  'analytics-widget': 'https://cdn.example.com/modules/analytics-widget/index.js',
  'chat-component': 'https://cdn.example.com/modules/chat-component/index.js'
};

/**
 * Basic module loading example
 */
function BasicExample() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Basic Module Loading</h2>
      
      <DynamicModuleLoader
        moduleName="user-dashboard"
        moduleUrl={EXAMPLE_MODULES['user-dashboard']}
        fallback={
          <LoadingFallback
            moduleName="user-dashboard"
            animation="spinner"
            size="medium"
          />
        }
        onLoad={() => console.log('User dashboard loading...')}
        onReady={(module) => console.log('User dashboard ready:', module)}
        onError={(error) => console.error('User dashboard error:', error)}
      />
    </div>
  );
}

/**
 * Advanced module loading with custom error handling
 */
function AdvancedExample() {
  const [selectedModule, setSelectedModule] = useState<string>('analytics-widget');
  
  const CustomErrorFallback = ({ error, retry, moduleName }: any) => (
    <div className="p-4 border border-red-300 rounded-lg bg-red-50">
      <h3 className="font-bold text-red-800">Failed to load {moduleName}</h3>
      <p className="text-red-600 text-sm mt-1">{error.message}</p>
      <div className="mt-3 space-x-2">
        <button
          onClick={retry}
          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
        <button
          onClick={() => setSelectedModule('user-dashboard')}
          className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
        >
          Load Different Module
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Advanced Module Loading</h2>
      
      <div className="space-x-2">
        {Object.keys(EXAMPLE_MODULES).map(moduleName => (
          <button
            key={moduleName}
            onClick={() => setSelectedModule(moduleName)}
            className={`px-3 py-1 rounded text-sm ${
              selectedModule === moduleName
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Load {moduleName}
          </button>
        ))}
      </div>

      <ModuleErrorBoundary
        moduleName={selectedModule}
        fallback={CustomErrorFallback}
        onError={(error) => console.error(`Module ${selectedModule} error:`, error)}
        autoRetry={false}
      >
        <DynamicModuleLoader
          moduleName={selectedModule}
          moduleUrl={EXAMPLE_MODULES[selectedModule as keyof typeof EXAMPLE_MODULES]}
          fallback={
            <div className="p-8 text-center">
              <LoadingFallback
                moduleName={selectedModule}
                animation="progress"
                size="large"
                message={`Loading ${selectedModule}...`}
              />
            </div>
          }
          lazy={true}
          timeout={10000}
          retries={2}
        />
      </ModuleErrorBoundary>
    </div>
  );
}

/**
 * Module loader hook usage example
 */
function HookExample() {
  const { loadModule, unloadModule, isLoaded, listModules } = useModuleLoader();
  const [loading, setLoading] = useState(false);
  const [loadedModules, setLoadedModules] = useState<string[]>([]);

  const handleLoadModule = async (moduleName: string) => {
    setLoading(true);
    try {
      await loadModule(moduleName, EXAMPLE_MODULES[moduleName as keyof typeof EXAMPLE_MODULES]);
      setLoadedModules(listModules());
    } catch (error) {
      console.error('Failed to load module:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnloadModule = async (moduleName: string) => {
    try {
      await unloadModule(moduleName);
      setLoadedModules(listModules());
    } catch (error) {
      console.error('Failed to unload module:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Module Loader Hook Example</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.keys(EXAMPLE_MODULES).map(moduleName => {
          const loaded = isLoaded(moduleName);
          
          return (
            <div key={moduleName} className="p-3 border rounded-lg">
              <h3 className="font-medium">{moduleName}</h3>
              <p className="text-sm text-gray-600 mb-2">
                Status: {loaded ? 'Loaded' : 'Not loaded'}
              </p>
              <div className="space-x-2">
                <button
                  onClick={() => handleLoadModule(moduleName)}
                  disabled={loading || loaded}
                  className="px-2 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50"
                >
                  Load
                </button>
                <button
                  onClick={() => handleUnloadModule(moduleName)}
                  disabled={!loaded}
                  className="px-2 py-1 bg-red-600 text-white rounded text-xs disabled:opacity-50"
                >
                  Unload
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h4 className="font-medium mb-2">Currently Loaded Modules:</h4>
        <p className="text-sm text-gray-600">
          {loadedModules.length > 0 ? loadedModules.join(', ') : 'None'}
        </p>
      </div>
    </div>
  );
}

/**
 * Communication example
 */
function CommunicationExample() {
  const { emit, on, getSharedState, setSharedState, eventHistory } = useCommunication('demo-component');
  const [messages, setMessages] = useState<string[]>([]);
  const [sharedCounter, setSharedCounter] = useState(0);

  React.useEffect(() => {
    // Listen for demo events
    const unsubscribe = on('demo:message', (event) => {
      setMessages(prev => [...prev, `${event.source}: ${event.payload.message}`]);
    });

    // Get initial shared counter
    const counter = getSharedState<number>('demo:counter') || 0;
    setSharedCounter(counter);

    // Listen for counter changes
    const unsubscribeCounter = on('shared-state:change', (event) => {
      if (event.payload.key === 'demo:counter') {
        setSharedCounter(event.payload.value);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeCounter();
    };
  }, [on, getSharedState]);

  const sendMessage = () => {
    emit('demo:message', { 
      message: `Hello from demo component at ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now()
    });
  };

  const incrementCounter = () => {
    const newValue = sharedCounter + 1;
    setSharedState('demo:counter', newValue, true); // persistent
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Communication Example</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">Event Communication</h3>
          <button
            onClick={sendMessage}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm mb-3"
          >
            Send Message
          </button>
          
          <div className="max-h-32 overflow-y-auto">
            <h4 className="text-sm font-medium mb-1">Messages:</h4>
            {messages.length > 0 ? (
              <ul className="text-xs space-y-1">
                {messages.slice(-5).map((message, index) => (
                  <li key={index} className="text-gray-600">{message}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">No messages yet</p>
            )}
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">Shared State</h3>
          <div className="flex items-center space-x-3">
            <span className="text-2xl font-mono">{sharedCounter}</span>
            <button
              onClick={incrementCounter}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm"
            >
              Increment
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            This counter is shared across all modules
          </p>
        </div>
      </div>

      <div className="p-4 border rounded-lg">
        <h4 className="font-medium mb-2">Recent Events ({eventHistory.length})</h4>
        <div className="max-h-32 overflow-y-auto">
          {eventHistory.slice(-10).reverse().map((event, index) => (
            <div key={event.id} className="text-xs text-gray-600 mb-1">
              <span className="font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
              {' '}
              <span className="font-medium">{event.type}</span>
              {' from '}
              <span className="font-medium">{event.source}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Module state management example
 */
function ModuleStateExample() {
  const { module, loading, error, state, reload, unload } = useModuleState(
    'user-dashboard',
    EXAMPLE_MODULES['user-dashboard']
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Module State Management</h2>
      
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Module: user-dashboard</h3>
          <div className="space-x-2">
            <button
              onClick={reload}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
            >
              Reload
            </button>
            <button
              onClick={unload}
              disabled={loading || !module}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm disabled:opacity-50"
            >
              Unload
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">State:</span>{' '}
            <span className={`px-2 py-1 rounded text-xs ${
              state === 'loaded' ? 'bg-green-100 text-green-800' :
              state === 'loading' ? 'bg-yellow-100 text-yellow-800' :
              state === 'error' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {state}
            </span>
          </div>
          <div>
            <span className="font-medium">Loading:</span> {loading ? 'Yes' : 'No'}
          </div>
          <div>
            <span className="font-medium">Module:</span> {module ? 'Available' : 'Not available'}
          </div>
          <div>
            <span className="font-medium">Error:</span> {error ? error.message : 'None'}
          </div>
        </div>

        {error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
            <strong>Error Details:</strong> {error.message}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main demo app
 */
export default function ModuleLoaderDemo() {
  const [activeTab, setActiveTab] = useState('basic');

  const tabs = [
    { id: 'basic', label: 'Basic Loading', component: BasicExample },
    { id: 'advanced', label: 'Advanced Loading', component: AdvancedExample },
    { id: 'hooks', label: 'Hook Usage', component: HookExample },
    { id: 'communication', label: 'Communication', component: CommunicationExample },
    { id: 'state', label: 'Module State', component: ModuleStateExample }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || BasicExample;

  return (
    <ModuleProvider
      config={{
        cache: {
          maxSize: 10,
          defaultTtl: 60 * 1000, // 1 minute for demo
          enablePersistence: true,
          enableVersionCheck: true
        },
        communication: {
          enableEventReplay: true,
          maxEventHistory: 100,
          debug: true
        },
        timeout: 10000,
        retries: 2,
        enableHMR: true,
        dev: {
          verbose: true,
          enableDiscovery: true
        }
      }}
    >
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dynamic Module Loader Demo</h1>
          <p className="text-gray-600">
            Comprehensive demonstration of the @plataforma/module-loader package features
          </p>
        </header>

        <nav className="mb-8">
          <div className="flex space-x-1 border-b">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <main className="mb-8">
          <ActiveComponent />
        </main>

        <footer className="border-t pt-6">
          <h2 className="text-xl font-bold mb-4">Module Registry Status</h2>
          <ModuleRegistryStatus />
        </footer>
      </div>
    </ModuleProvider>
  );
}