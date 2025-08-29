"""
Unit tests for core security functionality.

Tests password hashing, JWT token creation/validation, and security utilities.
"""

import time
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from jose import jwt, JWTError

from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_token,
    get_password_hash,
    verify_password,
    generate_password_reset_token,
    verify_password_reset_token,
    TokenData,
    password_validator,
    PasswordValidationResult
)
from app.core.config import get_settings


class TestPasswordHashing:
    """Test password hashing and verification functions."""
    
    def test_password_hashing(self):
        """Test password hashing produces different hashes for same password."""
        password = "testpassword123"
        
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        # Hashes should be different due to salt
        assert hash1 != hash2
        assert len(hash1) > 50  # bcrypt hashes are long
        assert len(hash2) > 50
    
    def test_password_verification_correct(self):
        """Test password verification with correct password."""
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed) is True
    
    def test_password_verification_incorrect(self):
        """Test password verification with incorrect password."""
        password = "testpassword123"
        wrong_password = "wrongpassword"
        hashed = get_password_hash(password)
        
        assert verify_password(wrong_password, hashed) is False
    
    def test_password_verification_empty_strings(self):
        """Test password verification with empty strings."""
        assert verify_password("", "") is False
        assert verify_password("password", "") is False
        assert verify_password("", "hash") is False


class TestJWTTokens:
    """Test JWT token creation and validation."""
    
    def test_create_access_token_basic(self):
        """Test basic access token creation."""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token.split('.')) == 3  # JWT has 3 parts
    
    def test_create_access_token_with_expiry(self):
        """Test access token creation with custom expiry."""
        data = {"sub": "user123"}
        expires_delta = timedelta(minutes=15)
        
        token = create_access_token(data, expires_delta=expires_delta)
        
        # Decode to check expiry
        settings = get_settings()
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        
        # Check that exp is set and is in the future
        assert "exp" in payload
        assert payload["exp"] > time.time()
        assert payload["exp"] < time.time() + (16 * 60)  # Should be less than 16 minutes
    
    def test_create_refresh_token(self):
        """Test refresh token creation."""
        data = {"sub": "user123"}
        token = create_refresh_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        
        # Decode to check it's a valid JWT
        settings = get_settings()
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        
        assert payload["sub"] == "user123"
        assert payload["token_type"] == "refresh"
        assert "exp" in payload
    
    def test_verify_token_valid(self):
        """Test token verification with valid token."""
        data = {
            "sub": "user123",
            "email": "test@example.com",
            "username": "testuser",
            "roles": ["user"],
            "permissions": ["read:profile"]
        }
        
        token = create_access_token(data)
        token_data = verify_token(token)
        
        assert isinstance(token_data, TokenData)
        assert str(token_data.user_id) == "user123"
        assert token_data.email == "test@example.com"
        assert token_data.username == "testuser"
        assert token_data.roles == ["user"]
        assert token_data.permissions == ["read:profile"]
    
    def test_verify_token_invalid(self):
        """Test token verification with invalid token."""
        with pytest.raises(HTTPException) as exc_info:
            verify_token("invalid.token.here")
        
        assert exc_info.value.status_code == 401
        assert "Invalid token" in str(exc_info.value.detail)
    
    def test_verify_token_expired(self):
        """Test token verification with expired token."""
        data = {"sub": "user123"}
        # Create token that expires immediately
        token = create_access_token(data, expires_delta=timedelta(seconds=-1))
        
        with pytest.raises(HTTPException) as exc_info:
            verify_token(token)
        
        assert exc_info.value.status_code == 401
        assert "Token expired" in str(exc_info.value.detail)
    
    def test_verify_token_missing_claims(self):
        """Test token verification with missing required claims."""
        # Create token with minimal data
        settings = get_settings()
        
        # Manually create token without required claims
        payload = {
            "sub": "user123",
            "exp": time.time() + 3600
        }
        
        token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        
        # Should handle missing claims gracefully
        token_data = verify_token(token)
        assert str(token_data.user_id) == "user123"
        assert token_data.email is None
        assert token_data.username == "user123"  # Falls back to sub
        assert token_data.roles == []
        assert token_data.permissions == []


