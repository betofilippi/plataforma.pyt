"""
WebSocket message schemas and data models for real-time communication.

This module defines the data structures and validation schemas for all WebSocket
messages, events, and connection management.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field


# ===== Message Types and Events =====

class MessageType(str, Enum):
    """WebSocket message types."""
    # Connection management
    JOIN_ROOM = "join_room"
    LEAVE_ROOM = "leave_room"
    ROOM_STATE = "room_state"
    
    # User presence
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    USER_STATUS_CHANGED = "user_status_changed"
    STATUS_UPDATE = "status_update"
    
    # Cursor tracking
    CURSOR_MOVE = "cursor_move"
    CURSOR_MOVED = "cursor_moved"
    
    # Table/worksheet updates
    CELL_UPDATE = "cell_update"
    CELL_UPDATED = "cell_updated"
    
    # Typing indicators
    TYPING_START = "typing_start"
    TYPING_STOP = "typing_stop"
    USER_TYPING_START = "user_typing_start"
    USER_TYPING_STOP = "user_typing_stop"
    
    # AI streaming
    AI_REQUEST = "ai_request"
    AI_EVENT = "ai_event"
    AI_START = "ai_start"
    AI_PROGRESS = "ai_progress"
    AI_COMPLETE = "ai_complete"
    AI_ERROR = "ai_error"
    
    # Notifications
    SUBSCRIBE_NOTIFICATIONS = "subscribe_notifications"
    UNSUBSCRIBE_NOTIFICATIONS = "unsubscribe_notifications"
    NOTIFICATION_EVENT = "notification_event"
    NOTIFICATION_READ = "notification_read"
    NOTIFICATION_READ_SYNC = "notification_read_sync"
    CRITICAL_NOTIFICATION = "critical_notification"
    
    # File operations
    FILE_UPLOAD_START = "file_upload_start"
    FILE_UPLOAD_PROGRESS = "file_upload_progress"
    FILE_UPLOAD_COMPLETE = "file_upload_complete"
    FILE_UPLOAD_ERROR = "file_upload_error"
    
    # System events
    PING = "ping"
    PONG = "pong"
    ERROR = "error"


class UserStatus(str, Enum):
    """User presence status."""
    ONLINE = "online"
    AWAY = "away"
    BUSY = "busy"
    OFFLINE = "offline"


class NotificationPriority(str, Enum):
    """Notification priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


# ===== Base Message Schema =====

class BaseMessage(BaseModel):
    """Base WebSocket message schema."""
    type: MessageType
    timestamp: datetime = Field(default_factory=datetime.now)
    request_id: Optional[str] = None
    
    class Config:
        use_enum_values = True


class ErrorMessage(BaseMessage):
    """Error message schema."""
    type: MessageType = MessageType.ERROR
    error: str
    code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


# ===== User and Presence Schemas =====

class CursorPosition(BaseModel):
    """Cursor position data."""
    x: int
    y: int
    cell: Optional[str] = None


class UserPresence(BaseModel):
    """User presence information."""
    user_id: str
    username: str
    email: str
    room: str
    cursor: Optional[CursorPosition] = None
    last_seen: datetime
    status: UserStatus = UserStatus.ONLINE
    
    class Config:
        use_enum_values = True


class ConnectionInfo(BaseModel):
    """WebSocket connection information."""
    connection_id: str
    user_id: str
    connected_at: datetime
    last_ping: datetime
    rooms: List[str] = Field(default_factory=list)


# ===== Room Management Schemas =====

class JoinRoomMessage(BaseMessage):
    """Message to join a room."""
    type: MessageType = MessageType.JOIN_ROOM
    room_id: str


class LeaveRoomMessage(BaseMessage):
    """Message to leave a room."""
    type: MessageType = MessageType.LEAVE_ROOM
    room_id: str


class RoomStateMessage(BaseMessage):
    """Room state information."""
    type: MessageType = MessageType.ROOM_STATE
    room_id: str
    users: List[UserPresence]
    active_sheets: List[str]
    total_users: int


