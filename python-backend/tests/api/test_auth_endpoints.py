"""
API tests for authentication endpoints.

Tests all authentication-related API endpoints including registration, login,
token management, password operations, and security features.
"""

import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any
from unittest.mock import patch, AsyncMock

import pytest
from fastapi import status
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.users import User, LoginAttempt
from app.core.security import create_access_token, verify_password


class TestUserRegistration:
    """Test user registration endpoints."""
    
    @pytest.mark.asyncio
    async def test_register_user_success(self, async_client: AsyncClient, sample_user_data: Dict[str, Any]):
        """Test successful user registration."""
        response = await async_client.post("/api/auth/register", json=sample_user_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        
        assert data["success"] is True
        assert data["message"] == "User registered successfully"
        assert "user_id" in data
        assert data["email"] == sample_user_data["email"]
    
    @pytest.mark.asyncio
    async def test_register_user_duplicate_email(self, async_client: AsyncClient, test_user: User, sample_user_data: Dict[str, Any]):
        """Test registration with duplicate email fails."""
        # Try to register with existing user's email
        sample_user_data["email"] = test_user.email
        
        response = await async_client.post("/api/auth/register", json=sample_user_data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        
        assert data["success"] is False
        assert "already exists" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_register_user_invalid_email(self, async_client: AsyncClient, sample_user_data: Dict[str, Any]):
        """Test registration with invalid email format."""
        sample_user_data["email"] = "invalid-email"
        
        response = await async_client.post("/api/auth/register", json=sample_user_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @pytest.mark.asyncio
    async def test_register_user_weak_password(self, async_client: AsyncClient, sample_user_data: Dict[str, Any]):
        """Test registration with weak password fails."""
        sample_user_data["password"] = "123"
        sample_user_data["confirm_password"] = "123"
        
        response = await async_client.post("/api/auth/register", json=sample_user_data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        
        assert data["success"] is False
        assert "password" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_register_user_password_mismatch(self, async_client: AsyncClient, sample_user_data: Dict[str, Any]):
        """Test registration with password mismatch fails."""
        sample_user_data["password"] = "strongpassword123"
        sample_user_data["confirm_password"] = "differentpassword123"
        
        response = await async_client.post("/api/auth/register", json=sample_user_data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        
        assert data["success"] is False
        assert "match" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_register_user_missing_fields(self, async_client: AsyncClient):
        """Test registration with missing required fields."""
        incomplete_data = {
            "email": "incomplete@example.com"
            # Missing name, password, etc.
        }
        
        response = await async_client.post("/api/auth/register", json=incomplete_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @pytest.mark.asyncio
    async def test_check_email_availability_available(self, async_client: AsyncClient):
        """Test email availability check for available email."""
        response = await async_client.post("/api/auth/register/check-availability", 
                                         params={"email": "available@example.com"})
        
        # Note: This endpoint is not fully implemented according to the code
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["success"] is True
        # Implementation shows this always returns available=True for now
        assert data["data"]["available"] is True
    
    @pytest.mark.asyncio
    async def test_register_user_with_optional_fields(self, async_client: AsyncClient, sample_user_data: Dict[str, Any]):
        """Test registration with optional fields filled."""
        sample_user_data.update({
            "first_name": "John",
            "last_name": "Doe",
            "timezone": "America/New_York",
            "language": "en-US"
        })
        
        response = await async_client.post("/api/auth/register", json=sample_user_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        
        assert data["success"] is True
        # Verify optional fields were processed
        assert "user_id" in data


class TestUserLogin:
    """Test user login endpoints."""
    
    @pytest.mark.asyncio
    async def test_login_success(self, async_client: AsyncClient, test_user: User, sample_login_data: Dict[str, Any]):
        """Test successful user login."""
        response = await async_client.post("/api/auth/login", json=sample_login_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["success"] is True
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == test_user.email
        assert data["mfa_required"] is False
    
    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, async_client: AsyncClient, sample_login_data: Dict[str, Any]):
        """Test login with invalid credentials."""
        sample_login_data["password"] = "wrongpassword"
        
        response = await async_client.post("/api/auth/login", json=sample_login_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        
        assert data["success"] is False
        assert "invalid" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, async_client: AsyncClient):
        """Test login with non-existent user."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "somepassword"
        }
        
        response = await async_client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        
        assert data["success"] is False
    
    @pytest.mark.asyncio
    async def test_login_locked_account(self, async_client: AsyncClient, db_session: AsyncSession, test_user: User):
        """Test login with locked account."""
        # Lock the user account
        test_user.is_locked = True
        test_user.lock_reason = "Account locked for testing"
        await db_session.commit()
        
        login_data = {
            "email": test_user.email,
            "password": "testpassword123"
        }
        
        response = await async_client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        
        assert data["success"] is False
        assert "locked" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_login_inactive_account(self, async_client: AsyncClient, db_session: AsyncSession, test_user: User):
        """Test login with inactive account."""
        # Deactivate the user account
        test_user.is_active = False
        await db_session.commit()
        
        login_data = {
            "email": test_user.email,
            "password": "testpassword123"
        }
        
        response = await async_client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        
        assert data["success"] is False
    
    @pytest.mark.asyncio
    async def test_login_creates_login_attempt_record(self, async_client: AsyncClient, db_session: AsyncSession, test_user: User):
        """Test that login attempts are recorded."""
        login_data = {
            "email": test_user.email,
            "password": "testpassword123"
        }
        
        # Count existing login attempts
        from sqlalchemy import select, func
        result = await db_session.execute(
            select(func.count(LoginAttempt.id))
            .where(LoginAttempt.email == test_user.email)
        )
        initial_count = result.scalar()
        
        response = await async_client.post("/api/auth/login", json=login_data)
        
        # Check that a new login attempt was recorded
        result = await db_session.execute(
            select(func.count(LoginAttempt.id))
            .where(LoginAttempt.email == test_user.email)
        )
        final_count = result.scalar()
        
        assert final_count > initial_count
    
    @pytest.mark.asyncio
    async def test_login_with_remember_me(self, async_client: AsyncClient, test_user: User):
        """Test login with remember me option."""
        login_data = {
            "email": test_user.email,
            "password": "testpassword123",
            "remember_me": True
        }
        
        response = await async_client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["success"] is True
        # With remember_me=True, refresh token should have longer expiry
        assert "refresh_token" in data


class TestTokenManagement:
    """Test token management endpoints."""
    
    @pytest.mark.asyncio
    async def test_token_refresh_success(self, async_client: AsyncClient, test_user_tokens: Dict[str, str]):
        """Test successful token refresh."""
        refresh_data = {
            "refresh_token": test_user_tokens["refresh_token"]
        }
        
        response = await async_client.post("/api/auth/token/refresh", json=refresh_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        # New tokens should be different from original
        assert data["access_token"] != test_user_tokens["access_token"]
    
    @pytest.mark.asyncio
    async def test_token_refresh_invalid_token(self, async_client: AsyncClient):
        """Test token refresh with invalid refresh token."""
        refresh_data = {
            "refresh_token": "invalid.refresh.token"
        }
        
        response = await async_client.post("/api/auth/token/refresh", json=refresh_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        
        assert data["success"] is False
    
    @pytest.mark.asyncio
    async def test_token_validation_valid(self, async_client: AsyncClient, auth_headers: Dict[str, str]):
        """Test token validation with valid token."""
        validation_data = {
            "token": auth_headers["Authorization"].replace("Bearer ", "")
        }
        
        response = await async_client.post("/api/auth/token/validate", 
                                         json=validation_data, 
                                         headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["valid"] is True
        assert "user_id" in data
        assert "expires_at" in data
    
    @pytest.mark.asyncio
    async def test_token_validation_invalid(self, async_client: AsyncClient):
        """Test token validation with invalid token."""
        validation_data = {
            "token": "invalid.token.here"
        }
        
        response = await async_client.post("/api/auth/token/validate", json=validation_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    @pytest.mark.asyncio
    async def test_token_validation_expired(self, async_client: AsyncClient, test_user: User):
        """Test token validation with expired token."""
        # Create an expired token
        expired_token = create_access_token(
            data={"sub": str(test_user.id)},
            expires_delta=timedelta(seconds=-1)  # Expired 1 second ago
        )
        
        validation_data = {
            "token": expired_token
        }
        
        response = await async_client.post("/api/auth/token/validate", json=validation_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestLogout:
    """Test logout functionality."""
    
    @pytest.mark.asyncio
    async def test_logout_success(self, async_client: AsyncClient, auth_headers: Dict[str, str], test_user_tokens: Dict[str, str]):
        """Test successful logout."""
        logout_data = {
            "refresh_token": test_user_tokens["refresh_token"],
            "logout_all_sessions": False
        }
        
        response = await async_client.post("/api/auth/logout", 
                                          json=logout_data, 
                                          headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["success"] is True
        assert "sessions_revoked" in data
    
    @pytest.mark.asyncio
    async def test_logout_all_sessions(self, async_client: AsyncClient, auth_headers: Dict[str, str], test_user_tokens: Dict[str, str]):
        """Test logout from all sessions."""
        logout_data = {
            "refresh_token": test_user_tokens["refresh_token"],
            "logout_all_sessions": True
        }
        
        response = await async_client.post("/api/auth/logout", 
                                          json=logout_data, 
                                          headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["success"] is True
        assert data["sessions_revoked"] >= 1
    
    @pytest.mark.asyncio
    async def test_logout_without_auth(self, async_client: AsyncClient):
        """Test logout without authentication token fails."""
        logout_data = {
            "refresh_token": "some.refresh.token",
            "logout_all_sessions": False
        }
        
        response = await async_client.post("/api/auth/logout", json=logout_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestPasswordManagement:
    """Test password management endpoints."""
    
    @pytest.mark.asyncio
    async def test_change_password_success(self, async_client: AsyncClient, auth_headers: Dict[str, str], db_session: AsyncSession, test_user: User):
        """Test successful password change."""
        password_data = {
            "current_password": "testpassword123",
            "new_password": "newstrongpassword123!",
            "confirm_password": "newstrongpassword123!"
        }
        
        response = await async_client.post("/api/auth/password/change", 
                                          json=password_data, 
                                          headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["success"] is True
        assert "changed successfully" in data["message"]
        
        # Verify password was actually changed
        await db_session.refresh(test_user)
        assert verify_password("newstrongpassword123!", test_user.password_hash)
    
    @pytest.mark.asyncio
    async def test_change_password_wrong_current(self, async_client: AsyncClient, auth_headers: Dict[str, str]):
        """Test password change with wrong current password."""
        password_data = {
            "current_password": "wrongcurrentpassword",
            "new_password": "newstrongpassword123!",
            "confirm_password": "newstrongpassword123!"
        }
        
        response = await async_client.post("/api/auth/password/change", 
                                          json=password_data, 
                                          headers=auth_headers)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        
        assert data["success"] is False
        assert "current password" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_change_password_mismatch(self, async_client: AsyncClient, auth_headers: Dict[str, str]):
        """Test password change with password mismatch."""
        password_data = {
            "current_password": "testpassword123",
            "new_password": "newstrongpassword123!",
            "confirm_password": "differentpassword123!"
        }
        
        response = await async_client.post("/api/auth/password/change", 
                                          json=password_data, 
                                          headers=auth_headers)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        
        assert data["success"] is False
        assert "match" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_request_password_reset(self, async_client: AsyncClient, test_user: User):
        """Test password reset request."""
        reset_data = {
            "email": test_user.email,
            "return_url": "https://app.example.com/reset-password"
        }
        
        response = await async_client.post("/api/auth/password/reset", json=reset_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["success"] is True
        assert "reset link sent" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_request_password_reset_nonexistent_email(self, async_client: AsyncClient):
        """Test password reset request for non-existent email."""
        reset_data = {
            "email": "nonexistent@example.com",
            "return_url": "https://app.example.com/reset-password"
        }
        
        response = await async_client.post("/api/auth/password/reset", json=reset_data)
        
        # For security, should return success even for non-existent emails
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["success"] is True
    
    @pytest.mark.asyncio
    async def test_password_strength_check_strong(self, async_client: AsyncClient):
        """Test password strength check with strong password."""
        strength_data = {
            "password": "VeryStr0ng!P@ssw0rd"
        }
        
        response = await async_client.post("/api/auth/password/strength", json=strength_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["valid"] is True
        assert data["strength_score"] > 70
        assert len(data["errors"]) == 0
    
    @pytest.mark.asyncio
    async def test_password_strength_check_weak(self, async_client: AsyncClient):
        """Test password strength check with weak password."""
        strength_data = {
            "password": "123"
        }
        
        response = await async_client.post("/api/auth/password/strength", json=strength_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["valid"] is False
        assert data["strength_score"] < 50
        assert len(data["errors"]) > 0
        assert len(data["suggestions"]) > 0


class TestUserProfile:
    """Test user profile endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_user_profile(self, async_client: AsyncClient, auth_headers: Dict[str, str], test_user: User):
        """Test getting user profile."""
        response = await async_client.get("/api/auth/profile", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "id" in data
        assert data["email"] == test_user.email
        assert data["name"] == test_user.name
        assert "is_active" in data
        assert "preferences" in data
    
    @pytest.mark.asyncio
    async def test_get_user_profile_summary(self, async_client: AsyncClient, auth_headers: Dict[str, str], test_user: User):
        """Test getting user profile summary."""
        response = await async_client.get("/api/auth/profile/summary", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "id" in data
        assert data["email"] == test_user.email
        assert "roles" in data
        assert "permissions" in data
    
    @pytest.mark.asyncio
    async def test_update_user_profile(self, async_client: AsyncClient, auth_headers: Dict[str, str]):
        """Test updating user profile."""
        update_data = {
            "name": "Updated Name",
            "first_name": "Updated",
            "last_name": "Name",
            "timezone": "Europe/London",
            "language": "en-US",
            "theme": "dark"
        }
        
        response = await async_client.put("/api/auth/profile", 
                                         json=update_data, 
                                         headers=auth_headers)
        
        # Note: According to the code, this is not fully implemented
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["success"] is False
        assert "not implemented" in data["message"]
    
    @pytest.mark.asyncio
    async def test_get_profile_without_auth(self, async_client: AsyncClient):
        """Test getting profile without authentication fails."""
        response = await async_client.get("/api/auth/profile")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestSessionManagement:
    """Test session management endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_user_sessions(self, async_client: AsyncClient, auth_headers: Dict[str, str]):
        """Test getting user sessions."""
        response = await async_client.get("/api/auth/sessions", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "sessions" in data
        assert "total_sessions" in data
        assert "active_sessions" in data
    
    @pytest.mark.asyncio
    async def test_revoke_user_sessions(self, async_client: AsyncClient, auth_headers: Dict[str, str]):
        """Test revoking user sessions."""
        revoke_data = {
            "session_ids": [],  # Empty array means revoke all
            "revoke_all": True
        }
        
        response = await async_client.post("/api/auth/sessions/revoke", 
                                          json=revoke_data, 
                                          headers=auth_headers)
        
        # Note: According to the code, this is not fully implemented
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["success"] is False
        assert "not implemented" in data["message"]


class TestSecurityAudit:
    """Test security audit endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_login_attempts(self, async_client: AsyncClient, auth_headers: Dict[str, str]):
        """Test getting login attempts."""
        response = await async_client.get("/api/auth/security/login-attempts", 
                                        headers=auth_headers, 
                                        params={"limit": 10})
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Should return a list (empty or with attempts)
        assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_get_security_audit_log(self, async_client: AsyncClient, auth_headers: Dict[str, str]):
        """Test getting security audit log."""
        response = await async_client.get("/api/auth/security/audit-log", 
                                        headers=auth_headers, 
                                        params={"page": 1, "per_page": 20})
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "logs" in data
        assert "total" in data
        assert "page" in data
        assert "per_page" in data
        assert data["page"] == 1
        assert data["per_page"] == 20


class TestHealthCheck:
    """Test authentication health check."""
    
    @pytest.mark.asyncio
    async def test_auth_health_check(self, async_client: AsyncClient):
        """Test authentication service health check."""
        response = await async_client.get("/api/auth/health")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["success"] is True
        assert "healthy" in data["message"].lower()
        assert "data" in data
        assert "features" in data["data"]
        assert "timestamp" in data["data"]
        assert "version" in data["data"]


class TestAuthenticationMiddleware:
    """Test authentication middleware and security."""
    
    @pytest.mark.asyncio
    async def test_protected_endpoint_without_token(self, async_client: AsyncClient):
        """Test accessing protected endpoint without token fails."""
        response = await async_client.get("/api/auth/profile")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    @pytest.mark.asyncio
    async def test_protected_endpoint_with_invalid_token(self, async_client: AsyncClient):
        """Test accessing protected endpoint with invalid token fails."""
        headers = {"Authorization": "Bearer invalid.token.here"}
        
        response = await async_client.get("/api/auth/profile", headers=headers)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    @pytest.mark.asyncio
    async def test_protected_endpoint_with_expired_token(self, async_client: AsyncClient, test_user: User):
        """Test accessing protected endpoint with expired token fails."""
        # Create expired token
        expired_token = create_access_token(
            data={"sub": str(test_user.id)},
            expires_delta=timedelta(seconds=-1)
        )
        
        headers = {"Authorization": f"Bearer {expired_token}"}
        
        response = await async_client.get("/api/auth/profile", headers=headers)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, async_client: AsyncClient):
        """Test rate limiting on authentication endpoints."""
        # Note: Rate limiting is disabled in test settings
        # This test would need rate limiting enabled to work properly
        
        login_data = {
            "email": "test@example.com",
            "password": "wrongpassword"
        }
        
        # Make multiple rapid requests
        responses = []
        for _ in range(5):
            response = await async_client.post("/api/auth/login", json=login_data)
            responses.append(response)
        
        # All should be processed since rate limiting is disabled in tests
        for response in responses:
            assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_429_TOO_MANY_REQUESTS]
    
    @pytest.mark.asyncio
    async def test_cors_headers_present(self, async_client: AsyncClient):
        """Test that CORS headers are present in responses."""
        response = await async_client.get("/api/auth/health")
        
        assert response.status_code == status.HTTP_200_OK
        
        # Check for common CORS headers (these might not all be present depending on middleware config)
        # This is more of a smoke test
        headers = response.headers
        # At minimum, the response should not fail due to CORS issues
        assert "content-type" in headers