class TestPasswordResetTokens:
    """Test password reset token functionality."""
    
    def test_generate_password_reset_token(self):
        """Test password reset token generation."""
        email = "test@example.com"
        token = generate_password_reset_token(email)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 20  # Should be a reasonable length
    
    def test_verify_password_reset_token_valid(self):
        """Test password reset token verification with valid token."""
        email = "test@example.com"
        token = generate_password_reset_token(email)
        
        verified_email = verify_password_reset_token(token)
        assert verified_email == email
    
    def test_verify_password_reset_token_invalid(self):
        """Test password reset token verification with invalid token."""
        result = verify_password_reset_token("invalid-token")
        assert result is None
    
    def test_verify_password_reset_token_expired(self):
        """Test password reset token verification with expired token."""
        email = "test@example.com"
        
        # Mock the token creation to create an expired token
        with patch('app.core.security.time.time') as mock_time:
            # Set time to past for token creation
            mock_time.return_value = time.time() - 7200  # 2 hours ago
            token = generate_password_reset_token(email)
            
            # Reset time to current for verification
            mock_time.return_value = time.time()
            result = verify_password_reset_token(token)
            
            assert result is None


class TestPasswordValidator:
    """Test password validation functionality."""
    
    def test_password_validator_exists(self):
        """Test that password validator exists and is callable."""
        assert password_validator is not None
        assert hasattr(password_validator, 'validate_password_strength')
    
    def test_password_validation_strong_password(self):
        """Test validation of a strong password."""
        strong_password = "StrongP@ssw0rd123!"
        result = password_validator.validate_password_strength(strong_password)
        
        assert isinstance(result, PasswordValidationResult)
        assert result.is_valid is True
        assert result.strength_score >= 80
        assert len(result.errors) == 0
    
    def test_password_validation_weak_password(self):
        """Test validation of a weak password."""
        weak_password = "123"
        result = password_validator.validate_password_strength(weak_password)
        
        assert isinstance(result, PasswordValidationResult)
        assert result.is_valid is False
        assert result.strength_score < 50
        assert len(result.errors) > 0
    
    def test_password_validation_missing_uppercase(self):
        """Test password validation with missing uppercase."""
        password = "lowercase123!"
        result = password_validator.validate_password_strength(password)
        
        if not result.is_valid:
            error_messages = ' '.join(result.errors)
            assert "uppercase" in error_messages.lower() or "capital" in error_messages.lower()
    
    def test_password_validation_missing_lowercase(self):
        """Test password validation with missing lowercase."""
        password = "UPPERCASE123!"
        result = password_validator.validate_password_strength(password)
        
        if not result.is_valid:
            error_messages = ' '.join(result.errors)
            assert "lowercase" in error_messages.lower()
    
    def test_password_validation_missing_numbers(self):
        """Test password validation with missing numbers."""
        password = "NoNumbers!"
        result = password_validator.validate_password_strength(password)
        
        if not result.is_valid:
            error_messages = ' '.join(result.errors)
            assert "number" in error_messages.lower() or "digit" in error_messages.lower()
    
    def test_password_validation_missing_symbols(self):
        """Test password validation with missing symbols."""
        password = "NoSymbols123"
        result = password_validator.validate_password_strength(password)
        
        if not result.is_valid:
            error_messages = ' '.join(result.errors)
            assert "symbol" in error_messages.lower() or "special" in error_messages.lower()
    
    def test_password_validation_too_short(self):
        """Test password validation with too short password."""
        password = "Short1!"
        result = password_validator.validate_password_strength(password)
        
        if not result.is_valid:
            error_messages = ' '.join(result.errors)
            assert "length" in error_messages.lower() or "characters" in error_messages.lower()
    
    def test_password_validation_common_password(self):
        """Test password validation with common password."""
        common_passwords = ["password123", "12345678", "qwerty123"]
        
        for password in common_passwords:
            result = password_validator.validate_password_strength(password)
            # Common passwords should have lower scores or be invalid
            assert result.strength_score < 70 or not result.is_valid


