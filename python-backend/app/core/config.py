"""
Core configuration management using Pydantic Settings.

This module handles all application configuration including:
- Environment variable loading
- Database configuration
- Redis configuration
- JWT settings
- CORS settings
- Security settings
"""

import secrets
from functools import lru_cache
from typing import List, Optional, Union

from pydantic import Field, HttpUrl, validator
from pydantic_settings import BaseSettings

# For database URL validation, we'll use string with validation
try:
    from pydantic import PostgresDsn, RedisDsn
except ImportError:
    # Fallback for newer pydantic versions
    PostgresDsn = str
    RedisDsn = str


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # ================================
    # APPLICATION SETTINGS
    # ================================
    app_name: str = Field(default="Plataforma NXT API", env="APP_NAME")
    app_version: str = Field(default="1.0.0", env="APP_VERSION")
    debug: bool = Field(default=False, env="DEBUG")
    environment: str = Field(default="development", env="ENVIRONMENT")
    
    # ================================
    # SERVER SETTINGS
    # ================================
    server_host: str = Field(default="0.0.0.0", env="SERVER_HOST")
    server_port: int = Field(default=8000, env="SERVER_PORT")
    allowed_hosts: List[str] = Field(default=["*"], env="ALLOWED_HOSTS")
    
    # ================================
    # DATABASE SETTINGS
    # ================================
    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/plataforma_nxt",
        env="DATABASE_URL"
    )
    database_pool_size: int = Field(default=10, env="DATABASE_POOL_SIZE")
    database_max_overflow: int = Field(default=20, env="DATABASE_MAX_OVERFLOW")
    database_pool_timeout: int = Field(default=30, env="DATABASE_POOL_TIMEOUT")
    database_pool_recycle: int = Field(default=3600, env="DATABASE_POOL_RECYCLE")  # 1 hour
    database_echo: bool = Field(default=False, env="DATABASE_ECHO")
    
    # ================================
    # REDIS SETTINGS
    # ================================
    redis_url: RedisDsn = Field(
        default="redis://localhost:6379/0",
        env="REDIS_URL"
    )
    disable_redis: bool = Field(default=False, env="DISABLE_REDIS")
    redis_max_connections: int = Field(default=20, env="REDIS_MAX_CONNECTIONS")
    redis_socket_timeout: int = Field(default=5, env="REDIS_SOCKET_TIMEOUT")
    redis_socket_connect_timeout: int = Field(default=5, env="REDIS_SOCKET_CONNECT_TIMEOUT")
    
    # ================================
    # AUTHENTICATION & SECURITY
    # ================================
    secret_key: str = Field(default_factory=lambda: secrets.token_urlsafe(32), env="SECRET_KEY")
    jwt_secret_key: str = Field(default_factory=lambda: secrets.token_urlsafe(32), env="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    jwt_access_token_expire_minutes: int = Field(default=30, env="JWT_ACCESS_TOKEN_EXPIRE_MINUTES")
    jwt_refresh_token_expire_days: int = Field(default=7, env="JWT_REFRESH_TOKEN_EXPIRE_DAYS")
    
    # Session settings
    session_secret_key: Optional[str] = Field(default=None, env="SESSION_SECRET_KEY")
    session_cookie_name: str = Field(default="session", env="SESSION_COOKIE_NAME")
    session_max_age: int = Field(default=86400, env="SESSION_MAX_AGE")  # 24 hours
    
    # Password settings
    password_min_length: int = Field(default=8, env="PASSWORD_MIN_LENGTH")
    password_require_uppercase: bool = Field(default=True, env="PASSWORD_REQUIRE_UPPERCASE")
    password_require_lowercase: bool = Field(default=True, env="PASSWORD_REQUIRE_LOWERCASE")
    password_require_numbers: bool = Field(default=True, env="PASSWORD_REQUIRE_NUMBERS")
    password_require_symbols: bool = Field(default=True, env="PASSWORD_REQUIRE_SYMBOLS")
    
    # ================================
    # CORS SETTINGS
    # ================================
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:3031", "http://127.0.0.1:3000"],
        env="CORS_ORIGINS"
    )
    cors_allow_credentials: bool = Field(default=True, env="CORS_ALLOW_CREDENTIALS")
    
    # ================================
    # RATE LIMITING
    # ================================
    disable_rate_limiting: bool = Field(default=False, env="DISABLE_RATE_LIMITING")
    rate_limit_per_minute: int = Field(default=60, env="RATE_LIMIT_PER_MINUTE")
    rate_limit_burst: int = Field(default=120, env="RATE_LIMIT_BURST")
    
    # ================================
    # FILE STORAGE
    # ================================
    upload_max_size: int = Field(default=10 * 1024 * 1024, env="UPLOAD_MAX_SIZE")  # 10MB
    upload_allowed_extensions: List[str] = Field(
        default=[".jpg", ".jpeg", ".png", ".gif", ".pdf", ".txt", ".docx", ".xlsx"],
        env="UPLOAD_ALLOWED_EXTENSIONS"
    )
    storage_path: str = Field(default="./storage", env="STORAGE_PATH")
    
    # ================================
    # EXTERNAL SERVICES
    # ================================
    # Supabase settings (if used)
    supabase_url: Optional[HttpUrl] = Field(default=None, env="SUPABASE_URL")
    supabase_anon_key: Optional[str] = Field(default=None, env="SUPABASE_ANON_KEY")
    supabase_service_key: Optional[str] = Field(default=None, env="SUPABASE_SERVICE_KEY")
    
    # Email settings (if used)
    smtp_server: Optional[str] = Field(default=None, env="SMTP_SERVER")
    smtp_port: int = Field(default=587, env="SMTP_PORT")
    smtp_username: Optional[str] = Field(default=None, env="SMTP_USERNAME")
    smtp_password: Optional[str] = Field(default=None, env="SMTP_PASSWORD")
    smtp_use_tls: bool = Field(default=True, env="SMTP_USE_TLS")
    
    # ================================
    # LOGGING & MONITORING
    # ================================
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(default="json", env="LOG_FORMAT")  # json or text
    
    # Sentry settings (if used)
    sentry_dsn: Optional[str] = Field(default=None, env="SENTRY_DSN")
    sentry_environment: Optional[str] = Field(default=None, env="SENTRY_ENVIRONMENT")
    sentry_traces_sample_rate: float = Field(default=0.1, env="SENTRY_TRACES_SAMPLE_RATE")
    
    # ================================
    # BACKGROUND TASKS
    # ================================
    # Celery settings (if used)
    celery_broker_url: Optional[str] = Field(default=None, env="CELERY_BROKER_URL")
    celery_result_backend: Optional[str] = Field(default=None, env="CELERY_RESULT_BACKEND")
    
    # ================================
    # API SETTINGS
    # ================================
    api_prefix: str = Field(default="/api/v1", env="API_PREFIX")
    api_version: str = Field(default="1.0", env="API_VERSION")
    
    # Pagination defaults
    default_page_size: int = Field(default=20, env="DEFAULT_PAGE_SIZE")
    max_page_size: int = Field(default=100, env="MAX_PAGE_SIZE")
    
    # ================================
    # DEVELOPMENT SETTINGS
    # ================================
    # These are only used in development
    auto_reload: bool = Field(default=False, env="AUTO_RELOAD")
    profiler_enabled: bool = Field(default=False, env="PROFILER_ENABLED")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        
        # Example .env values in docstring
        json_schema_extra = {
            "example": {
                "APP_NAME": "Plataforma NXT API",
                "DEBUG": "false",
                "DATABASE_URL": "postgresql+asyncpg://user:pass@localhost:5432/dbname",
                "REDIS_URL": "redis://localhost:6379/0",
                "SECRET_KEY": "your-secret-key-here",
                "JWT_SECRET_KEY": "your-jwt-secret-key-here",
                "CORS_ORIGINS": '["http://localhost:3000", "http://localhost:3031"]',
            }
        }
    
    # ================================
    # VALIDATORS
    # ================================
    @validator("cors_origins", pre=True)
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            # Handle comma-separated string or JSON array string
            if v.startswith("[") and v.endswith("]"):
                import json
                return json.loads(v)
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("allowed_hosts", pre=True)
    def parse_allowed_hosts(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse allowed hosts from string or list."""
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                return json.loads(v)
            return [host.strip() for host in v.split(",")]
        return v
    
    @validator("upload_allowed_extensions", pre=True)
    def parse_upload_extensions(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse upload extensions from string or list."""
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                return json.loads(v)
            return [ext.strip().lower() for ext in v.split(",")]
        return [ext.lower() for ext in v]
    
    @validator("environment")
    def validate_environment(cls, v: str) -> str:
        """Validate environment setting."""
        allowed = ["development", "staging", "production", "testing"]
        if v.lower() not in allowed:
            raise ValueError(f"Environment must be one of: {', '.join(allowed)}")
        return v.lower()
    
    @validator("log_level")
    def validate_log_level(cls, v: str) -> str:
        """Validate log level setting."""
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed:
            raise ValueError(f"Log level must be one of: {', '.join(allowed)}")
        return v.upper()
    
    @validator("log_format")
    def validate_log_format(cls, v: str) -> str:
        """Validate log format setting."""
        allowed = ["json", "text"]
        if v.lower() not in allowed:
            raise ValueError(f"Log format must be one of: {', '.join(allowed)}")
        return v.lower()
    
    @validator("session_secret_key", always=True)
    def set_session_secret_key(cls, v: Optional[str], values: dict) -> str:
        """Set session secret key from main secret key if not provided."""
        if v is None:
            return values.get("secret_key", secrets.token_urlsafe(32))
        return v
    
    # ================================
    # COMPUTED PROPERTIES
    # ================================
    @property
    def database_url_safe(self) -> str:
        """Database URL with password masked for logging."""
        url = str(self.database_url)
        if "@" in url and ":" in url:
            # Mask password in URL for safe logging
            parts = url.split("@")
            if len(parts) == 2:
                user_pass = parts[0].split("://")[1]
                if ":" in user_pass:
                    user = user_pass.split(":")[0]
                    return url.replace(user_pass, f"{user}:***")
        return url
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.environment == "development"
    
    @property
    def is_testing(self) -> bool:
        """Check if running in testing environment."""
        return self.environment == "testing"
    
    @property
    def redis_config(self) -> dict:
        """Redis configuration dictionary."""
        return {
            "url": str(self.redis_url),
            "max_connections": self.redis_max_connections,
            "socket_timeout": self.redis_socket_timeout,
            "socket_connect_timeout": self.redis_socket_connect_timeout,
            "decode_responses": True,
            "encoding": "utf8",
            "retry_on_timeout": True,
            "health_check_interval": 30,
        }
    
    @property
    def database_config(self) -> dict:
        """Database configuration dictionary."""
        return {
            "url": str(self.database_url),
            "pool_size": self.database_pool_size,
            "max_overflow": self.database_max_overflow,
            "pool_timeout": self.database_pool_timeout,
            "pool_recycle": self.database_pool_recycle,
            "echo": self.database_echo,
        }


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# For backwards compatibility and ease of use
settings = get_settings()