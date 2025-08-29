# Comprehensive Test Suite

This is a comprehensive testing suite for the Python FastAPI backend, providing thorough coverage of all system components with automated testing across multiple categories.

## Overview

The test suite is organized into five main categories:

- **Unit Tests** (`tests/unit/`) - Test individual components in isolation
- **Integration Tests** (`tests/integration/`) - Test component interactions and database operations
- **API Tests** (`tests/api/`) - Test REST API endpoints end-to-end
- **Performance Tests** (`tests/performance/`) - Load testing and performance monitoring
- **Test Utilities** (`tests/utils/`) - Shared utilities and helper functions

## Quick Start

### Prerequisites

```bash
# Install test dependencies
pip install -e ".[test]"

# Or install all development dependencies
pip install -e ".[dev]"
```

### Running Tests

```bash
# Run all tests
python tests/run_tests.py --all

# Run specific test categories
python tests/run_tests.py --unit
python tests/run_tests.py --integration
python tests/run_tests.py --api
python tests/run_tests.py --performance

# Run with coverage
python tests/run_tests.py --all --coverage

# Run fast tests only (exclude slow performance tests)
python tests/run_tests.py --fast

# Run predefined test suites
python tests/run_tests.py smoke      # Quick smoke tests
python tests/run_tests.py security   # Security-related tests
python tests/run_tests.py ci         # CI/CD pipeline tests
```

### Alternative pytest Commands

```bash
# Direct pytest usage
pytest tests/
pytest tests/unit/
pytest -m "not slow"  # Skip slow tests
pytest --cov=app --cov-report=html
```

## Test Categories

### 1. Unit Tests (`tests/unit/`)

Test individual components in isolation with mocked dependencies.

#### Files:
- `test_core_config.py` - Configuration management and validation
- `test_core_security.py` - Authentication, JWT, password hashing
- `test_models_users.py` - User models, RBAC, relationships

#### Key Features:
- Fast execution (< 5 seconds total)
- No external dependencies
- Comprehensive mocking
- High code coverage
- Edge case testing

```bash
# Run unit tests
pytest tests/unit/

# Run specific unit test file
pytest tests/unit/test_core_security.py

# Run with verbose output
pytest tests/unit/ -v
```

### 2. Integration Tests (`tests/integration/`)

Test component interactions, database operations, and system integration.

#### Files:
- `test_database_operations.py` - Database connectivity, transactions, relationships

#### Key Features:
- Real database connections (test database)
- Transaction testing
- Foreign key constraint validation
- Concurrent operation testing
- Performance monitoring

```bash
# Run integration tests
pytest tests/integration/

# Run with database cleanup
pytest tests/integration/ --tb=short
```

### 3. API Tests (`tests/api/`)

Test REST API endpoints with real HTTP requests and responses.

#### Files:
- `test_auth_endpoints.py` - Authentication API endpoints

#### Key Features:
- End-to-end API testing
- Request/response validation
- Authentication flow testing
- Error handling validation
- Security testing

```bash
# Run API tests
pytest tests/api/

# Run specific endpoint tests
pytest tests/api/test_auth_endpoints.py::TestUserLogin

# Run with request logging
pytest tests/api/ -v -s
```

### 4. Performance Tests (`tests/performance/`)

Load testing, stress testing, and performance monitoring.

#### Files:
- `test_load_testing.py` - Load testing, concurrent users, performance metrics

#### Key Features:
- Concurrent user simulation
- Response time measurement
- Throughput testing
- Memory usage monitoring
- Stress testing with gradual load increase

```bash
# Run performance tests (marked as slow)
pytest tests/performance/ -m slow -v -s

# Run quick performance tests
pytest tests/performance/ -m "not slow"

# Run with custom markers
pytest tests/performance/ -m performance
```

## Test Configuration

### Environment Variables

The test suite uses specific environment variables for testing:

```bash
ENVIRONMENT=testing
DEBUG=false
DISABLE_REDIS=true
DISABLE_RATE_LIMITING=true
DATABASE_URL=postgresql+asyncpg://test:test@localhost:5432/plataforma_test
```

### Test Database

The tests use an in-memory SQLite database by default for speed and isolation. For integration tests requiring PostgreSQL features, configure a test database:

```bash
# Create test database
createdb plataforma_test

# Run migrations
DATABASE_URL=postgresql+asyncpg://test:test@localhost:5432/plataforma_test alembic upgrade head
```

### Test Markers

The test suite uses pytest markers to categorize tests:

- `@pytest.mark.unit` - Unit tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.slow` - Slow tests (performance, load tests)
- `@pytest.mark.asyncio` - Async tests

```bash
# Run tests by marker
pytest -m unit
pytest -m integration
pytest -m "not slow"
pytest -m "unit and not slow"
```

## Test Fixtures and Utilities

### Shared Fixtures (`tests/conftest.py`)

- `test_settings` - Test configuration
- `test_db_engine` - Database engine for testing
- `db_session` - Database session with cleanup
- `test_app` - FastAPI test application
- `async_client` - HTTP test client
- `test_user` - Test user with authentication
- `auth_headers` - Authentication headers
- `test_data_factory` - Data generation factory

### Test Utilities (`tests/utils/`)

- `TestDataGenerator` - Realistic test data generation
- `AuthTestHelper` - Authentication testing utilities
- `DatabaseTestHelper` - Database testing utilities
- `APITestHelper` - API testing utilities
- `PerformanceTestHelper` - Performance testing utilities
- `WebSocketTestHelper` - WebSocket testing utilities

## Coverage Reports

### Generate Coverage

```bash
# Generate HTML coverage report
pytest --cov=app --cov-report=html:htmlcov tests/

