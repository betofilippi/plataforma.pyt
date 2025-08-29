"""
WebSocket module for real-time communication.

This module provides WebSocket infrastructure including connection management,
authentication, message handling, and real-time features.
"""

from .auth import WebSocketAuthenticator
from .manager import WebSocketManager
from .handlers import WebSocketHandlers

__all__ = [
    "WebSocketAuthenticator",
    "WebSocketManager", 
    "WebSocketHandlers",
]