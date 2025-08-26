/**
 * Supabase Edge Functions Window
 * Integrates the Edge Functions Manager into the desktop system
 */
import React, { useState } from 'react';
import { Zap, Bot, Code, Settings } from 'lucide-react';
// import { EdgeFunctionsManager, AIFunctionWriter } from '@/client/supabase-platform-kit'; // REMOVIDO - pasta deletada

const SupabaseEdgeFunctions: React.FC = () => {
  const [activeView, setActiveView] = useState<'manager' | 'ai-writer'>('manager');

  return (
    <div className="w-full h-full bg-gray-900 overflow-hidden">
      {/* Window Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Zap className="w-6 h-6 text-purple-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Edge Functions</h1>
              <p className="text-sm text-gray-400">Supabase Platform Kit 2025</p>
            </div>
          </div>

          {/* View Switcher */}
          <div className="flex items-center space-x-1 bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveView('manager')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md font-medium transition-all ${
                activeView === 'manager'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Manager</span>
            </button>
            
            <button
              onClick={() => setActiveView('ai-writer')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md font-medium transition-all ${
                activeView === 'ai-writer'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>AI Writer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="h-full overflow-y-auto">
        <div className="p-8 text-center">
          <p className="text-gray-500">Edge Functions Manager foi removido</p>
          <p className="text-sm text-gray-400 mt-2">Componente da pasta supabase-platform-kit que foi deletada</p>
        </div>
      </div>
    </div>
  );
};

export default SupabaseEdgeFunctions;