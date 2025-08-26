# Getting Started with Plataforma.dev

This guide will get you up and running with Plataforma.dev development environment in under 15 minutes.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
- **Node.js** (v18.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v8.0 or higher) - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)

### Optional Tools
- **Docker** - For container-based development
- **VS Code** - Recommended IDE with extensions:
  - ES7+ React/Redux/React-Native snippets
  - TypeScript Hero
  - Tailwind CSS IntelliSense
  - Auto Rename Tag

### System Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)

## 🚀 Quick Start (5 minutes)

### 1. Clone the Repository
```bash
git clone https://github.com/betofilippi/plataforma.dev.git
cd plataforma.dev
```

### 2. Install Dependencies
```bash
# Install all workspace dependencies
npm install

# This installs dependencies for:
# - Main application
# - All packages in packages/
# - Development tools
```

### 3. Start Development Server
```bash
npm run dev
```

This command starts:
- **Frontend**: http://localhost:3030
- **Backend API**: http://localhost:4000
- **Hot reload**: Automatic code recompilation

### 4. Access the Application
Open your browser and navigate to: **http://localhost:3030**

**Demo Login Credentials**:
- Email: `adm@nxt.eco.br`
- Password: Any password works in demo mode

### 5. Verify Installation
Once logged in, you should see:
- Desktop environment with taskbar
- Module icons (Sales, Finance, HR, etc.)
- Window system working properly

## 🔧 Full Development Setup (15 minutes)

### Environment Configuration

1. **Create Environment File**
```bash
cp .env.example .env
```

2. **Configure Environment Variables**
```env
# Application
NODE_ENV=development
PORT=3030
API_PORT=4000

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Database (Supabase)
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# Storage
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Development
DEMO_MODE=true
DEBUG=true
```

### Database Setup

If using your own Supabase project:

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Copy URL and keys to `.env`

2. **Run Database Migrations**
```bash
npm run db:setup
```

3. **Test Database Connection**
```bash
npm run db:test
# Should output: ✅ DB conectado
```

### Docker Setup (Alternative)

For containerized development:

1. **Start Services**
```bash
npm run docker:dev
```

This starts:
- PostgreSQL database
- Redis cache
- Grist integration
- Application services

2. **Access Services**
- App: http://localhost:3030
- API: http://localhost:4000
- Database: localhost:5432
- Grist: http://localhost:8484

## 🏗️ Project Structure

```
plataforma.dev/
├── packages/                    # Workspace packages
│   ├── auth-system/            # Authentication system
│   ├── core-window-system/     # Window management
│   ├── design-system/          # UI components
│   ├── module-contracts/       # Module interfaces
│   └── sdk/                    # Development SDK
│
├── client/                     # Frontend application
│   ├── components/             # Reusable components
│   ├── pages/                  # Page components
│   ├── hooks/                  # Custom hooks
│   ├── lib/                    # Utilities and services
│   └── styles/                 # Global styles
│
├── server/                     # Backend application
│   ├── routes/                 # API routes
│   ├── middleware/             # Express middleware
│   ├── services/               # Business logic
│   └── database/               # Database config
│
├── modulos/                    # Module definitions
│   ├── base_de_dados/          # Database module
│   └── sistema/                # System module
│
└── docs/                       # Documentation
```

## 🧪 Development Workflow

### 1. Running Tests
```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Run specific test types
npm run test:unit      # Unit tests only
npm run test:e2e       # End-to-end tests
npm run test:integration # Integration tests
```

### 2. Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format.fix

# Type checking
npm run typecheck
```

### 3. Building for Production
```bash
# Build all packages and application
npm run build

# Build specific parts
npm run build:client   # Frontend only
npm run build:server   # Backend only
npm run build:packages # Packages only
```

## 🏃 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run dev:watch` | Development with file watching |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm test` | Run test suite |
| `npm run lint` | Check code quality |
| `npm run format.fix` | Format code |
| `npm run typecheck` | TypeScript type checking |
| `npm run db:migrate` | Run database migrations |
| `npm run docker:up` | Start Docker services |

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using port 3030
netstat -ano | findstr :3030

# Kill specific process (Windows)
taskkill /PID 1234 /F

# Kill specific process (Mac/Linux)
kill -9 1234
```

#### White Screen on Startup
This usually indicates cache issues:

```bash
# Clear Vite cache
rmdir /s /q node_modules\.vite

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install
```

#### Database Connection Issues
1. Check environment variables in `.env`
2. Verify Supabase project is active
3. Test connection: `npm run db:test`

#### Module Not Loading
1. Check browser console for errors
2. Verify module is registered in module registry
3. Ensure all dependencies are installed

### Debug Tools

#### Built-in Debug Page
Access the debug dashboard at: http://localhost:3030/debug-system.html

This page shows:
- System status
- Database connections
- Module health
- Performance metrics

#### Development Tools
```bash
# Enable debug mode
export DEBUG=true

# View detailed logs
npm run dev -- --verbose

# Monitor file changes
npm run dev:watch
```

## 🧩 Creating Your First Module

### 1. Generate Module Scaffold
```bash
npx plataforma-cli create-module my-module
```

### 2. Module Structure
```typescript
// src/components/MyModule.tsx
import { WindowCard } from '@plataforma/design-system';

export default function MyModule() {
  return (
    <WindowCard title="My Custom Module">
      <p>Hello from my module!</p>
    </WindowCard>
  );
}
```

### 3. Register Module
```javascript
// modulos/my-module/config.json
{
  "name": "My Module",
  "version": "1.0.0",
  "description": "My first custom module",
  "main": "./dist/index.js",
  "permissions": ["read", "write"]
}
```

### 4. Test Module
```bash
npm run dev
# Open browser and look for your module in the desktop
```

## 🚀 Next Steps

Now that you have a working development environment:

1. **Explore the Codebase**
   - Browse existing modules in `client/pages/`
   - Study component patterns in `client/components/`
   - Review API endpoints in `server/routes/`

2. **Read Core Documentation**
   - [Architecture Overview](./ARCHITECTURE.md)
   - [Module Development Guide](./MODULE_DEVELOPMENT.md)
   - [API Reference](./API_REFERENCE.md)

3. **Join the Community**
   - GitHub Discussions for questions
   - Discord for real-time chat
   - Contribute to open issues

4. **Build Something**
   - Create a custom module
   - Extend existing functionality
   - Contribute to the core platform

## 📞 Getting Help

If you encounter issues:

1. **Check the FAQ**: [Common issues and solutions](./FAQ.md)
2. **Search Issues**: [GitHub Issues](https://github.com/betofilippi/plataforma.dev/issues)
3. **Ask Questions**: [GitHub Discussions](https://github.com/betofilippi/plataforma.dev/discussions)
4. **Join Discord**: Real-time help from the community
5. **Email Support**: support@plataforma.dev

## ✅ Verification Checklist

Before proceeding to development, verify:

- [ ] Node.js v18+ installed
- [ ] Repository cloned successfully
- [ ] Dependencies installed without errors
- [ ] Development server starts on port 3030
- [ ] Can login with demo credentials
- [ ] Desktop interface loads correctly
- [ ] Database connection working
- [ ] Tests pass: `npm test`
- [ ] Linting passes: `npm run lint`

---

**Congratulations!** You now have a fully working Plataforma.dev development environment. 

Continue with the [Module Development Guide](./MODULE_DEVELOPMENT.md) to start building your first module, or explore the [Architecture Documentation](./ARCHITECTURE.md) to understand the system design.