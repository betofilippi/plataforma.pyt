# 🎨 DESIGN SYSTEM - Padrões UI/UX Unificados

Este documento descreve o sistema de design unificado da Plataforma.app, que resolve inconsistências visuais e padroniza todos os componentes da interface.

## 📋 Índice

- [Problema Resolvido](#problema-resolvido)
- [Arquitetura do Sistema](#arquitetura-do-sistema)
- [Contextos UI](#contextos-ui)
- [Componentes Padronizados](#componentes-padronizados)
- [Como Usar](#como-usar)
- [Exemplos Práticos](#exemplos-práticos)
- [Referência Completa](#referência-completa)

## 🎯 Problema Resolvido

**ANTES**: Cores inconsistentes em diferentes partes do sistema
```tsx
// ❌ Cores diferentes para o mesmo contexto
<Icon color={getModuleColor('admin').gradient} />
<Card borderColor={getModuleColor('sistema').primary} />
```

**DEPOIS**: Sistema hierárquico consistente
```tsx
// ✅ Cores consistentes baseadas no contexto
<StandardIcon context={UI_CONTEXTS.ADMIN_IN_SISTEMA} />
<StandardCard context={UI_CONTEXTS.ADMIN_IN_SISTEMA} />
```

## 🏗️ Arquitetura do Sistema

### 1. Hierarquia de Cores

```
CONTEXTO (módulo) → Define o FUNDO
FUNÇÃO (ferramenta) → Define o PRIMEIRO PLANO
```

**Exemplo**: Admin Panel dentro do Sistema
- `module: 'sistema'` → Background laranja (contexto)  
- `function: 'admin'` → Foreground azul (ferramenta admin)

### 2. Estrutura de Arquivos

```
client/lib/
├── ui-standards.ts          # Sistema principal
├── module-colors.ts         # Cores dos módulos
├── design-system.ts         # Padrões base
└── DESIGN_SYSTEM.md        # Esta documentação

client/components/ui/
├── StandardIcon.tsx         # Ícones padronizados  
├── StandardCard.tsx         # Cards padronizados
└── index.ts                # Exports unificados
```

## 🎨 Contextos UI

### Contextos Pré-definidos

```tsx
import { UI_CONTEXTS } from '@/lib/ui-standards';

// Contextos principais
UI_CONTEXTS.SISTEMA           // { module: 'sistema' }
UI_CONTEXTS.PLATFORM          // { module: 'plataforma' }
UI_CONTEXTS.PUBLIC            // { module: 'public' }

// Contextos com função específica
UI_CONTEXTS.ADMIN_IN_SISTEMA  // { module: 'sistema', function: 'admin' }
UI_CONTEXTS.USERS_IN_SISTEMA  // { module: 'sistema', function: 'admin' }
```

### Criando Contextos Customizados

```tsx
const customContext: UIContext = {
  module: 'vendas',           // Define o background
  function: 'relatorios',     // Define o foreground
  variant: 'primary'          // Opcional
};
```

## 🧩 Componentes Padronizados

### StandardIcon

```tsx
import { StandardIcon, ModuleIcon } from '@/components/ui';
import { Users } from 'lucide-react';

// Ícone básico
<StandardIcon 
  Icon={Users}
  context={{ module: 'sistema', function: 'admin' }}
  size="lg"
  label="USUÁRIOS"
  onClick={() => openUserPanel()}
/>

// Ícone de módulo (versão especializada)
<ModuleIcon
  module={{
    id: "users",
    name: "USUÁRIOS", 
    icon: Users,
    contextModule: "sistema",
    contextFunction: "admin",
  }}
  onClick={() => openUserPanel()}
/>
```

### StandardCard

```tsx
import { StandardCard, SettingsCard } from '@/components/ui';

// Card básico
<StandardCard 
  context={{ module: 'sistema' }}
  title="Configurações Gerais"
  variant="highlighted"
>
  <p>Conteúdo do card...</p>
</StandardCard>

// Card especializado para configurações
<SettingsCard
  settingKey="notification"
  settingName="Notificações"
  description="Configure como receber alertas"
>
  <Toggle enabled={notifications} onChange={setNotifications} />
</SettingsCard>
```

### Variações Rápidas

```tsx
import { SystemIcon, AdminIcon, SystemCard, AdminCard } from '@/components/ui';

// Ícones especializados
<SystemIcon Icon={Settings} label="Configurar" />
<AdminIcon Icon={Users} label="Usuários" />

// Cards especializados  
<SystemCard title="Sistema">Configurações gerais</SystemCard>
<AdminCard title="Admin">Painel administrativo</AdminCard>
```

## 💡 Como Usar

### 1. Substituir Componentes Antigos

```tsx
// ❌ ANTES: Componente customizado inconsistente
function ModuleIcon({ module, onClick }) {
  const moduleColor = getModuleColor('sistema');
  return (
    <div onClick={onClick} style={{ color: moduleColor.primary }}>
      <Icon />
    </div>
  );
}

// ✅ DEPOIS: Componente padronizado
<ModuleIcon
  module={{
    id: "config",
    name: "CONFIGURAÇÕES",
    icon: Settings,
    contextModule: "sistema",
  }}
  onClick={handleOpenConfig}
/>
```

### 2. Definir Contexto Apropriado

```tsx
// Para ferramenta administrativa no sistema
const context = { module: 'sistema', function: 'admin' };

// Para ferramenta de usuário no sistema
const context = { module: 'sistema', function: 'users' };

// Para funcionalidade pura da plataforma
const context = { module: 'plataforma' };
```

### 3. Debug de Contexto

```tsx
import { debugContext } from '@/lib/ui-standards';

// Visualizar como as cores são resolvidas
debugContext({ module: 'sistema', function: 'admin' });
// Console: 🎨 UI Context Debug: { context, resolved: {...} }
```

## 🌈 Exemplos Práticos

### Desktop de Configurações

```tsx
function SistemaDesktop() {
  return (
    <div className="desktop">
      {/* Template - contexto sistema puro */}
      <ModuleIcon
        module={{
          id: "template",
          name: "TEMPLATE DE JANELAS",
          icon: Layout,
          contextModule: "sistema", 
        }}
        onClick={openTemplate}
      />
      
      {/* Usuários - admin no contexto sistema */}
      <ModuleIcon
        module={{
          id: "users", 
          name: "USUÁRIOS",
          icon: Users,
          contextModule: "sistema",
          contextFunction: "admin",
        }}
        onClick={openUsers}
      />
    </div>
  );
}
```

### Janela com Cards Padronizados

```tsx
function ConfigWindow() {
  return (
    <div className="window-content">
      <SystemCard title="Configurações Gerais" variant="highlighted">
        <SettingsCard
          settingKey="theme"
          settingName="Tema do Sistema"
          description="Escolha a aparência da interface"
        >
          <ThemeSelector />
        </SettingsCard>
      </SystemCard>
      
      <AdminCard title="Permissões" variant="highlighted">
        <UserPermissions />
      </AdminCard>
    </div>
  );
}
```

## 📚 Referência Completa

### Interface UIContext

```tsx
interface UIContext {
  module: string;          // Contexto do módulo (sistema, admin, etc.)
  function?: string;       // Função específica (se diferente do módulo)
  variant?: 'primary' | 'secondary' | 'accent' | 'neutral';
}
```

### Interface StandardColors

```tsx
interface StandardColors {
  background: string;      // Cor de fundo
  foreground: string;      // Cor do texto/ícone
  border: string;          // Cor da borda
  hover: {
    background: string;
    foreground: string;
  };
  gradient: string;        // Gradiente CSS
}
```

### Funções Principais

```tsx
// Resolver cores baseado no contexto
resolveColors(context: UIContext): StandardColors

// Estilos para ícones de desktop
getDesktopIconStyles(config: DesktopIconConfig): IconStyles

// Estilos para cards
getCardStyles(config: CardConfig): string

// Estilos para botões  
getButtonStyles(config: ButtonConfig): string

// Estilos para janelas
getWindowStyles(config: WindowConfig): WindowStyles
```

### Helpers Rápidos

```tsx
// Ícones
getDesktopIcon(context: UIContext, size?: IconSize)

// Janelas  
getWindow(title: string, context: UIContext, options?: WindowConfig)

// Cards
getCard(context: UIContext, variant?: CardVariant)

// Botões
getButton(context: UIContext, variant?: ButtonVariant)
```

## 🚀 Migração Gradual

Para migrar código existente:

1. **Identifique o contexto**: Determine o módulo e função
2. **Substitua componentes**: Use StandardIcon/StandardCard
3. **Teste as cores**: Use debugContext() para verificar
4. **Remova código antigo**: Exclua componentes customizados

## ✅ Benefícios

- ✅ **Consistência Visual**: Todas as cores seguem o mesmo padrão
- ✅ **Manutenibilidade**: Mudanças centralizadas no sistema
- ✅ **Reutilização**: Componentes padronizados para tudo
- ✅ **Debug Fácil**: Ferramentas para visualizar contextos
- ✅ **TypeScript**: Tipagem completa e autocompletar
- ✅ **Performance**: Menos re-renders com padrões otimizados

---

**Criado em**: Agosto 2025  
**Versão**: 1.0  
**Status**: Implementado ✅