"""
WebSocket connection manager with room support.

This module manages WebSocket connections, rooms, user presence tracking,
message broadcasting, connection health monitoring, and memory management.
"""

import asyncio
import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set

import redis.asyncio as redis
import structlog
from fastapi import WebSocket, WebSocketDisconnect

from app.schemas.websocket import (
    ConnectionState,
    MessageType,
    NotificationSubscription,
    RoomData,
    UserPresence,
    UserStatus,
    create_error_message,
    create_user_presence,
)
from app.websocket.auth import WebSocketAuthenticator

logger = structlog.get_logger(__name__)


class WebSocketManager:
    """
    WebSocket connection manager with comprehensive room support.
    
    Manages connections, rooms, user presence, message broadcasting,
    health monitoring, and memory cleanup.
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        """Initialize WebSocket manager."""
        self.redis_client = redis_client
        self.authenticator = WebSocketAuthenticator(redis_client)
        
        # Connection management
        self.connections: Dict[str, WebSocket] = {}
        self.connection_states: Dict[str, ConnectionState] = {}
        self.user_connections: Dict[str, Set[str]] = {}  # user_id -> connection_ids
        
        # Room management
        self.rooms: Dict[str, RoomData] = {}
        self.connection_rooms: Dict[str, Set[str]] = {}  # connection_id -> room_ids
        
        # Notification subscriptions
        self.notification_subscriptions: Dict[str, NotificationSubscription] = {}
        
        # Health monitoring
        self.start_time = datetime.now()
        self.message_count = 0
        self.error_count = 0
        
        # Background tasks
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        self._health_check_task = asyncio.create_task(self._health_check_loop())
    
    async def connect(self, websocket: WebSocket) -> Optional[ConnectionState]:
        """
        Accept and authenticate a new WebSocket connection.
        
        Args:
            websocket: The WebSocket connection to accept
            
        Returns:
            ConnectionState: The connection state if successful, None if failed
        """
        try:
            # Accept the WebSocket connection
            await websocket.accept()
            
            # Authenticate the connection
            connection_state = await self.authenticator.authenticate_connection(websocket)
            
            # Store connection
            connection_id = connection_state.connection_id
            self.connections[connection_id] = websocket
            self.connection_states[connection_id] = connection_state
            
            # Track user connections
            user_id = connection_state.user_id
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(connection_id)
            
            # Initialize connection rooms tracking
            self.connection_rooms[connection_id] = set()
            
            logger.info(
                "WebSocket connection established",
                connection_id=connection_id,
                user_id=user_id,
                username=connection_state.username
            )
            
            # Send welcome message
            await self.send_message(connection_id, {
                "type": "connection_established",
                "connection_id": connection_id,
                "timestamp": datetime.now().isoformat()
            })
            
            return connection_state
            
        except Exception as e:
            logger.error("WebSocket connection failed", error=str(e))
            try:
                await websocket.close(code=1008, reason="Authentication failed")
            except:
                pass
            return None
    
    async def disconnect(self, connection_id: str) -> None:
        """
        Disconnect and clean up a WebSocket connection.
        
        Args:
            connection_id: The connection ID to disconnect
        """
        try:
            connection_state = self.connection_states.get(connection_id)
            if not connection_state:
                return
            
            user_id = connection_state.user_id
            
            # Leave all rooms
            rooms_to_leave = list(self.connection_rooms.get(connection_id, set()))
            for room_id in rooms_to_leave:
                await self.leave_room(connection_id, room_id, silent=True)
            
            # Clean up connection tracking
            if connection_id in self.connections:
                del self.connections[connection_id]
            
            if connection_id in self.connection_states:
                del self.connection_states[connection_id]
            
            if connection_id in self.connection_rooms:
                del self.connection_rooms[connection_id]
            
            # Clean up user connections
            if user_id in self.user_connections:
                self.user_connections[user_id].discard(connection_id)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]
            
            # Clean up notification subscription
            if connection_id in self.notification_subscriptions:
                del self.notification_subscriptions[connection_id]
            
            # Invalidate session
            await self.authenticator.invalidate_session(connection_state)
            
            logger.info(
                "WebSocket connection closed",
                connection_id=connection_id,
                user_id=user_id
            )
            
        except Exception as e:
            logger.error(
                "Error during WebSocket disconnect",
                error=str(e),
                connection_id=connection_id
            )
    
    async def send_message(self, connection_id: str, message: Dict[str, Any]) -> bool:
        """
        Send a message to a specific connection.
        
        Args:
            connection_id: The connection ID
            message: The message to send
            
        Returns:
            bool: True if message was sent successfully
        """
        try:
            websocket = self.connections.get(connection_id)
            if not websocket:
                logger.warning("Connection not found", connection_id=connection_id)
                return False
            
            # Check rate limits
            connection_state = self.connection_states.get(connection_id)
            if connection_state:
                try:
                    await self.authenticator.check_rate_limit(connection_state)
                except Exception as e:
                    logger.warning("Rate limit check failed", error=str(e))
                    # Send rate limit error
                    error_msg = create_error_message(
                        "Rate limit exceeded", 
                        "RATE_LIMIT_EXCEEDED"
                    )
                    await websocket.send_text(json.dumps(error_msg.dict()))
                    return False
            
            # Add timestamp if not present
            if "timestamp" not in message:
                message["timestamp"] = datetime.now().isoformat()
            
            # Send message
            await websocket.send_text(json.dumps(message))
            self.message_count += 1
            return True
            
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected during send", connection_id=connection_id)
            await self.disconnect(connection_id)
            return False
        except Exception as e:
            logger.error(
                "Failed to send WebSocket message",
                error=str(e),
                connection_id=connection_id
            )
            self.error_count += 1
            return False
    
    async def broadcast_to_room(self, room_id: str, message: Dict[str, Any], 
                              exclude: Optional[Set[str]] = None) -> int:
        """
        Broadcast a message to all connections in a room.
        
        Args:
            room_id: The room ID
            message: The message to broadcast
            exclude: Set of connection IDs to exclude from broadcast
            
        Returns:
            int: Number of connections the message was sent to
        """
        try:
            room = self.rooms.get(room_id)
            if not room:
                logger.warning("Room not found for broadcast", room_id=room_id)
                return 0
            
            exclude = exclude or set()
            sent_count = 0
            
            # Get all connection IDs for users in the room
            connection_ids = set()
            for user_id in room.users.keys():
                user_connections = self.user_connections.get(user_id, set())
                connection_ids.update(user_connections)
            
            # Filter out excluded connections
            connection_ids -= exclude
            
            # Send to all connections
            tasks = []
            for connection_id in connection_ids:
                if connection_id in self.connections:
                    tasks.append(self.send_message(connection_id, message))
            
            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                sent_count = sum(1 for result in results if result is True)
            
            logger.debug(
                "Broadcast to room completed",
                room_id=room_id,
                sent_count=sent_count,
                total_connections=len(connection_ids)
            )
            
            return sent_count
            
        except Exception as e:
            logger.error(
                "Room broadcast failed",
                error=str(e),
                room_id=room_id
            )
            return 0
    
    async def broadcast_to_user(self, user_id: str, message: Dict[str, Any]) -> int:
        """
        Broadcast a message to all connections of a specific user.
        
        Args:
            user_id: The user ID
            message: The message to broadcast
            
        Returns:
            int: Number of connections the message was sent to
        """
        try:
            connection_ids = self.user_connections.get(user_id, set())
            if not connection_ids:
                logger.debug("No connections found for user", user_id=user_id)
                return 0
            
            # Send to all user's connections
            tasks = [
                self.send_message(connection_id, message)
                for connection_id in connection_ids
                if connection_id in self.connections
            ]
            
            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                sent_count = sum(1 for result in results if result is True)
            else:
                sent_count = 0
            
            logger.debug(
                "Broadcast to user completed",
                user_id=user_id,
                sent_count=sent_count
            )
            
            return sent_count
            
        except Exception as e:
            logger.error(
                "User broadcast failed",
                error=str(e),
                user_id=user_id
            )
            return 0
    
    async def join_room(self, connection_id: str, room_id: str) -> bool:
        """
        Add a connection to a room.
        
        Args:
            connection_id: The connection ID
            room_id: The room ID to join
            
        Returns:
            bool: True if successfully joined
        """
        try:
            connection_state = self.connection_states.get(connection_id)
            if not connection_state:
                logger.warning("Connection state not found", connection_id=connection_id)
                return False
            
            # Create room if it doesn't exist
            if room_id not in self.rooms:
                self.rooms[room_id] = RoomData(
                    room_id=room_id,
                    last_activity=datetime.now()
                )
                logger.info("Created new room", room_id=room_id)
            
            room = self.rooms[room_id]
            
            # Create user presence
            user_presence = create_user_presence(
                user_id=connection_state.user_id,
                username=connection_state.username,
                email=connection_state.email,
                room=room_id
            )
            
            # Add user to room
            room.users[connection_state.user_id] = user_presence
            room.last_activity = datetime.now()
            
            # Track connection's rooms
            self.connection_rooms[connection_id].add(room_id)
            connection_state.rooms.append(room_id)
            
            # Notify other users in the room
            await self.broadcast_to_room(room_id, {
                "type": MessageType.USER_JOINED.value,
                "user": user_presence.dict(),
                "total_users": len(room.users)
            }, exclude={connection_id})
            
            # Send room state to the joining connection
            await self.send_message(connection_id, {
                "type": MessageType.ROOM_STATE.value,
                "room_id": room_id,
                "users": [user.dict() for user in room.users.values()],
                "active_sheets": list(room.active_sheets),
                "total_users": len(room.users)
            })
            
            logger.info(
                "User joined room",
                user_id=connection_state.user_id,
                username=connection_state.username,
                room_id=room_id,
                total_users=len(room.users)
            )
            
            return True
            
        except Exception as e:
            logger.error(
                "Failed to join room",
                error=str(e),
                connection_id=connection_id,
                room_id=room_id
            )
            return False
    
    async def leave_room(self, connection_id: str, room_id: str, silent: bool = False) -> bool:
        """
        Remove a connection from a room.
        
        Args:
            connection_id: The connection ID
            room_id: The room ID to leave
            silent: If True, don't send notifications
            
        Returns:
            bool: True if successfully left
        """
        try:
            connection_state = self.connection_states.get(connection_id)
            if not connection_state:
                return False
            
            room = self.rooms.get(room_id)
            if not room:
                return False
            
            user_id = connection_state.user_id
            
            # Remove user from room
            if user_id in room.users:
                del room.users[user_id]
                room.last_activity = datetime.now()
            
            # Update connection tracking
            self.connection_rooms[connection_id].discard(room_id)
            if room_id in connection_state.rooms:
                connection_state.rooms.remove(room_id)
            
            # Clean up empty room
            if not room.users:
                del self.rooms[room_id]
                logger.info("Removed empty room", room_id=room_id)
            elif not silent:
                # Notify remaining users
                await self.broadcast_to_room(room_id, {
                    "type": MessageType.USER_LEFT.value,
                    "user_id": user_id,
                    "total_users": len(room.users)
                })
            
            if not silent:
                logger.info(
                    "User left room",
                    user_id=user_id,
                    username=connection_state.username,
                    room_id=room_id,
                    remaining_users=len(room.users) if room_id in self.rooms else 0
                )
            
            return True
            
        except Exception as e:
            logger.error(
                "Failed to leave room",
                error=str(e),
                connection_id=connection_id,
                room_id=room_id
            )
            return False
    
    async def update_user_status(self, connection_id: str, status: UserStatus) -> bool:
        """
        Update user status in all their rooms.
        
        Args:
            connection_id: The connection ID
            status: The new user status
            
        Returns:
            bool: True if status was updated
        """
        try:
            connection_state = self.connection_states.get(connection_id)
            if not connection_state:
                return False
            
            user_id = connection_state.user_id
            
            # Update status in all rooms the user is in
            for room_id in connection_state.rooms:
                room = self.rooms.get(room_id)
                if room and user_id in room.users:
                    user_presence = room.users[user_id]
                    user_presence.status = status
                    user_presence.last_seen = datetime.now()
                    
                    # Notify other users in the room
                    await self.broadcast_to_room(room_id, {
                        "type": MessageType.USER_STATUS_CHANGED.value,
                        "user_id": user_id,
                        "status": status.value
                    }, exclude={connection_id})
            
            logger.info(
                "User status updated",
                user_id=user_id,
                status=status.value,
                rooms=len(connection_state.rooms)
            )
            
            return True
            
        except Exception as e:
            logger.error(
                "Failed to update user status",
                error=str(e),
                connection_id=connection_id,
                status=status
            )
            return False
    
    async def update_user_cursor(self, connection_id: str, room_id: str, 
                                x: int, y: int, cell: Optional[str] = None) -> bool:
        """
        Update user cursor position in a room.
        
        Args:
            connection_id: The connection ID
            room_id: The room ID
            x: X coordinate
            y: Y coordinate
            cell: Optional cell identifier
            
        Returns:
            bool: True if cursor was updated
        """
        try:
            connection_state = self.connection_states.get(connection_id)
            room = self.rooms.get(room_id)
            
            if not connection_state or not room:
                return False
            
            user_id = connection_state.user_id
            
            if user_id not in room.users:
                return False
            
            # Update cursor position
            user_presence = room.users[user_id]
            user_presence.cursor = {"x": x, "y": y, "cell": cell}
            user_presence.last_seen = datetime.now()
            
            # Broadcast cursor position to other users
            await self.broadcast_to_room(room_id, {
                "type": MessageType.CURSOR_MOVED.value,
                "user_id": user_id,
                "username": connection_state.username,
                "cursor": {"x": x, "y": y, "cell": cell}
            }, exclude={connection_id})
            
            return True
            
        except Exception as e:
            logger.error(
                "Failed to update cursor position",
                error=str(e),
                connection_id=connection_id,
                room_id=room_id
            )
            return False
    
    async def subscribe_notifications(self, connection_id: str, 
                                    subscription: NotificationSubscription) -> bool:
        """
        Subscribe a connection to notifications.
        
        Args:
            connection_id: The connection ID
            subscription: The notification subscription
            
        Returns:
            bool: True if subscription was successful
        """
        try:
            connection_state = self.connection_states.get(connection_id)
            if not connection_state:
                return False
            
            # Store subscription
            subscription.user_id = connection_state.user_id
            self.notification_subscriptions[connection_id] = subscription
            
            # Send confirmation
            await self.send_message(connection_id, {
                "type": "notification_subscription_confirmed",
                "status": "subscribed",
                "subscription": subscription.dict()
            })
            
            logger.info(
                "Notification subscription created",
                user_id=connection_state.user_id,
                connection_id=connection_id,
                subscription=subscription.dict()
            )
            
            return True
            
        except Exception as e:
            logger.error(
                "Failed to subscribe to notifications",
                error=str(e),
                connection_id=connection_id
            )
            return False
    
    def get_room_users(self, room_id: str) -> List[UserPresence]:
        """Get all users in a room."""
        room = self.rooms.get(room_id)
        return list(room.users.values()) if room else []
    
    def get_user_rooms(self, user_id: str) -> List[str]:
        """Get all rooms a user is in."""
        rooms = []
        for connection_id in self.user_connections.get(user_id, set()):
            connection_state = self.connection_states.get(connection_id)
            if connection_state:
                rooms.extend(connection_state.rooms)
        return list(set(rooms))  # Remove duplicates
    
    def get_connection_count(self) -> int:
        """Get total number of active connections."""
        return len(self.connections)
    
    def get_user_count(self) -> int:
        """Get total number of connected users."""
        return len(self.user_connections)
    
    def get_room_count(self) -> int:
        """Get total number of active rooms."""
        return len(self.rooms)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive manager statistics."""
        uptime = (datetime.now() - self.start_time).total_seconds()
        
        return {
            "uptime_seconds": uptime,
            "total_connections": len(self.connections),
            "total_users": len(self.user_connections),
            "total_rooms": len(self.rooms),
            "notification_subscriptions": len(self.notification_subscriptions),
            "messages_sent": self.message_count,
            "errors": self.error_count,
            "messages_per_second": self.message_count / max(uptime, 1),
            "auth_stats": self.authenticator.get_connection_stats(),
            "room_details": [
                {
                    "room_id": room.room_id,
                    "user_count": len(room.users),
                    "active_sheets": len(room.active_sheets),
                    "last_activity": room.last_activity.isoformat()
                }
                for room in self.rooms.values()
            ]
        }
    
    # Background maintenance tasks
    
    async def _cleanup_loop(self) -> None:
        """Periodic cleanup of stale connections and rooms."""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                await self._cleanup_stale_connections()
                await self._cleanup_empty_rooms()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Cleanup loop error", error=str(e))
    
    async def _health_check_loop(self) -> None:
        """Periodic health check of connections."""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                await self._ping_connections()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Health check loop error", error=str(e))
    
    async def _cleanup_stale_connections(self) -> None:
        """Clean up stale connections."""
        now = datetime.now()
        stale_threshold = timedelta(minutes=30)
        
        stale_connections = []
        
        for connection_id, connection_state in self.connection_states.items():
            if now - connection_state.last_ping > stale_threshold:
                stale_connections.append(connection_id)
        
        for connection_id in stale_connections:
            logger.info("Cleaning up stale connection", connection_id=connection_id)
            await self.disconnect(connection_id)
    
    async def _cleanup_empty_rooms(self) -> None:
        """Clean up empty rooms."""
        empty_rooms = [
            room_id for room_id, room in self.rooms.items()
            if not room.users
        ]
        
        for room_id in empty_rooms:
            del self.rooms[room_id]
            logger.info("Cleaned up empty room", room_id=room_id)
    
    async def _ping_connections(self) -> None:
        """Send ping to all connections and update last_ping."""
        ping_tasks = []
        
        for connection_id, connection_state in self.connection_states.items():
            ping_tasks.append(self._ping_connection(connection_id, connection_state))
        
        if ping_tasks:
            await asyncio.gather(*ping_tasks, return_exceptions=True)
    
    async def _ping_connection(self, connection_id: str, connection_state: ConnectionState) -> None:
        """Ping a specific connection."""
        try:
            success = await self.send_message(connection_id, {"type": "ping"})
            if success:
                connection_state.last_ping = datetime.now()
            else:
                # Connection is stale, schedule for cleanup
                logger.warning("Ping failed for connection", connection_id=connection_id)
                
        except Exception as e:
            logger.error(
                "Ping failed for connection",
                error=str(e),
                connection_id=connection_id
            )
    
    async def shutdown(self) -> None:
        """Shutdown the WebSocket manager."""
        try:
            logger.info("Shutting down WebSocket manager")
            
            # Cancel background tasks
            self._cleanup_task.cancel()
            self._health_check_task.cancel()
            
            # Close all connections
            close_tasks = []
            for connection_id in list(self.connections.keys()):
                close_tasks.append(self.disconnect(connection_id))
            
            if close_tasks:
                await asyncio.gather(*close_tasks, return_exceptions=True)
            
            logger.info("WebSocket manager shutdown complete")
            
        except Exception as e:
            logger.error("Error during WebSocket manager shutdown", error=str(e))