# @plataforma/module-database

Módulo de Base de Dados da Plataforma.app - Interface visual para gerenciamento de bancos de dados PostgreSQL com recursos avançados de edição e visualização.

## Características

- 🗃️ **Editor Visual**: Interface tipo planilha para edição de dados
- 📊 **Multi-Schema**: Suporte completo a múltiplos schemas PostgreSQL
- 🎨 **Glassmorphism UI**: Design moderno com efeitos de vidro
- 🔍 **Busca e Filtros**: Sistema avançado de filtros por coluna
- 📱 **Responsivo**: Interface adaptável para diferentes tamanhos de tela
- ⚡ **Performance**: Virtualização para grandes volumes de dados
- 🔄 **Real-time**: Sincronização em tempo real com Supabase

## Instalação

```bash
npm install @plataforma/module-database
```

## Uso Básico

```tsx
import { DatabaseModule } from '@plataforma/module-database';

function App() {
  return (
    <DatabaseModule />
  );
}
```

## API

### Componentes

#### DatabaseModule
Componente principal do módulo de banco de dados.

```tsx
interface DatabaseModuleProps {
  className?: string;
  style?: React.CSSProperties;
}
```

#### TableEditor
Editor de tabelas com interface tipo planilha.

```tsx
interface TableEditorProps {
  tableName: string;
  schema?: string;
  readonly?: boolean;
}
```

### Hooks

#### useDatabase
Hook para gerenciar estado geral do banco de dados.

```tsx
const { schemas, activeSchema, setActiveSchema } = useDatabase();
```

#### useTableEditor
Hook para gerenciar edição de tabelas.

```tsx
const { data, loading, save, undo, redo } = useTableEditor(tableName);
```

#### useQueryExecutor
Hook para execução de queries SQL.

```tsx
const { execute, loading, result, error } = useQueryExecutor();
```

### Services

#### DatabaseService
Serviço principal para interação com o banco de dados.

#### QueryService
Serviço para execução de queries SQL.

#### SchemaService
Serviço para gerenciamento de schemas.

## Estrutura de Arquivos

```
src/
├── components/          # Componentes React
├── hooks/              # Custom hooks
├── services/           # Serviços de API
├── utils/              # Utilitários
├── types/              # Types TypeScript
└── index.ts           # Exportações principais
```

## Dependências

- React 18+
- Material-UI 5+
- Supabase Client
- TanStack Query
- Lucide React (ícones)
- Zustand (estado global)

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Desenvolvimento com watch
npm run dev

# Build para produção
npm run build

# Type checking
npm run type-check

# Lint
npm run lint
```

## Licença

MIT © Plataforma.app Team