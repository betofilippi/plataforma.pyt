/**
 * Design System Showcase - Galeria interativa completa
 * Mostra todos os componentes, cores e padrões disponíveis
 */

import React, { useState } from 'react';
import { 
  StandardIcon, 
  StandardCard, 
  AdminCard, 
  SystemCard, 
  PlatformCard,
  StandardBadge,
  StatusBadge,
  RoleBadge,
  PermissionBadge,
  ModuleBadge,
  WindowButton,
  WindowInput,
  WindowToggle 
} from '@/components/ui';
import { 
  MODULE_COLORS, 
  getModuleColor 
} from '@/lib/module-colors';
import { 
  UI_CONTEXTS, 
  resolveColors, 
  debugContext 
} from '@/lib/ui-standards';
import { 
  Palette,
  Copy,
  Check,
  Settings,
  Users,
  Database,
  Shield,
  Layout,
  Zap,
  Star,
  Heart,
  Sparkles
} from 'lucide-react';

export default function DesignSystemShowcase() {
  const [activeTab, setActiveTab] = useState<'colors' | 'components' | 'contexts' | 'templates'>('colors');
  const [copiedCode, setCopiedCode] = useState('');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copyToClipboard(text, id)}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/10 border border-white/20 rounded hover:bg-white/20 transition-colors"
    >
      {copiedCode === id ? <Check size={12} /> : <Copy size={12} />}
      {copiedCode === id ? 'Copied!' : 'Copy'}
    </button>
  );

  return (
    <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Palette className="h-6 w-6 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">Design System Showcase</h1>
        </div>
        <p className="text-gray-300 text-sm">
          Galeria completa de componentes, cores e padrões do sistema
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 bg-white/10 rounded-xl p-1">
        {[
          { id: 'colors', label: '🎨 Cores', desc: 'Paleta de módulos' },
          { id: 'components', label: '🧩 Componentes', desc: 'Galeria visual' },
          { id: 'contexts', label: '📐 Contextos', desc: 'UI Contexts' },
          { id: 'templates', label: '🖼️ Templates', desc: 'Padrões de uso' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
              }
            `}
          >
            <div>{tab.label}</div>
            <div className="text-xs opacity-70">{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div className="space-y-6">
          <AdminCard title="🎨 Module Colors Palette" variant="highlighted">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(MODULE_COLORS).map(([name, color]) => (
                <div key={name} className="space-y-3">
                  {/* Color Preview */}
                  <div className="relative">
                    <div 
                      className="h-20 rounded-lg border border-white/20 flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${color.primary}, ${color.secondary})` }}
                    >
                      <span className="text-white font-medium text-sm drop-shadow-lg">
                        {name.toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <CopyButton 
                        text={`getModuleColor('${name}')`}
                        id={`color-${name}`}
                      />
                    </div>
                  </div>
                  
                  {/* Color Details */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Primary:</span>
                      <span className="text-white font-mono">{color.primary}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Secondary:</span>
                      <span className="text-white font-mono">{color.secondary}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      )}

      {/* Components Tab */}
      {activeTab === 'components' && (
        <div className="space-y-6">
          {/* Icons */}
          <AdminCard title="🔸 Standard Icons" variant="highlighted">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <StandardIcon Icon={Settings} context={{module: 'sistema'}} size="sm" label="SISTEMA" />
                <StandardIcon Icon={Users} context={{module: 'sistema', function: 'admin'}} size="md" label="ADMIN" />
                <StandardIcon Icon={Database} context={{module: 'plataforma'}} size="lg" label="PLATFORM" />
                <StandardIcon Icon={Shield} context={{module: 'admin'}} size="xl" label="SECURITY" />
              </div>
              <CopyButton 
                text={`<StandardIcon Icon={Settings} context={{module: 'sistema'}} size="lg" label="CONFIG" />`}
                id="icon-example"
              />
            </div>
          </AdminCard>

          {/* Cards */}
          <AdminCard title="🔸 Standard Cards" variant="highlighted">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SystemCard title="System Card" padding="sm">
                <p className="text-sm text-gray-300">Sistema context com padding pequeno</p>
              </SystemCard>
              <AdminCard title="Admin Card" padding="md">
                <p className="text-sm text-gray-300">Admin context com padding médio</p>
              </AdminCard>
              <PlatformCard title="Platform Card" padding="lg">
                <p className="text-sm text-gray-300">Plataforma context com padding grande</p>
              </PlatformCard>
              <StandardCard context={{module: 'database'}} title="Custom Context">
                <p className="text-sm text-gray-300">Contexto customizado database</p>
              </StandardCard>
            </div>
            <CopyButton 
              text={`<AdminCard title="My Card" padding="md">Content</AdminCard>`}
              id="card-example"
            />
          </AdminCard>

          {/* Badges */}
          <AdminCard title="🔸 Standard Badges" variant="highlighted">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Status Badges</h4>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status="active">Active</StatusBadge>
                  <StatusBadge status="pending">Pending</StatusBadge>
                  <StatusBadge status="suspended">Suspended</StatusBadge>
                  <StatusBadge status="rejected">Rejected</StatusBadge>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Role & Permission Badges</h4>
                <div className="flex flex-wrap gap-2">
                  <RoleBadge role="admin" />
                  <RoleBadge role="user" />
                  <RoleBadge role="manager" />
                  <PermissionBadge permission="read" />
                  <PermissionBadge permission="write" />
                  <ModuleBadge module="sistema" />
                </div>
              </div>
              
              <CopyButton 
                text={`<StatusBadge status="active">Active</StatusBadge>`}
                id="badge-example"
              />
            </div>
          </AdminCard>

          {/* Form Components */}
          <AdminCard title="🔸 Form Components" variant="highlighted">
            <div className="space-y-4 max-w-md">
              <WindowInput 
                placeholder="Standard Input" 
                label="Nome"
              />
              <WindowToggle 
                checked={true}
                label="Enable feature"
              />
              <WindowButton variant="primary">
                Primary Button
              </WindowButton>
              <WindowButton variant="secondary">
                Secondary Button
              </WindowButton>
            </div>
            <CopyButton 
              text={`<WindowInput placeholder="Email" label="Your Email" />`}
              id="form-example"
            />
          </AdminCard>
        </div>
      )}

      {/* Contexts Tab */}
      {activeTab === 'contexts' && (
        <div className="space-y-6">
          <AdminCard title="📐 UI Contexts Available" variant="highlighted">
            <div className="space-y-6">
              {Object.entries(UI_CONTEXTS).map(([name, context]) => {
                const colors = resolveColors(context);
                return (
                  <div key={name} className="border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-white">{name}</h3>
                      <CopyButton 
                        text={`UI_CONTEXTS.${name}`}
                        id={`context-${name}`}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-xs text-gray-400">Module:</span>
                        <div className="text-sm text-white">{context.module}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Function:</span>
                        <div className="text-sm text-white">{context.function || 'Same as module'}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <StandardIcon 
                        Icon={Sparkles} 
                        context={context} 
                        size="sm" 
                        label="PREVIEW" 
                      />
                      <StandardCard context={context} padding="sm">
                        <span className="text-xs text-gray-300">Context Preview</span>
                      </StandardCard>
                    </div>
                  </div>
                );
              })}
            </div>
          </AdminCard>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <AdminCard title="🖼️ Common Patterns & Templates" variant="highlighted">
            <div className="space-y-6">
              {/* Icon + Card Pattern */}
              <div className="border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white">Icon + Card Pattern</h3>
                  <CopyButton 
                    text={`<ModuleIcon module={{id: "config", name: "CONFIG", icon: Settings, contextModule: "sistema"}} />`}
                    id="pattern-icon-card"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <StandardIcon Icon={Settings} context={{module: 'sistema'}} size="lg" label="CONFIG" />
                  <SystemCard title="Configuration Panel" padding="sm">
                    <p className="text-xs text-gray-300">Sistema settings and preferences</p>
                  </SystemCard>
                </div>
              </div>

              {/* Status Dashboard Pattern */}
              <div className="border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white">Status Dashboard Pattern</h3>
                  <CopyButton 
                    text={`<AdminCard><div className="grid grid-cols-4 gap-4">...</div></AdminCard>`}
                    id="pattern-dashboard"
                  />
                </div>
                <AdminCard padding="sm">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">142</div>
                      <StatusBadge status="active" className="text-xs">Active</StatusBadge>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-400">23</div>
                      <StatusBadge status="pending" className="text-xs">Pending</StatusBadge>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-400">7</div>
                      <StatusBadge status="rejected" className="text-xs">Rejected</StatusBadge>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-400">12</div>
                      <StatusBadge status="suspended" className="text-xs">Suspended</StatusBadge>
                    </div>
                  </div>
                </AdminCard>
              </div>

              {/* Action Buttons Pattern */}
              <div className="border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white">Action Buttons Pattern</h3>
                  <CopyButton 
                    text={`<div className="flex gap-2"><WindowButton variant="primary">Save</WindowButton></div>`}
                    id="pattern-buttons"
                  />
                </div>
                <div className="flex gap-2">
                  <WindowButton variant="primary">
                    <Settings size={16} />
                    Primary Action
                  </WindowButton>
                  <WindowButton variant="secondary">
                    <Copy size={16} />
                    Secondary Action  
                  </WindowButton>
                  <WindowButton variant="ghost">
                    <Zap size={16} />
                    Ghost Action
                  </WindowButton>
                </div>
              </div>
            </div>
          </AdminCard>

          {/* Code Examples */}
          <AdminCard title="💻 Code Examples" variant="highlighted">
            <div className="space-y-4">
              <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                <h4 className="text-sm font-medium text-white mb-2">Creating a new admin tool:</h4>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap">{`// 1. Add to SistemaModule.tsx
<ModuleIcon
  module={{
    id: "my-tool",
    name: "MY TOOL",
    icon: YourIcon,
    contextModule: "sistema",
    contextFunction: "admin",
  }}
  onClick={handleOpenMyTool}
/>

// 2. Create component with AdminCard
<AdminCard title="My Admin Tool" variant="highlighted">
  <StatusBadge status="active">Tool Active</StatusBadge>
  <p>Your admin tool content...</p>
</AdminCard>`}</pre>
                <CopyButton text={`// Complete admin tool example...`} id="admin-tool-example" />
              </div>
            </div>
          </AdminCard>
        </div>
      )}
    </div>
  );
}