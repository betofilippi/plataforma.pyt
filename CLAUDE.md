# CLAUDE.md - Instruções para Assistentes IA

Este arquivo contém instruções essenciais para qualquer assistente Claude (ou outro LLM) trabalhando neste projeto.

# ⚠️ REGRAS RÍGIDAS - HONESTIDADE ABSOLUTA

## 1. NUNCA MENTIR
- ❌ NUNCA declarar sucesso sem verificar
- ❌ NUNCA fingir que algo funciona quando não funciona
- ❌ NUNCA criar funcionalidades falsas ou demos que não servem pra nada
- ✅ SEMPRE testar antes de afirmar que funciona

## 2. SE NÃO SABE, ADMITA
- Diga "NÃO SEI" quando não souber
- Diga "NÃO CONSIGO" quando não conseguir
- Peça ajuda ou sugira alternativas
- NÃO fique criando código fake para parecer competente

## 3. PROIBIDO CRIAR LIXO
- ❌ NUNCA criar demos falsos
- ❌ NUNCA criar módulos que não existem
- ❌ NUNCA simular funcionalidades
- ✅ Criar apenas código que REALMENTE funciona

---

## 🎯 O QUE REALMENTE EXISTE E FUNCIONA

### ✅ FUNCIONALIDADES REAIS:
1. **Sistema de Janelas Flutuantes**
   - WindowManager, WindowDesktop funcionando
   - Janelas podem ser movidas, redimensionadas, minimizadas
   - GlobalWindowTemplate com configurador de temas

2. **Dashboard Principal**
   - PlatformDashboardFixed.tsx
   - Ícones de Sistema e Temas funcionando

3. **Autenticação**
   - Login funcional com demo credentials
   - Protected routes funcionando

4. **Páginas Existentes** (mas sem backend real):
   - `/sistema` - Configurações do sistema
   - `/admin/permissions` - Interface admin (sem backend)
   - `/profile` - Perfil do usuário (sem backend)
   - `/template` - Template base

### ❌ O QUE NÃO EXISTE:
- NÃO existe sistema de módulos real
- NÃO existe marketplace
- NÃO existe rota `/notifications`
- NÃO existe rota `/themes` 
- NÃO existe backend real para admin/profile

## 📁 Estrutura REAL do Projeto

```
plataforma.dev/
├── client/
│   ├── components/
│   │   ├── ui/          # Design system real
│   │   └── windows/     # Sistema de janelas real
│   ├── pages/
│   │   ├── PlatformDashboardFixed.tsx  # Dashboard principal
│   │   ├── SistemaModule.tsx           # Configurações
│   │   ├── Login.tsx                   # Login funcional
│   │   └── [outras páginas sem backend real]
│   └── lib/
│       └── moduleRegistry.ts  # VAZIO - sem módulos
│
├── server/              # Backend com algumas APIs funcionais
└── index.html          # Entry point
```

## 🚀 Como Iniciar

```bash
npm install
npm run dev
# Acessa em http://localhost:3031 (ou outra porta disponível)
```

## 💡 Para Assistentes IA

1. **NÃO INVENTE** - Se não existe, não finja que existe
2. **SEJA HONESTO** - Sistema em desenvolvimento inicial
3. **FOQUE NO REAL** - Trabalhe apenas com o que funciona
4. **NÃO CRIE DEMOS** - Demos e mocks são lixo inútil
5. **TESTE SEMPRE** - Use debug-system.html para verificar

## 🔍 Debug Obrigatório

Após qualquer mudança:
1. Abra `http://localhost:PORT/debug-system.html`
2. Verifique se todos os 24 testes passam
3. Se houver erros, CORRIJA antes de declarar sucesso

---

**ATUALIZADO**: 27/08/2025 - Após limpeza completa removendo ~8000 linhas de código lixo