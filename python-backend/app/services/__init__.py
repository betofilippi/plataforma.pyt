"""
Business logic services for Plataforma NXT Backend

Contains all business logic, service classes, and application workflows including:
- Authentication and authorization
- Database operations and query helpers
- File storage and processing
- WebSocket real-time communication
- Caching (memory and Redis)
- Notifications (email, push, in-app)
- User management
- Data processing
- External API integrations
"""

from .auth import auth_service
from .database_service import database_service
from .storage_service import storage_service
from .websocket_service import websocket_service, websocket_manager
from .cache_service import cache_service
from .notification_service import notification_service

__all__ = [
    "auth_service",
    "database_service", 
    "storage_service",
    "websocket_service",
    "websocket_manager",
    "cache_service",
    "notification_service"
]