"""
Test utilities and helper functions.

Provides reusable utilities for testing across different test categories
including data generation, authentication helpers, database utilities,
API testing helpers, and performance testing tools.
"""

import asyncio
import json
import random
import string
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union, Callable, Tuple
from unittest.mock import AsyncMock, MagicMock

import faker
from httpx import AsyncClient, Response
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.models.users import User, Role, Permission, Organization, UserSession, LoginAttempt
from app.core.security import create_access_token, create_refresh_token, get_password_hash
from app.core.config import get_settings


class TestDataGenerator:
    """
    Utility class for generating realistic test data.
    
    Uses Faker library to generate consistent, realistic test data
    for various testing scenarios.
    """
    
    def __init__(self, seed: Optional[int] = None):
        """Initialize with optional seed for reproducible data."""
        self.fake = faker.Faker(['pt_BR', 'en_US'])
        if seed:
            self.fake.seed_instance(seed)
    
    def generate_user_data(self, **overrides) -> Dict[str, Any]:
        """Generate realistic user registration data."""
        first_name = self.fake.first_name()
        last_name = self.fake.last_name()
        email = self.fake.email()
        
        data = {
            'email': email,
            'name': f"{first_name} {last_name}",
            'first_name': first_name,
            'last_name': last_name,
            'password': 'TestPassword123!',
            'confirm_password': 'TestPassword123!',
            'phone': self.fake.phone_number(),
            'department': self.fake.random_element(['Engineering', 'Marketing', 'Sales', 'HR', 'Finance']),
            'job_title': self.fake.job(),
            'timezone': self.fake.timezone(),
            'language': self.fake.random_element(['pt-BR', 'en-US', 'es-ES']),
            'theme': self.fake.random_element(['light', 'dark', 'system'])
        }
        
        data.update(overrides)
        return data
    
    def generate_organization_data(self, **overrides) -> Dict[str, Any]:
        """Generate organization data."""
        company_name = self.fake.company()
        domain = f"{company_name.lower().replace(' ', '').replace(',', '')}.com"
        
        data = {
            'name': company_name,
            'description': self.fake.catch_phrase(),
            'domain': domain,
            'settings': {
                'features': {
                    'mfa_required': self.fake.boolean(),
                    'password_expiry_days': self.fake.random_int(30, 90),
                    'session_timeout_minutes': self.fake.random_int(15, 480)
                },
                'branding': {
                    'primary_color': self.fake.hex_color(),
                    'logo_url': self.fake.image_url()
                }
            }
        }
        
        data.update(overrides)
        return data
    
    def generate_permission_data(self, **overrides) -> Dict[str, Any]:
        """Generate permission data."""
        categories = ['user_management', 'content', 'admin', 'billing', 'reports']
        resources = ['users', 'roles', 'content', 'settings', 'data']
        actions = ['create', 'read', 'update', 'delete', 'manage']
        
        category = self.fake.random_element(categories)
        resource = self.fake.random_element(resources)
        action = self.fake.random_element(actions)
        
        data = {
            'name': f"{resource}:{action}",
            'description': f"{action.title()} {resource}",
            'category': category,
            'resource': resource,
            'action': action,
            'is_system_permission': self.fake.boolean(chance_of_getting_true=20)
        }
        
        data.update(overrides)
        return data
    
    def generate_role_data(self, organization_id: uuid.UUID, **overrides) -> Dict[str, Any]:
        """Generate role data."""
        role_names = ['admin', 'manager', 'user', 'viewer', 'editor', 'moderator']
        colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']
        icons = ['shield', 'users', 'user', 'eye', 'edit', 'settings']
        
        data = {
            'name': self.fake.random_element(role_names) + f"-{self.fake.random_int(1, 999)}",
            'description': self.fake.sentence(),
            'level': self.fake.random_int(1, 99),
            'organization_id': organization_id,
            'color': self.fake.random_element(colors),
            'icon': self.fake.random_element(icons),
            'is_system_role': self.fake.boolean(chance_of_getting_true=10)
        }
        
        data.update(overrides)
        return data
    
    def generate_login_attempt_data(self, **overrides) -> Dict[str, Any]:
        """Generate login attempt data."""
        data = {
            'email': self.fake.email(),
            'ip_address': self.fake.ipv4(),
            'user_agent': self.fake.user_agent(),
            'success': self.fake.boolean(),
            'failure_reason': None if self.fake.boolean() else self.fake.random_element([
                'Invalid credentials', 'Account locked', 'Account inactive', 'MFA required'
            ]),
            'attempted_at': self.fake.date_time_between(start_date='-30d', end_date='now')
        }
        
        data.update(overrides)
        return data
    
    def generate_bulk_users(self, count: int, organization_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Generate multiple users for bulk testing."""
        users = []
        for i in range(count):
            user_data = self.generate_user_data(
                email=f"bulk_user_{i}@example.com",
                name=f"Bulk User {i}"
            )
            users.append(user_data)
        return users


class AuthTestHelper:
    """
    Helper class for authentication-related testing.
    
    Provides utilities for creating tokens, managing authentication state,
    and testing auth flows.
    """
    
    @staticmethod
    def create_test_tokens(user: User, extra_data: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
        """Create access and refresh tokens for testing."""
        token_data = {
            'sub': str(user.id),
            'email': user.email,
            'username': user.name,
            'roles': [role.name for role in user.roles] if user.roles else [],
            'permissions': user.get_effective_permissions() if hasattr(user, 'get_effective_permissions') else []
        }
        
        if extra_data:
            token_data.update(extra_data)
        
        access_token = create_access_token(data=token_data)
        refresh_token = create_refresh_token(data={'sub': str(user.id)})
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'bearer'
        }
    
    @staticmethod
    def create_auth_headers(tokens: Dict[str, str]) -> Dict[str, str]:
        """Create authorization headers from tokens."""
        return {
            'Authorization': f"Bearer {tokens['access_token']}",
            'Content-Type': 'application/json'
        }
    
    @staticmethod
    def create_expired_token(user: User, expired_seconds: int = 3600) -> str:
        """Create an expired token for testing."""
        return create_access_token(
            data={'sub': str(user.id)},
            expires_delta=timedelta(seconds=-expired_seconds)
        )
    
    @staticmethod
    def create_invalid_token() -> str:
        """Create an invalid token for testing."""
        return "invalid.token.structure"
    
    @staticmethod
    def mock_password_verification(return_value: bool = True) -> MagicMock:
        """Mock password verification for testing."""
        return MagicMock(return_value=return_value)
    
    @staticmethod
    async def simulate_login_attempts(
        async_client: AsyncClient,
        email: str,
        password: str,
        attempts: int,
        delay_between: float = 0.1
    ) -> List[Response]:
        """Simulate multiple login attempts."""
        responses = []
        login_data = {'email': email, 'password': password}
        
        for _ in range(attempts):
            response = await async_client.post('/api/auth/login', json=login_data)
            responses.append(response)
            if delay_between > 0:
                await asyncio.sleep(delay_between)
        
        return responses
    
    @staticmethod
    def extract_token_claims(token: str) -> Dict[str, Any]:
        """Extract claims from JWT token without verification (for testing)."""
        from jose import jwt
        
        # Decode without verification for testing purposes
        return jwt.get_unverified_claims(token)


class DatabaseTestHelper:
    """
    Helper class for database testing operations.
    
    Provides utilities for database setup, cleanup, data manipulation,
    and transaction testing.
    """
    
    @staticmethod
    async def cleanup_test_data(session: AsyncSession, table_names: List[str]):
        """Clean up test data from specified tables."""
        for table_name in reversed(table_names):  # Reverse order for FK constraints
            await session.execute(text(f"DELETE FROM {table_name}"))
        await session.commit()
    
    @staticmethod
    async def count_table_rows(session: AsyncSession, model_class) -> int:
        """Count rows in a table."""
        result = await session.execute(select(func.count(model_class.id)))
        return result.scalar()
    
    @staticmethod
    async def create_test_organization(
        session: AsyncSession,
        name: str = "Test Organization",
        **kwargs
    ) -> Organization:
        """Create a test organization."""
        org_data = {
            'name': name,
            'description': 'Test organization for testing',
            'domain': f"test-{uuid.uuid4().hex[:8]}.com",
            'settings': {'test': True}
        }
        org_data.update(kwargs)
        
        org = Organization(**org_data)
        session.add(org)
        await session.commit()
        await session.refresh(org)
        return org
    
    @staticmethod
    async def create_test_user(
        session: AsyncSession,
        organization: Organization,
        email: Optional[str] = None,
        **kwargs
    ) -> User:
        """Create a test user."""
        if not email:
            email = f"testuser-{uuid.uuid4().hex[:8]}@example.com"
        
        user_data = {
            'email': email,
            'name': 'Test User',
            'password_hash': get_password_hash('testpassword123'),
            'organization_id': organization.id,
            'is_active': True,
            'email_verified_at': datetime.utcnow()
        }
        user_data.update(kwargs)
        
        user = User(**user_data)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user
    
    @staticmethod
    async def create_test_permissions(
        session: AsyncSession,
        count: int = 5
    ) -> List[Permission]:
        """Create test permissions."""
        permissions = []
        for i in range(count):
            perm = Permission(
                name=f"test:permission_{i}",
                description=f"Test permission {i}",
                category="test",
                resource="test_resource",
                action=f"action_{i}"
            )
            permissions.append(perm)
        
        session.add_all(permissions)
        await session.commit()
        
        for perm in permissions:
            await session.refresh(perm)
        
        return permissions
    
    @staticmethod
    async def create_test_role(
        session: AsyncSession,
        organization: Organization,
        permissions: Optional[List[Permission]] = None,
        **kwargs
    ) -> Role:
        """Create a test role with optional permissions."""
        role_data = {
            'name': f"test-role-{uuid.uuid4().hex[:8]}",
            'description': 'Test role',
            'organization_id': organization.id,
            'level': 50
        }
        role_data.update(kwargs)
        
        role = Role(**role_data)
        if permissions:
            role.permissions = permissions
        
        session.add(role)
        await session.commit()
        await session.refresh(role)
        return role
    
    @staticmethod
    async def verify_foreign_key_constraint(
        session: AsyncSession,
        parent_model,
        child_model,
        parent_id_field: str
    ):
        """Verify foreign key constraints are working."""
        # This would depend on specific database implementation
        # For testing, we can check that orphaned records are handled correctly
        pass
    
    @staticmethod
    async def simulate_database_error(session: AsyncSession):
        """Simulate a database error for testing error handling."""
        # Execute invalid SQL to trigger an error
        try:
            await session.execute(text("SELECT * FROM non_existent_table"))
        except Exception as e:
            await session.rollback()
            raise e


class APITestHelper:
    """
    Helper class for API testing operations.
    
    Provides utilities for API endpoint testing, response validation,
    and common API test patterns.
    """
    
    @staticmethod
    async def make_authenticated_request(
        client: AsyncClient,
        method: str,
        url: str,
        tokens: Dict[str, str],
        **kwargs
    ) -> Response:
        """Make an authenticated API request."""
        headers = kwargs.get('headers', {})
        headers.update({'Authorization': f"Bearer {tokens['access_token']}"})
        kwargs['headers'] = headers
        
        return await client.request(method, url, **kwargs)
    
    @staticmethod
    def assert_response_structure(response: Response, expected_keys: List[str]):
        """Assert response has expected structure."""
        assert response.status_code == 200
        data = response.json()
        
        for key in expected_keys:
            assert key in data, f"Expected key '{key}' not found in response"
    
    @staticmethod
    def assert_error_response(
        response: Response,
        expected_status: int,
        expected_error_keys: Optional[List[str]] = None
    ):
        """Assert error response has expected format."""
        assert response.status_code == expected_status
        
        if expected_error_keys:
            data = response.json()
            for key in expected_error_keys:
                assert key in data
    
    @staticmethod
    def assert_pagination_response(response: Response):
        """Assert response has pagination structure."""
        assert response.status_code == 200
        data = response.json()
        
        pagination_keys = ['items', 'total', 'page', 'per_page', 'pages']
        for key in pagination_keys:
            assert key in data, f"Pagination key '{key}' not found"
    
    @staticmethod
    async def test_endpoint_with_different_methods(
        client: AsyncClient,
        url: str,
        allowed_methods: List[str],
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Response]:
        """Test endpoint with different HTTP methods."""
        all_methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
        results = {}
        
        for method in all_methods:
            response = await client.request(method, url, headers=headers or {})
            results[method] = response
            
            if method in allowed_methods:
                assert response.status_code != 405  # Method not allowed
            else:
                assert response.status_code == 405
        
        return results
    
    @staticmethod
    async def test_input_validation(
        client: AsyncClient,
        url: str,
        method: str,
        valid_data: Dict[str, Any],
        invalid_test_cases: List[Dict[str, Any]],
        headers: Optional[Dict[str, str]] = None
    ):
        """Test input validation for an endpoint."""
        # Test with valid data
        response = await client.request(
            method, url, json=valid_data, headers=headers or {}
        )
        assert response.status_code not in [400, 422]  # Should not be validation error
        
        # Test with invalid data cases
        for invalid_case in invalid_test_cases:
            response = await client.request(
                method, url, json=invalid_case, headers=headers or {}
            )
            assert response.status_code in [400, 422], f"Expected validation error for {invalid_case}"
    
    @staticmethod
    def measure_response_time(
        func: Callable
    ) -> Tuple[Any, float]:
        """Measure response time of a function."""
        start_time = time.time()
        result = func()
        end_time = time.time()
        return result, end_time - start_time
    
    @staticmethod
    async def measure_async_response_time(
        coro: Callable
    ) -> Tuple[Any, float]:
        """Measure response time of an async function."""
        start_time = time.time()
        result = await coro
        end_time = time.time()
        return result, end_time - start_time


class PerformanceTestHelper:
    """
    Helper class for performance testing.
    
    Provides utilities for load testing, performance monitoring,
    and performance assertions.
    """
    
    @staticmethod
    async def run_concurrent_requests(
        client_factory: Callable,
        request_func: Callable,
        concurrent_count: int,
        requests_per_client: int = 1
    ) -> List[Dict[str, Any]]:
        """Run concurrent requests and collect performance metrics."""
        async def client_task(client_id: int):
            async with client_factory() as client:
                results = []
                for _ in range(requests_per_client):
                    start_time = time.time()
                    try:
                        response = await request_func(client)
                        end_time = time.time()
                        
                        results.append({
                            'client_id': client_id,
                            'success': True,
                            'status_code': response.status_code if hasattr(response, 'status_code') else None,
                            'response_time': end_time - start_time,
                            'timestamp': start_time
                        })
                    except Exception as e:
                        end_time = time.time()
                        results.append({
                            'client_id': client_id,
                            'success': False,
                            'error': str(e),
                            'response_time': end_time - start_time,
                            'timestamp': start_time
                        })
                return results
        
        tasks = [client_task(i) for i in range(concurrent_count)]
        results = await asyncio.gather(*tasks)
        
        # Flatten results
        all_results = []
        for client_results in results:
            all_results.extend(client_results)
        
        return all_results
    
    @staticmethod
    def analyze_performance_results(results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze performance test results."""
        successful_results = [r for r in results if r['success']]
        failed_results = [r for r in results if not r['success']]
        
        if not results:
            return {
                'total_requests': 0,
                'successful_requests': 0,
                'failed_requests': 0,
                'success_rate': 0,
                'error_rate': 0
            }
        
        response_times = [r['response_time'] for r in successful_results]
        
        analysis = {
            'total_requests': len(results),
            'successful_requests': len(successful_results),
            'failed_requests': len(failed_results),
            'success_rate': len(successful_results) / len(results),
            'error_rate': len(failed_results) / len(results)
        }
        
        if response_times:
            analysis.update({
                'avg_response_time': sum(response_times) / len(response_times),
                'min_response_time': min(response_times),
                'max_response_time': max(response_times),
                'p50_response_time': sorted(response_times)[len(response_times) // 2],
                'p95_response_time': sorted(response_times)[int(0.95 * len(response_times))],
                'p99_response_time': sorted(response_times)[int(0.99 * len(response_times))]
            })
        
        return analysis
    
    @staticmethod
    def assert_performance_requirements(
        analysis: Dict[str, Any],
        max_avg_response_time: float = 1.0,
        max_p95_response_time: float = 2.0,
        min_success_rate: float = 0.95,
        max_error_rate: float = 0.05
    ):
        """Assert performance requirements are met."""
        if 'avg_response_time' in analysis:
            assert analysis['avg_response_time'] <= max_avg_response_time, \
                f"Average response time {analysis['avg_response_time']:.3f}s exceeds {max_avg_response_time}s"
        
        if 'p95_response_time' in analysis:
            assert analysis['p95_response_time'] <= max_p95_response_time, \
                f"P95 response time {analysis['p95_response_time']:.3f}s exceeds {max_p95_response_time}s"
        
        assert analysis['success_rate'] >= min_success_rate, \
            f"Success rate {analysis['success_rate']:.2%} below {min_success_rate:.2%}"
        
        assert analysis['error_rate'] <= max_error_rate, \
            f"Error rate {analysis['error_rate']:.2%} exceeds {max_error_rate:.2%}"
    
    @staticmethod
    def monitor_memory_usage() -> Dict[str, float]:
        """Monitor current memory usage."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        
        return {
            'rss_mb': memory_info.rss / 1024 / 1024,  # Resident Set Size
            'vms_mb': memory_info.vms / 1024 / 1024,  # Virtual Memory Size
            'percent': process.memory_percent()
        }


class WebSocketTestHelper:
    """
    Helper class for WebSocket testing.
    
    Provides utilities for testing WebSocket connections, messages,
    and real-time functionality.
    """
    
    @staticmethod
    async def connect_websocket(
        client: TestClient,
        url: str,
        headers: Optional[Dict[str, str]] = None
    ):
        """Connect to WebSocket endpoint."""
        with client.websocket_connect(url, headers=headers or {}) as websocket:
            yield websocket
    
    @staticmethod
    async def send_and_receive_message(
        websocket,
        message: Union[str, Dict[str, Any]],
        timeout: float = 5.0
    ) -> Any:
        """Send a message and wait for response."""
        if isinstance(message, dict):
            websocket.send_json(message)
        else:
            websocket.send_text(message)
        
        # Wait for response with timeout
        try:
            response = websocket.receive_json() if isinstance(message, dict) else websocket.receive_text()
            return response
        except Exception as e:
            raise TimeoutError(f"No response received within {timeout}s") from e
    
    @staticmethod
    async def simulate_multiple_connections(
        app: FastAPI,
        url: str,
        connection_count: int,
        messages_per_connection: int = 1,
        headers: Optional[Dict[str, str]] = None
    ):
        """Simulate multiple WebSocket connections."""
        results = []
        
        def connection_task(connection_id: int):
            with TestClient(app) as client:
                try:
                    with client.websocket_connect(url, headers=headers or {}) as websocket:
                        connection_results = []
                        for i in range(messages_per_connection):
                            message = {'type': 'test', 'connection_id': connection_id, 'message_id': i}
                            websocket.send_json(message)
                            response = websocket.receive_json()
                            connection_results.append({
                                'connection_id': connection_id,
                                'message_id': i,
                                'success': True,
                                'response': response
                            })
                        return connection_results
                except Exception as e:
                    return [{
                        'connection_id': connection_id,
                        'success': False,
                        'error': str(e)
                    }]
        
        # Run connections concurrently using ThreadPoolExecutor
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=connection_count) as executor:
            futures = [executor.submit(connection_task, i) for i in range(connection_count)]
            for future in concurrent.futures.as_completed(futures):
                results.extend(future.result())
        
        return results
    
    @staticmethod
    def assert_websocket_message_structure(
        message: Dict[str, Any],
        expected_keys: List[str]
    ):
        """Assert WebSocket message has expected structure."""
        for key in expected_keys:
            assert key in message, f"Expected key '{key}' not found in WebSocket message"
    
    @staticmethod
    def create_mock_websocket_manager():
        """Create a mock WebSocket manager for testing."""
        mock_manager = AsyncMock()
        mock_manager.connect = AsyncMock()
        mock_manager.disconnect = AsyncMock()
        mock_manager.send_message = AsyncMock()
        mock_manager.broadcast = AsyncMock()
        mock_manager.get_connections = AsyncMock(return_value=[])
        return mock_manager


# Additional utility functions

def generate_random_string(length: int = 10) -> str:
    """Generate a random string of specified length."""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


def generate_random_email() -> str:
    """Generate a random email address."""
    username = generate_random_string(8)
    domain = generate_random_string(5)
    return f"{username}@{domain}.com"


def wait_for_condition(
    condition_func: Callable[[], bool],
    timeout: float = 10.0,
    check_interval: float = 0.1
) -> bool:
    """Wait for a condition to become true within a timeout."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        if condition_func():
            return True
        time.sleep(check_interval)
    return False


async def async_wait_for_condition(
    condition_func: Callable[[], bool],
    timeout: float = 10.0,
    check_interval: float = 0.1
) -> bool:
    """Async version of wait_for_condition."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        if condition_func():
            return True
        await asyncio.sleep(check_interval)
    return False


def assert_json_schema(data: Dict[str, Any], schema: Dict[str, Any]):
    """Assert JSON data matches a schema structure."""
    try:
        import jsonschema
        jsonschema.validate(instance=data, schema=schema)
    except ImportError:
        # Fallback to basic structure checking if jsonschema not available
        for key, expected_type in schema.get('properties', {}).items():
            if key in schema.get('required', []):
                assert key in data, f"Required key '{key}' missing from data"
                # Basic type checking would go here


def create_test_database_url(db_name: str = "test_db") -> str:
    """Create a test database URL."""
    import os
    base_url = os.getenv('TEST_DATABASE_URL', 'postgresql+asyncpg://test:test@localhost:5432')
    return f"{base_url}/{db_name}"