class UserJoinedMessage(BaseMessage):
    """User joined room message."""
    type: MessageType = MessageType.USER_JOINED
    user: UserPresence
    total_users: int


class UserLeftMessage(BaseMessage):
    """User left room message."""
    type: MessageType = MessageType.USER_LEFT
    user_id: str
    total_users: int


# ===== Cursor Tracking Schemas =====

class CursorMoveMessage(BaseMessage):
    """Cursor movement message."""
    type: MessageType = MessageType.CURSOR_MOVE
    x: int
    y: int
    cell: Optional[str] = None
    room: str


class CursorMovedMessage(BaseMessage):
    """Cursor moved broadcast message."""
    type: MessageType = MessageType.CURSOR_MOVED
    user_id: str
    username: str
    cursor: CursorPosition


# ===== Table/Cell Update Schemas =====

class CellUpdateMessage(BaseMessage):
    """Cell update message."""
    type: MessageType = MessageType.CELL_UPDATE
    sheet_id: str
    cell_id: str
    value: Any
    formula: Optional[str] = None
    version: Optional[int] = None


class CellUpdatedMessage(BaseMessage):
    """Cell updated broadcast message."""
    type: MessageType = MessageType.CELL_UPDATED
    sheet_id: str
    cell_id: str
    value: Any
    formula: Optional[str] = None
    user_id: str
    version: int


# ===== Status Update Schemas =====

class StatusUpdateMessage(BaseMessage):
    """Status update message."""
    type: MessageType = MessageType.STATUS_UPDATE
    status: UserStatus


class UserStatusChangedMessage(BaseMessage):
    """User status changed broadcast message."""
    type: MessageType = MessageType.USER_STATUS_CHANGED
    user_id: str
    status: UserStatus


# ===== Typing Indicator Schemas =====

class TypingStartMessage(BaseMessage):
    """Typing start message."""
    type: MessageType = MessageType.TYPING_START
    cell_id: str
    room: str


class TypingStopMessage(BaseMessage):
    """Typing stop message."""
    type: MessageType = MessageType.TYPING_STOP
    cell_id: str
    room: str


class UserTypingStartMessage(BaseMessage):
    """User typing start broadcast message."""
    type: MessageType = MessageType.USER_TYPING_START
    user_id: str
    username: str
    cell_id: str


class UserTypingStopMessage(BaseMessage):
    """User typing stop broadcast message."""
    type: MessageType = MessageType.USER_TYPING_STOP
    user_id: str
    cell_id: str


# ===== AI Streaming Schemas =====

class AIRequestMessage(BaseMessage):
    """AI request message."""
    type: MessageType = MessageType.AI_REQUEST
    query: str
    sheet_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class AIEventMessage(BaseMessage):
    """AI event message."""
    type: MessageType = MessageType.AI_EVENT
    event_type: MessageType  # AI_START, AI_PROGRESS, AI_COMPLETE, AI_ERROR
    user_id: str
    data: Dict[str, Any]


# ===== Notification Schemas =====

class NotificationSubscription(BaseModel):
    """Notification subscription preferences."""
    user_id: str
    categories: Optional[List[str]] = None
    modules: Optional[List[str]] = None
    priorities: Optional[List[NotificationPriority]] = None
    
    class Config:
        use_enum_values = True


class SubscribeNotificationsMessage(BaseMessage):
    """Subscribe to notifications message."""
    type: MessageType = MessageType.SUBSCRIBE_NOTIFICATIONS
    categories: Optional[List[str]] = None
    modules: Optional[List[str]] = None
    priorities: Optional[List[NotificationPriority]] = None


class NotificationReadMessage(BaseMessage):
    """Mark notification as read message."""
    type: MessageType = MessageType.NOTIFICATION_READ
    notification_id: str


class NotificationEventMessage(BaseMessage):
    """Notification event broadcast message."""
    type: MessageType = MessageType.NOTIFICATION_EVENT
    event_type: str  # notification_created, notification_read, etc.
    notification: Dict[str, Any]
    user_id: str


