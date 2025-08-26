# Module Registry

A comprehensive module registry system for managing, discovering and distributing modules in the plataforma.app ecosystem.

## Overview

The Module Registry provides:

- **Package Management**: Secure publishing, versioning, and distribution of modules
- **Discovery System**: Advanced search, recommendations, and trending analysis
- **Security Scanning**: Automated security vulnerability detection and malware scanning
- **User Management**: Authentication, profiles, and package ownership
- **Analytics**: Download tracking, usage statistics, and performance metrics
- **Web Interface**: Modern React-based marketplace for browsing and managing modules

## Architecture

```
module-registry/
├── src/
│   ├── server/           # Registry API server
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   └── middleware/   # Authentication, logging, etc.
│   ├── client/           # React marketplace UI
│   │   ├── components/   # UI components
│   │   ├── pages/        # Route pages
│   │   └── hooks/        # Custom React hooks
│   ├── core/             # Core registry logic
│   ├── database/         # Database schema and migrations
│   └── types/            # TypeScript type definitions
├── package.json
└── README.md
```

## Features

### 🔍 Advanced Search & Discovery
- Full-text search across package names, descriptions, and metadata
- Category-based filtering and browsing
- Trending packages detection
- Personalized recommendations
- Similar package suggestions
- Search autocomplete and suggestions

### 🛡️ Security & Quality
- Automated security scanning for vulnerabilities and malware
- Package signature verification
- Dependency security analysis
- Community ratings and reviews
- Automated testing integration
- Content policy enforcement

### 📊 Analytics & Insights
- Download tracking and statistics
- Usage analytics and trends
- Performance monitoring
- User engagement metrics
- Regional distribution data
- API usage statistics

### 👤 User Management
- User authentication and authorization
- Publisher profiles and verification
- Package ownership and permissions
- API token management
- Webhook notifications
- Activity tracking

### 🏪 Marketplace Interface
- Modern, responsive web interface
- Package browsing and search
- Detailed package pages with documentation
- User dashboards and package management
- Publishing workflow
- Admin interface

## API Endpoints

### Public Endpoints
- `GET /api/v1/packages` - List/search packages
- `GET /api/v1/packages/:name` - Get package details
- `GET /api/v1/packages/:name/:version/download` - Download package
- `GET /api/v1/stats` - Registry statistics
- `GET /api/v1/search` - Advanced search
- `GET /api/v1/health` - Health check

### Authenticated Endpoints
- `POST /api/v1/packages` - Publish package
- `GET /api/v1/users/me` - User profile
- `GET /api/v1/users/me/packages` - User's packages
- `POST /api/v1/webhooks` - Create webhook
- `DELETE /api/v1/packages/:name/:version` - Unpublish package

### Admin Endpoints
- `GET /api/v1/admin/users` - Manage users
- `GET /api/v1/admin/packages` - Moderate packages
- `POST /api/v1/admin/security/scan` - Manual security scan

## Database Schema

### Core Tables
- `packages` - Package metadata and information
- `package_versions` - Individual package versions
- `users` - User accounts and profiles
- `package_downloads` - Download tracking
- `package_ratings` - User ratings and reviews
- `security_issues` - Security vulnerability records

### Supporting Tables
- `categories` - Package categories
- `tags` - Package tags
- `webhooks` - User webhook configurations
- `api_tokens` - API access tokens

## Installation & Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)

### Database Setup
```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Seed initial data
npm run seed
```

### Environment Configuration
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=module_registry
DB_USER=postgres
DB_PASSWORD=your_password

# Security
JWT_SECRET=your-super-secret-jwt-key
BCRYPT_ROUNDS=12

# Storage
STORAGE_PROVIDER=local
STORAGE_PATH=./uploads

# Registry
REGISTRY_BASE_URL=http://localhost:3001
```

### Start Development Server
```bash
# Start API server
npm run start:dev

