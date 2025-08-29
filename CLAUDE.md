# CLAUDE.md - A VERDADE ABSOLUTA SOBRE ESTE PROJETO

**ATUALIZADO**: 28/08/2025 - Após análise completa e honesta

## ⚠️ AVISO CRÍTICO PARA ASSISTENTES IA

**LEIA ISTO PRIMEIRO** - Este documento contém a VERDADE sobre o que realmente funciona neste projeto. Não confie em declarações anteriores de sucesso sem verificar.

---

## 🔴 A VERDADE BRUTAL SOBRE O STACK

### O QUE REALMENTE TEMOS:
- **Frontend**: React 18.3 + TypeScript + Vite (**NÃO É PYTHON**)
- **Backend**: Python FastAPI (**100% PYTHON** - isso sim migrado)
- **Database**: **NÃO EXISTE** - apenas dicionários Python em memória
- **Autenticação**: JWT real funcionando com mock users

### O QUE NÃO TEMOS:
- ❌ **Frontend Python** - ainda é 100% React/TypeScript
- ❌ **Banco de dados real** - apenas mock data em memória
- ❌ **Persistência** - tudo é perdido ao reiniciar
- ❌ **Sistema de módulos real** - registry vazio
- ❌ **Upload de arquivos** - fake
- ❌ **WebSocket real** - manager existe mas não integrado
- ❌ **Email** - não configurado
- ❌ **Background tasks** - Celery não usado

---

## 🟢 O QUE FUNCIONA DE VERDADE

### ✅ FUNCIONANDO 100%:
1. **Autenticação JWT**
   - Login com `admin@plataforma.app / admin123`
   - Tokens reais, refresh token funcional
   - Logout e gerenciamento de sessão

2. **Sistema de Janelas**
   - Drag & drop real
   - Resize, minimize, maximize
   - Multi-janelas funcionando

3. **API Backend (50+ endpoints)**
   - Todos retornando dados (mock mas funcionais)
   - CORS configurado
   - Documentação em `/docs`

4. **Roteamento Frontend**
   - Rotas protegidas funcionando
   - Login redirect automático
   - 404 handling

### ⚠️ FUNCIONANDO COM MOCK DATA:
1. **Dashboard** - gráficos e KPIs com dados fake
2. **User Management** - CRUD completo mas usuários hardcoded
3. **Notifications** - sistema completo mas notificações fake
4. **Permissions** - RBAC funcionando mas roles fixas

### ❌ NÃO FUNCIONA:
1. **Upload de avatar** - botão existe mas não faz nada
2. **Módulos marketplace** - não existe
3. **Temas customizados** - rota `/themes` não existe
4. **Email/SMS** - não configurado
5. **Persistência** - reiniciou, perdeu tudo

---

## 📁 ESTRUTURA REAL

```
plataforma.pyt/
├── client/                 # Frontend React (196 arquivos TypeScript)
│   ├── components/         # 119 componentes .tsx
│   ├── pages/             # Páginas funcionais
│   └── hooks/             # 20+ custom hooks
│
├── python-backend/        # Backend Python (100% funcional)
│   └── app/
│       ├── main_full.py  # 50+ endpoints com mock data
│       ├── main.py       # Versão "produção" (precisa DB)
│       └── models/       # Modelos completos mas não usados
│
└── NÃO EXISTE:
    ├── banco de dados real
    ├── sistema de módulos
    ├── upload de arquivos
    └── WebSocket integrado
```

---

## 🚀 COMO RODAR (DE VERDADE)

### Para Desenvolvimento:
```bash
# Terminal 1 - Backend Python
cd python-backend
python -m uvicorn app.main_full:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 - Frontend React
npm run dev
# Acessa em http://localhost:3333
```

### Login:
- `admin@plataforma.app / admin123` ✅ FUNCIONA
- `user@plataforma.app / user123` ✅ FUNCIONA
- `manager@plataforma.app / manager123` ✅ FUNCIONA

---

## ⚠️ REGRAS PARA ASSISTENTES

### PROIBIDO:
1. ❌ **NUNCA** diga que o frontend é Python
2. ❌ **NUNCA** diga que existe banco de dados real
3. ❌ **NUNCA** crie demos fake ou módulos que não servem
4. ❌ **NUNCA** prometa migração completa para Python sem avisar que é MUITO trabalho
5. ❌ **NUNCA** finja que upload funciona

### OBRIGATÓRIO:
1. ✅ **SEMPRE** teste antes de declarar sucesso
2. ✅ **SEMPRE** avise que frontend é React/TypeScript
3. ✅ **SEMPRE** mencione que dados são mock
4. ✅ **SEMPRE** seja honesto sobre limitações
5. ✅ **SEMPRE** verifique em `/docs` se endpoint existe

---

## 💡 SUGESTÕES HONESTAS

### Se usuário quer 100% Python:
1. **Avise**: Frontend Python = reescrever TUDO (196 arquivos)
2. **Sugira**: Streamlit para MVP rápido (mas limitado)
3. **Explique**: React é melhor para UI complexa
4. **Seja honesto**: Migração levaria semanas

### Se usuário quer banco de dados:
1. **main.py** já tem SQLAlchemy configurado
2. Precisa PostgreSQL + Redis
3. Migrations com Alembic prontas
4. Mas precisa configurar e rodar

### Se usuário quer produção:
1. Frontend está pronto
2. Backend precisa DB real
3. Precisa configurar email
4. Precisa storage real (S3/local)

---

## 🔍 COMANDOS ÚTEIS PARA VERIFICAR

```bash
# Ver o que realmente está rodando
curl http://localhost:8001/health

# Ver endpoints disponíveis
open http://localhost:8001/docs

# Testar login
curl -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@plataforma.app","password":"admin123"}'

# Verificar frontend
curl http://localhost:3333
```

---

## 📊 ESTATÍSTICAS REAIS

- **Frontend**: 196 arquivos TypeScript/TSX
- **Backend**: 50+ endpoints Python
- **Componentes React**: 119
- **Custom Hooks**: 20+
- **Dependências NPM**: 100+ (muitas não usadas)
- **Linhas de código**: ~15,000+
- **Tempo para migrar tudo pra Python**: 3-4 semanas minimum

---

## ⚡ TL;DR - RESUMO EXECUTIVO

**O que é**: Aplicação web com frontend React e backend Python  
**O que funciona**: Login, API, janelas, dashboard (com mock data)  
**O que não existe**: Database, uploads, WebSocket real, módulos  
**Honestidade**: É um bom sistema mas NÃO é 100% Python e dados são fake  

**Para assistentes**: SEJA HONESTO. Funciona mas tem limitações.

---

*Este documento foi criado após análise completa em 28/08/2025 e representa a realidade atual do projeto.*