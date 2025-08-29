"""
Performance and load testing for the API endpoints.

Tests system performance under various loads, concurrent users,
and stress conditions to ensure scalability and reliability.
"""

import asyncio
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Tuple
from datetime import datetime

import pytest
from httpx import AsyncClient, Client
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.users import User


class TestAPIPerformance:
    """Test API endpoint performance under normal load."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_health_endpoint_performance(self, async_client: AsyncClient):
        """Test health endpoint response time."""
        response_times = []
        
        for _ in range(100):
            start_time = time.time()
            response = await async_client.get("/health")
            end_time = time.time()
            
            assert response.status_code == 200
            response_times.append(end_time - start_time)
        
        avg_response_time = statistics.mean(response_times)
        p95_response_time = sorted(response_times)[94]  # 95th percentile
        
        # Health endpoint should be very fast
        assert avg_response_time < 0.1  # 100ms average
        assert p95_response_time < 0.2   # 200ms p95
        
        print(f"Health endpoint - Avg: {avg_response_time:.3f}s, P95: {p95_response_time:.3f}s")
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_auth_health_endpoint_performance(self, async_client: AsyncClient):
        """Test auth health endpoint response time."""
        response_times = []
        
        for _ in range(50):
            start_time = time.time()
            response = await async_client.get("/api/auth/health")
            end_time = time.time()
            
            assert response.status_code == 200
            response_times.append(end_time - start_time)
        
        avg_response_time = statistics.mean(response_times)
        p95_response_time = sorted(response_times)[47]  # 95th percentile
        
        assert avg_response_time < 0.2  # 200ms average
        assert p95_response_time < 0.5   # 500ms p95
        
        print(f"Auth health endpoint - Avg: {avg_response_time:.3f}s, P95: {p95_response_time:.3f}s")
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_login_endpoint_performance(self, async_client: AsyncClient, test_user: User):
        """Test login endpoint performance."""
        login_data = {
            "email": test_user.email,
            "password": "testpassword123"
        }
        
        response_times = []
        
        for _ in range(20):  # Fewer iterations as login is more expensive
            start_time = time.time()
            response = await async_client.post("/api/auth/login", json=login_data)
            end_time = time.time()
            
            assert response.status_code == 200
            response_times.append(end_time - start_time)
        
        avg_response_time = statistics.mean(response_times)
        p95_response_time = sorted(response_times)[18]  # 95th percentile
        
        # Login should be reasonably fast but can be slower due to password hashing
        assert avg_response_time < 1.0  # 1 second average
        assert p95_response_time < 2.0   # 2 seconds p95
        
        print(f"Login endpoint - Avg: {avg_response_time:.3f}s, P95: {p95_response_time:.3f}s")
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_protected_endpoint_performance(self, async_client: AsyncClient, auth_headers: Dict[str, str]):
        """Test protected endpoint performance."""
        response_times = []
        
        for _ in range(50):
            start_time = time.time()
            response = await async_client.get("/api/auth/profile", headers=auth_headers)
            end_time = time.time()
            
            assert response.status_code == 200
            response_times.append(end_time - start_time)
        
        avg_response_time = statistics.mean(response_times)
        p95_response_time = sorted(response_times)[47]  # 95th percentile
        
        assert avg_response_time < 0.3  # 300ms average
        assert p95_response_time < 0.6   # 600ms p95
        
        print(f"Protected endpoint - Avg: {avg_response_time:.3f}s, P95: {p95_response_time:.3f}s")


class TestConcurrentUsers:
    """Test system behavior under concurrent user load."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_concurrent_health_checks(self, test_app):
        """Test concurrent health check requests."""
        concurrent_users = 50
        requests_per_user = 10
        
        async def make_requests(client_id: int) -> List[float]:
            async with AsyncClient(app=test_app, base_url="http://test") as client:
                response_times = []
                for _ in range(requests_per_user):
                    start_time = time.time()
                    response = await client.get("/health")
                    end_time = time.time()
                    
                    assert response.status_code == 200
                    response_times.append(end_time - start_time)
                return response_times
        
        # Create concurrent tasks
        tasks = [make_requests(i) for i in range(concurrent_users)]
        
        start_time = time.time()
        results = await asyncio.gather(*tasks)
        total_time = time.time() - start_time
        
        # Flatten results and calculate statistics
        all_response_times = [rt for user_times in results for rt in user_times]
        total_requests = len(all_response_times)
        
        avg_response_time = statistics.mean(all_response_times)
        p95_response_time = sorted(all_response_times)[int(0.95 * len(all_response_times))]
        throughput = total_requests / total_time
        
        # Performance assertions
        assert avg_response_time < 0.2  # 200ms average under load
        assert p95_response_time < 0.5   # 500ms p95 under load
        assert throughput > 100          # At least 100 requests/second
        
        print(f"Concurrent health checks: {concurrent_users} users, {requests_per_user} req/user")
        print(f"Total time: {total_time:.2f}s, Throughput: {throughput:.1f} req/s")
        print(f"Avg response: {avg_response_time:.3f}s, P95: {p95_response_time:.3f}s")
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_concurrent_login_attempts(self, test_app, test_user: User):
        """Test concurrent login attempts."""
        concurrent_users = 20
        login_data = {
            "email": test_user.email,
            "password": "testpassword123"
        }
        
        async def login_attempt() -> Tuple[int, float]:
            async with AsyncClient(app=test_app, base_url="http://test") as client:
                start_time = time.time()
                response = await client.post("/api/auth/login", json=login_data)
                end_time = time.time()
                
                return response.status_code, end_time - start_time
        
        tasks = [login_attempt() for _ in range(concurrent_users)]
        
        start_time = time.time()
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.time() - start_time
        
        # Filter out exceptions and analyze results
        valid_results = [r for r in results if not isinstance(r, Exception)]
        successful_logins = [r for r in valid_results if r[0] == 200]
        response_times = [r[1] for r in successful_logins]
        
        success_rate = len(successful_logins) / len(valid_results) if valid_results else 0
        avg_response_time = statistics.mean(response_times) if response_times else 0
        
        # Most logins should succeed (allowing for some database contention)
        assert success_rate > 0.8  # At least 80% success rate
        assert avg_response_time < 2.0  # Average under 2 seconds
        
        print(f"Concurrent logins: {concurrent_users} attempts")
        print(f"Success rate: {success_rate:.2%}, Avg time: {avg_response_time:.3f}s")
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_mixed_endpoint_load(self, test_app, test_user: User, test_user_tokens: Dict[str, str]):
        """Test mixed load across different endpoints."""
        async def health_check_user():
            async with AsyncClient(app=test_app, base_url="http://test") as client:
                responses = []
                for _ in range(20):
                    response = await client.get("/health")
                    responses.append(response.status_code)
                return responses
        
        async def auth_user():
            async with AsyncClient(app=test_app, base_url="http://test") as client:
                headers = {"Authorization": f"Bearer {test_user_tokens['access_token']}"}
                responses = []
                for _ in range(10):
                    response = await client.get("/api/auth/profile", headers=headers)
                    responses.append(response.status_code)
                return responses
        
        async def login_user():
            async with AsyncClient(app=test_app, base_url="http://test") as client:
                login_data = {
                    "email": test_user.email,
                    "password": "testpassword123"
                }
                responses = []
                for _ in range(3):  # Fewer login attempts
                    response = await client.post("/api/auth/login", json=login_data)
                    responses.append(response.status_code)
                return responses
        
        # Create mixed workload
        tasks = []
        tasks.extend([health_check_user() for _ in range(10)])  # 10 health check users
        tasks.extend([auth_user() for _ in range(5)])           # 5 authenticated users
        tasks.extend([login_user() for _ in range(3)])          # 3 login users
        
        start_time = time.time()
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.time() - start_time
        
        # Count successful responses
        successful_responses = 0
        total_responses = 0
        
        for result in results:
            if not isinstance(result, Exception):
                total_responses += len(result)
                successful_responses += len([r for r in result if r == 200])
        
        success_rate = successful_responses / total_responses if total_responses > 0 else 0
        
        assert success_rate > 0.95  # 95% success rate under mixed load
        assert total_time < 30      # Should complete within 30 seconds
        
        print(f"Mixed load test: {len(tasks)} concurrent users")
        print(f"Success rate: {success_rate:.2%}, Total time: {total_time:.2f}s")


