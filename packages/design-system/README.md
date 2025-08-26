# @plataforma/design-system

A comprehensive glassmorphism design system for building beautiful, accessible modules in the Plataforma.dev ecosystem.

## ✨ Features

- **Glassmorphism Design**: Modern transparent aesthetics with blur effects
- **Fully Accessible**: WCAG 2.1 AA compliant components
- **TypeScript Support**: Complete type definitions included
- **Theme Support**: Dark/light mode with custom theme options
- **Responsive**: Mobile-first design patterns
- **Customizable**: Extensive styling options and variants
- **Performance Optimized**: Tree-shaking support and minimal bundle size

## 🚀 Quick Start

### Installation

```bash
npm install @plataforma/design-system
```

### Basic Usage

```tsx
import { 
  WindowCard, 
  WindowButton, 
  WindowInput 
} from '@plataforma/design-system';

function MyModule() {
  return (
    <WindowCard title="My Module">
      <div className="p-4 space-y-4">
        <WindowInput 
          label="Name" 
          placeholder="Enter your name"
        />
        <WindowButton variant="primary">
          Submit
        </WindowButton>
      </div>
    </WindowCard>
  );
}
```

## 📚 Components

### WindowCard

The primary container component with glassmorphism styling.

```tsx
import { WindowCard } from '@plataforma/design-system';

// Basic usage
<WindowCard title="Card Title">
  <p>Card content goes here</p>
</WindowCard>

// With custom styling
<WindowCard 
  title="Custom Card"
  className="bg-blue-500/10"
  headerClassName="border-blue-500/20"
>
  <div className="p-6">
    <p>Custom styled content</p>
  </div>
</WindowCard>

// With actions in header
<WindowCard 
  title="Interactive Card"
  actions={
    <WindowButton size="sm" variant="ghost">
      Settings
    </WindowButton>
  }
>
  <p>Content with header actions</p>
</WindowCard>
```

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Card title in header |
| `children` | `ReactNode` | - | Card content |
| `className` | `string` | - | Additional CSS classes |
| `headerClassName` | `string` | - | Header-specific classes |
| `actions` | `ReactNode` | - | Actions in header |
| `collapsible` | `boolean` | `false` | Enable collapse/expand |
| `defaultCollapsed` | `boolean` | `false` | Initial collapsed state |

### WindowButton

Styled button component with multiple variants and sizes.

```tsx
import { WindowButton } from '@plataforma/design-system';
import { Save, Download, Trash } from 'lucide-react';

// Button variants
<WindowButton variant="primary">Primary Action</WindowButton>
<WindowButton variant="secondary">Secondary Action</WindowButton>
<WindowButton variant="ghost">Ghost Button</WindowButton>
<WindowButton variant="danger">Delete</WindowButton>

// With icons
<WindowButton variant="primary" icon={<Save />}>
  Save Changes
</WindowButton>

<WindowButton variant="ghost" iconOnly>
  <Download />
</WindowButton>

// Different sizes
<WindowButton size="sm">Small</WindowButton>
<WindowButton size="md">Medium</WindowButton>
<WindowButton size="lg">Large</WindowButton>

// States
<WindowButton loading>Saving...</WindowButton>
<WindowButton disabled>Disabled</WindowButton>
```

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Button style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `icon` | `ReactNode` | - | Icon element |
| `iconOnly` | `boolean` | `false` | Show only icon |
| `loading` | `boolean` | `false` | Loading state |
| `disabled` | `boolean` | `false` | Disabled state |
| `onClick` | `function` | - | Click handler |
| `className` | `string` | - | Additional CSS classes |

### WindowInput

Form input component with label and validation support.

