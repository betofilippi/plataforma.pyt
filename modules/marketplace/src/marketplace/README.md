# 🛒 Marketplace Frontend

Uma interface completa de marketplace para a plataforma.dev, permitindo aos usuários descobrir, instalar e gerenciar módulos da plataforma.

## ✨ Funcionalidades

### 📦 Para Usuários
- **Navegação de Módulos**: Browse por categorias, busca, filtros
- **Visualizações Detalhadas**: Screenshots, descrições, avaliações
- **Instalação One-Click**: Processo simplificado de instalação
- **Gerenciamento**: Ver módulos instalados, atualizações
- **Avaliações**: Sistema de reviews e ratings

### 🛠️ Para Desenvolvedores
- **Dashboard Completo**: Analytics, receita, estatísticas
- **Publicação de Módulos**: Interface para upload e gerenciamento
- **Analytics**: Dados detalhados de downloads e engajamento
- **Gerenciamento de Versões**: Controle de releases e changelogs

## 🏗️ Arquitetura

```
marketplace/
├── components/           # Componentes específicos
│   ├── ModuleCard.tsx   # Cards de exibição de módulos
│   ├── ModuleDetail.tsx # Tela detalhada do módulo
│   ├── InstallModal.tsx # Modal de instalação
│   └── DeveloperDashboard.tsx # Painel do desenvolvedor
├── hooks/               # Custom hooks
│   ├── useMarketplace.ts # Hook principal do marketplace
│   └── useModuleInstaller.ts # Hook de instalação
├── services/            # Integração com APIs
│   ├── marketplace-api.ts # API principal
│   └── mock-data.ts     # Dados mock para desenvolvimento
├── types/               # TypeScript types
│   └── index.ts         # Definições de tipos
├── MarketplacePage.tsx  # Componente principal
└── index.ts            # Exports principais
```

## 🚀 Como testar

### Pré-requisitos
1. Servidor de desenvolvimento rodando (`npm run dev`)
2. Usuário autenticado na plataforma

### Acesso ao Marketplace
1. Acesse `http://localhost:3032` (ou a porta exibida no terminal)
2. Faça login com: `adm@nxt.eco.br` (qualquer senha)
3. Clique no ícone "MARKETPLACE" no desktop

### Funcionalidades Testáveis
- ✅ **Navegação Principal**: Browse, categorias, busca
- ✅ **Visualização de Módulos**: Cards com informações completas
- ✅ **Detalhes do Módulo**: Tela completa com screenshots, reviews
- ✅ **Sistema de Filtros**: Categoria, preço, ordenação
- ✅ **Dashboard de Desenvolvedor**: Estatísticas e gerenciamento
- ⚠️ **Instalação Real**: Mock (simulação) em desenvolvimento

## 🎨 Design System

Usa o design system existente da plataforma:
- **WindowCard**: Cards padronizados com glassmorphism
- **WindowButton**: Botões com variantes (primary, secondary, etc.)
- **WindowInput**: Inputs padronizados
- **Cores**: Violeta (#7C3AED) como cor principal

## 🔧 Configurações

### Mock Data
Em desenvolvimento, usa dados simulados em `services/mock-data.ts`:
- 5 módulos de exemplo
- 5 categorias
- Sistema completo de ratings e reviews

### API Integration
Para produção, configura em `services/marketplace-api.ts`:
- Endpoints REST para todas as funcionalidades
- Autenticação automática via tokens
- Tratamento de erros e loading states

## 📋 Dados Mock Disponíveis

### Módulos de Teste
1. **AI Assistant Pro** - Pago (R$ 29.99) - Featured
2. **CRM Profissional** - Freemium - Trending  
3. **Gerenciador de Tarefas** - Gratuito - New Release
4. **Dashboard Financeiro** - Pago (R$ 49.90) - Featured + Trending
5. **Chat da Equipe** - Pago (R$ 19.90)

### Categorias
- Inteligência Artificial
- Negócios  
- Produtividade
- Financeiro
- Comunicação

## 🐛 Troubleshooting

### Marketplace não carrega
1. Verifique se o servidor está rodando
2. Confirme que está logado na plataforma
3. Verifique console do browser para erros

### Instalação não funciona
- Em desenvolvimento, instalações são simuladas
- Check os toasts para feedback do processo

### Dashboard de desenvolvedor vazio
- É esperado em desenvolvimento (dados mock limitados)
- Algumas funcionalidades são placeholders

## 🚀 Próximos Passos

### Backend Integration
- [ ] Implementar endpoints da API
- [ ] Sistema real de instalação de módulos
- [ ] Banco de dados para módulos e reviews
- [ ] Sistema de pagamentos

### Funcionalidades Avançadas
- [ ] Sistema de favoritos persistente
- [ ] Notificações push para atualizações
- [ ] Analytics em tempo real
- [ ] Sistema de versioning avançado

### UX/UI Enhancements
- [ ] Animações e transições
- [ ] Mode escuro/claro
- [ ] Responsividade mobile
- [ ] Acessibilidade completa

---

**Status**: ✅ Pronto para demonstração e testes básicos  
**Version**: 1.0.0  
**Last Updated**: 26/08/2025