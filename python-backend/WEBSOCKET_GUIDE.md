# WebSocket Infrastructure Guide

This document provides a comprehensive guide to the WebSocket infrastructure implemented for the Python backend, explaining how to use all the real-time features.

## Overview

The WebSocket infrastructure provides comprehensive real-time communication capabilities including:
- Connection management with room support
- JWT authentication for WebSocket connections
- User presence tracking and cursor synchronization
- Real-time table/worksheet updates
- AI streaming with progress updates
- Notification system with subscription filters
- File upload progress tracking
- Rate limiting and security features

## Architecture

```
Client (WebSocket) ↔ WebSocket API ↔ WebSocket Manager ↔ Redis (optional)
                                   ↔ WebSocket Handlers
                                   ↔ WebSocket Authenticator
```

### Core Components

1. **WebSocketManager** (`app/websocket/manager.py`)
   - Manages connections and rooms
   - Handles message broadcasting
   - Tracks user presence
   - Monitors connection health

2. **WebSocketHandlers** (`app/websocket/handlers.py`)
   - Processes incoming messages
   - Implements business logic
   - Coordinates real-time features

3. **WebSocketAuthenticator** (`app/websocket/auth.py`)
   - JWT authentication
   - Permission checking
   - Rate limiting

4. **WebSocket API** (`app/api/v1/websocket.py`)
   - FastAPI integration
   - REST endpoints for WebSocket management
   - Statistics and monitoring

## Connection and Authentication

### WebSocket Connection

Connect to the WebSocket endpoint:

```javascript
const token = "your-jwt-token";
const ws = new WebSocket(`ws://localhost:8000/api/v1/ws?token=${token}`);

