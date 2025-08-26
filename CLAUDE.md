# CLAUDE.md - Instruções para Assistentes IA

Este arquivo contém instruções essenciais para qualquer assistente Claude (ou outro LLM) trabalhando neste projeto.

# ⚠️ REGRAS RÍGIDAS DE POSTURA - LEIA PRIMEIRO!

## PRODUTIVIDADE E HONESTIDADE ABSOLUTA

### 1. SEM MENTIRAS OU DECLARAÇÕES FALSAS
- ❌ **NUNCA** declarar "sucesso", "funcionou" ou "pronto" sem verificar
- ❌ **NUNCA** dizer "fiz X" se não fez
- ❌ **NUNCA** fingir que algo está funcionando quando não está
- ✅ Sempre verificar se a mudança realmente funcionou antes de afirmar algo

### 2. ADMITIR LIMITAÇÕES IMEDIATAMENTE
- Se **NÃO SABE** fazer algo → Diga "NÃO SEI"
- Se **NÃO CONSEGUE** resolver → Diga "NÃO CONSIGO"
- Se **PRECISA** de ajuda → Peça ajuda ou sugira alternativas
- **NÃO** fique girando em círculos tentando parecer competente

### 3. PROIBIDO MOCK DE DADOS
- ❌ **NUNCA** criar dados falsos ou simulados sem autorização explícita
- ❌ **NUNCA** inventar respostas ou resultados
- ❌ **NUNCA** simular funcionalidades que não existem
- ✅ Usar apenas dados reais do sistema

### 4. COMUNICAÇÃO DIRETA
- **SIM é SIM, NÃO é NÃO**
- Sem enrolação ou textos desnecessários
- Ir direto ao ponto
- Se algo está quebrado → Diga "ESTÁ QUEBRADO"
- Se não vê mudança → Diga "NÃO MUDOU"

### 5. FOCO EM RESULTADOS REAIS
- Testar antes de declarar conclusão
- Verificar se o problema foi **REALMENTE** resolvido
- Não assumir que funcionou - **CONFIRMAR** que funcionou
- Se o usuário diz que não mudou, **ACREDITE** e investigue

### 6. QUANDO ERRAR
- Admitir o erro **IMEDIATAMENTE**
- Não tentar esconder, minimizar ou justificar
- Focar em como corrigir, não em parecer competente
- Se quebrou algo → Admita que quebrou

### 7. PRESERVAÇÃO DO CÓDIGO
- **NUNCA** remover funcionalidades sem autorização explícita
- **NUNCA** simplificar código funcionando sem pedido direto
- **SEMPRE** preservar o que está funcionando
- Em caso de dúvida → **PERGUNTE** antes de mudar

### 8. DEBUG OBRIGATÓRIO APÓS MUDANÇAS
- ✅ **SEMPRE** executar debug-system.html após qualquer mudança de código
- ✅ **NUNCA** declarar tarefa concluída sem passar TODOS os testes do debug
- ✅ **CONTINUAR** corrigindo erros até debug passar 100%
- ✅ **REPORTAR** resultado do debug ao usuário com detalhes
- 📍 Debug disponível em: `http://localhost:3030/debug-system.html`
- ⚠️ Se houver erros no debug → **CORRIGIR** antes de finalizar
- ⚠️ Se debug não carregar → Verificar servidor e porta

**PROCESSO DE DEBUG OBRIGATÓRIO**:
```bash
1. Fazer mudanças no código
2. Abrir http://localhost:3030/debug-system.html
3. Aguardar todos os 24 testes executarem
4. Se houver erros → Corrigir e repetir desde o passo 2
5. Só finalizar quando TODOS os testes passarem
```

### 9. PRESERVAÇÃO DA SESSÃO DO CLAUDE CODE CLI
- ❌ **NUNCA** usar `taskkill /IM node.exe` ou comandos que matem TODOS os processos Node
- ❌ **NUNCA** fechar processos sem identificar o PID específico
- ✅ **SEMPRE** usar PID específico: `taskkill /PID [numero] /F`
- ✅ **SEMPRE** verificar qual processo está usando a porta: `netstat -ano | findstr :3030`
- ⚠️ **LEMBRE-SE**: Claude Code CLI roda em Node.js - matar todos os Node fecha a sessão!

