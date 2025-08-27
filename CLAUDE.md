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

### 3. PROIBIDO MOCK DE DADOS E INVENÇÃO DE MÓDULOS
- ❌ **NUNCA** criar dados falsos ou simulados sem autorização explícita
- ❌ **NUNCA** inventar módulos que não existem
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

**Plataforma.dev** é um sistema de janelas flutuantes no navegador com editor visual de PostgreSQL. O projeto está em desenvolvimento inicial com arquitetura modular planejada.

### Características Atuais:
- 🖥️ **Sistema de Janelas**: Janelas flutuantes funcionais
- 💾 **Editor Database**: PostgreSQL visual estilo Excel
- 🎨 **Design System**: Glassmorphism e componentes padronizados
- 🔐 **Auth Demo**: Login demo funcional

## 🌐 PORTAS E URLS

### URLs de Acesso:
| Serviço | Porta | URL | Status |
|---------|-------|-----|--------|
| **Frontend** | **3030** | **http://localhost:3030** | ✅ Principal |
| **Backend API** | **4000** | **http://localhost:4000** | ✅ API |

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

## 📦 STATUS REAL DOS MÓDULOS (VERDADE ABSOLUTA)

### ✅ O QUE REALMENTE EXISTE:

#### 1. **Database Module**
- **Localização**: `packages/@plataforma/module-database/`
- **Status**: ❌ **NÃO MODULARIZADO** (8,712 linhas em TableEditorCanvas.tsx)
- **Problema CRÍTICO**: 95.4% do código ainda em arquivo monolítico
- **Funcionalidade**: Editor visual PostgreSQL funcional mas não modularizado

#### 2. **Sistema Module**
- **Localização**: `client/pages/SistemaModule.tsx`
- **Status**: ✅ Página básica funcional
- **Conteúdo**: Layout com ícones, não é um módulo real

#### 3. **Marketplace Module**
- **Localização**: `client/pages/MarketplaceModule.tsx` (se existir)
- **Status**: ❓ Página básica ou placeholder

### ❌ O QUE NÃO EXISTE:
- **Módulos de negócio**: Vendas, RH, Financeiro, Estoque, etc. (TODOS são placeholders vazios)
- **Módulos administrativos**: Users, Reports, Audit (NÃO EXISTEM)
- **Módulos AI**: Removidos, não existem mais
- **SDK**: Não existe ainda
- **Templates**: Não existem
- **Repositórios separados**: Todos os módulos estão no repo principal

### 📌 REALIDADE BRUTAL:
- **Módulos prometidos na documentação anterior**: 20+
- **Módulos realmente funcionais**: 0.5 (Database parcial)
- **Module Registry**: Funciona apenas para Database (hardcoded)
- **Modularização**: FALHOU - apenas 4.6% do código foi extraído

## 📁 Estrutura REAL do Projeto

```
plataforma.dev/
├── 📦 packages/@plataforma/         # Apenas 1 módulo
│   └── module-database/             # Database (NÃO modularizado)
│       └── src/components/
│           └── TableEditorCanvas.tsx  # 8,712 linhas!!!
│
├── 🖥️ client/                       # Frontend
│   ├── components/ui/               # Design System (existe)
│   ├── pages/                       # Páginas básicas
│   │   ├── SistemaModule.tsx        # Página simples
│   │   └── PlatformDashboardFixed.tsx
│   ├── lib/
│   │   └── moduleRegistry.ts        # Registry básico
│   └── App.tsx                      # Roteamento
│
├── 🔧 server/                       # Backend básico
│   └── routes/
│       ├── postgres-direct.ts      # API PostgreSQL
│       └── auth.ts                  # Auth demo
│
└── ⚙️ vite.config.ts               # Config (porta 3030)
```

## 💾 Sistema de Database

### Arquitetura Real
- **PostgreSQL** hospedado no Supabase
- **Interface Visual** - Editor estilo Excel com glassmorphism
- **Problema**: TableEditorCanvas com 8,712 linhas NÃO modularizadas

### ⚠️ REGRA FUNDAMENTAL: Sistema TEXT + Type Hints
- **Armazenamento (Supabase)**: TODOS os dados são salvos como **TEXT**
- **Type Hints (Metadados)**: Definem como interpretar e renderizar os campos
- **Interface**: Formatação rica baseada nos hints
- **Validação**: Acontece no frontend, dados sempre aceitos no banco