```tsx
import { WindowInput } from '@plataforma/design-system';
import { Search, User } from 'lucide-react';

// Basic input
<WindowInput 
  label="Email"
  type="email"
  placeholder="Enter your email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// With icon
<WindowInput
  label="Search"
  icon={<Search />}
  placeholder="Search modules..."
/>

// With validation
<WindowInput
  label="Username"
  required
  error={errors.username}
  helperText="Username must be unique"
/>

// Different sizes
<WindowInput size="sm" label="Small" />
<WindowInput size="lg" label="Large" />
```

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Input label |
| `type` | `string` | `'text'` | Input type |
| `placeholder` | `string` | - | Placeholder text |
| `value` | `string` | - | Input value |
| `onChange` | `function` | - | Change handler |
| `icon` | `ReactNode` | - | Icon element |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Input size |
| `error` | `string` | - | Error message |
| `helperText` | `string` | - | Helper text |
| `required` | `boolean` | `false` | Required field |
| `disabled` | `boolean` | `false` | Disabled state |

### WindowToggle

Toggle switch component for boolean settings.

```tsx
import { WindowToggle } from '@plataforma/design-system';

// Basic toggle
<WindowToggle
  label="Dark Mode"
  checked={darkMode}
  onChange={setDarkMode}
/>

// With description
<WindowToggle
  label="Enable Notifications"
  description="Receive real-time updates"
  checked={notifications}
  onChange={setNotifications}
/>

// Different sizes
<WindowToggle size="sm" label="Small toggle" />
<WindowToggle size="lg" label="Large toggle" />
```

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Toggle label |
| `description` | `string` | - | Description text |
| `checked` | `boolean` | `false` | Toggle state |
| `onChange` | `function` | - | Change handler |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Toggle size |
| `disabled` | `boolean` | `false` | Disabled state |

### WindowTable

Data table component with sorting, filtering, and pagination.

```tsx
import { WindowTable } from '@plataforma/design-system';

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', filterable: true },
  { 
    key: 'actions', 
    label: 'Actions',
    render: (row) => (
      <WindowButton size="sm" variant="ghost">
        Edit
      </WindowButton>
    )
  }
];

const data = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' }
];

<WindowTable
  columns={columns}
  data={data}
  pagination={{
    page: 1,
    pageSize: 10,
    total: 100,
    onPageChange: setPage
  }}
  onSort={(key, direction) => handleSort(key, direction)}
  onFilter={(filters) => handleFilter(filters)}
/>
```

### WindowModal

Modal dialog component for overlays and forms.

```tsx
import { WindowModal } from '@plataforma/design-system';

<WindowModal
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Confirm Action"
  description="Are you sure you want to delete this item?"
>
  <div className="flex gap-2 justify-end">
    <WindowButton 
      variant="secondary"
      onClick={() => setIsOpen(false)}
    >
      Cancel
    </WindowButton>
    <WindowButton 
      variant="danger"
      onClick={handleDelete}
    >
      Delete
    </WindowButton>
  </div>
</WindowModal>
```

### WindowToast

Toast notification system for user feedback.

```tsx
import { WindowToast } from '@plataforma/design-system';

// Show different types of toasts
WindowToast.success('Operation completed successfully!');
WindowToast.error('Something went wrong');
WindowToast.warning('Please check your input');
WindowToast.info('New update available');

// Custom toast with actions
WindowToast.custom(
  'File uploaded',
  {
    action: {
      label: 'View',
      onClick: () => viewFile()
    },
    duration: 5000
  }
);
```

## 🎨 Design Tokens

### Glassmorphism Utilities

Pre-defined glassmorphism styles:

```tsx
import { glassmorphism } from '@plataforma/design-system';

// Apply glassmorphism styles
<div className={glassmorphism.card}>
  Standard glassmorphism card
</div>

<div className={glassmorphism.sidebar}>
  Transparent sidebar
</div>

<div className={glassmorphism.modal}>
  Modal overlay
</div>
```

**Available Tokens**:
```typescript
export const glassmorphism = {
  // Base glassmorphism
  base: 'backdrop-blur-xl bg-white/5 border border-white/10',
  
  // Component-specific styles
  card: 'backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg',
  sidebar: 'backdrop-blur-xl border-r border-white/10',
  modal: 'backdrop-blur-xl bg-white/10 border border-white/20',
  button: 'backdrop-blur-md bg-white/10 hover:bg-white/20',
  input: 'backdrop-blur-md bg-white/5 border border-white/20',
  
  // Interactive states
  hover: 'hover:bg-white/10',
  active: 'active:bg-white/20',
  focus: 'focus:ring-2 focus:ring-white/30',
};
```