# Start client (in another terminal)
cd src/client
npm run dev
```

## Usage Examples

### Publishing a Package
```bash
# Using CLI
plataforma publish ./my-module.tgz

# Using API
curl -X POST http://localhost:3001/api/v1/packages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "package=@my-module.tgz" \
  -F "tag=latest" \
  -F "access=public"
```

### Searching Packages
```javascript
import { RegistryClient } from '@plataforma/module-registry';

const client = new RegistryClient('http://localhost:3001');

// Search packages
const results = await client.searchPackages({
  q: 'authentication',
  category: 'auth',
  minRating: 4.0,
  limit: 20
});

// Get package details
const package = await client.getPackageDetails('my-auth-module');

// Get recommendations
const recommendations = await client.getRecommendations(['express', 'react']);
```

### Registry Statistics
```javascript
const stats = await client.getRegistryStats();
console.log(`Total packages: ${stats.totalPackages}`);
console.log(`Total downloads: ${stats.totalDownloads}`);
```

## Security Features

### Package Scanning
- **Malware Detection**: Scans for known malicious patterns
- **Vulnerability Analysis**: Checks dependencies for known CVEs
- **Code Analysis**: Detects suspicious code patterns
- **Dependency Audit**: Analyzes dependency tree for issues

### Access Control
- **API Authentication**: JWT-based token authentication
- **Role-based Permissions**: User, publisher, moderator, admin roles
- **Package Ownership**: Strict ownership and publishing controls
- **Rate Limiting**: Prevents abuse and ensures availability

### Content Policy
- **License Validation**: Ensures proper licensing information
- **Content Filtering**: Blocks inappropriate or malicious content
- **Trademark Protection**: Prevents name squatting
- **Community Moderation**: User reporting and moderation tools

## Performance & Scalability

### Database Optimization
- Full-text search indexes for fast package discovery
- Materialized views for analytics and statistics
- Query optimization and connection pooling
- Automated database maintenance

### Caching Strategy
- Redis for session and API response caching
- CDN integration for package distribution
- Aggressive caching of static content
- Cache invalidation strategies

### Monitoring & Observability
- Request/response logging and metrics
- Performance monitoring and alerting
- Error tracking and debugging
- Usage analytics and insights

## Development

### Running Tests
```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests
```

### Code Quality
```bash
npm run lint              # ESLint
npm run type-check        # TypeScript
npm run format            # Prettier
npm run security-audit    # Security scanning
```

### Database Management
```bash
npm run migrate           # Run migrations
npm run migrate:rollback  # Rollback last migration
npm run seed             # Seed test data
npm run db:reset         # Reset database (dev only)
```

## Deployment

### Production Build
```bash
npm run build            # Build all components
npm run build:server     # Build server only  
npm run build:client     # Build client only
```

### Docker Deployment
```bash
# Build image
docker build -t module-registry .

# Run with docker-compose
docker-compose up -d
```

### Environment Setup
- Configure production database
- Set up SSL certificates  
- Configure CDN for static assets
- Set up monitoring and logging
- Configure backup strategies

## API Reference

Detailed API documentation is available at `/api/v1/openapi.json` when the server is running.

### Authentication
```bash
# Login to get token
curl -X POST /api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Use token in subsequent requests
curl -H "Authorization: Bearer YOUR_TOKEN" /api/v1/users/me
```

### Package Management
```bash
# List packages
curl "/api/v1/packages?q=auth&category=security&limit=10"

# Get package details  
curl "/api/v1/packages/my-package"

# Download package
curl "/api/v1/packages/my-package/1.0.0/download"

# Publish package
curl -X POST /api/v1/packages \
  -H "Authorization: Bearer TOKEN" \
  -F "package=@package.tgz"
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation for new features
- Follow the existing code style
- Ensure security considerations

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@plataforma.app
- 📖 Documentation: https://docs.plataforma.app/registry
- 🐛 Issues: https://github.com/plataforma/module-registry/issues
- 💬 Discord: https://discord.gg/plataforma