**COMANDOS SEGUROS**:
```bash
# Ver qual processo usa a porta
netstat -ano | findstr :3030

# Matar apenas o processo específico
taskkill /PID 12345 /F

# NUNCA USE:
# taskkill /IM node.exe (mata TODOS os Node incluindo Claude Code)
```

## ⛔ ESTAS REGRAS SÃO INEGOCIÁVEIS!
**Violação destas regras = Perda total de confiança do usuário**

---

## 🎯 Visão Geral do Projeto

**plataforma.app** é uma plataforma empresarial AI-First que funciona como um sistema operacional virtual no navegador, com 20+ módulos integrados e foco em inteligência artificial.

### Características Principais:
- 🖥️ **Desktop Virtual**: Sistema de janelas flutuantes estilo Windows/MacOS
- 🧠 **AI-First**: Módulo IA com 5 componentes vazios (apenas ícones)
- 💾 **Database Integrado**: PostgreSQL multi-schema com interface visual
- 📊 **20 Módulos Ativos**: Todos os departamentos empresariais cobertos
- 🎨 **Design System**: Glassmorphism e componentes padronizados
- 🔐 **Autenticação Simples**: Login demo para desenvolvimento

## 🌐 PORTAS E URLS (ATUALIZADO!)

### URLs de Acesso:
| Serviço | Porta | URL | Status |
|---------|-------|-----|--------|
| **Frontend** | **3030** | **http://localhost:3030** | ✅ Principal |
| **Backend API** | **4000** | **http://localhost:4000** | ✅ API |
| **Grist Core** | **8484** | **http://localhost:8484** | Editor avançado |

### ⚠️ IMPORTANTE:
- O Vite pode tentar portas alternativas (3031, 3032) se 3030 estiver ocupada
- **SEMPRE** verifique o console para ver qual porta foi alocada
- Use `netstat -ano | findstr 3030` para verificar se a porta está livre

## 🚀 Como Iniciar o Projeto

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar desenvolvimento (Frontend + Backend)
npm run dev

# 3. Acessar no navegador
http://localhost:3030

# 4. Login demo (qualquer senha funciona)
Email: adm@nxt.eco.br
Senha: (qualquer uma)
```

## 📦 Módulos Implementados (20)

Todos os módulos abrem como janelas flutuantes dentro do sistema:

### Módulos Core
1. **Inteligência Artificial** - 5 componentes vazios (apenas ícones)
2. **Base de Dados** - Editor de tabelas com glassmorphism
3. **Sistema** - Configurações gerais

### Módulos de Negócio
4. **Estoque** - Controle de inventário
5. **Montagem** - Gestão de produção
6. **Vendas** - Gestão comercial
7. **Faturamento** - Emissão de notas
8. **Expedição** - Logística e entregas

### Módulos Administrativos
9. **RH** - Recursos Humanos
10. **Administrativo** - Gestão administrativa
11. **Financeiro** - Gestão financeira
12. **Jurídico** - Gestão jurídica
13. **Tributário** - Gestão fiscal

### Módulos de Suporte
14. **Suporte** - Atendimento ao cliente
15. **Comunicação** - Comunicação interna
16. **Marketing** - Marketing e campanhas
17. **Produtos** - Catálogo de produtos
18. **Lojas** - Gestão de lojas
19. **Cadastros** - Cadastros gerais
20. **Notificações** - Central de alertas

## 🤖 Componentes de IA (VAZIOS)

Localizados em `client/components/ia/` - **Atualmente apenas ícones placeholder**:

### 1. **MCPComponent.tsx**
- Ícone: `Cpu` (lucide-react)
- Placeholder vazio para futuro gerenciador MCP

### 2. **PlaygroundComponent.tsx**
- Ícone: `PlayCircle` (lucide-react)
- Placeholder vazio para futuro playground de IA

### 3. **OCRComponent.tsx**
- Ícone: `ScanLine` (lucide-react)
- Placeholder vazio para futuro OCR

### 4. **LLMComponent.tsx**
- Ícone: `Brain` (lucide-react)
- Placeholder vazio para futuro gerenciador LLM

### 5. **TerminalComponent.tsx**
- Ícone: `Terminal` (lucide-react)
- Placeholder vazio para futuro terminal IA

## 💾 Sistema de Database

### Arquitetura
- **PostgreSQL** hospedado no Supabase
- **Multi-schema** - um schema por módulo
- **Interface Visual** - Editor estilo Excel com glassmorphism
- **Acesso Direto** - Sem módulo intermediário

### ⚠️ REGRA FUNDAMENTAL: Sistema TEXT + Type Hints
- **Armazenamento (Supabase)**: TODOS os dados são salvos como **TEXT**
- **Type Hints (Metadados)**: Definem como interpretar e renderizar os campos
- **Interface**: Formatação rica baseada nos hints
- **Validação**: Acontece no frontend, dados sempre aceitos no banco

#### Como Funciona o Sistema TEXT + Type Hints:

**1. ARMAZENAMENTO (Supabase)**
```sql
-- Tudo é TEXT - compatibilidade máxima
CREATE TABLE vendas (
  preco TEXT,          -- "1234.56" 
  data_venda TEXT,     -- "2024-01-15"
  cliente_cpf TEXT,    -- "12345678901"
  pago TEXT           -- "true"
);
```

**2. TYPE HINTS (Metadados)**
```sql
-- Como interpretar cada campo
plataforma_core.column_metadata:
  - preco: type_hint='currency' 
  - data_venda: type_hint='date'
  - cliente_cpf: type_hint='cpf'
  - pago: type_hint='boolean'