### Color System

```typescript
export const colors = {
  primary: {
    50: '#f0f9ff',
    500: '#3b82f6',
    900: '#1e3a8a'
  },
  success: {
    50: '#f0fdf4',
    500: '#10b981',
    900: '#064e3b'
  },
  danger: {
    50: '#fef2f2',
    500: '#ef4444',
    900: '#7f1d1d'
  },
  warning: {
    50: '#fffbeb',
    500: '#f59e0b',
    900: '#78350f'
  }
};
```

### Typography

```typescript
export const typography = {
  heading: {
    h1: 'text-3xl font-bold text-white',
    h2: 'text-2xl font-semibold text-white',
    h3: 'text-xl font-medium text-white',
    h4: 'text-lg font-medium text-white'
  },
  body: {
    large: 'text-base text-white/90',
    medium: 'text-sm text-white/80',
    small: 'text-xs text-white/70'
  }
};
```

## 🎯 Advanced Usage

### Custom Theming

Create custom themes by extending the design tokens:

```tsx
import { createTheme } from '@plataforma/design-system';

const customTheme = createTheme({
  colors: {
    primary: {
      500: '#8b5cf6' // Purple primary color
    }
  },
  glassmorphism: {
    card: 'backdrop-blur-xl bg-purple-500/10 border border-purple-500/20'
  }
});

// Apply theme to your module
<ThemeProvider theme={customTheme}>
  <MyModule />
</ThemeProvider>
```

### Responsive Design

All components support responsive design:

```tsx
<WindowCard className="w-full md:w-1/2 lg:w-1/3">
  <WindowButton 
    size="sm" 
    className="md:size-md lg:size-lg"
  >
    Responsive Button
  </WindowButton>
</WindowCard>
```

### Animation Support

Components include built-in animations:

```tsx
import { WindowCard } from '@plataforma/design-system';

// Animated card with fade-in
<WindowCard 
  title="Animated Card"
  className="animate-fade-in"
>
  Content appears smoothly
</WindowCard>

// Custom animations
<WindowButton className="transition-all duration-200 hover:scale-105">
  Hover me
</WindowButton>
```

## ♿ Accessibility

All components are built with accessibility in mind:

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and roles
- **Focus Management**: Visible focus indicators
- **Color Contrast**: WCAG AA compliant colors
- **Semantic HTML**: Proper HTML structure

### Accessibility Example

```tsx
<WindowInput
  label="Email Address"
  aria-describedby="email-help"
  required
  error={error}
/>
<div id="email-help" className="text-sm text-white/60">
  We'll never share your email with anyone
</div>
```

## 🔧 Development

### Setup

```bash
# Clone repository
git clone https://github.com/plataforma-dev/design-system

# Install dependencies
npm install

# Start development
npm run dev

# Run Storybook
npm run storybook
```

### Building

```bash
# Build for production
npm run build

# Clean build files
npm run clean
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📖 Storybook

Explore components interactively with Storybook:

```bash
npm run storybook
```

Visit `http://localhost:6006` to browse all components with live examples.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Guidelines

1. **Component Structure**: Follow established patterns
2. **TypeScript**: Use strict typing for all props
3. **Accessibility**: Test with screen readers
4. **Documentation**: Update Storybook stories
5. **Testing**: Add comprehensive tests

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.

## 📄 License

MIT © [Plataforma.app Team](https://github.com/plataforma-dev)

## 🔗 Links

- [Documentation](https://docs.plataforma.dev)
- [Storybook](https://storybook.plataforma.dev)
- [GitHub](https://github.com/plataforma-dev/design-system)
- [NPM Package](https://www.npmjs.com/package/@plataforma/design-system)

---

**Need help?** Join our [Discord community](https://discord.gg/plataforma) or check the [documentation](https://docs.plataforma.dev) for more examples and guides.