# ===== File Upload Schemas =====

class FileUploadStartMessage(BaseMessage):
    """File upload start message."""
    type: MessageType = MessageType.FILE_UPLOAD_START
    file_id: str
    filename: str
    file_size: int
    mime_type: str


class FileUploadProgressMessage(BaseMessage):
    """File upload progress message."""
    type: MessageType = MessageType.FILE_UPLOAD_PROGRESS
    file_id: str
    bytes_uploaded: int
    total_bytes: int
    percentage: float


class FileUploadCompleteMessage(BaseMessage):
    """File upload complete message."""
    type: MessageType = MessageType.FILE_UPLOAD_COMPLETE
    file_id: str
    url: str
    metadata: Optional[Dict[str, Any]] = None


class FileUploadErrorMessage(BaseMessage):
    """File upload error message."""
    type: MessageType = MessageType.FILE_UPLOAD_ERROR
    file_id: str
    error: str


# ===== Room Data Models =====

class RoomData(BaseModel):
    """Room data storage model."""
    room_id: str
    users: Dict[str, UserPresence] = Field(default_factory=dict)
    active_sheets: set[str] = Field(default_factory=set)
    last_activity: datetime
    created_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        arbitrary_types_allowed = True


# ===== Connection State Schemas =====

class ConnectionState(BaseModel):
    """WebSocket connection state."""
    connection_id: str
    user_id: str
    username: str
    email: str
    connected_at: datetime
    last_ping: datetime
    rooms: List[str] = Field(default_factory=list)
    subscription: Optional[NotificationSubscription] = None
    is_authenticated: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ===== Rate Limiting Schemas =====

class RateLimitInfo(BaseModel):
    """Rate limiting information."""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    current_minute_count: int = 0
    current_hour_count: int = 0
    last_request: datetime
    blocked_until: Optional[datetime] = None


# ===== Statistics and Monitoring Schemas =====

class ConnectionStats(BaseModel):
    """Connection statistics."""
    total_connections: int
    authenticated_connections: int
    rooms_active: int
    messages_per_second: float
    uptime_seconds: int


class RoomStats(BaseModel):
    """Room statistics."""
    room_id: str
    user_count: int
    active_sheets_count: int
    last_activity: datetime
    messages_sent: int
    avg_users_per_hour: float


# ===== Message Union Types =====

WebSocketMessage = Union[
    # Connection management
    JoinRoomMessage,
    LeaveRoomMessage,
    RoomStateMessage,
    UserJoinedMessage,
    UserLeftMessage,
    
    # Cursor tracking
    CursorMoveMessage,
    CursorMovedMessage,
    
    # Cell updates
    CellUpdateMessage,
    CellUpdatedMessage,
    
    # Status updates
    StatusUpdateMessage,
    UserStatusChangedMessage,
    
    # Typing indicators
    TypingStartMessage,
    TypingStopMessage,
    UserTypingStartMessage,
    UserTypingStopMessage,
    
    # AI streaming
    AIRequestMessage,
    AIEventMessage,
    
    # Notifications
    SubscribeNotificationsMessage,
    NotificationReadMessage,
    NotificationEventMessage,
    
    # File uploads
    FileUploadStartMessage,
    FileUploadProgressMessage,
    FileUploadCompleteMessage,
    FileUploadErrorMessage,
    
    # System
    ErrorMessage,
]


# ===== Helper Functions =====

def create_error_message(error: str, code: Optional[str] = None, 
                        request_id: Optional[str] = None) -> ErrorMessage:
    """Create a standardized error message."""
    return ErrorMessage(
        error=error,
        code=code,
        request_id=request_id
    )


def create_user_presence(user_id: str, username: str, email: str, 
                        room: str, status: UserStatus = UserStatus.ONLINE) -> UserPresence:
    """Create a user presence object."""
    return UserPresence(
        user_id=user_id,
        username=username,
        email=email,
        room=room,
        last_seen=datetime.now(),
        status=status
    )