class TestMemoryUsage:
    """Test memory usage and potential memory leaks."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_memory_usage_under_load(self, test_app):
        """Test memory usage doesn't grow excessively under load."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        async def make_requests():
            async with AsyncClient(app=test_app, base_url="http://test") as client:
                for _ in range(100):
                    await client.get("/health")
                    await client.get("/api/auth/health")
        
        # Run multiple rounds of requests
        for round_num in range(5):
            tasks = [make_requests() for _ in range(10)]  # 10 concurrent clients
            await asyncio.gather(*tasks)
            
            current_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_growth = current_memory - initial_memory
            
            print(f"Round {round_num + 1}: Memory usage: {current_memory:.1f}MB (+{memory_growth:.1f}MB)")
            
            # Memory shouldn't grow excessively (allowing for some normal growth)
            assert memory_growth < 100  # Less than 100MB growth
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        total_growth = final_memory - initial_memory
        
        print(f"Total memory growth: {total_growth:.1f}MB")
        assert total_growth < 150  # Total growth should be reasonable


class TestDatabasePerformance:
    """Test database performance under load."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_database_connection_handling(self, test_app, performance_config: Dict[str, Any]):
        """Test database connection handling under concurrent load."""
        concurrent_users = min(performance_config["concurrent_users"], 20)  # Limit for DB tests
        
        async def database_intensive_requests():
            async with AsyncClient(app=test_app, base_url="http://test") as client:
                # Make requests that require database access
                response_times = []
                
                for _ in range(10):
                    start_time = time.time()
                    response = await client.get("/health/detailed")  # Includes DB health check
                    end_time = time.time()
                    
                    if response.status_code == 200:
                        response_times.append(end_time - start_time)
                
                return response_times
        
        tasks = [database_intensive_requests() for _ in range(concurrent_users)]
        
        start_time = time.time()
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.time() - start_time
        
        # Analyze results
        all_response_times = []
        for result in results:
            if not isinstance(result, Exception) and result:
                all_response_times.extend(result)
        
        if all_response_times:
            avg_response_time = statistics.mean(all_response_times)
            p95_response_time = sorted(all_response_times)[int(0.95 * len(all_response_times))]
            
            # Database operations should still be reasonably fast
            assert avg_response_time < 1.0  # 1 second average
            assert p95_response_time < 2.0   # 2 seconds p95
            
            print(f"DB performance: {concurrent_users} users, {len(all_response_times)} requests")
            print(f"Avg: {avg_response_time:.3f}s, P95: {p95_response_time:.3f}s")
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_user_creation_performance(self, test_app, test_data_factory):
        """Test user creation performance under load."""
        concurrent_registrations = 10
        
        async def register_user(user_id: int):
            async with AsyncClient(app=test_app, base_url="http://test") as client:
                user_data = test_data_factory.create_user_data(
                    email=f"perftest{user_id}@example.com"
                )
                
                start_time = time.time()
                response = await client.post("/api/auth/register", json=user_data)
                end_time = time.time()
                
                return response.status_code, end_time - start_time
        
        tasks = [register_user(i) for i in range(concurrent_registrations)]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Analyze results
        successful_registrations = []
        response_times = []
        
        for result in results:
            if not isinstance(result, Exception):
                status_code, response_time = result
                if status_code == 201:  # Created
                    successful_registrations.append(result)
                    response_times.append(response_time)
        
        success_rate = len(successful_registrations) / len(results)
        
        if response_times:
            avg_response_time = statistics.mean(response_times)
            
            assert success_rate > 0.8  # Most registrations should succeed
            assert avg_response_time < 3.0  # Registration should be reasonable fast
            
            print(f"User registration: {concurrent_registrations} concurrent")
            print(f"Success rate: {success_rate:.2%}, Avg time: {avg_response_time:.3f}s")


class TestStressTestinng:
    """Stress testing to find system limits."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_gradual_load_increase(self, test_app):
        """Test system behavior with gradually increasing load."""
        load_levels = [10, 25, 50, 75, 100]  # Concurrent users
        requests_per_user = 20
        
        results = {}
        
        for load_level in load_levels:
            print(f"Testing load level: {load_level} concurrent users")
            
            async def user_load():
                async with AsyncClient(app=test_app, base_url="http://test") as client:
                    response_times = []
                    errors = 0
                    
                    for _ in range(requests_per_user):
                        start_time = time.time()
                        try:
                            response = await client.get("/health")
                            end_time = time.time()
                            
                            if response.status_code == 200:
                                response_times.append(end_time - start_time)
                            else:
                                errors += 1
                        except Exception:
                            errors += 1
                    
                    return response_times, errors
            
            tasks = [user_load() for _ in range(load_level)]
            
            start_time = time.time()
            user_results = await asyncio.gather(*tasks, return_exceptions=True)
            total_time = time.time() - start_time
            
            # Analyze results for this load level
            all_response_times = []
            total_errors = 0
            
            for result in user_results:
                if not isinstance(result, Exception):
                    response_times, errors = result
                    all_response_times.extend(response_times)
                    total_errors += errors
            
            total_requests = load_level * requests_per_user
            successful_requests = len(all_response_times)
            error_rate = (total_errors + (total_requests - successful_requests)) / total_requests
            
            if all_response_times:
                avg_response_time = statistics.mean(all_response_times)
                p95_response_time = sorted(all_response_times)[int(0.95 * len(all_response_times))]
                throughput = successful_requests / total_time
            else:
                avg_response_time = float('inf')
                p95_response_time = float('inf')
                throughput = 0
            
            results[load_level] = {
                'avg_response_time': avg_response_time,
                'p95_response_time': p95_response_time,
                'error_rate': error_rate,
                'throughput': throughput
            }
            
            print(f"  Avg response: {avg_response_time:.3f}s")
            print(f"  P95 response: {p95_response_time:.3f}s")
            print(f"  Error rate: {error_rate:.2%}")
            print(f"  Throughput: {throughput:.1f} req/s")
            
            # System should handle reasonable load levels
            if load_level <= 50:
                assert error_rate < 0.05  # Less than 5% error rate
                assert avg_response_time < 1.0  # Under 1 second average
        
        # Print summary
        print("\nLoad test summary:")
        for load_level, metrics in results.items():
            print(f"{load_level:3d} users: "
                  f"avg={metrics['avg_response_time']:.3f}s "
                  f"p95={metrics['p95_response_time']:.3f}s "
                  f"errors={metrics['error_rate']:.2%} "
                  f"throughput={metrics['throughput']:.1f}req/s")
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_sustained_load(self, test_app):
        """Test system behavior under sustained load."""
        concurrent_users = 20
        test_duration = 60  # seconds
        
        async def sustained_user():
            async with AsyncClient(app=test_app, base_url="http://test") as client:
                response_times = []
                errors = 0
                start_time = time.time()
                
                while time.time() - start_time < test_duration:
                    try:
                        req_start = time.time()
                        response = await client.get("/health")
                        req_end = time.time()
                        
                        if response.status_code == 200:
                            response_times.append(req_end - req_start)
                        else:
                            errors += 1
                        
                        # Small delay to avoid overwhelming the system
                        await asyncio.sleep(0.1)
                        
                    except Exception:
                        errors += 1
                
                return response_times, errors
        
        print(f"Running sustained load test: {concurrent_users} users for {test_duration}s")
        
        tasks = [sustained_user() for _ in range(concurrent_users)]
        results = await asyncio.gather(*tasks)
        
        # Analyze sustained load results
        all_response_times = []
        total_errors = 0
        
        for response_times, errors in results:
            all_response_times.extend(response_times)
            total_errors += errors
        
        total_requests = len(all_response_times) + total_errors
        error_rate = total_errors / total_requests if total_requests > 0 else 0
        
        if all_response_times:
            avg_response_time = statistics.mean(all_response_times)
            p95_response_time = sorted(all_response_times)[int(0.95 * len(all_response_times))]
            throughput = len(all_response_times) / test_duration
        else:
            avg_response_time = float('inf')
            p95_response_time = float('inf')
            throughput = 0
        
        print(f"Sustained load results:")
        print(f"  Total requests: {total_requests}")
        print(f"  Avg response time: {avg_response_time:.3f}s")
        print(f"  P95 response time: {p95_response_time:.3f}s")
        print(f"  Error rate: {error_rate:.2%}")
        print(f"  Throughput: {throughput:.1f} req/s")
        
        # System should remain stable under sustained load
        assert error_rate < 0.10  # Less than 10% error rate
        assert avg_response_time < 2.0  # Average under 2 seconds
        assert throughput > 10  # At least 10 requests per second