```

**3. INTERFACE (Frontend)**
```typescript
// Renderização inteligente baseada no hint
if (hint === 'currency') {
  return <span>R$ 1.234,56</span>  // Formatado
}
// Mas salva como "1234.56" (TEXT)
```

#### Benefícios do Sistema:
1. **Zero erros de tipo** - Aceita qualquer entrada
2. **Flexibilidade total** - Mudanças sem migração
3. **Formatação rica** - Visual profissional automático  
4. **Detecção inteligente** - Reconhece CPF, email, moeda automaticamente
5. **Editores especializados** - Date picker, color picker, etc.
6. **100% Supabase compatible** - Funciona com qualquer configuração

#### Sincronização Interface ↔ Supabase
- **Ordem de Colunas**: Sempre por `ordinal_position`
- **Ordem de Linhas**: Por posição na interface (rowIndex)
- **Mapeamento**: Por nome de coluna, não índice
- **DELETE/UPDATE**: Usa nome da coluna + rowIndex ou todos valores antigos
- **Sem Restrições**: Qualquer célula pode ser editada/apagada

### Janela do Editor (TableEditorCanvas.tsx)
- **Sidebar Transparente**: Glassmorphism aplicado
- **Seleção de Schemas**: Apenas módulos (oculta public e plataforma_core)
- **Ícones Material-UI**: Cada módulo com seu ícone específico
- **Nomes em Maiúsculas**: INTELIGÊNCIA ARTIFICIAL, BASE DE DADOS, etc.
- **Sincronização Perfeita**: Interface sempre reflete Supabase

### Conexão PostgreSQL
```javascript
postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres
```

### APIs Disponíveis
```
GET  /api/postgres/tables      # Listar tabelas
GET  /api/postgres/schemas     # Listar schemas
POST /api/postgres/query       # Executar SQL
GET  /api/postgres/table-data  # Dados da tabela (com columnOrder)
```

## 🎨 Design System Obrigatório

### Componentes Padrão
```tsx
import { WindowCard, WindowButton, WindowInput, WindowToggle } from '@/components/ui';

// Card com glassmorphism
<WindowCard title="Título">
  <p>Conteúdo</p>
</WindowCard>

// Botão com variantes
<WindowButton variant="primary" icon={<Save />}>
  Salvar
</WindowButton>

