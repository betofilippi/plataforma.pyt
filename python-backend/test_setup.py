#!/usr/bin/env python3
"""
Setup verification script for the Plataforma NXT FastAPI backend.

This script tests the basic setup and configuration to ensure everything
is working correctly before starting development.
"""

import sys
import asyncio
from pathlib import Path

# Add the app directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def test_imports():
    """Test that all core modules can be imported."""
    print("Testing imports...")
    
    try:
        from app.core.config import get_settings
        print("[OK] Config module imported successfully")
        
        from app.core.database import DatabaseManager
        print("[OK] Database module imported successfully")
        
        from app.core.security import PasswordHasher, JWTManager
        print("[OK] Security module imported successfully")
        
        from app.core.exceptions import APIException
        print("[OK] Exceptions module imported successfully")
        
        from app.main import create_app
        print("[OK] Main application module imported successfully")
        
        return True
    except ImportError as e:
        print(f"[ERROR] Import error: {e}")
        return False

def test_config():
    """Test configuration loading."""
    print("\nTesting configuration...")
    
    try:
        from app.core.config import get_settings
        
        settings = get_settings()
        print(f"[OK] App Name: {settings.app_name}")
        print(f"[OK] App Version: {settings.app_version}")
        print(f"[OK] Environment: {settings.environment}")
        print(f"[OK] Debug Mode: {settings.debug}")
        print(f"[OK] Database URL (safe): {settings.database_url_safe}")
        print(f"[OK] Redis Disabled: {settings.disable_redis}")
        
        return True
    except Exception as e:
        print(f"[ERROR] Configuration error: {e}")
        return False

def test_security():
    """Test security utilities."""
    print("\nTesting security utilities...")
    
    try:
        from app.core.security import (
            password_hasher, 
            password_validator, 
            jwt_manager,
            validate_password
        )
        
        # Test password hashing
        test_password = "TestPassword123!"
        hashed = password_hasher.hash_password(test_password)
        is_valid = password_hasher.verify_password(test_password, hashed)
        print(f"[OK] Password hashing: {is_valid}")
        
        # Test password validation
        validation_result = validate_password(test_password)
        print(f"[OK] Password validation: {validation_result.is_valid} (score: {validation_result.strength_score})")
        
        # Test JWT token creation
        token = jwt_manager.create_access_token(
            user_id=1,
            username="testuser",
            email="test@example.com"
        )
        print(f"[OK] JWT token creation: {len(token) > 0}")
        
        # Test JWT token verification
        token_data = jwt_manager.verify_token(token)
        print(f"[OK] JWT token verification: {token_data.username}")
        
        return True
    except Exception as e:
        print(f"[ERROR] Security error: {e}")
        return False

async def test_database():
    """Test database configuration (without actual connection)."""
    print("\nTesting database configuration...")
    
    try:
        from app.core.database import DatabaseManager
        from app.core.config import get_settings
        
        settings = get_settings()
        db_manager = DatabaseManager(settings)
        
        print(f"[OK] Database manager created")
        print(f"[OK] Database config: {settings.database_config}")
        
        # Note: Not testing actual connection here to avoid dependency on running database
        print("[INFO] Database connection test skipped (requires running database)")
        
        return True
    except Exception as e:
        print(f"[ERROR] Database configuration error: {e}")
        return False

def test_app_creation():
    """Test FastAPI app creation."""
    print("\nTesting FastAPI app creation...")
    
    try:
        from app.main import create_app
        
        app = create_app()
        print(f"[OK] FastAPI app created: {app.title}")
        
        # Check some basic routes exist
        routes = [route.path for route in app.routes]
        expected_routes = ["/health", "/health/detailed", "/metrics", "/api"]
        
        for route in expected_routes:
            if route in routes:
                print(f"[OK] Route {route} found")
            else:
                print(f"[WARN] Route {route} not found")
        
        return True
    except Exception as e:
        print(f"[ERROR] App creation error: {e}")
        return False

def test_exception_handling():
    """Test exception handling setup."""
    print("\nTesting exception handling...")
    
    try:
        from app.core.exceptions import (
            APIException,
            ValidationException, 
            AuthenticationException,
            NotFoundError,
            create_error_response
        )
        
        # Test custom exceptions
        try:
            raise NotFoundError("Test resource", "123")
        except NotFoundError as e:
            print(f"[OK] NotFoundError: {e.code}")
        
        # Test error response creation
        error_response = create_error_response(
            message="Test error",
            code="TEST_ERROR",
            status_code=400
        )
        print(f"[OK] Error response: {error_response.code}")
        
        return True
    except Exception as e:
        print(f"[ERROR] Exception handling error: {e}")
        return False

def check_dependencies():
    """Check if all required dependencies are installed."""
    print("\nChecking dependencies...")
    
    required_packages = [
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "asyncpg",
        "pydantic",
        "jose",  # python-jose imports as 'jose'
        "passlib",
        "redis",
        "structlog",
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"[OK] {package}")
        except ImportError:
            print(f"[ERROR] {package} - MISSING")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n[WARN] Missing packages: {', '.join(missing_packages)}")
        print("[INFO] Install missing packages with: pip install -r requirements.txt")
        return False
    
    return True

async def main():
    """Run all tests."""
    print("Plataforma NXT FastAPI Backend - Setup Verification")
    print("=" * 60)
    
    tests = [
        ("Dependencies", check_dependencies),
        ("Imports", test_imports),
        ("Configuration", test_config),
        ("Security", test_security),
        ("Database", test_database),
        ("App Creation", test_app_creation),
        ("Exception Handling", test_exception_handling),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            
            if result:
                passed += 1
        except Exception as e:
            print(f"[ERROR] {test_name} failed with exception: {e}")
    
    print("\n" + "=" * 60)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("[SUCCESS] All tests passed! The setup is ready for development.")
        print("\nYou can now start the development server:")
        print("   python run_dev.py")
    else:
        print("[WARN] Some tests failed. Please fix the issues before proceeding.")
        return 1
    
    return 0

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n[ERROR] Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        sys.exit(1)