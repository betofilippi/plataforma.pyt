"""
WebSocket authentication and authorization module.

This module handles JWT authentication for WebSocket connections, session validation,
permission checking, and rate limiting for WebSocket messages.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Set

import redis.asyncio as redis
import structlog
from fastapi import WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from pydantic import ValidationError

from app.core.config import get_settings
from app.core.security import verify_token
from app.schemas.websocket import (
    ConnectionState,
    ErrorMessage,
    MessageType,
    RateLimitInfo,
    create_error_message,
)

logger = structlog.get_logger(__name__)


class WebSocketAuthenticationError(Exception):
    """WebSocket authentication error."""
    pass


class WebSocketRateLimitError(Exception):
    """WebSocket rate limiting error."""
    pass


class WebSocketAuthenticator:
    """
    WebSocket authentication and authorization handler.
    
    Provides JWT authentication, session validation, permission checking,
    and rate limiting for WebSocket connections.
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        """Initialize WebSocket authenticator."""
        self.settings = get_settings()
        self.redis_client = redis_client
        self.rate_limits: Dict[str, RateLimitInfo] = {}
        self.blocked_connections: Set[str] = set()
        
        # Rate limiting configuration
        self.requests_per_minute = 60
        self.requests_per_hour = 1000
        self.block_duration_minutes = 15
        
        # Start cleanup task
        asyncio.create_task(self._cleanup_rate_limits())
    
    async def authenticate_connection(self, websocket: WebSocket) -> ConnectionState:
        """
        Authenticate a WebSocket connection.
        
        Args:
            websocket: The WebSocket connection
            
        Returns:
            ConnectionState: The authenticated connection state
            
        Raises:
            WebSocketAuthenticationError: If authentication fails
        """
        try:
            # Get authentication token from query params or headers
            token = await self._extract_token(websocket)
            if not token:
                raise WebSocketAuthenticationError("Authentication token required")
            
            # Verify and decode the JWT token
            payload = await self._verify_jwt_token(token)
            if not payload:
                raise WebSocketAuthenticationError("Invalid authentication token")
            
            # Extract user information
            user_id = payload.get("sub")
            username = payload.get("username")
            email = payload.get("email")
            
            if not all([user_id, username, email]):
                raise WebSocketAuthenticationError("Incomplete user information in token")
            
            # Check if user session is valid
            if not await self._validate_session(user_id, token):
                raise WebSocketAuthenticationError("Invalid or expired session")
            
            # Create connection state
            connection_id = f"ws_{user_id}_{int(time.time())}"
            connection_state = ConnectionState(
                connection_id=connection_id,
                user_id=user_id,
                username=username,
                email=email,
                connected_at=datetime.now(),
                last_ping=datetime.now(),
                is_authenticated=True,
                metadata={"token": token}
            )
            
            logger.info(
                "WebSocket connection authenticated",
                connection_id=connection_id,
                user_id=user_id,
                username=username
            )
            
            return connection_state
            
        except (JWTError, ValidationError, KeyError) as e:
            logger.error("WebSocket authentication failed", error=str(e))
            raise WebSocketAuthenticationError(f"Authentication failed: {str(e)}")
    
    async def check_permissions(self, connection_state: ConnectionState, 
                               action: str, resource: Optional[str] = None) -> bool:
        """
        Check if a user has permission to perform an action.
        
        Args:
            connection_state: The connection state
            action: The action to check (e.g., "join_room", "edit_cell")
            resource: Optional resource identifier (e.g., room_id, sheet_id)
            
        Returns:
            bool: True if permission is granted
        """
        try:
            user_id = connection_state.user_id
            
            # Basic permission checks
            if action in ["join_room", "leave_room", "cursor_move", "status_update"]:
                # All authenticated users can perform basic actions
                return True
            
            if action in ["cell_update", "ai_request"]:
                # Check if user can edit content
                return await self._check_edit_permission(user_id, resource)
            
            if action in ["subscribe_notifications", "file_upload"]:
                # Check if user can access notifications or upload files
                return await self._check_access_permission(user_id, resource)
            
            # Default deny for unknown actions
            logger.warning(
                "Unknown permission action",
                action=action,
                user_id=user_id,
                resource=resource
            )
            return False
            
        except Exception as e:
            logger.error(
                "Permission check failed",
                error=str(e),
                user_id=connection_state.user_id,
                action=action
            )
            return False
    
    async def check_rate_limit(self, connection_state: ConnectionState) -> bool:
        """
        Check if a connection is within rate limits.
        
        Args:
            connection_state: The connection state
            
        Returns:
            bool: True if within limits, False if rate limited
            
        Raises:
            WebSocketRateLimitError: If rate limit is exceeded
        """
        user_id = connection_state.user_id
        now = datetime.now()
        
        # Check if connection is blocked
        if user_id in self.blocked_connections:
            raise WebSocketRateLimitError("Connection is blocked due to rate limit violations")
        
        # Get or create rate limit info
        if user_id not in self.rate_limits:
            self.rate_limits[user_id] = RateLimitInfo(last_request=now)
        
        rate_limit = self.rate_limits[user_id]
        
        # Check if still blocked
        if rate_limit.blocked_until and now < rate_limit.blocked_until:
            time_left = (rate_limit.blocked_until - now).total_seconds()
            raise WebSocketRateLimitError(f"Rate limited. Try again in {time_left:.0f} seconds")
        
        # Reset blocked status if time has passed
        if rate_limit.blocked_until and now >= rate_limit.blocked_until:
            rate_limit.blocked_until = None
            rate_limit.current_minute_count = 0
            rate_limit.current_hour_count = 0
        
        # Update counters
        time_since_last = (now - rate_limit.last_request).total_seconds()
        
        # Reset minute counter if a minute has passed
        if time_since_last >= 60:
            rate_limit.current_minute_count = 1
        else:
            rate_limit.current_minute_count += 1
        
        # Reset hour counter if an hour has passed
        if time_since_last >= 3600:
            rate_limit.current_hour_count = 1
        else:
            rate_limit.current_hour_count += 1
        
        rate_limit.last_request = now
        
        # Check limits
        if rate_limit.current_minute_count > self.requests_per_minute:
            # Block for a few minutes
            rate_limit.blocked_until = now + timedelta(minutes=self.block_duration_minutes)
            self.blocked_connections.add(user_id)
            
            logger.warning(
                "User exceeded minute rate limit",
                user_id=user_id,
                requests=rate_limit.current_minute_count,
                limit=self.requests_per_minute
            )
            
            raise WebSocketRateLimitError("Rate limit exceeded: too many requests per minute")
        
        if rate_limit.current_hour_count > self.requests_per_hour:
            # Block for an hour
            rate_limit.blocked_until = now + timedelta(hours=1)
            self.blocked_connections.add(user_id)
            
            logger.warning(
                "User exceeded hour rate limit",
                user_id=user_id,
                requests=rate_limit.current_hour_count,
                limit=self.requests_per_hour
            )
            
            raise WebSocketRateLimitError("Rate limit exceeded: too many requests per hour")
        
        return True
    
    async def refresh_session(self, connection_state: ConnectionState) -> bool:
        """
        Refresh the session for a connection.
        
        Args:
            connection_state: The connection state
            
        Returns:
            bool: True if session was refreshed successfully
        """
        try:
            token = connection_state.metadata.get("token")
            if not token:
                return False
            
            # Verify token is still valid
            payload = await self._verify_jwt_token(token)
            if not payload:
                return False
            
            # Update last ping
            connection_state.last_ping = datetime.now()
            
            # Store session info in Redis if available
            if self.redis_client:
                session_key = f"ws_session:{connection_state.user_id}"
                session_data = {
                    "connection_id": connection_state.connection_id,
                    "last_ping": connection_state.last_ping.isoformat(),
                    "rooms": connection_state.rooms
                }
                await self.redis_client.setex(
                    session_key, 
                    3600,  # 1 hour TTL
                    json.dumps(session_data)
                )
            
            return True
            
        except Exception as e:
            logger.error(
                "Session refresh failed",
                error=str(e),
                user_id=connection_state.user_id
            )
            return False
    
    async def invalidate_session(self, connection_state: ConnectionState) -> None:
        """
        Invalidate a session.
        
        Args:
            connection_state: The connection state
        """
        try:
            user_id = connection_state.user_id
            
            # Remove from Redis if available
            if self.redis_client:
                session_key = f"ws_session:{user_id}"
                await self.redis_client.delete(session_key)
            
            # Clean up rate limits
            if user_id in self.rate_limits:
                del self.rate_limits[user_id]
            
            # Remove from blocked connections
            self.blocked_connections.discard(user_id)
            
            logger.info("WebSocket session invalidated", user_id=user_id)
            
        except Exception as e:
            logger.error(
                "Session invalidation failed",
                error=str(e),
                user_id=connection_state.user_id
            )
    
    # Private methods
    
    async def _extract_token(self, websocket: WebSocket) -> Optional[str]:
        """Extract authentication token from WebSocket connection."""
        # Try to get token from query parameters
        token = websocket.query_params.get("token")
        if token:
            return token
        
        # Try to get token from headers
        auth_header = websocket.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            return auth_header[7:]  # Remove "Bearer " prefix
        
        return None
    
    async def _verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode JWT token."""
        try:
            payload = jwt.decode(
                token,
                self.settings.jwt_secret_key,
                algorithms=["HS256"]
            )
            
            # Check expiration
            exp = payload.get("exp")
            if exp and datetime.fromtimestamp(exp) < datetime.now():
                return None
            
            return payload
            
        except JWTError as e:
            logger.error("JWT verification failed", error=str(e))
            return None
    
    async def _validate_session(self, user_id: str, token: str) -> bool:
        """Validate user session."""
        try:
            # Check Redis for session if available
            if self.redis_client:
                session_key = f"user_session:{user_id}"
                stored_token = await self.redis_client.get(session_key)
                
                if stored_token and stored_token == token:
                    return True
                
                # If no stored token or mismatch, allow connection
                # (might be a new session)
                return True
            
            # If no Redis, allow connection
            return True
            
        except Exception as e:
            logger.error("Session validation failed", error=str(e))
            return False
    
    async def _check_edit_permission(self, user_id: str, resource: Optional[str]) -> bool:
        """Check if user has edit permission for a resource."""
        try:
            # TODO: Implement proper RBAC check
            # For now, allow all authenticated users to edit
            return True
            
        except Exception as e:
            logger.error("Edit permission check failed", error=str(e))
            return False
    
    async def _check_access_permission(self, user_id: str, resource: Optional[str]) -> bool:
        """Check if user has access permission for a resource."""
        try:
            # TODO: Implement proper RBAC check
            # For now, allow all authenticated users to access
            return True
            
        except Exception as e:
            logger.error("Access permission check failed", error=str(e))
            return False
    
    async def _cleanup_rate_limits(self) -> None:
        """Cleanup old rate limit entries periodically."""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                
                now = datetime.now()
                expired_users = []
                
                for user_id, rate_limit in self.rate_limits.items():
                    # Remove entries older than 1 hour
                    if (now - rate_limit.last_request).total_seconds() > 3600:
                        expired_users.append(user_id)
                
                for user_id in expired_users:
                    del self.rate_limits[user_id]
                    self.blocked_connections.discard(user_id)
                
                if expired_users:
                    logger.debug("Cleaned up rate limit entries", count=len(expired_users))
                
            except Exception as e:
                logger.error("Rate limit cleanup failed", error=str(e))
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get authentication and rate limiting statistics."""
        now = datetime.now()
        blocked_count = len(self.blocked_connections)
        active_limits = len(self.rate_limits)
        
        # Count currently blocked users
        currently_blocked = 0
        for rate_limit in self.rate_limits.values():
            if rate_limit.blocked_until and rate_limit.blocked_until > now:
                currently_blocked += 1
        
        return {
            "active_rate_limits": active_limits,
            "blocked_connections": blocked_count,
            "currently_blocked": currently_blocked,
            "requests_per_minute_limit": self.requests_per_minute,
            "requests_per_hour_limit": self.requests_per_hour
        }