// Input padronizado
<WindowInput label="Nome" placeholder="Digite..." />

// Toggle switch
<WindowToggle label="Ativar" checked={state} onChange={setState} />
```

### Padrões Visuais
- **Glassmorphism**: `backdrop-blur-xl bg-white/5`
- **Transparência Total**: Sidebars sem background
- **Hover Sutil**: `hover:bg-white/5`
- **Bordas**: `border-white/10`
- **Texto**: Títulos `text-white`, descrições `text-gray-400`



**Caracteres proibidos em nomes de arquivos:**
- `< > : " | ? * \`

## 🚨 Troubleshooting Comum

### Problema: Tela Branca e Erro EBUSY (CRÍTICO - LEIA PRIMEIRO!)

**CAUSA PRINCIPAL**: 
1. Cache corrompido do Vite em `node_modules/.vite/deps`
2. Antivírus/Windows Defender bloqueando arquivos de cache

**SINTOMAS**:
- Tela completamente branca
- Nenhum erro visível no navegador
- Erro no terminal: `EBUSY: resource busy or locked` com `deps_temp`
- Erro: `The file does not exist at ".vite/deps/react.js"`

**SOLUÇÃO DEFINITIVA IMPLEMENTADA (23/08/2025)**:

### 1. Desabilitar Cache do Vite Completamente
No arquivo `vite.config.ts`, adicione/modifique:
```typescript
export default defineConfig({
  cacheDir: false, // Desabilita cache completamente
  optimizeDeps: {
    force: false, // Não força re-otimização
    // ... resto das configurações
  }
})
```

### 2. Inicialização Limpa
Para iniciar o servidor sem problemas de cache:
```bash
# Limpar cache do Vite
rmdir /s /q node_modules\.vite 2>nul

# Liberar porta 3030 se necessário
netstat -ano | findstr :3030
taskkill /PID [numero] /F

# Iniciar servidor
npm run dev
```

### 3. Sistema de Debug Permanente
Acesse `http://localhost:3030/debug/debug-simple.html` para:
- Diagnosticar problemas automaticamente
- Verificar status do servidor, React e API
- Copiar relatório completo com botão dedicado

**IMPORTANTE**: 
- Use terminal CMD ou PowerShell externo
- Com cache desabilitado, o servidor inicia um pouco mais lento mas SEMPRE funciona

### Problema: Porta 3030 Ocupada
```bash
# O Vite tentará automaticamente 3031, 3032...
# Verifique o console para ver qual porta foi alocada

# Para matar processo na porta
netstat -ano | findstr 3030
taskkill /PID [numero] /F  # Windows
```

### Problema: Erros de Token JWT
- **Normal**: Tokens expiram após algum tempo
- **Solução**: Limpar localStorage e fazer login novamente
- **Não é bug**: Sistema de autenticação funcionando corretamente

### Problema: Módulo não abre
- Verificar se o componente está lazy loaded
- Adicionar Suspense com fallback
- Verificar imports do componente

## 📁 Estrutura do Projeto

```
plataforma.app/
├── client/
│   ├── components/
│   │   ├── ia/              # 5 componentes de IA
│   │   ├── ui/              # Design System
│   │   └── windows/         # Sistema de janelas
│   ├── pages/
│   │   ├── *Module.tsx      # 22 módulos
│   │   └── windows/         # Janelas especializadas
│   └── lib/
│       ├── design-system.ts
│       └── module-colors.ts
├── server/
│   └── routes/
│       ├── postgres-direct.ts
│       └── auth.ts
└── vite.config.ts           # Porta 3030 configurada aqui
```

## 🏗️ GUIA DE MODULARIZAÇÃO DE COMPONENTES

### ⚡ NOVA REGRA FUNDAMENTAL: Componentes Modularizados desde o Início
**TODOS os novos componentes DEVEM nascer modularizados seguindo a estrutura estabelecida pelo TableEditorCanvas.**

