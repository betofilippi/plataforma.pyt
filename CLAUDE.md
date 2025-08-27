# CLAUDE.md - Plataforma OS Enterprise Documentation

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg) ![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg) ![License](https://img.shields.io/badge/license-Enterprise-orange.svg) ![TypeScript](https://img.shields.io/badge/TypeScript-99%25-blue.svg) ![Modules](https://img.shields.io/badge/modules-20+-purple.svg)

---

## 📊 Project Statistics

| **Metric** | **Value** |
|------------|-----------|
| **Active Modules** | 20+ enterprise modules |
| **Lines of Code** | 250,000+ LOC |
| **UI Components** | 180+ reusable components |
| **API Endpoints** | 150+ RESTful endpoints |
| **Test Coverage** | 85%+ |
| **Performance Score** | 95+ Lighthouse |
| **Concurrent Users** | 1,000+ supported |

---

## 🚀 Project Overview

### Executive Summary

**Plataforma OS** is a next-generation virtual enterprise operating system that revolutionizes the digital work experience. Combining the familiarity of a traditional desktop with the power of cloud computing, we deliver a complete integrated work environment that runs entirely in the browser.

### Key Features

- 🖥️ **Virtual Desktop**: Native OS experience with floating windows, multitasking, and application management
- 🧩 **Advanced Modular Architecture**: 20+ specialized modules with hot-swapping and lazy loading
- 💾 **Integrated Visual Database**: PostgreSQL visual editor with Excel-like interface
- 🎨 **Enterprise Design System**: Glassmorphism UI with 180+ standardized components
- 🔒 **Enterprise Security**: Multi-factor authentication, RBAC, and complete auditing
- ⚡ **Optimized Performance**: <3s load time with intelligent caching and global CDN

---

## 🏛️ Technical Architecture

### Micro-Frontend Modular Architecture

```typescript
interface ModuleConfig {
  id: string;
  name: string;
  version: string;
  dependencies: string[];
  lazy: boolean;
  permissions: Permission[];
  endpoints: APIEndpoint[];
}
```

### Application Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
├─────────────────────────────────────────────────────────────┤
│  Window Manager  │  Module Renderer  │  Design System      │
├─────────────────────────────────────────────────────────────┤
│                     BUSINESS LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  Module Registry │  Service Layer    │  State Management   │
├─────────────────────────────────────────────────────────────┤
│                      DATA LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL      │  API Gateway      │  External Services  │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Technology Stack

### Frontend
- **Framework**: React 18.2+ with TypeScript 5.0+
- **Build Tool**: Vite 4.4+ 
- **State**: Zustand + TanStack Query
- **Styling**: TailwindCSS 3.3+ with Glassmorphism
- **UI Components**: Material-UI + Lucide React

### Backend
- **Runtime**: Node.js 18.17+
- **Framework**: Express.js 4.18+
- **Database**: PostgreSQL 15+ via Supabase
- **Cache**: Redis 7.0+
- **Auth**: Supabase Auth with JWT

### DevOps
- **Version Control**: Git + GitHub
- **CI/CD**: GitHub Actions
- **Containerization**: Docker + Compose
- **Monitoring**: Sentry + LogRocket

---

## 🏢 Enterprise Module System

### Core Modules (5)

| Module | Component | Description |
|--------|-----------|-------------|
| **Database** | `@plataforma/module-database` | Visual PostgreSQL editor |
| **System** | `@plataforma/module-system` | System configuration |
| **Auth** | `@plataforma/module-auth` | Authentication & authorization |
| **Files** | `@plataforma/module-files` | File management |
| **Settings** | `@plataforma/module-settings` | User preferences |

### Business Modules (10)

| Module | Component | Description |
|--------|-----------|-------------|
| **CRM** | `@plataforma/module-crm` | Customer relationship management |
| **ERP** | `@plataforma/module-erp` | Enterprise resource planning |
| **Sales** | `@plataforma/module-sales` | Sales management |
| **Finance** | `@plataforma/module-finance` | Financial management |
| **HR** | `@plataforma/module-hr` | Human resources |
| **Inventory** | `@plataforma/module-inventory` | Stock control |
| **Marketing** | `@plataforma/module-marketing` | Marketing automation |
| **Production** | `@plataforma/module-production` | Production management |
| **Logistics** | `@plataforma/module-logistics` | Supply chain |
| **BI** | `@plataforma/module-bi` | Business intelligence |

### Administrative Modules (3)

| Module | Component | Description |
|--------|-----------|-------------|
| **Users** | `@plataforma/module-users` | User management |
| **Reports** | `@plataforma/module-reports` | Report generation |
| **Audit** | `@plataforma/module-audit` | System auditing |

### Support Modules (3)

| Module | Component | Description |
|--------|-----------|-------------|
| **AI Assistant** | `@plataforma/module-ai` | AI-powered assistance |
| **Marketplace** | `@plataforma/module-marketplace` | Module marketplace |
| **Automation** | `@plataforma/module-automation` | Workflow automation |

---

## 🔌 APIs and Integrations

### REST API
```typescript
// Core endpoints
GET  /api/system/info
GET  /api/system/health
GET  /api/database/schemas
POST /api/database/query

// Business endpoints
GET  /api/crm/contacts
POST /api/sales/orders
GET  /api/finance/reports
```

### WebSocket Events
```typescript
// Real-time events
'database:table_updated'
'crm:contact_created'
'sales:order_paid'
'system:notification'
```

### GraphQL Schema
```graphql
type Query {
  systemInfo: SystemInfo!
  contacts(search: String): [Contact!]!
  dashboardData: DashboardData!
}

type Mutation {
  createContact(input: ContactInput!): Contact!
  updateOrder(id: ID!, status: OrderStatus!): Order!
}

type Subscription {
  contactUpdated: Contact!
  orderCreated: Order!
}
```

---

## 🛠️ Development Guide

### Creating a New Module

1. **Generate module structure**:
```bash
npx plataforma-cli create-module my-module
```

2. **Module structure**:
```
packages/@plataforma/module-my-module/
├── src/
│   ├── components/
│   │   └── MyModule.tsx
│   ├── hooks/
│   ├── services/
│   └── index.ts
├── package.json
└── tsconfig.json
```

3. **Register the module**:
```typescript
// client/lib/moduleRegistry.ts
{
  id: 'my-module',
  name: 'My Module',
  component: '@plataforma/module-my-module',
  category: 'business',
  lazy: true
}
```

### Using the Design System

```tsx
import { WindowCard, WindowButton } from '@/components/ui';

export function MyComponent() {
  return (
    <WindowCard title="My Feature">
      <WindowButton variant="primary">
        Action
      </WindowButton>
    </WindowCard>
  );
}
```

### Database Operations

```typescript
// Using SDK
import { plataformaSDK } from '@plataforma/sdk';

const result = await plataformaSDK.database.query(
  'SELECT * FROM module_crm.contacts WHERE active = $1',
  [true]
);

// Using Visual Editor
import { TableEditor } from '@plataforma/module-database';

<TableEditor 
  schema="module_crm"
  table="contacts"
  editable={true}
/>
```

---

## 🔧 Development Tools

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run dev:server       # Start backend only
npm run dev:client       # Start frontend only

# Building
npm run build           # Production build
npm run preview         # Preview production build

# Testing
npm run test           # Run unit tests
npm run test:e2e       # Run E2E tests
npm run test:coverage  # Generate coverage report

# Code Quality
npm run lint          # Lint code
npm run format        # Format with Prettier
npm run type-check    # TypeScript checking
```

### Debug Tools

Access debug panel at: `http://localhost:3030/debug`

```typescript
// Enable debug mode
localStorage.setItem('DEBUG_MODE', 'true');

// View module registry
console.log(moduleRegistry.getAllModules());

// Check window state
console.log(windowManager.getWindows());
```

---

## 📁 Project Structure

```
plataforma.dev/
├── 📦 packages/@plataforma/       # Module packages
│   ├── module-database/
│   ├── module-crm/
│   └── ...20+ modules
│
├── 🖥️ client/                     # Frontend application
│   ├── components/
│   │   ├── ui/                   # Design system
│   │   └── windows/              # Window system
│   ├── lib/
│   │   ├── moduleRegistry.ts
│   │   └── windowManager.ts
│   ├── pages/
│   └── App.tsx
│
├── 🔧 server/                     # Backend application
│   ├── routes/
│   │   ├── api/
│   │   └── websocket/
│   └── index.ts
│
├── 📚 docs/                       # Documentation
│   ├── TECH_ROADMAP_2025.md
│   └── API_REFERENCE.md
│
└── ⚙️ Configuration files
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## 🎯 Best Practices

### TypeScript Patterns

```typescript
// Use strict types
interface UserData {
  id: string;
  name: string;
  email: string;
}

// Avoid 'any'
function processData<T extends object>(data: T): T {
  return { ...data };
}

// Use enums for constants
enum Status {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}
```

### React Patterns

```tsx
// Use functional components
export function Component() {
  const [state, setState] = useState<State>();
  
  // Use custom hooks
  const { data, loading } = useModuleData();
  
  // Memoize expensive operations
  const result = useMemo(() => 
    expensiveCalculation(data), [data]
  );
  
  return <div>{result}</div>;
}

// Error boundaries
<ErrorBoundary fallback={<ErrorFallback />}>
  <Component />
</ErrorBoundary>
```

### Performance Optimization

```typescript
// Lazy load modules
const Module = lazy(() => import('@plataforma/module-crm'));

// Use React.memo for pure components
export const PureComponent = memo(({ data }) => {
  return <div>{data}</div>;
});

// Debounce expensive operations
const debouncedSearch = useMemo(
  () => debounce(search, 300),
  [search]
);
```

---

## 🔒 Security Guidelines

### Authentication
- JWT tokens with refresh mechanism
- Multi-factor authentication support
- Session management with Redis

### Authorization
- Role-based access control (RBAC)
- Module-level permissions
- Row-level security in PostgreSQL

### Data Protection
- TLS 1.3 encryption
- Input validation and sanitization
- SQL injection prevention
- XSS protection

---

## 📋 AI Assistant Guidelines

### Core Principles for AI Assistants

1. **Code Quality First**
   - Always use TypeScript with proper types
   - Follow existing patterns in the codebase
   - Use the design system components
   - Write clean, maintainable code

2. **Module Architecture**
   - Respect the modular structure
   - Use lazy loading for new modules
   - Follow the Module Registry pattern
   - Maintain module isolation

3. **Performance Awareness**
   - Implement lazy loading
   - Use React.memo and useMemo appropriately
   - Optimize bundle sizes
   - Monitor render performance

4. **Security Consciousness**
   - Never expose sensitive data
   - Validate all inputs
   - Use prepared statements for SQL
   - Implement proper authentication checks

5. **User Experience**
   - Maintain consistent UI/UX
   - Use glassmorphism design
   - Provide loading states
   - Handle errors gracefully

### Development Workflow

1. **Before Making Changes**:
   - Understand the existing code structure
   - Check for similar implementations
   - Review the design system
   - Consider performance implications

2. **When Implementing Features**:
   - Start with TypeScript interfaces
   - Create reusable components
   - Add proper error handling
   - Include loading states

3. **After Implementation**:
   - Test the functionality
   - Check for TypeScript errors
   - Verify responsive design
   - Update documentation if needed

### Common Tasks

#### Adding a New Feature
```typescript
// 1. Define types
interface FeatureProps {
  data: FeatureData;
  onUpdate: (data: FeatureData) => void;
}

// 2. Create component
export function Feature({ data, onUpdate }: FeatureProps) {
  // Implementation
}

// 3. Add to module
export { Feature } from './Feature';
```

#### Integrating with Database
```typescript
// Use the SDK
const result = await sdk.database.query(
  'SELECT * FROM table WHERE id = $1',
  [id]
);

// Handle errors
if (result.error) {
  console.error('Database error:', result.error);
  return;
}
```

#### Creating API Endpoints
```typescript
// server/routes/api/feature.ts
router.get('/api/feature/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getFeature(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🚀 Technology Roadmap 2025

### Q1 2025 - Foundation
- ✅ Module system architecture
- ✅ Design system implementation
- ✅ Core modules development
- 🔄 Performance optimization

### Q2 2025 - Intelligence
- 📊 **Activity Miner**: Workflow mining and automation
- 🤖 **AI Operator**: Integrated AI assistant
- 🧠 **RAG System**: Contextual enterprise AI
- 📈 **Real-time Analytics**: Live dashboards

### Q3 2025 - Automation
- 🔄 **Workflow Orchestration**: Process automation
- 📄 **Document Intelligence**: Smart document processing
- 🚀 **Event Streaming**: Real-time synchronization
- 🔍 **Observability Stack**: Complete monitoring

### Q4 2025 - Scale
- 🌍 **Global Distribution**: Multi-region deployment
- 🔐 **Advanced Security**: Zero-trust architecture
- 📱 **Mobile Support**: Responsive PWA
- 🎯 **Enterprise Features**: Advanced customization

### Emerging Technologies

| Technology | Purpose | Status |
|------------|---------|--------|
| **Agente Operator** | AI-powered system control | 🔄 Planning |
| **Activity Mining** | Process discovery | 🔄 Planning |
| **Temporal Workflows** | Complex automation | 📅 Q3 2025 |
| **Vector Database** | AI knowledge base | 📅 Q2 2025 |
| **Edge Computing** | Local processing | 📅 Q4 2025 |

---

## 🌐 Environment Configuration

### Development Environment

```bash
# .env.development
NODE_ENV=development
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
DATABASE_URL=postgresql://user:pass@localhost:5432/plataforma
REDIS_URL=redis://localhost:6379
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
VITE_API_URL=https://api.plataforma.dev
VITE_WS_URL=wss://api.plataforma.dev
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}
```

### Required Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3030 | Vite dev server |
| Backend | 4000 | Express API |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache |
| WebSocket | 4000 | Real-time |

---

## 🎓 Learning Resources

### Documentation
- [Official Docs](docs/README.md)
- [API Reference](docs/API_REFERENCE.md)
- [Tech Roadmap](docs/TECH_ROADMAP_2025.md)

### Key Technologies
- [React 18 Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Docs](https://supabase.io/docs)
- [TailwindCSS](https://tailwindcss.com/docs)

### Community
- GitHub Issues for bug reports
- Discord for discussions
- Stack Overflow for questions

---

## 🤝 Contributing

### Code Standards
1. Use TypeScript for all new code
2. Follow ESLint and Prettier rules
3. Write meaningful commit messages
4. Add tests for new features
5. Update documentation

### Pull Request Process
1. Fork the repository
2. Create feature branch
3. Implement changes
4. Add tests
5. Update documentation
6. Submit PR with description

### Commit Convention
```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

---

## 📝 License

Plataforma OS is proprietary software. All rights reserved.

For licensing inquiries, contact: license@plataforma.dev

---

## 🏆 Acknowledgments

Built with cutting-edge technologies and best practices from the global development community.

Special thanks to all contributors and the open-source community.

---

**Last Updated**: August 27, 2025  
**Version**: 2.0.0  
**Status**: Production Ready

---

*This document serves as the complete technical reference for the Plataforma OS enterprise system. For specific implementation details, refer to the inline documentation and type definitions in the codebase.*