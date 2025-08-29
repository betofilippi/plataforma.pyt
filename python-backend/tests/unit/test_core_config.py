"""
Unit tests for core configuration functionality.

Tests the Settings class, validators, and configuration loading.
"""

import os
import tempfile
from typing import List

import pytest
from pydantic import ValidationError

from app.core.config import Settings, get_settings


class TestSettingsValidation:
    """Test Settings class validation and parsing."""
    
    def test_default_settings(self):
        """Test default settings creation."""
        settings = Settings()
        
        assert settings.app_name == "Plataforma NXT API"
        assert settings.environment == "development"
        assert settings.debug is False
        assert settings.server_host == "0.0.0.0"
        assert settings.server_port == 8000
        assert isinstance(settings.allowed_hosts, list)
        assert "*" in settings.allowed_hosts
    
    def test_environment_validation_valid(self):
        """Test valid environment values."""
        valid_environments = ["development", "staging", "production", "testing"]
        
        for env in valid_environments:
            settings = Settings(environment=env)
            assert settings.environment == env
    
    def test_environment_validation_invalid(self):
        """Test invalid environment values."""
        with pytest.raises(ValidationError) as exc_info:
            Settings(environment="invalid")
        
        assert "Environment must be one of" in str(exc_info.value)
    
    def test_cors_origins_parsing_string(self):
        """Test CORS origins parsing from comma-separated string."""
        settings = Settings(cors_origins="http://localhost:3000,http://localhost:3001")
        
        assert isinstance(settings.cors_origins, list)
        assert len(settings.cors_origins) == 2
        assert "http://localhost:3000" in settings.cors_origins
        assert "http://localhost:3001" in settings.cors_origins
    
    def test_cors_origins_parsing_json_array(self):
        """Test CORS origins parsing from JSON array string."""
        settings = Settings(cors_origins='["http://localhost:3000", "http://localhost:3001"]')
        
        assert isinstance(settings.cors_origins, list)
        assert len(settings.cors_origins) == 2
        assert "http://localhost:3000" in settings.cors_origins
        assert "http://localhost:3001" in settings.cors_origins
    
    def test_allowed_hosts_parsing(self):
        """Test allowed hosts parsing."""
        settings = Settings(allowed_hosts="localhost,127.0.0.1,example.com")
        
        assert isinstance(settings.allowed_hosts, list)
        assert len(settings.allowed_hosts) == 3
        assert "localhost" in settings.allowed_hosts
        assert "127.0.0.1" in settings.allowed_hosts
        assert "example.com" in settings.allowed_hosts
    
    def test_upload_extensions_parsing(self):
        """Test upload extensions parsing and case normalization."""
        settings = Settings(upload_allowed_extensions=".PDF,.TXT,.JPG")
        
        assert isinstance(settings.upload_allowed_extensions, list)
        assert ".pdf" in settings.upload_allowed_extensions
        assert ".txt" in settings.upload_allowed_extensions
        assert ".jpg" in settings.upload_allowed_extensions
        # Should all be lowercase
        assert all(ext.islower() for ext in settings.upload_allowed_extensions)
    
    def test_log_level_validation_valid(self):
        """Test valid log level values."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        
        for level in valid_levels:
            settings = Settings(log_level=level)
            assert settings.log_level == level.upper()
        
        # Test case insensitivity
        settings = Settings(log_level="debug")
        assert settings.log_level == "DEBUG"
    
    def test_log_level_validation_invalid(self):
        """Test invalid log level values."""
        with pytest.raises(ValidationError) as exc_info:
            Settings(log_level="INVALID")
        
        assert "Log level must be one of" in str(exc_info.value)
    
    def test_log_format_validation(self):
        """Test log format validation."""
        # Valid formats
        settings = Settings(log_format="json")
        assert settings.log_format == "json"
        
        settings = Settings(log_format="TEXT")
        assert settings.log_format == "text"
        
        # Invalid format
        with pytest.raises(ValidationError) as exc_info:
            Settings(log_format="invalid")
        
        assert "Log format must be one of" in str(exc_info.value)
    
    def test_session_secret_key_auto_generation(self):
        """Test automatic session secret key generation."""
        settings = Settings()
        
        assert settings.session_secret_key is not None
        assert len(settings.session_secret_key) > 0
        assert settings.session_secret_key == settings.secret_key
    
    def test_session_secret_key_explicit(self):
        """Test explicit session secret key."""
        explicit_key = "custom-session-key"
        settings = Settings(session_secret_key=explicit_key)
        
        assert settings.session_secret_key == explicit_key


class TestSettingsProperties:
    """Test Settings computed properties."""
    
    def test_database_url_safe_masking(self):
        """Test database URL password masking."""
        settings = Settings(
            database_url="postgresql+asyncpg://user:password@localhost:5432/db"
        )
        
        safe_url = settings.database_url_safe
        assert "password" not in safe_url
        assert "user:***" in safe_url
        assert "@localhost:5432/db" in safe_url
    
    def test_database_url_safe_no_password(self):
        """Test database URL safe when no password present."""
        settings = Settings(
            database_url="postgresql+asyncpg://localhost:5432/db"
        )
        
        safe_url = settings.database_url_safe
        assert safe_url == str(settings.database_url)
    
    def test_environment_properties(self):
        """Test environment check properties."""
        # Production
        settings = Settings(environment="production")
        assert settings.is_production is True
        assert settings.is_development is False
        assert settings.is_testing is False
        
        # Development
        settings = Settings(environment="development")
        assert settings.is_production is False
        assert settings.is_development is True
        assert settings.is_testing is False
        
        # Testing
        settings = Settings(environment="testing")
        assert settings.is_production is False
        assert settings.is_development is False
        assert settings.is_testing is True
    
    def test_redis_config_property(self):
        """Test Redis configuration property."""
        settings = Settings(
            redis_url="redis://localhost:6379/2",
            redis_max_connections=50,
            redis_socket_timeout=10
        )
        
        config = settings.redis_config
        
        assert config["url"] == "redis://localhost:6379/2"
        assert config["max_connections"] == 50
        assert config["socket_timeout"] == 10
        assert config["decode_responses"] is True
        assert config["encoding"] == "utf8"
        assert config["retry_on_timeout"] is True
    
    def test_database_config_property(self):
        """Test database configuration property."""
        settings = Settings(
            database_url="postgresql+asyncpg://test:test@localhost:5432/testdb",
            database_pool_size=20,
            database_max_overflow=30,
            database_echo=True
        )
        
        config = settings.database_config
        
        assert "postgresql+asyncpg://test:test@localhost:5432/testdb" in config["url"]
        assert config["pool_size"] == 20
        assert config["max_overflow"] == 30
        assert config["echo"] is True


class TestSettingsFromEnvFile:
    """Test Settings loading from environment file."""
    
    def test_load_from_env_file(self):
        """Test loading settings from .env file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False) as f:
            f.write("APP_NAME=Test App\n")
            f.write("DEBUG=true\n")
            f.write("SERVER_PORT=9000\n")
            f.write("CORS_ORIGINS=http://test1.com,http://test2.com\n")
            env_file_path = f.name
        
        try:
            # Mock the env file path
            class TestSettings(Settings):
                class Config:
                    env_file = env_file_path
                    env_file_encoding = "utf-8"
            
            settings = TestSettings()
            
            assert settings.app_name == "Test App"
            assert settings.debug is True
            assert settings.server_port == 9000
            assert "http://test1.com" in settings.cors_origins
            assert "http://test2.com" in settings.cors_origins
        
        finally:
            os.unlink(env_file_path)