### Por que Modularizar desde o Início?
1. **Evita refatoração futura** - Não precisaremos modularizar depois
2. **Código limpo desde o dia 1** - Componente principal permanece enxuto
3. **Facilita colaboração** - Múltiplos devs podem trabalhar em paralelo
4. **Testes mais simples** - Funções isoladas são facilmente testáveis
5. **Padrão consistente** - Todos os componentes seguem mesma estrutura

### Metodologia "EPC" (Extract-Preserve-Connect)
Baseada no sucesso da modularização do TableEditorCanvas, use esta metodologia para TODOS os componentes grandes (>500 linhas).

### 📁 ESTRUTURA OBRIGATÓRIA PARA NOVOS COMPONENTES

```
component-name/
├── ComponentName.tsx          # Orquestrador principal (<500 linhas MÁXIMO)
├── README.md                  # Documentação obrigatória
└── modules/
    ├── constants/
    │   ├── types.ts          # SEMPRE criar primeiro - Interfaces e types
    │   ├── constants.ts      # Constantes e configurações
    │   └── mappings.ts       # Mapeamentos (ícones, cores, etc)
    ├── utils/
    │   ├── helpers.ts        # Funções puras auxiliares
    │   ├── formatters.ts     # Formatadores de dados
    │   ├── validators.ts     # Validações
    │   └── file-operations.ts # Se trabalhar com arquivos
    ├── config/
    │   ├── styles.ts         # Estilos e temas
    │   ├── formulas.ts       # Se tiver fórmulas
    │   └── settings.ts       # Configurações gerais
    ├── handlers/
    │   ├── event-handlers.ts # Handlers de eventos
    │   ├── formatting-handlers.ts # Se tiver formatação
    │   └── zoom-handlers.ts  # Se tiver zoom/pan
    ├── hooks/                # Custom hooks
    │   ├── useComponentState.ts # Hook principal do componente
    │   └── useFeatureX.ts   # Hooks específicos de features
    ├── components/           # Sub-componentes visuais
    │   ├── Header.tsx
    │   ├── Body.tsx
    │   ├── Footer.tsx
    │   └── Modals/
    │       └── SettingsModal.tsx
    └── services/             # Lógica de negócio
        ├── api.ts            # Chamadas API
        └── data-service.ts   # Processamento de dados
```

### 🎯 ORDEM DE CRIAÇÃO OBRIGATÓRIA PARA NOVOS COMPONENTES

#### Passo 1: Estrutura Base (ANTES de codificar)
```bash
# Criar estrutura completa ANTES de escrever código
mkdir -p component-name/modules/{constants,utils,config,handlers,hooks,components,services}
touch component-name/README.md
touch component-name/ComponentName.tsx
touch component-name/modules/constants/types.ts
```

#### Passo 2: Definir Types PRIMEIRO
```typescript
// modules/constants/types.ts
// SEMPRE começar definindo todas as interfaces
export interface ComponentProps { }
export interface ComponentState { }
export type ActionType = 'create' | 'update' | 'delete';
```

#### Passo 3: Extrair Constantes
```typescript
// modules/constants/constants.ts
export const DEFAULT_VALUES = { };
export const CONFIG = { };
```

#### Passo 4: Criar Funções Puras
```typescript
// modules/utils/helpers.ts
// Funções que não dependem de estado
export const calculateValue = (x: number) => x * 2;
export const formatData = (data: any) => { };
```

#### Passo 5: Componente Principal Magro
```typescript
// ComponentName.tsx
import { useComponentState } from './modules/hooks/useComponentState';
import { Header } from './modules/components/Header';

export default function ComponentName() {
  const { state, handlers } = useComponentState();
  
  return (
    <div>
      <Header {...state} />
      {/* Máximo 500 linhas aqui! */}
    </div>
  );
}
```

### ⚡ PROCESSO DE MODULARIZAÇÃO SEGURA

#### FASE 1: Preparação (Risco Zero)
1. **Criar estrutura de pastas** sem tocar no componente original
2. **Documentar** no README.md o que será feito
3. **Commit** da estrutura vazia

#### FASE 2: Extração Segura (Baixo Risco)
**Ordem de extração (do mais seguro ao mais arriscado):**