### Conexão PostgreSQL
```javascript
postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres
```

### APIs Disponíveis
```
GET  /api/postgres/tables      # Listar tabelas
GET  /api/postgres/schemas     # Listar schemas
POST /api/postgres/query       # Executar SQL
GET  /api/postgres/table-data  # Dados da tabela
```

## 🎨 Design System

### Componentes Disponíveis
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
```

### Padrões Visuais
- **Glassmorphism**: `backdrop-blur-xl bg-white/5`
- **Transparência**: Sidebars sem background
- **Hover**: `hover:bg-white/5`
- **Bordas**: `border-white/10`
- **Texto**: Títulos `text-white`, descrições `text-gray-400`

## 🚨 PROBLEMAS CONHECIDOS (CRÍTICOS)

### 1. TableEditorCanvas NÃO está modularizado
- **Arquivo**: `packages/@plataforma/module-database/src/components/TableEditorCanvas.tsx`
- **Problema**: 8,712 linhas em um único arquivo (deveria ter < 500)
- **Impacto**: Impossível de manter
- **Status**: FALHA TOTAL na modularização

### 2. Module Registry limitado
- **Problema**: Funciona apenas para Database (hardcoded)
- **Status**: Não é um sistema modular real

### 3. Módulos inexistentes
- **Problema**: Documentação anterior mentia sobre 20+ módulos
- **Realidade**: Apenas placeholders e páginas vazias

### 4. Sem SDK ou ferramentas
- **Problema**: Não existe SDK para desenvolvimento
- **Status**: Promessas não cumpridas

## 🔧 Desenvolvimento

### Scripts NPM
```bash
npm run dev        # Desenvolvimento (porta 3030)
npm run build      # Build de produção
npm run preview    # Preview do build
npm test           # Testes (se existirem)
```

### Variáveis de Ambiente (.env)
```bash
# Autenticação Demo
DEMO_MODE=true

# PostgreSQL (Supabase)
DATABASE_URL=postgresql://...

# Desenvolvimento
NODE_ENV=development
```

## 📊 Status REAL do Projeto

### ✅ O que Funciona
- Sistema de janelas flutuantes básico
- Database editor visual (mas não modularizado)
- Autenticação demo
- Design System básico

### 🚧 O que NÃO Funciona
- Modularização (falhou completamente)
- Module Registry (limitado)
- Múltiplos módulos (não existem)

### ❌ O que é Mentira
- 20+ módulos empresariais
- Sistema modular avançado
- SDK e ferramentas completas
- Arquitetura enterprise

## 💡 Dicas para Assistentes IA

1. **NUNCA inventar módulos** - Documente apenas o que existe
2. **Admitir problemas** - Modularização falhou
3. **Ser honesto** - Projeto em desenvolvimento inicial
4. **Design System** - Use WindowCard, WindowButton, etc.
5. **Porta 3030** - Servidor configurado para esta porta
6. **Login demo** - adm@nxt.eco.br com qualquer senha
7. **Database funciona** - Editor visual está funcional
8. **NÃO prometer** - Não documente funcionalidades inexistentes

## 🔴 PRÓXIMOS PASSOS REAIS

1. **URGENTE**: Modularizar TableEditorCanvas de verdade
2. **IMPORTANTE**: Criar módulos reais (não páginas vazias)
3. **NECESSÁRIO**: Implementar Module Registry funcional
4. **OPCIONAL**: Desenvolver SDK e ferramentas

---

**ÚLTIMA ATUALIZAÇÃO**: 27/08/2025 - CLAUDE.md COMPLETAMENTE CORRIGIDO para refletir apenas a REALIDADE do projeto, removendo todas as mentiras sobre módulos inexistentes.

**MUDANÇAS NESTA VERSÃO:**
- ✅ Removidas TODAS as mentiras sobre 20+ módulos
- ✅ Documentada apenas a realidade: Database (não modularizado), Sistema (página)
- ✅ Admitidos problemas reais de modularização
- ✅ Eliminadas referências a SDK, templates e funcionalidades inexistentes
- ✅ Status real: projeto em desenvolvimento inicial
- ✅ Honestidade absoluta sobre o que existe vs o que não existe