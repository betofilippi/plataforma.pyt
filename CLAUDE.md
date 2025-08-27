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

**Plataforma.dev** é um sistema de janelas flutuantes no navegador. Projeto em desenvolvimento inicial.

### ✅ O QUE REALMENTE EXISTE:
- 🖥️ **Sistema de Janelas**: Janelas flutuantes funcionais
- 🎨 **Design System**: Glassmorphism e componentes padronizados
- 🔐 **Auth Demo**: Login demo funcional
- ⚙️ **Configurações**: Tela de configurações do sistema

## 🌐 PORTAS E URLS

| Serviço | Porta | URL | Status |
|---------|-------|-----|--------|
| **Frontend** | **3030** | **http://localhost:3030** | ✅ Principal |
| **Backend API** | **4000** | **http://localhost:4000** | ✅ API |

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

## 📁 Estrutura do Projeto

```
plataforma.dev/
├── 🖥️ client/                       # Frontend
│   ├── components/ui/               # Design System
│   ├── pages/                       # Páginas
│   │   └── SistemaModule.tsx        # Tela de configurações
│   ├── lib/
│   │   └── moduleRegistry.ts        # Registry (vazio - sem módulos)
│   └── App.tsx                      # Roteamento
│
├── 🔧 server/                       # Backend 
│   └── routes/                      # APIs
│
└── ⚙️ vite.config.ts               # Config (porta 3030)
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

## 💡 Dicas para Assistentes IA

1. **NUNCA inventar módulos** - NÃO existem módulos no sistema
2. **Ser honesto** - Projeto em desenvolvimento inicial
3. **Design System** - Use WindowCard, WindowButton, etc.
4. **Porta 3030** - Servidor configurado para esta porta
5. **Login demo** - adm@nxt.eco.br com qualquer senha
6. **Sistema = configurações** - Não é módulo, é tela de configurações
7. **NÃO prometer** - Não documente funcionalidades inexistentes

---

**ATUALIZADO**: 27/08/2025 - Versão limpa e honesta, documentando apenas o que realmente existe.