class TestGetSettings:
    """Test get_settings function."""
    
    def test_get_settings_caching(self):
        """Test that get_settings returns cached instance."""
        settings1 = get_settings()
        settings2 = get_settings()
        
        assert settings1 is settings2
    
    def test_get_settings_returns_settings_instance(self):
        """Test that get_settings returns Settings instance."""
        settings = get_settings()
        
        assert isinstance(settings, Settings)
        assert hasattr(settings, 'app_name')
        assert hasattr(settings, 'database_url')
        assert hasattr(settings, 'redis_url')


class TestSettingsPasswordValidation:
    """Test password-related settings validation."""
    
    def test_password_requirements_defaults(self):
        """Test default password requirements."""
        settings = Settings()
        
        assert settings.password_min_length == 8
        assert settings.password_require_uppercase is True
        assert settings.password_require_lowercase is True
        assert settings.password_require_numbers is True
        assert settings.password_require_symbols is True
    
    def test_password_requirements_custom(self):
        """Test custom password requirements."""
        settings = Settings(
            password_min_length=12,
            password_require_uppercase=False,
            password_require_symbols=False
        )
        
        assert settings.password_min_length == 12
        assert settings.password_require_uppercase is False
        assert settings.password_require_lowercase is True  # Still default
        assert settings.password_require_numbers is True  # Still default
        assert settings.password_require_symbols is False


class TestJWTSettings:
    """Test JWT-related settings."""
    
    def test_jwt_defaults(self):
        """Test JWT default settings."""
        settings = Settings()
        
        assert settings.jwt_algorithm == "HS256"
        assert settings.jwt_access_token_expire_minutes == 30
        assert settings.jwt_refresh_token_expire_days == 7
        assert len(settings.jwt_secret_key) > 0
    
    def test_jwt_custom_values(self):
        """Test JWT custom values."""
        settings = Settings(
            jwt_algorithm="RS256",
            jwt_access_token_expire_minutes=60,
            jwt_refresh_token_expire_days=14,
            jwt_secret_key="custom-jwt-secret"
        )
        
        assert settings.jwt_algorithm == "RS256"
        assert settings.jwt_access_token_expire_minutes == 60
        assert settings.jwt_refresh_token_expire_days == 14
        assert settings.jwt_secret_key == "custom-jwt-secret"


class TestRateLimitingSettings:
    """Test rate limiting settings."""
    
    def test_rate_limiting_defaults(self):
        """Test rate limiting default settings."""
        settings = Settings()
        
        assert settings.disable_rate_limiting is False
        assert settings.rate_limit_per_minute == 60
        assert settings.rate_limit_burst == 120
    
    def test_rate_limiting_disabled(self):
        """Test rate limiting disabled."""
        settings = Settings(
            disable_rate_limiting=True,
            rate_limit_per_minute=100
        )
        
        assert settings.disable_rate_limiting is True
        assert settings.rate_limit_per_minute == 100


class TestFileUploadSettings:
    """Test file upload settings."""
    
    def test_upload_defaults(self):
        """Test file upload default settings."""
        settings = Settings()
        
        assert settings.upload_max_size == 10 * 1024 * 1024  # 10MB
        assert isinstance(settings.upload_allowed_extensions, list)
        assert ".pdf" in settings.upload_allowed_extensions
        assert ".jpg" in settings.upload_allowed_extensions
        assert settings.storage_path == "./storage"
    
    def test_upload_custom_settings(self):
        """Test file upload custom settings."""
        settings = Settings(
            upload_max_size=50 * 1024 * 1024,  # 50MB
            upload_allowed_extensions=[".txt", ".csv"],
            storage_path="/custom/storage"
        )
        
        assert settings.upload_max_size == 50 * 1024 * 1024
        assert settings.upload_allowed_extensions == [".txt", ".csv"]
        assert settings.storage_path == "/custom/storage"
