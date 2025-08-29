# Plataforma NXT - FastAPI Backend

A modern, high-performance backend API built with FastAPI, SQLAlchemy 2.0, and PostgreSQL.

## Features

- ⚡ **FastAPI** - Modern, fast web framework for building APIs
- 🗃️ **SQLAlchemy 2.0** - Powerful ORM with async support
- 🐘 **PostgreSQL** - Robust relational database
- 🔒 **JWT Authentication** - Secure token-based authentication
- 🧪 **Comprehensive Testing** - Unit and integration tests with pytest
- 📊 **Database Migrations** - Alembic for database schema management
- 🔄 **Background Tasks** - Celery with Redis for async processing
- 📝 **Auto Documentation** - OpenAPI/Swagger documentation
- 🎯 **Type Safety** - Full type hints with Pydantic models
- 🚀 **Production Ready** - Docker, logging, monitoring, and more

## Quick Start

### Prerequisites

- Python 3.11 or higher
- PostgreSQL 13+ 
- Redis (for background tasks)
- Git

### 1. Clone and Setup

```bash
# Navigate to the project directory
cd python-backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -e ".[dev]"
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your settings
# At minimum, configure:
# - DATABASE_URL
# - SECRET_KEY
# - REDIS_URL (if using background tasks)
```

### 3. Database Setup

```bash
# Create database (ensure PostgreSQL is running)
createdb plataforma_nxt

# Run database migrations
alembic upgrade head

# Optional: Create initial admin user
python -m app.scripts.create_admin
```

### 4. Run Development Server

```bash
# Start the development server
uvicorn app.main:app --reload --port 8000

# Server will be available at:
# API: http://localhost:8000
# Documentation: http://localhost:8000/docs
# Alternative docs: http://localhost:8000/redoc
```

## Project Structure

```
python-backend/
├── app/                           # Main application package
│   ├── __init__.py
│   ├── main.py                    # FastAPI application entry point
│   ├── config.py                  # Configuration settings
│   │
│   ├── api/                       # API routes
│   │   ├── __init__.py
│   │   ├── dependencies.py        # Common dependencies
│   │   ├── v1/                    # API v1 routes
│   │   │   ├── __init__.py
│   │   │   ├── auth.py           # Authentication endpoints
│   │   │   ├── users.py          # User management
│   │   │   └── ...               # Other endpoints
│   │   └── middleware.py         # Custom middleware
│   │
│   ├── core/                     # Core functionality
│   │   ├── __init__.py
│   │   ├── security.py          # Security utilities
│   │   ├── database.py          # Database configuration
│   │   ├── config.py            # Settings management
│   │   └── exceptions.py        # Custom exceptions
│   │
│   ├── models/                   # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── base.py              # Base model class
│   │   ├── user.py              # User model
│   │   └── ...                  # Other models
│   │
│   ├── schemas/                  # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py              # User schemas
│   │   ├── auth.py              # Auth schemas
│   │   └── ...                  # Other schemas
│   │
│   ├── services/                 # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py      # Authentication service
│   │   ├── user_service.py      # User service
│   │   └── ...                  # Other services
│   │
│   ├── tasks/                    # Background tasks
│   │   ├── __init__.py
│   │   ├── celery_app.py        # Celery configuration
│   │   └── email_tasks.py       # Email tasks
│   │
│   └── utils/                    # Utility functions
│       ├── __init__.py
│       ├── logging.py           # Logging configuration
│       └── helpers.py           # Helper functions
│
├── migrations/                   # Alembic migrations
│   ├── versions/                # Migration versions
│   ├── env.py                  # Migration environment
│   └── script.py.mako          # Migration template
│
├── tests/                       # Test suite
│   ├── __init__.py
│   ├── conftest.py             # Test configuration
│   ├── test_auth.py            # Auth tests
│   ├── test_users.py           # User tests
│   └── ...                     # Other tests
│
├── scripts/                     # Utility scripts
│   ├── create_admin.py         # Create admin user
│   └── seed_data.py            # Seed database
│
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
├── alembic.ini                 # Alembic configuration
├── pytest.ini                 # Pytest configuration
├── pyproject.toml             # Project configuration
├── requirements.txt           # Pip requirements
└── README.md                  # This file
```

## Development

### Code Quality

This project uses several tools to maintain code quality:

```bash
# Format code
black .
isort .

# Lint code
flake8 .

# Type checking
mypy app/

# Run all quality checks
pre-commit run --all-files
```

### Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run tests matching pattern
pytest -k "test_login"
```

### Database Management

```bash
# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# Show migration history
alembic history

# Show current revision
alembic current
```

### Background Tasks

```bash
# Start Celery worker
celery -A app.tasks.celery_app worker --loglevel=info

# Start Celery beat (scheduler)
celery -A app.tasks.celery_app beat --loglevel=info

# Monitor tasks
celery -A app.tasks.celery_app flower
```

## API Documentation

Once the server is running, you can access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc  
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Configuration

The application uses environment variables for configuration. See `.env.example` for all available options.

### Key Configuration Areas:

- **Database**: PostgreSQL connection settings
- **Authentication**: JWT secret and token expiration
- **Redis**: Cache and background task configuration
- **CORS**: Cross-origin resource sharing settings
- **Email**: SMTP configuration for notifications
- **Logging**: Log level and format settings

## Deployment

### Using Docker

```bash
# Build image
docker build -t plataforma-backend .

# Run container
docker run -p 8000:8000 --env-file .env plataforma-backend
```

### Using Docker Compose

```bash
# Start all services (API, PostgreSQL, Redis)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

For production deployment:

1. Set `ENVIRONMENT=production` in `.env`
2. Use a production WSGI server like Gunicorn
3. Set up proper logging and monitoring
4. Configure SSL/TLS
5. Set up database backups
6. Configure health checks

```bash
# Production server with Gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 style guide
- Write comprehensive tests for new features
- Update documentation as needed
- Use type hints throughout the codebase
- Follow conventional commit messages

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Verify database exists and credentials are correct

2. **Import Errors**
   - Ensure virtual environment is activated
   - Install dependencies: `pip install -e ".[dev]"`

3. **Migration Issues**
   - Check Alembic configuration in alembic.ini
   - Ensure database URL is correct
   - Try: `alembic stamp head` then `alembic upgrade head`

4. **Redis Connection Error**
   - Ensure Redis server is running
   - Check REDIS_URL in .env file

### Getting Help

- Check the [documentation](http://localhost:8000/docs) when server is running
- Review existing [issues](https://github.com/your-org/plataforma-backend/issues)
- Create a new issue with detailed information

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Changelog

### v0.1.0 (Initial Release)
- FastAPI application setup
- User authentication with JWT
- Database models and migrations
- Basic CRUD operations
- Comprehensive testing setup
- Docker configuration
- API documentation