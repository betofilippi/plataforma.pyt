import React, { useState } from 'react';
import { 
  WindowCard, 
  WindowButton, 
  WindowInput, 
  WindowTextarea, 
  WindowSelect, 
  WindowToggle 
} from '@/components/ui';
import { 
  Save, 
  Settings, 
  User, 
  Mail, 
  Lock,
  Download,
  RefreshCw
} from 'lucide-react';

/**
 * TEMPLATE DE JANELA PADRÃO
 * 
 * Use este template como base para criar novas janelas no sistema.
 * Todos os componentes seguem o Design System padronizado.
 */
export function WindowTemplate() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    description: '',
    category: 'general',
    notifications: true,
    autoSave: false
  });

  const handleSave = () => {
    console.log('Salvando dados:', formData);
    // Implementar lógica de salvamento
  };

  const handleExport = () => {
    console.log('Exportando dados...');
    // Implementar lógica de exportação
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-2">
          <WindowButton
            variant="primary"
            icon={<Download />}
            onClick={handleExport}
          >
            Exportar Dados
          </WindowButton>
          <WindowButton
            variant="secondary"
            icon={<RefreshCw />}
            onClick={() => window.location.reload()}
          >
            Recarregar
          </WindowButton>
        </div>
        
        <WindowButton
          variant="primary"
          icon={<Save />}
          onClick={handleSave}
        >
          Salvar Alterações
        </WindowButton>
      </div>

      {/* Conteúdo da janela */}
      <div className="space-y-6">
        
        {/* Seção 1: Informações Básicas */}
        <WindowCard title="Informações Básicas">
          <div className="grid grid-cols-2 gap-4">
            <WindowInput
              label="Nome"
              placeholder="Digite seu nome"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              icon={<User />}
              description="Nome completo do usuário"
            />
            
            <WindowInput
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              icon={<Mail />}
              description="Endereço de email válido"
            />
          </div>

          <WindowTextarea
            label="Descrição"
            placeholder="Digite uma descrição..."
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            description="Descrição opcional sobre o usuário"
          />

          <WindowSelect
            label="Categoria"
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            description="Selecione a categoria apropriada"
          >
            <option value="general" className="bg-gray-800">Geral</option>
            <option value="admin" className="bg-gray-800">Administrador</option>
            <option value="user" className="bg-gray-800">Usuário</option>
            <option value="guest" className="bg-gray-800">Convidado</option>
          </WindowSelect>
        </WindowCard>

        {/* Seção 2: Configurações */}
        <WindowCard title="Configurações">
          <WindowToggle
            label="Receber Notificações"
            description="Ativar notificações por email"
            checked={formData.notifications}
            onChange={(checked) => setFormData({...formData, notifications: checked})}
          />

          <WindowToggle
            label="Auto Save"
            description="Salvar alterações automaticamente"
            checked={formData.autoSave}
            onChange={(checked) => setFormData({...formData, autoSave: checked})}
          />
        </WindowCard>

        {/* Seção 3: Ações */}
        <WindowCard title="Ações Disponíveis">
          <div className="grid grid-cols-3 gap-4">
            <WindowButton
              variant="success"
              icon={<Save />}
              onClick={handleSave}
              fullWidth
            >
              Salvar
            </WindowButton>
            
            <WindowButton
              variant="warning"
              icon={<RefreshCw />}
              onClick={() => console.log('Reset')}
              fullWidth
            >
              Resetar
            </WindowButton>
            
            <WindowButton
              variant="danger"
              icon={<Lock />}
              onClick={() => console.log('Bloquear')}
              fullWidth
            >
              Bloquear
            </WindowButton>
          </div>
        </WindowCard>

      </div>
    </div>
  );
}

export default WindowTemplate;