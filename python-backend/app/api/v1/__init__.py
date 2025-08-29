"""
API v1 routes for Plataforma NXT Backend

Version 1 of the API endpoints.
"""

from fastapi import APIRouter
from .auth import router as auth_router
from .websocket import router as websocket_router

# Create main v1 router
router = APIRouter(prefix="/v1")

# Include auth routes
router.include_router(auth_router)

# Include WebSocket routes
router.include_router(websocket_router, tags=["WebSocket"])

__all__ = ["router"]