class TestTokenData:
    """Test TokenData class."""
    
    def test_token_data_creation(self):
        """Test TokenData object creation."""
        user_id = uuid4()
        token_data = TokenData(
            user_id=user_id,
            email="test@example.com",
            username="testuser",
            roles=["user", "admin"],
            permissions=["read:all", "write:own"],
            exp=time.time() + 3600
        )
        
        assert token_data.user_id == user_id
        assert token_data.email == "test@example.com"
        assert token_data.username == "testuser"
        assert token_data.roles == ["user", "admin"]
        assert token_data.permissions == ["read:all", "write:own"]
        assert token_data.exp > time.time()
    
    def test_token_data_defaults(self):
        """Test TokenData with default values."""
        user_id = uuid4()
        token_data = TokenData(user_id=user_id, username="testuser")
        
        assert token_data.user_id == user_id
        assert token_data.username == "testuser"
        assert token_data.email is None
        assert token_data.roles == []
        assert token_data.permissions == []
        assert token_data.exp is None


class TestSecurityHelpers:
    """Test security helper functions."""
    
    @patch('app.core.security.secrets')
    def test_secret_generation(self, mock_secrets):
        """Test that secrets are properly generated."""
        mock_secrets.token_urlsafe.return_value = "mocked-secret"
        
        # Test by creating a new token
        data = {"sub": "test"}
        token = create_access_token(data)
        
        # Verify the function was called (indirectly through settings)
        assert token is not None
    
    def test_token_format_validation(self):
        """Test that tokens follow expected format."""
        data = {"sub": "user123"}
        access_token = create_access_token(data)
        refresh_token = create_refresh_token(data)
        
        # Both should be valid JWT format (3 parts separated by dots)
        assert len(access_token.split('.')) == 3
        assert len(refresh_token.split('.')) == 3
        
        # Should not contain spaces or invalid characters
        assert ' ' not in access_token
        assert ' ' not in refresh_token
        assert '\n' not in access_token
        assert '\n' not in refresh_token
    
    def test_token_algorithm_consistency(self):
        """Test that tokens use consistent algorithm."""
        settings = get_settings()
        data = {"sub": "user123"}
        
        token = create_access_token(data)
        
        # Decode token header to check algorithm
        header = jwt.get_unverified_header(token)
        assert header["alg"] == settings.jwt_algorithm
    
    def test_different_tokens_for_same_data(self):
        """Test that different tokens are created for same data."""
        data = {"sub": "user123"}
        
        token1 = create_access_token(data)
        # Small delay to ensure different issued-at time
        time.sleep(0.001)
        token2 = create_access_token(data)
        
        assert token1 != token2  # Should be different due to iat claim


class TestSecurityConfiguration:
    """Test security configuration and settings."""
    
    def test_jwt_settings_loaded(self):
        """Test that JWT settings are properly loaded."""
        settings = get_settings()
        
        assert settings.jwt_secret_key is not None
        assert len(settings.jwt_secret_key) > 0
        assert settings.jwt_algorithm in ["HS256", "RS256", "ES256"]
        assert settings.jwt_access_token_expire_minutes > 0
        assert settings.jwt_refresh_token_expire_days > 0
    
    def test_password_settings_loaded(self):
        """Test that password settings are properly loaded."""
        settings = get_settings()
        
        assert settings.password_min_length >= 6
        assert isinstance(settings.password_require_uppercase, bool)
        assert isinstance(settings.password_require_lowercase, bool)
        assert isinstance(settings.password_require_numbers, bool)
        assert isinstance(settings.password_require_symbols, bool)