# Generate terminal coverage report
pytest --cov=app --cov-report=term-missing tests/

# Generate XML coverage report (for CI)
pytest --cov=app --cov-report=xml tests/
```

### Coverage Targets

- **Overall Coverage**: > 90%
- **Unit Tests**: > 95%
- **Integration Tests**: > 85%
- **API Tests**: > 80%

### View Coverage Report

```bash
# Open HTML coverage report
open htmlcov/index.html  # macOS
start htmlcov/index.html  # Windows
xdg-open htmlcov/index.html  # Linux
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -e ".[test]"
      - name: Run tests
        run: |
          python tests/run_tests.py ci --coverage --junit-xml=test-results.xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Docker Testing

```bash
# Build test image
docker build -t plataforma-backend-test -f Dockerfile.test .

# Run tests in container
docker run --rm plataforma-backend-test python tests/run_tests.py --all
```

## Performance Benchmarks

### Expected Performance Metrics

| Endpoint | Avg Response Time | P95 Response Time | Throughput |
|----------|------------------|-------------------|------------|
| `/health` | < 50ms | < 100ms | > 1000 req/s |
| `/api/auth/login` | < 500ms | < 1s | > 100 req/s |
| `/api/auth/profile` | < 200ms | < 400ms | > 500 req/s |

### Load Testing

```bash
# Run load tests with specific configuration
pytest tests/performance/test_load_testing.py::TestConcurrentUsers -v -s

# Run stress tests
pytest tests/performance/test_load_testing.py::TestStressTestinng -v -s
```

## Debugging Tests

### Verbose Output

```bash
# Run with maximum verbosity
pytest tests/ -vvv

# Show print statements
pytest tests/ -s

# Show local variables in tracebacks
pytest tests/ --tb=long
```

### Debug Specific Tests

```bash
# Run single test with debugging
pytest tests/unit/test_core_security.py::TestPasswordHashing::test_password_hashing -vvv -s

# Drop into debugger on failure
pytest tests/ --pdb

# Drop into debugger on first failure
pytest tests/ --pdb -x
```

### Logging Configuration

```python
# Add to test file for debugging
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Writing New Tests

### Unit Test Template

```python
import pytest
from app.core.some_module import SomeClass

class TestSomeClass:
    """Test SomeClass functionality."""
    
    def test_basic_functionality(self):
        """Test basic functionality."""
        # Arrange
        instance = SomeClass()
        
        # Act
        result = instance.some_method()
        
        # Assert
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_async_functionality(self):
        """Test async functionality."""
        # Arrange
        instance = SomeClass()
        
        # Act
        result = await instance.async_method()
        
        # Assert
        assert result is not None
```

### Integration Test Template

```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.users import User

class TestUserOperations:
    """Test user database operations."""
    
    @pytest.mark.asyncio
    async def test_create_user(self, db_session: AsyncSession, test_organization):
        """Test user creation."""
        # Arrange
        user_data = {
            'email': 'test@example.com',
            'name': 'Test User',
            'organization_id': test_organization.id
        }
        
        # Act
        user = User(**user_data)
        db_session.add(user)
        await db_session.commit()
        
        # Assert
        assert user.id is not None
        assert user.email == 'test@example.com'
```

### API Test Template

```python
import pytest
from httpx import AsyncClient

class TestAuthAPI:
    """Test authentication API."""
    
    @pytest.mark.asyncio
    async def test_login_endpoint(self, async_client: AsyncClient, test_user):
        """Test login endpoint."""
        # Arrange
        login_data = {
            'email': test_user.email,
            'password': 'testpassword'
        }
        
        # Act
        response = await async_client.post('/api/auth/login', json=login_data)
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert 'access_token' in data
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database is running
   pg_ctl status
   
   # Create test database
   createdb plataforma_test
   ```

2. **Import Errors**
   ```bash
   # Install in development mode
   pip install -e .
   
   # Check Python path
   python -c "import sys; print(sys.path)"
   ```

3. **Async Test Issues**
   ```bash
   # Install pytest-asyncio
   pip install pytest-asyncio
   
   # Check pytest-asyncio configuration in pytest.ini
   ```

4. **Performance Test Timeouts**
   ```python
   # Increase timeout in test
   @pytest.mark.timeout(300)  # 5 minutes
   async def test_long_running():
       pass
   ```

### Getting Help

- Check test output with `-v` flag for verbose information
- Use `--tb=long` for detailed tracebacks
- Run specific failing tests in isolation
- Check the test fixtures in `conftest.py`
- Review the test utilities in `tests/utils/`

## Contributing

### Test Guidelines

1. **Follow the AAA pattern**: Arrange, Act, Assert
2. **Use descriptive test names**: `test_user_login_with_valid_credentials`
3. **Test one thing at a time**: Each test should have a single responsibility
4. **Use appropriate fixtures**: Leverage shared fixtures for common setup
5. **Mock external dependencies**: Keep unit tests isolated
6. **Add performance assertions**: Include timing assertions for critical paths
7. **Document complex test logic**: Add comments for non-obvious test scenarios

### Adding New Test Categories

1. Create new directory under `tests/`
2. Add `__init__.py` file
3. Create test files following naming convention
4. Update `run_tests.py` to include new category
5. Add appropriate markers and fixtures
6. Update this README with documentation

---

**Happy Testing!** 🧪✅

This comprehensive test suite ensures the reliability, performance, and security of the Python backend. Run tests frequently during development and before deployment to maintain code quality.
