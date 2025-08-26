import React from 'react';
import { WindowCard, WindowButton } from '@/components/ui';
import { 
  Code, 
  AlertCircle, 
  CheckCircle,
  Copy,
  FileText
} from 'lucide-react';

/**
 * TEMPLATE DA TASKBAR - Padrão para Implementação
 * 
 * Este componente documenta o padrão correto para adicionar
 * novos módulos à taskbar do sistema.
 */
export function TaskbarTemplate() {
  const correctExample = `// ✅ CORRETO - Importação de ícones
import { Grid as SpreadsheetIcon, Settings as SettingsIcon, CircleHelp as BusinessIcon, Store as StoreIcon } from "lucide-react";

// Para ícones lucide-react (use com moderação na taskbar)
import {
  Database,
  Ship,
  // outros ícones lucide se necessário
} from "lucide-react";`;

  const moduleDetection = `// ✅ PADRÃO CORRETO - Detecção de Módulo
// Em WindowTaskbar.tsx - função getCurrentModule()

// Detect NOVO_MODULO
if (path.startsWith("/novo-modulo")) {
  return {
    name: "NOME DO MÓDULO",          // Nome exibido na taskbar
    icon: ModuleIcon,                // Ícone do lucide-react
    color: "from-blue-600 to-blue-700", // Gradiente de cor
  };
}`;

  const wrongExample = `// ❌ ERRADO - Mistura de fontes de ícones
import { Settings } from "lucide-react"; // ❌ Não use lucide para taskbar principal

// ❌ ERRADO - Ícone inconsistente
if (path.startsWith("/sistema")) {
  return {
    name: "SISTEMA",
    icon: Settings,  // ❌ Deveria ser SettingsIcon do MUI
    color: "from-gray-600 to-gray-700",
  };
}`;

  const colorPalette = [
    { name: "Blue", gradient: "from-blue-600 to-blue-700", sample: "bg-gradient-to-r from-blue-600 to-blue-700" },
    { name: "Purple", gradient: "from-purple-600 to-purple-700", sample: "bg-gradient-to-r from-purple-600 to-purple-700" },
    { name: "Green", gradient: "from-green-600 to-green-700", sample: "bg-gradient-to-r from-green-600 to-green-700" },
    { name: "Red", gradient: "from-red-600 to-red-700", sample: "bg-gradient-to-r from-red-600 to-red-700" },
    { name: "Gray", gradient: "from-gray-600 to-gray-700", sample: "bg-gradient-to-r from-gray-600 to-gray-700" },
    { name: "Teal", gradient: "from-teal-600 to-teal-700", sample: "bg-gradient-to-r from-teal-600 to-teal-700" },
    { name: "Orange", gradient: "from-orange-600 to-orange-700", sample: "bg-gradient-to-r from-orange-600 to-orange-700" },
    { name: "Indigo", gradient: "from-indigo-600 to-indigo-700", sample: "bg-gradient-to-r from-indigo-600 to-indigo-700" },
  ];

  const modulesList = `// 📋 MÓDULOS ATUALMENTE CONFIGURADOS
const modules = [
  {
    path: "/database",
    name: "BASE DE DADOS",
    icon: Database,  // lucide-react (exceção - já existente)
    color: "from-purple-600 to-purple-700"
  },
  {
    path: "/sistema",
    name: "SISTEMA",
    icon: SettingsIcon,  // lucide-react ✅
    color: "from-gray-600 to-gray-700"
  }
];`;

  const stepByStep = `// 📝 PASSO A PASSO PARA ADICIONAR NOVO MÓDULO

// 1. Importe o ícone do MUI no topo do arquivo
import { Store as StoreIcon } from "lucide-react";

// 2. Adicione a detecção na função getCurrentModule()
if (path.startsWith("/loja")) {
  return {
    name: "LOJA",
    icon: StoreIcon,
    color: "from-green-600 to-green-700",
  };
}

// 3. Teste navegando para o módulo
// A taskbar deve mostrar o nome e ícone corretos`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Code className="w-8 h-8 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">Template da Taskbar</h1>
        </div>
        <WindowButton
          variant="secondary"
          icon={<FileText />}
          onClick={() => window.open('/client/components/windows/WindowTaskbar.tsx', '_blank')}
        >
          Ver Arquivo
        </WindowButton>
      </div>

      <div className="space-y-6">
        {/* Exemplo Correto */}
        <WindowCard title="✅ Implementação Correta">
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-1" />
                <div className="flex-1">
                  <h3 className="text-green-400 font-semibold mb-2">Importações Corretas</h3>
                  <div className="overflow-x-auto bg-black/30 p-3 rounded">
                    <pre className="text-xs text-gray-300 whitespace-pre">
                      <code>{correctExample}</code>
                    </pre>
                  </div>
                  <WindowButton
                    variant="secondary"
                    icon={<Copy />}
                    onClick={() => copyToClipboard(correctExample)}
                    className="mt-2"
                  >
                    Copiar
                  </WindowButton>
                </div>
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-1" />
                <div className="flex-1">
                  <h3 className="text-green-400 font-semibold mb-2">Detecção de Módulo</h3>
                  <div className="overflow-x-auto bg-black/30 p-3 rounded">
                    <pre className="text-xs text-gray-300 whitespace-pre">
                      <code>{moduleDetection}</code>
                    </pre>
                  </div>
                  <WindowButton
                    variant="secondary"
                    icon={<Copy />}
                    onClick={() => copyToClipboard(moduleDetection)}
                    className="mt-2"
                  >
                    Copiar
                  </WindowButton>
                </div>
              </div>
            </div>
          </div>
        </WindowCard>

        {/* Exemplo Incorreto */}
        <WindowCard title="❌ Implementação Incorreta">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-2 mb-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-1" />
              <div className="flex-1">
                <h3 className="text-red-400 font-semibold mb-2">Evite Estes Erros</h3>
                <div className="overflow-x-auto bg-black/30 p-3 rounded">
                  <pre className="text-xs text-gray-300 whitespace-pre">
                    <code>{wrongExample}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </WindowCard>

        {/* Paleta de Cores */}
        <WindowCard title="🎨 Paleta de Cores Disponíveis">
          <div className="grid grid-cols-4 gap-3">
            {colorPalette.map((color) => (
              <div key={color.name} className="space-y-2">
                <div className={`h-12 rounded-lg ${color.sample}`} />
                <div className="text-xs">
                  <div className="text-white font-medium">{color.name}</div>
                  <div className="text-gray-400">{color.gradient}</div>
                </div>
              </div>
            ))}
          </div>
        </WindowCard>

        {/* Lista de Módulos */}
        <WindowCard title="📋 Módulos Configurados">
          <div className="overflow-x-auto bg-black/30 p-4 rounded">
            <pre className="text-xs text-gray-300 whitespace-pre">
              <code>{modulesList}</code>
            </pre>
          </div>
          <WindowButton
            variant="secondary"
            icon={<Copy />}
            onClick={() => copyToClipboard(modulesList)}
            className="mt-3"
          >
            Copiar Lista
          </WindowButton>
        </WindowCard>

        {/* Passo a Passo */}
        <WindowCard title="📝 Passo a Passo">
          <div className="overflow-x-auto bg-black/30 p-4 rounded">
            <pre className="text-xs text-gray-300 whitespace-pre">
              <code>{stepByStep}</code>
            </pre>
          </div>
          <WindowButton
            variant="secondary"
            icon={<Copy />}
            onClick={() => copyToClipboard(stepByStep)}
            className="mt-3"
          >
            Copiar Tutorial
          </WindowButton>
        </WindowCard>

        {/* Regras Importantes */}
        <WindowCard title="⚠️ Regras Importantes">
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <span className="text-yellow-400">•</span>
              <p className="text-gray-300 text-sm">
                <strong className="text-white">Sempre use lucide-react</strong> para novos módulos na taskbar
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-yellow-400">•</span>
              <p className="text-gray-300 text-sm">
                <strong className="text-white">Mantenha consistência</strong> nos gradientes de cor (from-[cor]-600 to-[cor]-700)
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-yellow-400">•</span>
              <p className="text-gray-300 text-sm">
                <strong className="text-white">Use nomes descritivos</strong> para os módulos (MAIÚSCULAS ou formato .APP)
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-yellow-400">•</span>
              <p className="text-gray-300 text-sm">
                <strong className="text-white">Teste sempre</strong> navegando para o módulo e verificando a taskbar
              </p>
            </div>
          </div>
        </WindowCard>
      </div>
    </div>
  );
}

export default TaskbarTemplate;