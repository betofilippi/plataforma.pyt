"""
WebSocket service for real-time communication.

This service provides comprehensive WebSocket functionality including:
- Connection management and authentication
- Room/channel-based messaging
- Broadcast messaging
- Heartbeat/ping-pong for connection health
- Message persistence and history
- Rate limiting and security
- Event-driven architecture
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Callable, Union
from uuid import UUID, uuid4
from enum import Enum

import structlog
from fastapi import WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field, validator

from app.core.config import get_settings
from app.core.security import jwt_manager
from app.services.database_service import database_service

logger = structlog.get_logger(__name__)


class MessageType(str, Enum):
    """WebSocket message types."""
    # System messages
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    PING = "ping"
    PONG = "pong"
    ERROR = "error"
    AUTH = "auth"
    
    # Room management
    JOIN_ROOM = "join_room"
    LEAVE_ROOM = "leave_room"
    ROOM_MESSAGE = "room_message"
    
    # Broadcast messages
    BROADCAST = "broadcast"
    USER_MESSAGE = "user_message"
    
    # Notification messages
    NOTIFICATION = "notification"
    ALERT = "alert"
    
    # Data updates
    DATA_UPDATE = "data_update"
    SYNC = "sync"


class WebSocketMessage(BaseModel):
    """WebSocket message schema."""
    type: MessageType
    data: Optional[Dict[str, Any]] = None
    room: Optional[str] = None
    target_user: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    message_id: str = Field(default_factory=lambda: str(uuid4()))
    
    @validator('data', pre=True)
    def parse_data(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return {"content": v}
        return v


class ConnectionInfo(BaseModel):
    """WebSocket connection information."""
    connection_id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    connected_at: datetime = Field(default_factory=datetime.utcnow)
    last_ping: datetime = Field(default_factory=datetime.utcnow)
    rooms: Set[str] = Field(default_factory=set)
    is_authenticated: bool = False


class RoomInfo(BaseModel):
    """Room information."""
    room_id: str
    name: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_public: bool = True
    max_members: Optional[int] = None
    members: Set[str] = Field(default_factory=set)
    
    @property
    def member_count(self) -> int:
        return len(self.members)


class WebSocketManager:
    """Manages WebSocket connections, rooms, and messaging."""
    
    def __init__(self):
        self.settings = get_settings()
        
        # Connection management
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_info: Dict[str, ConnectionInfo] = {}
        
        # Room management
        self.rooms: Dict[str, RoomInfo] = {}
        self.user_rooms: Dict[str, Set[str]] = {}  # user_id -> room_ids
        
        # Message handling
        self.message_handlers: Dict[MessageType, Callable] = {}
        self.message_history: List[WebSocketMessage] = []
        self.max_history_size = 1000
        
        # Rate limiting
        self.rate_limits: Dict[str, List[float]] = {}  # connection_id -> timestamps
        self.max_messages_per_minute = 60
        
        # Heartbeat settings
        self.heartbeat_interval = 30  # seconds
        self.heartbeat_task: Optional[asyncio.Task] = None
        
        # Statistics
        self.stats = {
            "total_connections": 0,
            "messages_sent": 0,
            "messages_received": 0,
            "rooms_created": 0,
        }
        
        self._setup_message_handlers()
    
    def _setup_message_handlers(self):
        """Setup default message handlers."""
        self.message_handlers[MessageType.PING] = self._handle_ping
        self.message_handlers[MessageType.AUTH] = self._handle_auth
        self.message_handlers[MessageType.JOIN_ROOM] = self._handle_join_room
        self.message_handlers[MessageType.LEAVE_ROOM] = self._handle_leave_room
        self.message_handlers[MessageType.ROOM_MESSAGE] = self._handle_room_message
        self.message_handlers[MessageType.USER_MESSAGE] = self._handle_user_message
        self.message_handlers[MessageType.BROADCAST] = self._handle_broadcast
    
    async def connect(
        self, 
        websocket: WebSocket, 
        connection_id: Optional[str] = None,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """Accept a new WebSocket connection."""
        await websocket.accept()
        
        if not connection_id:
            connection_id = str(uuid4())
        
        # Store connection
        self.active_connections[connection_id] = websocket
        self.connection_info[connection_id] = ConnectionInfo(
            connection_id=connection_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            is_authenticated=bool(user_id)
        )
        
        self.stats["total_connections"] += 1
        
        # Send connection confirmation
        await self.send_message(connection_id, WebSocketMessage(
            type=MessageType.CONNECT,
            data={
                "connection_id": connection_id,
                "server_time": datetime.utcnow().isoformat(),
                "heartbeat_interval": self.heartbeat_interval
            }
        ))
        
        logger.info(
            "WebSocket connection established",
            connection_id=connection_id,
            user_id=user_id,
            ip_address=ip_address
        )
        
        # Start heartbeat if this is the first connection
        if len(self.active_connections) == 1 and not self.heartbeat_task:
            self.heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        
        return connection_id
    
    async def disconnect(self, connection_id: str, code: int = 1000) -> None:
        """Disconnect a WebSocket connection."""
        if connection_id not in self.active_connections:
            return
        
        # Get connection info
        conn_info = self.connection_info.get(connection_id)
        
        # Remove from all rooms
        if conn_info:
            for room_id in conn_info.rooms.copy():
                await self.leave_room(connection_id, room_id)
        
        # Clean up connection
        websocket = self.active_connections.pop(connection_id, None)
        self.connection_info.pop(connection_id, None)
        self.rate_limits.pop(connection_id, None)
        
        if websocket:
            try:
                await websocket.close(code=code)
            except Exception as e:
                logger.warning("Error closing WebSocket", error=str(e))
        
        logger.info("WebSocket connection closed", connection_id=connection_id)
        
        # Stop heartbeat if no active connections
        if not self.active_connections and self.heartbeat_task:
            self.heartbeat_task.cancel()
            self.heartbeat_task = None
    
    async def send_message(self, connection_id: str, message: WebSocketMessage) -> bool:
        """Send a message to a specific connection."""
        if connection_id not in self.active_connections:
            return False
        
        try:
            websocket = self.active_connections[connection_id]
            await websocket.send_text(message.model_dump_json())
            self.stats["messages_sent"] += 1
            
            # Add to history if it's not a system message
            if message.type not in [MessageType.PING, MessageType.PONG]:
                self._add_to_history(message)
            
            return True
        except Exception as e:
            logger.error(
                "Failed to send WebSocket message",
                connection_id=connection_id,
                error=str(e)
            )
            # Connection might be broken, disconnect it
            await self.disconnect(connection_id, code=1006)
            return False
    
    async def broadcast_message(
        self, 
        message: WebSocketMessage,
        exclude_connection: Optional[str] = None
    ) -> int:
        """Broadcast a message to all connected clients."""
        sent_count = 0
        
        for connection_id in list(self.active_connections.keys()):
            if connection_id != exclude_connection:
                if await self.send_message(connection_id, message):
                    sent_count += 1
        
        return sent_count
    
    async def send_to_room(
        self, 
        room_id: str, 
        message: WebSocketMessage,
        exclude_connection: Optional[str] = None
    ) -> int:
        """Send a message to all members of a room."""
        if room_id not in self.rooms:
            return 0
        
        sent_count = 0
        room = self.rooms[room_id]
        
        for connection_id in list(self.active_connections.keys()):
            if connection_id == exclude_connection:
                continue
            
            conn_info = self.connection_info.get(connection_id)
            if conn_info and room_id in conn_info.rooms:
                if await self.send_message(connection_id, message):
                    sent_count += 1
        
        return sent_count
    
    async def send_to_user(
        self, 
        user_id: str, 
        message: WebSocketMessage
    ) -> int:
        """Send a message to all connections of a specific user."""
        sent_count = 0
        
        for connection_id, conn_info in self.connection_info.items():
            if conn_info.user_id == user_id:
                if await self.send_message(connection_id, message):
                    sent_count += 1
        
        return sent_count
    
    async def receive_message(
        self, 
        connection_id: str, 
        websocket: WebSocket
    ) -> None:
        """Handle incoming messages from a WebSocket connection."""
        try:
            while True:
                # Receive message
                raw_message = await websocket.receive_text()
                self.stats["messages_received"] += 1
                
                # Check rate limiting
                if not self._check_rate_limit(connection_id):
                    await self.send_message(connection_id, WebSocketMessage(
                        type=MessageType.ERROR,
                        data={"error": "Rate limit exceeded"}
                    ))
                    continue
                
                # Parse message
                try:
                    message_data = json.loads(raw_message)
                    message = WebSocketMessage(**message_data)
                except Exception as e:
                    await self.send_message(connection_id, WebSocketMessage(
                        type=MessageType.ERROR,
                        data={"error": f"Invalid message format: {str(e)}"}
                    ))
                    continue
                
                # Handle message
                await self._handle_message(connection_id, message)
                
        except WebSocketDisconnect:
            await self.disconnect(connection_id, code=1000)
        except Exception as e:
            logger.error(
                "Error handling WebSocket messages",
                connection_id=connection_id,
                error=str(e)
            )
            await self.disconnect(connection_id, code=1011)
    
    async def _handle_message(self, connection_id: str, message: WebSocketMessage):
        """Handle a received message."""
        handler = self.message_handlers.get(message.type)
        
        if handler:
            try:
                await handler(connection_id, message)
            except Exception as e:
                logger.error(
                    "Error in message handler",
                    connection_id=connection_id,
                    message_type=message.type,
                    error=str(e)
                )
                await self.send_message(connection_id, WebSocketMessage(
                    type=MessageType.ERROR,
                    data={"error": f"Handler error: {str(e)}"}
                ))
        else:
            logger.warning(
                "No handler for message type",
                connection_id=connection_id,
                message_type=message.type
            )
    
    # ================================
    # MESSAGE HANDLERS
    # ================================
    
    async def _handle_ping(self, connection_id: str, message: WebSocketMessage):
        """Handle ping message."""
        # Update last ping time
        if connection_id in self.connection_info:
            self.connection_info[connection_id].last_ping = datetime.utcnow()
        
        # Send pong response
        await self.send_message(connection_id, WebSocketMessage(
            type=MessageType.PONG,
            data={"timestamp": datetime.utcnow().isoformat()}
        ))
    
    async def _handle_auth(self, connection_id: str, message: WebSocketMessage):
        """Handle authentication message."""
        if not message.data or 'token' not in message.data:
            await self.send_message(connection_id, WebSocketMessage(
                type=MessageType.ERROR,
                data={"error": "Token required for authentication"}
            ))
            return
        
        try:
            # Verify JWT token
            token = message.data['token']
            token_data = jwt_manager.verify_token(token)
            
            # Update connection info
            conn_info = self.connection_info[connection_id]
            conn_info.user_id = str(token_data.user_id)
            conn_info.user_email = token_data.email
            conn_info.is_authenticated = True
            
            await self.send_message(connection_id, WebSocketMessage(
                type=MessageType.AUTH,
                data={
                    "success": True,
                    "user_id": conn_info.user_id,
                    "user_email": conn_info.user_email
                }
            ))
            
        except Exception as e:
            await self.send_message(connection_id, WebSocketMessage(
                type=MessageType.ERROR,
                data={"error": f"Authentication failed: {str(e)}"}
            ))
    
    async def _handle_join_room(self, connection_id: str, message: WebSocketMessage):
        """Handle join room message."""
        if not message.data or 'room_id' not in message.data:
            await self.send_message(connection_id, WebSocketMessage(
                type=MessageType.ERROR,
                data={"error": "Room ID required"}
            ))
            return
        
        room_id = message.data['room_id']
        success = await self.join_room(connection_id, room_id)
        
        if success:
            await self.send_message(connection_id, WebSocketMessage(
                type=MessageType.JOIN_ROOM,
                data={
                    "room_id": room_id,
                    "success": True,
                    "member_count": self.rooms[room_id].member_count
                }
            ))
        else:
            await self.send_message(connection_id, WebSocketMessage(
                type=MessageType.ERROR,
                data={"error": f"Failed to join room: {room_id}"}
            ))
    
    async def _handle_leave_room(self, connection_id: str, message: WebSocketMessage):
        """Handle leave room message."""
        if not message.data or 'room_id' not in message.data:
            return
        
        room_id = message.data['room_id']
        success = await self.leave_room(connection_id, room_id)
        
        if success:
            await self.send_message(connection_id, WebSocketMessage(
                type=MessageType.LEAVE_ROOM,
                data={"room_id": room_id, "success": True}
            ))
    
    async def _handle_room_message(self, connection_id: str, message: WebSocketMessage):
        """Handle room message."""
        if not message.room or not message.data:
            return
        
        # Check if connection is in the room
        conn_info = self.connection_info.get(connection_id)
        if not conn_info or message.room not in conn_info.rooms:
            await self.send_message(connection_id, WebSocketMessage(
                type=MessageType.ERROR,
                data={"error": "Not a member of this room"}
            ))
            return
        
        # Add sender information
        message.data['sender_connection_id'] = connection_id
        message.data['sender_user_id'] = conn_info.user_id
        
        # Broadcast to room
        sent_count = await self.send_to_room(
            message.room, 
            message, 
            exclude_connection=connection_id
        )
        
        logger.info(
            "Room message sent",
            room_id=message.room,
            sender=connection_id,
            recipients=sent_count
        )
    
    async def _handle_user_message(self, connection_id: str, message: WebSocketMessage):
        """Handle direct user message."""
        if not message.target_user or not message.data:
            return
        
        # Add sender information
        conn_info = self.connection_info.get(connection_id)
        if conn_info:
            message.data['sender_user_id'] = conn_info.user_id
            message.data['sender_connection_id'] = connection_id
        
        # Send to target user
        sent_count = await self.send_to_user(message.target_user, message)
        
        # Send confirmation to sender
        await self.send_message(connection_id, WebSocketMessage(
            type=MessageType.USER_MESSAGE,
            data={
                "target_user": message.target_user,
                "delivered": sent_count > 0,
                "connections_reached": sent_count
            }
        ))
    
    async def _handle_broadcast(self, connection_id: str, message: WebSocketMessage):
        """Handle broadcast message (admin only)."""
        # Check if user is admin (basic implementation)
        conn_info = self.connection_info.get(connection_id)
        if not conn_info or not conn_info.is_authenticated:
            await self.send_message(connection_id, WebSocketMessage(
                type=MessageType.ERROR,
                data={"error": "Authentication required for broadcast"}
            ))
            return
        
        # TODO: Check admin permissions properly
        # For now, allow any authenticated user
        
        # Add sender information
        message.data = message.data or {}
        message.data['sender_user_id'] = conn_info.user_id
        
        # Broadcast to all connections
        sent_count = await self.broadcast_message(
            message, 
            exclude_connection=connection_id
        )
        
        # Send confirmation to sender
        await self.send_message(connection_id, WebSocketMessage(
            type=MessageType.BROADCAST,
            data={
                "sent_to": sent_count,
                "success": True
            }
        ))
    
    # ================================
    # ROOM MANAGEMENT
    # ================================
    
    async def create_room(
        self, 
        room_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        is_public: bool = True,
        max_members: Optional[int] = None
    ) -> bool:
        """Create a new room."""
        if room_id in self.rooms:
            return False
        
        self.rooms[room_id] = RoomInfo(
            room_id=room_id,
            name=name,
            description=description,
            is_public=is_public,
            max_members=max_members
        )
        
        self.stats["rooms_created"] += 1
        
        logger.info("Room created", room_id=room_id, name=name)
        return True
    
    async def join_room(self, connection_id: str, room_id: str) -> bool:
        """Add a connection to a room."""
        # Create room if it doesn't exist
        if room_id not in self.rooms:
            await self.create_room(room_id)
        
        room = self.rooms[room_id]
        conn_info = self.connection_info.get(connection_id)
        
        if not conn_info:
            return False
        
        # Check room capacity
        if room.max_members and len(room.members) >= room.max_members:
            return False
        
        # Add to room
        room.members.add(connection_id)
        conn_info.rooms.add(room_id)
        
        # Notify other room members
        await self.send_to_room(room_id, WebSocketMessage(
            type=MessageType.JOIN_ROOM,
            data={
                "room_id": room_id,
                "connection_id": connection_id,
                "user_id": conn_info.user_id,
                "member_count": room.member_count
            }
        ), exclude_connection=connection_id)
        
        logger.info(
            "Connection joined room",
            connection_id=connection_id,
            room_id=room_id,
            member_count=room.member_count
        )
        
        return True
    
    async def leave_room(self, connection_id: str, room_id: str) -> bool:
        """Remove a connection from a room."""
        if room_id not in self.rooms:
            return False
        
        room = self.rooms[room_id]
        conn_info = self.connection_info.get(connection_id)
        
        if not conn_info:
            return False
        
        # Remove from room
        room.members.discard(connection_id)
        conn_info.rooms.discard(room_id)
        
        # Notify other room members
        await self.send_to_room(room_id, WebSocketMessage(
            type=MessageType.LEAVE_ROOM,
            data={
                "room_id": room_id,
                "connection_id": connection_id,
                "user_id": conn_info.user_id,
                "member_count": room.member_count
            }
        ))
        
        # Delete room if empty and not permanent
        if not room.members and not room.name:
            del self.rooms[room_id]
        
        logger.info(
            "Connection left room",
            connection_id=connection_id,
            room_id=room_id,
            member_count=room.member_count
        )
        
        return True
    
    # ================================
    # UTILITY METHODS
    # ================================
    
    def _check_rate_limit(self, connection_id: str) -> bool:
        """Check if connection is within rate limits."""
        now = time.time()
        
        # Initialize rate limit tracking
        if connection_id not in self.rate_limits:
            self.rate_limits[connection_id] = []
        
        # Clean old timestamps
        cutoff = now - 60  # 1 minute ago
        self.rate_limits[connection_id] = [
            timestamp for timestamp in self.rate_limits[connection_id]
            if timestamp > cutoff
        ]
        
        # Check limit
        if len(self.rate_limits[connection_id]) >= self.max_messages_per_minute:
            return False
        
        # Add current timestamp
        self.rate_limits[connection_id].append(now)
        return True
    
    def _add_to_history(self, message: WebSocketMessage):
        """Add message to history."""
        self.message_history.append(message)
        
        # Trim history if too long
        if len(self.message_history) > self.max_history_size:
            self.message_history = self.message_history[-self.max_history_size:]
    
    async def _heartbeat_loop(self):
        """Background task to send heartbeat pings."""
        while self.active_connections:
            try:
                # Send ping to all connections
                current_time = datetime.utcnow()
                
                for connection_id in list(self.active_connections.keys()):
                    conn_info = self.connection_info.get(connection_id)
                    
                    # Check if connection is stale
                    if conn_info:
                        time_since_ping = current_time - conn_info.last_ping
                        
                        if time_since_ping.total_seconds() > (self.heartbeat_interval * 3):
                            # Connection is stale, disconnect
                            logger.warning(
                                "Disconnecting stale connection",
                                connection_id=connection_id,
                                last_ping=conn_info.last_ping
                            )
                            await self.disconnect(connection_id, code=1001)
                        else:
                            # Send ping
                            await self.send_message(connection_id, WebSocketMessage(
                                type=MessageType.PING,
                                data={"timestamp": current_time.isoformat()}
                            ))
                
                # Wait for next heartbeat
                await asyncio.sleep(self.heartbeat_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in heartbeat loop", error=str(e))
                await asyncio.sleep(5)  # Wait a bit before retrying
    
    def get_stats(self) -> Dict[str, Any]:
        """Get WebSocket server statistics."""
        return {
            **self.stats,
            "active_connections": len(self.active_connections),
            "active_rooms": len(self.rooms),
            "authenticated_connections": sum(
                1 for conn in self.connection_info.values()
                if conn.is_authenticated
            ),
            "total_room_members": sum(
                len(room.members) for room in self.rooms.values()
            ),
            "message_history_size": len(self.message_history)
        }
    
    def get_room_info(self, room_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific room."""
        if room_id not in self.rooms:
            return None
        
        room = self.rooms[room_id]
        return {
            "room_id": room.room_id,
            "name": room.name,
            "description": room.description,
            "created_at": room.created_at.isoformat(),
            "is_public": room.is_public,
            "max_members": room.max_members,
            "member_count": room.member_count,
            "members": list(room.members)
        }


