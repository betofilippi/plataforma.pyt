# Análise Completa do Projeto

Este documento consolida a análise técnica, de arquitetura, UI/UX, segurança e recomendações de melhorias para o projeto.

Sumário
- Visão geral e estrutura
- Stack de tecnologias
- Arquitetura e layout
- Autenticação e permissões
- Sistema de janelas (Window Manager)
- Editor de tabelas (TableEditor)
- Integrações e APIs
- Infraestrutura (Docker/Grist)
- Segurança e privacidade
- Inconsistências e bugs
- UI/UX – pontos fortes e melhorias
- Recomendações priorizadas
- Checklist de ações

---

Visão geral e estrutura
- Projeto modular com múltiplos domínios (vendas, financeiro, estoque, etc.)
- Frontend React/TS em client/
- Módulos de domínio em client/pages/* e metadados por domínio em modulos/
- Editor de tabelas avançado e sistema de janelas com taskbar (estilo desktop)
- Integração com Supabase (Postgres + Realtime + Storage) e endpoints /api
- Infra adicional com Grist via Docker Compose

Principais diretórios e seu papel
- apps/: placeholder de apps, atualmente vazio
- client/: aplicação React (App.tsx, rotas, contexts, componentes e páginas)
- client/components/windows: WindowManager, WindowDesktop, WindowTaskbar, etc.
- client/pages: páginas e módulos de domínio (Database, Vendas, etc.)
- client/components/ui: design system (shadcn + Radix) e componentes Window*
- client/contexts: AuthContext e PermissionContext
- client/lib: serviços (supabase, api-config, design-system, etc.)
- modulos/: metadados/config específicos por domínio (config.json, permissions.json)
- database/: scripts e migração (migrate.cjs) – separado da integração Supabase
- docker-compose.yml: serviço de Grist e init de esquema no Postgres remoto

Stack de tecnologias
- Frontend
  - React 18 + react-router-dom v6
  - TypeScript
  - TanStack React Query
  - Tailwind CSS (tokens CSS + utilitários em client/global.css)
  - shadcn/ui + Radix UI (class-variance-authority/cva)
  - Ícones: lucide-react e Material UI Icons (MUI)
  - RevoGrid e componentes de tabela próprios (virtualização e edição)
- Dados/Integrações
  - Supabase JS SDK (createClient, Realtime, Storage)
  - Chamadas HTTP para /api (auth, database, files, permissions, etc.)
- Infra
  - Docker Compose (gristlabs/grist)
  - Netlify (arquivo de config presente)

Arquitetura e layout
- App.tsx centraliza rotas; módulos são Lazy + Suspense com loaders por rota
- ProtectedRoute protege rotas com base em AuthContext; há AdminRoute/ManagerRoute/GuestOnly
- MainLayout provê WindowManagerProvider e WindowTaskbar globais (exceto /login)
- Cada módulo (ex.: DatabaseModule/VendasModule) cria um "desktop" com ícones (Diretórios, Documentos, Tabelas) e abre janelas via useCreateWindow
- Observação: módulos também criam seu próprio WindowManagerProvider + Taskbar (duplicado com MainLayout)

Autenticação e permissões
- AuthContext (client/contexts/AuthContext.tsx)
  - Login via POST /api/auth/login; refresh via /api/auth/refresh
  - Token e usuário salvos em localStorage (plataforma_access_token, plataforma_token_expiry, plataforma_user)
  - Interceptores axios; auto-refresh 1 min antes de expirar
  - Social login com Supabase OAuth (redirect /auth/callback)
- PermissionContext (client/contexts/PermissionContext.tsx)
  - Carrega permissões/roles via /api/my-permissions
  - Verificações locais (hasPermission/hasRole/levels) e dinâmicas (/api/check-permission(s)) com cache em memória
  - Helpers: isAdmin, isSuperAdmin, etc.

Sistema de janelas (Window Manager)
- WindowManager: controla janelas (id, título, conteúdo, posição, tamanho, zIndex, minimizar/maximizar, snap esquerdo/direito)
- Persistência de posição/tamanho/minimização em localStorage
- WindowDesktop renderiza janelas e taskbar; DesktopContextMenu simples
- UX estilo desktop, com taskbar

Editor de tabelas (TableEditor)
- TableEditorCanvas.tsx (extenso, ~8.6k linhas) integra:
  - VirtualizedTableBody, CellRenderer, filtros, constraints, undo/redo, seleção, realtime Supabase, upload de mídia (storage), relacionamentos
  - CellRenderer com type hints: currency, percentage, date/time, boolean, select, tags, cpf/cnpj, email, url, cep, color, json, media, location, uuid, multiline etc.
- Hooks: useTableEditor, useTableSelection, useUndoRedo, useTableConstraints, etc.
- TableEditorWithSchema: wrapper para filtrar por schema (atualmente "intercepta" window.fetch – ver Riscos)

Integrações e APIs
- Supabase: client/lib/supabase.ts cria cliente com createClient
- databaseHelpers usam RPCs (list_all_tables, get_table_schema, execute_sql)
- API REST:
  - client/lib/api-config.ts monta base URLs relativos a /api/... em desenvolvimento/produção
  - Componentes chamam /api/files/list, /api/postgres/schemas, /api/postgres/tables, /api/my-permissions etc.
- Observação: código de servidor não está neste workspace; endpoints presumidos

Infraestrutura (Docker/Grist)
- docker-compose.yml sobe gristlabs/grist com GRIST_SANDBOX_FLAVOR=unsandboxed
- Conecta ao Postgres do Supabase (host e credenciais expostos no compose)
- Serviço grist-init aplica init-schema.sql no Postgres remoto (Supabase)

Segurança e privacidade (pontos críticos)
1) Supabase service_role exposta no cliente
- client/lib/supabase.ts contém createClient com service_role key no frontend (grave). A chave deve ser mantida no servidor e rotacionada imediatamente (revogar a exposta). No cliente, usar apenas anon key com RLS + policies corretas.

2) Credenciais e host do banco no docker-compose.yml
- docker-compose.yml contém host/usuário/senha do Postgres remoto (Supabase) em texto claro. Use variáveis de ambiente e secrets. Evitar ligar containers locais diretamente a banco de produção.

3) Grist "unsandboxed"
- GRIST_SANDBOX_FLAVOR=unsandboxed eleva risco se combinado com credenciais amplas. Revisar necessidade e isolar ambiente.

4) FileExplorer com path arbitrário
- /api/files/list recebe path do cliente; módulos usam caminhos Windows reais. O servidor deve validar/limitar raiz e não permitir traversal. Ideal: usar storage (ex.: Supabase Storage) com ACL.

5) Fluxo de tokens
- Mistura de withCredentials (cookies) e Bearer tokens em headers sem desenho único pode gerar falhas/duplicidade. Padronizar (preferir cookie httpOnly + CSRF ou somente Bearer).

6) RLS/Policies
- Com anon key no cliente, é obrigatório ter RLS e policies adequadas em todas as tabelas acessíveis; operações privilegiadas via service only no servidor.

Inconsistências e bugs
- Token inconsistente entre contexts
  - AuthContext salva token como 'plataforma_access_token'; PermissionContext lê 'accessToken' para montar Authorization (provável 401/403). Corrigir para usar useAuth() ou a mesma chave
- Duplicidade de WindowManagerProvider/Taskbar
  - MainLayout já cria provider/taskbar global; módulos criam outro provider/taskbar. Unificar em um provider/taskbar global
- TableEditorWithSchema intercepta window.fetch
  - Efeito global frágil; preferir passar schemaFilter como prop/param e aplicar no serviço/servidor
- components.json vs realidade
  - Aponta tailwind.config.ts e client/index.css; o CSS real é client/global.css e não há tailwind.config no workspace
- Configs ausentes
  - Faltam package.json/tsconfig.json/vite.config.ts/index.html neste workspace (provável em outro repo). Documentar ou mover para cá
- global.css com duplicações
  - Tokens/classes repetidos; consolidar
- Duas bibliotecas de toast (Toaster + Sonner)
  - Unificar para evitar UI duplicada
- Arquivo "nul" na raiz (especial no Windows)
  - Pode quebrar ferramentas cross-platform; remover/renomear

UI/UX – pontos fortes
- Carregadores por módulo em Suspense, UX consistente
- Desktop de janelas com taskbar e persistência de estado
- CellRenderer rico melhora legibilidade de dados
- Sidebar acessível (atalho Ctrl/Cmd+B), mobile via Sheet
- Virtualização em tabelas grandes

UI/UX – oportunidades
- Unificar shell (provider/taskbar único), controlar overlays (z-index) de forma consistente
- Consolidar tokens e temas (dark/light) no global.css e alinhar com shadcn
- Unificar toasts; guideline de iconografia (lucide vs MUI)
- Acessibilidade: foco visível, aria labels em botões/menus

Recomendações priorizadas
1) Segurança
- Remover service_role do cliente e rotacionar chave no Supabase
- Mover operações privilegiadas (RPCs perigosas/execute_sql) para servidor
- Proteger docker-compose com env/secrets; revisar Grist "unsandboxed"
- Restringir /api/files/* a root controlado ou migrar para Storage
- Habilitar e revisar RLS/policies em todas as tabelas

2) Correções imediatas
- Corrigir PermissionContext para usar token do AuthContext ou mesma chave de storage
- Unificar WindowManagerProvider/Taskbar (manter no MainLayout)
- Substituir intercept global do fetch por parâmetro/serviço com filtro de schema aplicado no backend
- Unificar toasts; remover duplicações no global.css

3) Configuração/DX
- Adicionar/alinhar: package.json (scripts), tsconfig.json (paths @), vite.config.ts (alias), tailwind.config (content), index.html (div#root)
- Ajustar components.json para refletir global.css/tailwind config
- ESLint/Prettier/Husky para padronização

4) Backend/API
- Documentar/implementar endpoints /api com autenticação/autorização consistente (Bearer ou cookies httpOnly + CSRF)
- Server-side enforcement para filtro de schema por módulo

5) Código e performance
- Fatiar TableEditorCanvas em módulos menores (núcleo de dados, edição/seleção, UI/toolbar, formatação, storage, relacionamentos)
- Code-splitting de features pesadas do editor; memoização seletiva
- Padronizar logs (lib/logs.ts) e remover console.log em produção

Checklist de ações
- [ ] Revogar/rotacionar service_role e remover do cliente; usar anon key + RLS
- [ ] Corrigir PermissionContext para usar token do AuthContext
- [ ] Unificar WindowManagerProvider/Taskbar no MainLayout
- [ ] Remover intercept de fetch no TableEditorWithSchema; aplicar filtro via serviço/servidor
- [ ] Ajustar components.json e adicionar tailwind.config + apontar CSS correto
- [ ] Adicionar package.json/tsconfig/vite.config/index.html neste projeto (se aplicável)
- [ ] Unificar sistema de toasts (ou Sonner ou Toaster)
- [ ] Consolidar tokens/duplicações em global.css
- [ ] Proteger docker-compose com env/secrets e revisar Grist
- [ ] Restringir /api/files/* e migrar para Storage
- [ ] Implementar/lacrar políticas RLS por schema/módulo
- [ ] Adicionar lint/format/tests (Vitest/RTL e E2E)

Notas finais
- O projeto tem uma base sólida e ambiciosa (desktop de janelas + editor de dados avançado). 
- As maiores prioridades são a segurança (chaves/credenciais) e algumas inconsistências arquiteturais (providers duplicados, token de permissão). 
- Após corrigir os pontos críticos, foque em refatorar o editor de tabelas para manter a velocidade de desenvolvimento e confiabilidade.