1. **Types e Interfaces** (100% seguro)
   ```typescript
   // modules/constants/types.ts
   export interface ComponentProps { ... }
   export type ComponentState = { ... }
   ```

2. **Constantes e Configurações** (100% seguro)
   ```typescript
   // modules/constants/constants.ts
   export const CONFIG = { ... }
   export const COLORS = { ... }
   ```

3. **Funções Puras** (100% seguro)
   ```typescript
   // modules/utils/helpers.ts
   export const calculateValue = (x: number) => x * 2;
   ```

4. **Mapeamentos** (99% seguro)
   ```typescript
   // modules/constants/mappings.ts
   export const iconMap = { ... }
   ```

#### FASE 3: Teste e Validação
- **Após CADA extração**: Testar aplicação
- **Se quebrar**: Reverter imediatamente
- **Se funcionar**: Commit com mensagem clara

#### FASE 4: Integração (Médio Risco)
5. **Custom Hooks** (médio risco)
   - Agrupar useState relacionados
   - Manter lógica simples

6. **Componentes Visuais** (alto risco)
   - Apenas se não tiverem estado complexo
   - Começar pelos menores

7. **Services** (variável)
   - APIs e integrações externas

### ⚠️ REGRAS DE OURO

#### ✅ SEMPRE FAZER:
- Criar a estrutura modular DESDE O INÍCIO para novos componentes
- Testar após CADA micro-mudança
- Commit frequente (poder reverter é crucial)
- Manter o componente original funcionando durante a transição

#### ❌ NUNCA FAZER:
- Modularizar tudo de uma vez
- Remover código do original antes de testar o modular
- Extrair lógica de estado compartilhado complexo
- Modificar múltiplos arquivos simultaneamente

### 📊 Critérios para Modularização

**DEVE modularizar se:**
- Componente tem >500 linhas
- Múltiplas responsabilidades
- Difícil de entender/manter
- Será reutilizado

**NÃO modularizar se:**
- Componente tem <200 linhas
- Lógica altamente acoplada
- Estado muito complexo
- Funciona perfeitamente

### 🎯 Exemplo Prático: TableEditorCanvas

**Antes**: 5.635 linhas em um arquivo
**Meta**: ~1.000 linhas no principal + módulos

**Progresso:**
- ✅ Fase 1: Types extraídos (0 quebras)
- ✅ Fase 1: Helpers extraídos (0 quebras)
- 🚧 Fase 2: Ícones e constantes (próximo)
- ⏳ Fase 3: Hooks e componentes (futuro)

### 💡 EXEMPLOS PRÁTICOS DE MODULARIZAÇÃO

#### ❌ ERRADO - Componente Monolítico
```typescript
// ❌ NÃO FAÇA ISSO - WhatsAppMessenger.tsx com 2000 linhas
export default function WhatsAppMessenger() {
  // 50 useStates aqui dentro
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  // ... mais 48 estados
  
  // Funções misturadas com componente
  const formatMessage = (msg) => { /*...*/ };
  const validatePhone = (phone) => { /*...*/ };
  
  // 1900 linhas de JSX
  return <div>...</div>;
}
```

#### ✅ CORRETO - Componente Modularizado desde o Início
```typescript
// ✅ FAÇA ASSIM - WhatsAppMessenger/WhatsAppMessenger.tsx (300 linhas)
import { useWhatsAppState } from './modules/hooks/useWhatsAppState';
import { MessageList } from './modules/components/MessageList';
import { ContactList } from './modules/components/ContactList';
import { InputBar } from './modules/components/InputBar';

export default function WhatsAppMessenger() {
  const { messages, contacts, handlers } = useWhatsAppState();
  
  return (
    <div className="whatsapp-container">
      <ContactList contacts={contacts} onSelect={handlers.selectContact} />
      <MessageList messages={messages} />
      <InputBar onSend={handlers.sendMessage} />
    </div>
  );
}
```

### 📊 MÉTRICAS DE SUCESSO PARA MODULARIZAÇÃO