# Global WebSocket manager instance
websocket_manager = WebSocketManager()


class WebSocketService:
    """High-level WebSocket service interface."""
    
    def __init__(self):
        self.manager = websocket_manager
    
    async def connect_client(
        self, 
        websocket: WebSocket,
        token: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """Connect a new WebSocket client."""
        user_id = None
        
        # Authenticate if token provided
        if token:
            try:
                token_data = jwt_manager.verify_token(token)
                user_id = str(token_data.user_id)
            except Exception as e:
                logger.warning("WebSocket authentication failed", error=str(e))
        
        return await self.manager.connect(
            websocket=websocket,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def handle_client_messages(
        self, 
        connection_id: str, 
        websocket: WebSocket
    ):
        """Handle messages from a WebSocket client."""
        await self.manager.receive_message(connection_id, websocket)
    
    async def send_notification(
        self, 
        user_id: str, 
        notification: Dict[str, Any]
    ) -> int:
        """Send a notification to a specific user."""
        message = WebSocketMessage(
            type=MessageType.NOTIFICATION,
            data=notification
        )
        return await self.manager.send_to_user(user_id, message)
    
    async def broadcast_system_message(
        self, 
        message: str, 
        level: str = "info"
    ) -> int:
        """Broadcast a system message to all connected clients."""
        ws_message = WebSocketMessage(
            type=MessageType.ALERT,
            data={
                "message": message,
                "level": level,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        return await self.manager.broadcast_message(ws_message)
    
    async def create_room(
        self, 
        room_id: str,
        **kwargs
    ) -> bool:
        """Create a new room."""
        return await self.manager.create_room(room_id, **kwargs)
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Get service statistics."""
        return self.manager.get_stats()


# Global service instance
websocket_service = WebSocketService()