// Alternative: Send token in Authorization header
const ws = new WebSocket("ws://localhost:8000/api/v1/ws", [], {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Connection Events

```javascript
ws.onopen = function(event) {
    console.log('Connected to WebSocket');
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    handleMessage(message);
};

ws.onclose = function(event) {
    console.log('WebSocket connection closed');
};

ws.onerror = function(error) {
    console.error('WebSocket error:', error);
};
```

## Message Types and Usage

### 1. Room Management

#### Join Room
```javascript
ws.send(JSON.stringify({
    type: "join_room",
    room_id: "workspace_123"
}));
```

#### Leave Room
```javascript
ws.send(JSON.stringify({
    type: "leave_room",
    room_id: "workspace_123"
}));
```

#### Room State Updates
Received when joining a room or when users join/leave:

```javascript
{
    type: "room_state",
    room_id: "workspace_123",
    users: [
        {
            user_id: "user_1",
            username: "john_doe",
            email: "john@example.com",
            room: "workspace_123",
            status: "online",
            cursor: { x: 100, y: 200, cell: "A1" },
            last_seen: "2024-01-15T10:30:00Z"
        }
    ],
    active_sheets: ["sheet_1", "sheet_2"],
    total_users: 1
}
```

### 2. Cursor Tracking

#### Send Cursor Position
```javascript
ws.send(JSON.stringify({
    type: "cursor_move",
    room: "workspace_123",
    x: 150,
    y: 300,
    cell: "B2"
}));
```

#### Receive Cursor Updates
```javascript
{
    type: "cursor_moved",
    user_id: "user_2",
    username: "jane_doe",
    cursor: { x: 150, y: 300, cell: "B2" }
}
```

### 3. Cell Updates

#### Send Cell Update
```javascript
ws.send(JSON.stringify({
    type: "cell_update",
    sheet_id: "sheet_123",
    cell_id: "A1",
    value: "Hello World",
    formula: "=CONCATENATE('Hello', ' ', 'World')",
    version: 1642161000000
}));
```

#### Receive Cell Updates
```javascript
{
    type: "cell_updated",
    sheet_id: "sheet_123",
    cell_id: "A1",
    value: "Hello World",
    formula: "=CONCATENATE('Hello', ' ', 'World')",
    user_id: "user_2",
    username: "jane_doe",
    version: 1642161000001
}
```

### 4. User Presence

#### Update Status
```javascript
ws.send(JSON.stringify({
    type: "status_update",
    status: "busy"  // "online", "away", "busy"
}));
```

#### Receive Status Changes
```javascript
{
    type: "user_status_changed",
    user_id: "user_2",
    status: "busy"
}
```

### 5. Typing Indicators

#### Start Typing
```javascript
ws.send(JSON.stringify({
    type: "typing_start",
    cell_id: "A1",
    room: "workspace_123"
}));
```

#### Stop Typing
```javascript
ws.send(JSON.stringify({
    type: "typing_stop",
    cell_id: "A1",
    room: "workspace_123"
}));
```

#### Receive Typing Events
```javascript
{
    type: "user_typing_start",
    user_id: "user_2",
    username: "jane_doe",
    cell_id: "A1"
}
```

### 6. AI Streaming

#### Request AI Processing
```javascript
ws.send(JSON.stringify({
    type: "ai_request",
    request_id: "req_123",
    query: "Analyze this data and provide insights",
    sheet_id: "sheet_123",
    context: { table_range: "A1:Z100" }
}));
```

#### Receive AI Events
```javascript
// AI Started
{
    type: "ai_event",
    event_type: "ai_start",
    request_id: "req_123",
    user_id: "user_1",
    data: { query: "...", sheet_id: "sheet_123" }
}

// AI Progress
{
    type: "ai_event",
    event_type: "ai_progress",
    request_id: "req_123",
    user_id: "user_1",
    data: { progress: 60, status: "Processing step 3/5" }
}

// AI Complete
{
    type: "ai_event",
    event_type: "ai_complete",
    request_id: "req_123",
    user_id: "user_1",
    data: { 
        result: "Analysis complete: Found 3 trends...",
        processing_time: 4.5
    }
}
```

### 7. Notifications

#### Subscribe to Notifications
```javascript
ws.send(JSON.stringify({
    type: "subscribe_notifications",
    categories: ["system", "workspace"],
    modules: ["tables", "ai"],
    priorities: ["normal", "high", "critical"]
}));
```

#### Mark Notification as Read
```javascript
ws.send(JSON.stringify({
    type: "notification_read",
    notification_id: "notif_123"
}));
```

#### Receive Notifications
```javascript
{
    type: "notification_event",
    event_type: "notification_created",
    notification: {
        id: "notif_123",
        title: "New Comment",
        message: "John commented on your sheet",
        category: "workspace",
        priority: "normal",
        module_name: "tables"
    },
    user_id: "user_1"
}
```

### 8. File Upload Progress

#### Start File Upload
```javascript
ws.send(JSON.stringify({
    type: "file_upload_start",
    file_id: "file_123",
    filename: "data.csv",
    file_size: 1024000,
    mime_type: "text/csv"
}));
```

#### Send Upload Progress
```javascript
ws.send(JSON.stringify({
    type: "file_upload_progress",
    file_id: "file_123",
    bytes_uploaded: 512000,
    total_bytes: 1024000,
    percentage: 50.0
}));
```

#### Receive Upload Complete
```javascript
{
    type: "file_upload_complete",
    file_id: "file_123",
    filename: "data.csv",
    url: "https://storage.example.com/file_123.csv",
    user_id: "user_1"
}
```

## REST API Integration

### Get WebSocket Statistics

```bash
GET /api/v1/ws/stats
```

Response:
```json
{
    "total_connections": 15,
    "authenticated_connections": 15,
    "rooms_active": 3,
    "messages_per_second": 2.5,
    "uptime_seconds": 3600
}
```

### Get Active Rooms

```bash
GET /api/v1/ws/rooms
```

Response:
```json
[
    {
        "room_id": "workspace_123",
        "user_count": 5,
        "active_sheets_count": 2,
        "last_activity": "2024-01-15T10:30:00Z",
        "messages_sent": 150,
        "avg_users_per_hour": 4.2
    }
]
```

### Broadcast to Room

```bash
POST /api/v1/ws/rooms/workspace_123/broadcast
Content-Type: application/json

{
    "type": "system_announcement",
    "title": "Maintenance Notice",
    "message": "System maintenance in 30 minutes"
}
```

### Notify User

```bash
POST /api/v1/ws/users/user_123/notify
Content-Type: application/json

{
    "type": "direct_message",
    "from": "admin",
    "message": "Please review the updated document"
}
```

### Broadcast Notification

```bash
POST /api/v1/ws/broadcast/notification?event_type=notification_created
Content-Type: application/json

{
    "user_id": "user_123",
    "title": "New Task Assigned",
    "message": "You have been assigned a new task",
    "category": "tasks",
    "priority": "high",
    "module_name": "project_management"
}
```

## Error Handling

### WebSocket Errors

```javascript
{
    type: "error",
    error: "Permission denied",
    code: "PERMISSION_DENIED",
    timestamp: "2024-01-15T10:30:00Z"
}
```

### Common Error Codes

- `AUTHENTICATION_FAILED`: Invalid or missing JWT token
- `PERMISSION_DENIED`: Insufficient permissions for action
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INVALID_JSON`: Malformed message
- `UNKNOWN_MESSAGE_TYPE`: Unsupported message type
- `ROOM_NOT_FOUND`: Room doesn't exist
- `INTERNAL_ERROR`: Server-side error

### Rate Limiting

Default limits:
- 60 requests per minute
- 1000 requests per hour
- 15-minute block for violations

Rate limit exceeded response:
```javascript
{
    type: "error",
    error: "Rate limit exceeded: too many requests per minute",
    code: "RATE_LIMIT_EXCEEDED"
}
```

## Security Features

1. **JWT Authentication**: All connections must be authenticated
2. **Permission Checking**: Actions are validated against user permissions
3. **Rate Limiting**: Prevents abuse with configurable limits
4. **Input Validation**: All messages are validated against schemas
5. **Connection Monitoring**: Health checks and automatic cleanup
6. **Secure Headers**: Security headers for all HTTP responses

## Configuration

### Environment Variables

```env
# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET_KEY=your-secret-key

# Rate Limiting
WEBSOCKET_REQUESTS_PER_MINUTE=60
WEBSOCKET_REQUESTS_PER_HOUR=1000
WEBSOCKET_BLOCK_DURATION_MINUTES=15

# WebSocket Settings
WEBSOCKET_PING_INTERVAL=25
WEBSOCKET_PING_TIMEOUT=60
```

### FastAPI Configuration

The WebSocket infrastructure is automatically integrated with FastAPI when you include the router:

```python
from app.api.v1 import router as api_v1_router

app.include_router(api_v1_router, prefix="/api")
```

## Monitoring and Debugging

### Health Check

```bash
GET /api/v1/ws/health
```

### Detailed Statistics

```bash
GET /api/v1/ws/stats/detailed
```

### Connection Management

```bash
# Force disconnect a connection
DELETE /api/v1/ws/connections/ws_user_123_1642161000

# Graceful shutdown
POST /api/v1/ws/shutdown
```

## Integration with Existing TypeScript System

This Python WebSocket infrastructure is designed to replace the Socket.IO functionality from the TypeScript system while maintaining compatibility with existing client-side code.

### Migration Notes

1. **Message Format**: Messages use the same structure as the TypeScript system
2. **Room Management**: Same room joining/leaving semantics
3. **User Presence**: Compatible cursor tracking and status updates
4. **Real-time Updates**: Cell updates work the same way
5. **Notifications**: Enhanced subscription system with more filters

### Client Migration

Update WebSocket connection URL:
```javascript
// Old (Socket.IO)
const socket = io('http://localhost:3005');

// New (Native WebSocket)
const ws = new WebSocket('ws://localhost:8000/api/v1/ws?token=jwt_token');
```

Message handling remains largely the same, just replace `socket.emit()` with `ws.send()` and handle `ws.onmessage`.

## Production Considerations

1. **Redis**: Use Redis for scalability and persistence
2. **Load Balancing**: Implement sticky sessions or Redis pub/sub
3. **Monitoring**: Set up monitoring for connection counts and error rates
4. **Logging**: Configure structured logging for debugging
5. **Security**: Use HTTPS/WSS in production
6. **Resource Limits**: Configure connection limits and memory usage
7. **Backup**: Regular cleanup of stale connections and rooms

## Testing

### Unit Tests

```python
import pytest
from app.websocket.manager import WebSocketManager

@pytest.mark.asyncio
async def test_websocket_connection():
    manager = WebSocketManager()
    # Test connection logic
    pass
```

### Integration Tests

Use FastAPI's test client with WebSocket support:

```python
from fastapi.testclient import TestClient
from app.main import app

def test_websocket_endpoint():
    client = TestClient(app)
    with client.websocket_connect("/api/v1/ws?token=test_token") as websocket:
        websocket.send_json({"type": "ping"})
        data = websocket.receive_json()
        assert data["type"] == "pong"
```

This comprehensive WebSocket infrastructure provides production-ready real-time communication capabilities for your Python backend, replacing the Socket.IO functionality while maintaining compatibility and adding enhanced features.