#### Componente bem modularizado deve ter:
- ✅ **Arquivo principal**: < 500 linhas
- ✅ **Módulos**: 5-15 arquivos organizados
- ✅ **Types definidos**: 100% das interfaces em types.ts
- ✅ **Funções puras**: > 80% das funções são puras
- ✅ **Custom hooks**: 1-5 hooks para estado complexo
- ✅ **Zero duplicação**: Nenhum código repetido
- ✅ **Imports limpos**: < 20 imports no arquivo principal

#### Red Flags - Quando modularizar mais:
- 🚨 Arquivo principal > 500 linhas
- 🚨 Mais de 10 useStates no componente
- 🚨 Funções de negócio misturadas com JSX
- 🚨 Imports > 30 linhas
- 🚨 Dificuldade para encontrar código específico

### 🎯 CASO REAL: TableEditorCanvas

**ANTES da modularização:**
- 8,715 linhas em um arquivo
- 74 useState hooks
- 46 event handlers
- Impossível de manter

**DEPOIS da modularização:**
- ~7,300 linhas no principal
- 10 módulos organizados
- 1,400 linhas extraídas
- 100% funcional
- Fácil de navegar

### 📋 CHECKLIST PARA NOVOS COMPONENTES

Antes de começar a codificar, responda:

- [ ] Criei a estrutura de pastas modules/?
- [ ] Defini todos os types em types.ts?
- [ ] Identifiquei as constantes?
- [ ] Listei as funções puras?
- [ ] Planejei os custom hooks?
- [ ] Separei sub-componentes visuais?
- [ ] Arquivo principal ficará < 500 linhas?

Se alguma resposta for NÃO, PARE e modularize ANTES de continuar!

### 📝 Checklist de Modularização

- [ ] Estrutura de pastas criada
- [ ] README.md com avisos adicionado
- [ ] Types/interfaces extraídos
- [ ] Constantes isoladas
- [ ] Funções puras movidas
- [ ] Teste após cada extração
- [ ] Commits frequentes
- [ ] Documentação atualizada

## 📦 REGRA FUNDAMENTAL: ISOLAMENTO MODULAR COMPLETO

### ⚠️ TODOS os componentes DEVEM estar dentro de seus respectivos módulos

**ESTRUTURA OBRIGATÓRIA**:
```
/modulos/[nome_modulo]/componentes/
```

**EXEMPLOS CORRETOS**:
- ✅ TableEditor: `/modulos/base_de_dados/componentes/table_editor/`
- ✅ Auth: `/modulos/sistema/componentes/auth/`
- ✅ IA Components: `/modulos/inteligencia_artificial/componentes/[componente]/`

**PROIBIDO**:
- ❌ Componentes em `/client/components/[modulo]/`
- ❌ Componentes compartilhados sem módulo definido
- ❌ Duplicação de componentes em múltiplos locais
- ❌ Componentes de módulo fora da pasta `/modulos/`

**IMPORTS CORRETOS**:
```typescript
// Usar paths absolutos com alias @
import { TableEditor } from '@/modulos/base_de_dados/componentes/table_editor';
import { AuthComponent } from '@/modulos/sistema/componentes/auth';
import { IAComponent } from '@/modulos/inteligencia_artificial/componentes/[componente]';
```

**EXCEÇÕES - Apenas componentes VERDADEIRAMENTE globais**:
Apenas em `/client/components/ui/`:
- WindowCard, WindowButton, WindowInput (Design System)
- Toast, Dialog, Alert (UI primitivos)
- ContextMenu, Tooltip (Componentes base)

**ESTRUTURA COMPLETA DE UM MÓDULO**:
```
/modulos/[nome_modulo]/
├── componentes/       # TODOS os componentes do módulo
├── hooks/            # Hooks específicos do módulo
├── utils/            # Utilidades do módulo
├── services/         # APIs e serviços do módulo
├── types/            # Types e interfaces do módulo
├── config.json       # Configuração do módulo
├── permissions.json  # Permissões do módulo
└── README.md         # Documentação do módulo
```

**PROCESSO DE MIGRAÇÃO**:
1. Identificar componente e módulo dono
2. Criar estrutura em `/modulos/[modulo]/componentes/`
3. Mover arquivos para novo local
4. Atualizar TODOS os imports
5. Remover pasta/arquivos antigos
6. Testar funcionamento
7. Commit com mensagem clara: "refactor: move [componente] to modular structure"

## ⚠️ Regras Críticas

### 1. SEMPRE Use o Design System
```tsx
// ❌ ERRADO
<div className="bg-white/10 backdrop-blur-md">

// ✅ CORRETO
<WindowCard>
```

### 2. Ícones Material-UI para Módulos
```tsx
// Importar do @mui/icons-material
import { Psychology, Database, Inventory } from '@mui/icons-material';
```

### 3. Lazy Loading com Suspense
```tsx
const Component = lazy(() => import('./Component'));

<Suspense fallback={<Loading />}>
  <Component />
</Suspense>
```

### 4. Glassmorphism em Sidebars
```tsx
// Sidebar transparente
className="backdrop-blur-xl border-r border-white/10"
// SEM background sólido
```

### 5. NUNCA Modificar Porta sem Atualizar Docs
- Porta frontend está em `vite.config.ts` linha 10
- Se mudar, atualize este documento

## 📁 Estrutura GitHub

### Organização dos Repositórios
- **Repositório Principal**: `betofilippi/plataforma.app` (este repo)
- **Módulos**: Cada módulo tem seu próprio repositório
  - Ex: `betofilippi/inteligencia_artificial`, `betofilippi/vendas`
- **Componentes**: São subdiretórios dentro dos repos dos módulos
  - Ex: `inteligencia_artificial/mcp_manager/`

### Documentação da Estrutura
Veja [GITHUB_STRUCTURE.md](GITHUB_STRUCTURE.md) para detalhes completos da organização no GitHub.

## 🔧 Desenvolvimento

### Scripts NPM
```bash
npm run dev        # Desenvolvimento (porta 3030)
npm run build      # Build de produção
npm run preview    # Preview do build
npm test           # Testes
```

### Variáveis de Ambiente (.env)
```bash
# Autenticação Demo
DEMO_MODE=true

# PostgreSQL (Supabase)
DATABASE_URL=postgresql://...

# Redis (desabilitado)
DISABLE_REDIS=true

# Desenvolvimento
NODE_ENV=development
```

## 💡 Dicas para Assistentes IA

1. **Projeto está funcionando** - Não "conserte" o que não está quebrado
2. **Use componentes existentes** - WindowCard, WindowButton, etc.
3. **Teste na porta correta** - Sempre verifique qual porta o Vite alocou
4. **Login é demo** - adm@nxt.eco.br com qualquer senha
5. **Erros de token são normais** - Sistema de auth funcionando
6. **Glassmorphism obrigatório** - Em todas as sidebars
7. **20 módulos prontos** - Não precisa criar novos, apenas melhorar
8. **5 componentes IA vazios** - Apenas ícones placeholder por enquanto
9. **Database integrado** - Não é módulo separado
10. **Estrutura GitHub** - Veja GITHUB_STRUCTURE.md para organização dos repos

## 📊 Status Atual do Projeto

### ✅ Funcionando
- Sistema de janelas flutuantes
- 20 módulos implementados
- 5 componentes de IA (apenas ícones vazios)
- Database com glassmorphism
- Autenticação demo
- Design System completo

### 🚧 Em Desenvolvimento
- Integração com Grist Core
- MCP Bridge completo
- Persistência de janelas

### 📝 Backlog
- Deploy em produção
- Autenticação real
- WebSockets para real-time

---

**ÚLTIMA ATUALIZAÇÃO**: 26/08/2025 - Adicionadas INSTRUÇÕES OBRIGATÓRIAS DE MODULARIZAÇÃO - Todos novos componentes devem nascer modularizados seguindo estrutura do TableEditorCanvas
**ATUALIZAÇÃO ANTERIOR**: 23/08/2025 - Adicionada REGRA FUNDAMENTAL DE ISOLAMENTO MODULAR COMPLETO - Todos componentes devem estar em /modulos/[nome_modulo]/componentes/