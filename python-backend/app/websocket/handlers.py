"""
WebSocket message handlers for real-time features.

This module implements handlers for all WebSocket message types including
window state synchronization, table/worksheet updates, user presence tracking,
notifications, and file upload progress.
"""

import asyncio
import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import redis.asyncio as redis
import structlog
from fastapi import WebSocket
from pydantic import ValidationError

from app.schemas.websocket import (
    AIRequestMessage,
    CellUpdateMessage,
    CursorMoveMessage,
    FileUploadProgressMessage,
    FileUploadStartMessage,
    JoinRoomMessage,
    LeaveRoomMessage,
    MessageType,
    NotificationReadMessage,
    NotificationSubscription,
    StatusUpdateMessage,
    SubscribeNotificationsMessage,
    TypingStartMessage,
    TypingStopMessage,
    UserStatus,
    WebSocketMessage,
    create_error_message,
)
from app.websocket.manager import WebSocketManager

logger = structlog.get_logger(__name__)


class WebSocketHandlers:
    """
    WebSocket message handlers for real-time features.
    
    Handles all WebSocket message types and coordinates with the WebSocket manager
    to provide real-time functionality.
    """
    
    def __init__(self, manager: WebSocketManager, redis_client: Optional[redis.Redis] = None):
        """Initialize WebSocket handlers."""
        self.manager = manager
        self.redis_client = redis_client
        
        # Handler mapping
        self.message_handlers = {
            MessageType.JOIN_ROOM: self.handle_join_room,
            MessageType.LEAVE_ROOM: self.handle_leave_room,
            MessageType.CURSOR_MOVE: self.handle_cursor_move,
            MessageType.CELL_UPDATE: self.handle_cell_update,
            MessageType.STATUS_UPDATE: self.handle_status_update,
            MessageType.TYPING_START: self.handle_typing_start,
            MessageType.TYPING_STOP: self.handle_typing_stop,
            MessageType.AI_REQUEST: self.handle_ai_request,
            MessageType.SUBSCRIBE_NOTIFICATIONS: self.handle_subscribe_notifications,
            MessageType.UNSUBSCRIBE_NOTIFICATIONS: self.handle_unsubscribe_notifications,
            MessageType.NOTIFICATION_READ: self.handle_notification_read,
            MessageType.FILE_UPLOAD_START: self.handle_file_upload_start,
            MessageType.FILE_UPLOAD_PROGRESS: self.handle_file_upload_progress,
            MessageType.PING: self.handle_ping,
        }
        
        # AI processing state
        self.active_ai_requests: Dict[str, Dict[str, Any]] = {}
        
        # File upload state
        self.active_uploads: Dict[str, Dict[str, Any]] = {}
    
    async def handle_message(self, connection_id: str, raw_message: str) -> bool:
        """
        Handle incoming WebSocket message.
        
        Args:
            connection_id: The connection ID
            raw_message: The raw message string
            
        Returns:
            bool: True if message was handled successfully
        """
        try:
            # Parse message
            message_data = json.loads(raw_message)
            message_type = message_data.get("type")
            
            if not message_type:
                await self._send_error(connection_id, "Message type is required")
                return False
            
            # Check if handler exists
            handler = self.message_handlers.get(MessageType(message_type))
            if not handler:
                await self._send_error(connection_id, f"Unknown message type: {message_type}")
                return False
            
            # Check authentication and permissions
            if not await self._check_permissions(connection_id, message_type, message_data):
                await self._send_error(connection_id, "Permission denied", "PERMISSION_DENIED")
                return False
            
            # Handle the message
            return await handler(connection_id, message_data)
            
        except json.JSONDecodeError:
            await self._send_error(connection_id, "Invalid JSON format")
            return False
        except ValidationError as e:
            await self._send_error(connection_id, f"Validation error: {str(e)}")
            return False
        except Exception as e:
            logger.error(
                "Message handling error",
                error=str(e),
                connection_id=connection_id,
                message_type=message_type
            )
            await self._send_error(connection_id, "Internal server error")
            return False
    
    # Room Management Handlers
    
    async def handle_join_room(self, connection_id: str, message_data: Dict[str, Any]) -> bool:
        """Handle join room message."""
        try:
            message = JoinRoomMessage(**message_data)
            success = await self.manager.join_room(connection_id, message.room_id)
            
            if not success:
                await self._send_error(connection_id, "Failed to join room")
                return False
            
            logger.info(
                "User joined room via handler",
                connection_id=connection_id,
                room_id=message.room_id
            )
            
            return True
            
        except Exception as e:
            logger.error("Join room handler error", error=str(e))
            return False
    
    async def handle_leave_room(self, connection_id: str, message_data: Dict[str, Any]) -> bool:
        """Handle leave room message."""
        try:
            message = LeaveRoomMessage(**message_data)
            success = await self.manager.leave_room(connection_id, message.room_id)
            
            if not success:
                await self._send_error(connection_id, "Failed to leave room")
                return False
            
            logger.info(
                "User left room via handler",
                connection_id=connection_id,
                room_id=message.room_id
            )
            
            return True
            
        except Exception as e:
            logger.error("Leave room handler error", error=str(e))
            return False
    
    # Cursor Tracking Handlers
    
    async def handle_cursor_move(self, connection_id: str, message_data: Dict[str, Any]) -> bool:
        """Handle cursor movement message."""
        try:
            message = CursorMoveMessage(**message_data)
            
            success = await self.manager.update_user_cursor(
                connection_id=connection_id,
                room_id=message.room,
                x=message.x,
                y=message.y,
                cell=message.cell
            )
            
            return success
            
        except Exception as e:
            logger.error("Cursor move handler error", error=str(e))
            return False
    
    # Table/Cell Update Handlers
    
    async def handle_cell_update(self, connection_id: str, message_data: Dict[str, Any]) -> bool:
        """Handle cell update message."""
        try:
            message = CellUpdateMessage(**message_data)
            connection_state = self.manager.connection_states.get(connection_id)
            
            if not connection_state:
                return False
            
            # Create enhanced cell update with user info and version
            cell_update = {
                "type": MessageType.CELL_UPDATED.value,
                "sheet_id": message.sheet_id,
                "cell_id": message.cell_id,
                "value": message.value,
                "formula": message.formula,
                "user_id": connection_state.user_id,
                "username": connection_state.username,
                "version": message.version or int(datetime.now().timestamp() * 1000),
                "timestamp": datetime.now().isoformat()
            }
            
            # Store in Redis for persistence and conflict resolution
            if self.redis_client:
                cache_key = f"cell:{message.sheet_id}:{message.cell_id}"
                await self.redis_client.setex(
                    cache_key,
                    3600,  # 1 hour TTL
                    json.dumps(cell_update)
                )
            
            # Broadcast to all rooms the user is in
            broadcast_count = 0
            for room_id in connection_state.rooms:
                # Add the sheet to room's active sheets
                room = self.manager.rooms.get(room_id)
                if room:
                    room.active_sheets.add(message.sheet_id)
                    room.last_activity = datetime.now()
                
                # Broadcast to room (excluding sender)
                count = await self.manager.broadcast_to_room(
                    room_id, 
                    cell_update, 
                    exclude={connection_id}
                )
                broadcast_count += count
            
            logger.info(
                "Cell update processed",
                user_id=connection_state.user_id,
                sheet_id=message.sheet_id,
                cell_id=message.cell_id,
                broadcast_count=broadcast_count
            )
            
            return True
            
        except Exception as e:
            logger.error("Cell update handler error", error=str(e))
            return False
    
    # Status Update Handlers
    
    async def handle_status_update(self, connection_id: str, message_data: Dict[str, Any]) -> bool:
        """Handle user status update message."""
        try:
            message = StatusUpdateMessage(**message_data)
            success = await self.manager.update_user_status(connection_id, message.status)
            
            return success
            
        except Exception as e:
            logger.error("Status update handler error", error=str(e))
            return False
    
    # Typing Indicator Handlers
    
    async def handle_typing_start(self, connection_id: str, message_data: Dict[str, Any]) -> bool:
        """Handle typing start message."""
        try:
            message = TypingStartMessage(**message_data)
            connection_state = self.manager.connection_states.get(connection_id)
            
            if not connection_state:
                return False
            
            # Broadcast typing indicator to room
            typing_message = {
                "type": MessageType.USER_TYPING_START.value,
                "user_id": connection_state.user_id,
                "username": connection_state.username,
                "cell_id": message.cell_id,
                "timestamp": datetime.now().isoformat()
            }
            
            await self.manager.broadcast_to_room(
                message.room, 
                typing_message, 
                exclude={connection_id}
            )
            
            return True
            
        except Exception as e:
            logger.error("Typing start handler error", error=str(e))
            return False
    
    async def handle_typing_stop(self, connection_id: str, message_data: Dict[str, Any]) -> bool:
        """Handle typing stop message."""
        try:
            message = TypingStopMessage(**message_data)
            connection_state = self.manager.connection_states.get(connection_id)
            
            if not connection_state:
                return False
            
            # Broadcast typing stop to room
            typing_message = {
                "type": MessageType.USER_TYPING_STOP.value,
                "user_id": connection_state.user_id,
                "cell_id": message.cell_id,
                "timestamp": datetime.now().isoformat()
            }
            
            await self.manager.broadcast_to_room(
                message.room, 
                typing_message, 
                exclude={connection_id}
            )
            
            return True
            
        except Exception as e:
            logger.error("Typing stop handler error", error=str(e))
            return False
    
    # AI Streaming Handlers
    
    async def handle_ai_request(self, connection_id: str, message_data: Dict[str, Any]) -> bool:
        """Handle AI request message."""
        try:
            message = AIRequestMessage(**message_data)
            connection_state = self.manager.connection_states.get(connection_id)
            
            if not connection_state:
                return False
            
            request_id = message.request_id or str(uuid.uuid4())
            
            # Store AI request state
            self.active_ai_requests[request_id] = {
                "connection_id": connection_id,
                "user_id": connection_state.user_id,
                "query": message.query,
                "sheet_id": message.sheet_id,
                "context": message.context,
                "started_at": datetime.now(),
                "status": "processing"
            }
            
            # Send AI start event
            ai_start_event = {
                "type": MessageType.AI_EVENT.value,
                "event_type": MessageType.AI_START.value,
                "request_id": request_id,
                "user_id": connection_state.user_id,
                "data": {
                    "query": message.query,
                    "sheet_id": message.sheet_id,
                    "context": message.context
                },
                "timestamp": datetime.now().isoformat()
            }
            
            # Broadcast AI start to user's rooms
            for room_id in connection_state.rooms:
                await self.manager.broadcast_to_room(room_id, ai_start_event)
            
            # Start AI processing (mock implementation)
            asyncio.create_task(self._process_ai_request(request_id))
            
            logger.info(
                "AI request started",
                request_id=request_id,
                user_id=connection_state.user_id,
                query=message.query[:100]  # Log first 100 chars
            )
            
            return True
            
        except Exception as e:
            logger.error("AI request handler error", error=str(e))
            return False
    
    # Notification Handlers
    
    async def handle_subscribe_notifications(self, connection_id: str, message_data: Dict[str, Any]) -> bool:
        """Handle notification subscription message."""
        try:
            message = SubscribeNotificationsMessage(**message_data)
            
            subscription = NotificationSubscription(
                user_id="",  # Will be set by manager
                categories=message.categories,
                modules=message.modules,
                priorities=message.priorities
            )
            
            success = await self.manager.subscribe_notifications(connection_id, subscription)
            
            return success
            
        except Exception as e:
            logger.error("Subscribe notifications handler error", error=str(e))
            return False
    
    async def handle_unsubscribe_notifications(self, connection_id: str, message_data: Dict[str, Any]) -> bool:
        """Handle notification unsubscription message."""
        try:
            # Remove subscription
            if connection_id in self.manager.notification_subscriptions:
                del self.manager.notification_subscriptions[connection_id]
            
            # Send confirmation
            await self.manager.send_message(connection_id, {
                "type": "notification_subscription_confirmed",
                "status": "unsubscribed",
                "timestamp": datetime.now().isoformat()
            })
            
            logger.info("Notification unsubscription processed", connection_id=connection_id)
            
            return True
            
        except Exception as e:
            logger.error("Unsubscribe notifications handler error", error=str(e))
            return False
    
    async def handle_notification_read(self, connection_id: str, message_data: Dict[str, Any]) -> bool:
        """Handle notification read message."""
        try:
            message = NotificationReadMessage(**message_data)
            connection_state = self.manager.connection_states.get(connection_id)
            
            if not connection_state:
                return False
            
            # Sync read status across user's other sessions
            user_id = connection_state.user_id
            sync_message = {
                "type": MessageType.NOTIFICATION_READ_SYNC.value,
                "notification_id": message.notification_id,
                "user_id": user_id,
                "timestamp": datetime.now().isoformat()
            }
            
            # Send to all user's other connections
            await self.manager.broadcast_to_user(user_id, sync_message)
            
            # Store read status in Redis if available
            if self.redis_client:
                read_key = f"notification_read:{message.notification_id}:{user_id}"
                await self.redis_client.setex(read_key, 86400, "true")  # 24 hour TTL
            
            logger.info(
                "Notification marked as read",
                user_id=user_id,
                notification_id=message.notification_id
            )
            
            return True
            
        except Exception as e:
            logger.error("Notification read handler error", error=str(e))
            return False
    
    # File Upload Handlers
    
    async def handle_file_upload_start(self, connection_id: str, message_data: Dict[str, Any]) -> bool:
        """Handle file upload start message."""
        try:
            message = FileUploadStartMessage(**message_data)
            connection_state = self.manager.connection_states.get(connection_id)
            
            if not connection_state:
                return False
            
            # Initialize upload tracking
            self.active_uploads[message.file_id] = {
                "connection_id": connection_id,
                "user_id": connection_state.user_id,
                "filename": message.filename,
                "file_size": message.file_size,
                "mime_type": message.mime_type,
                "bytes_uploaded": 0,
                "started_at": datetime.now(),
                "status": "uploading"
            }
            
            logger.info(
                "File upload started",
                file_id=message.file_id,
                filename=message.filename,
                file_size=message.file_size,
                user_id=connection_state.user_id
            )
            
            return True
            
        except Exception as e:
            logger.error("File upload start handler error", error=str(e))
            return False
    
    async def handle_file_upload_progress(self, connection_id: str, message_data: Dict[str, Any]) -> bool:
        """Handle file upload progress message."""
        try:
            message = FileUploadProgressMessage(**message_data)
            
            upload_info = self.active_uploads.get(message.file_id)
            if not upload_info:
                await self._send_error(connection_id, "Upload not found")
                return False
            
            # Update progress
            upload_info["bytes_uploaded"] = message.bytes_uploaded
            upload_info["last_update"] = datetime.now()
            
            # Broadcast progress to user's rooms
            connection_state = self.manager.connection_states.get(connection_id)
            if connection_state:
                progress_message = {
                    "type": MessageType.FILE_UPLOAD_PROGRESS.value,
                    "file_id": message.file_id,
                    "filename": upload_info["filename"],
                    "bytes_uploaded": message.bytes_uploaded,
                    "total_bytes": message.total_bytes,
                    "percentage": message.percentage,
                    "user_id": connection_state.user_id,
                    "timestamp": datetime.now().isoformat()
                }
                
                for room_id in connection_state.rooms:
                    await self.manager.broadcast_to_room(room_id, progress_message)
            
            return True
            
        except Exception as e:
            logger.error("File upload progress handler error", error=str(e))
            return False
    
    # System Handlers
    
    async def handle_ping(self, connection_id: str, message_data: Dict[str, Any]) -> bool:
        """Handle ping message."""
        try:
            # Send pong response
            await self.manager.send_message(connection_id, {
                "type": MessageType.PONG.value,
                "timestamp": datetime.now().isoformat()
            })
            
            return True
            
        except Exception as e:
            logger.error("Ping handler error", error=str(e))
            return False
    
    # Public Broadcasting Methods
    
    async def broadcast_notification(self, notification: Dict[str, Any], event_type: str) -> int:
        """
        Broadcast a notification to subscribed users.
        
        Args:
            notification: The notification data
            event_type: The notification event type
            
        Returns:
            int: Number of users notified
        """
        try:
            user_id = notification.get("user_id")
            if not user_id:
                return 0
            
            # Find user's connections with notification subscriptions
            notified_count = 0
            
            for connection_id in self.manager.user_connections.get(user_id, set()):
                subscription = self.manager.notification_subscriptions.get(connection_id)
                
                # Check if notification matches subscription filters
                if self._matches_subscription(notification, subscription):
                    notification_event = {
                        "type": MessageType.NOTIFICATION_EVENT.value,
                        "event_type": event_type,
                        "notification": notification,
                        "user_id": user_id,
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    success = await self.manager.send_message(connection_id, notification_event)
                    if success:
                        notified_count += 1
                    
                    # Send critical notification alert if needed
                    if notification.get("priority") == "critical":
                        critical_alert = {
                            "type": MessageType.CRITICAL_NOTIFICATION.value,
                            "notification": notification,
                            "timestamp": datetime.now().isoformat()
                        }
                        await self.manager.send_message(connection_id, critical_alert)
            
            return notified_count
            
        except Exception as e:
            logger.error("Notification broadcast error", error=str(e))
            return 0
    
    async def broadcast_file_upload_complete(self, file_id: str, url: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Broadcast file upload completion."""
        try:
            upload_info = self.active_uploads.get(file_id)
            if not upload_info:
                return False
            
            connection_id = upload_info["connection_id"]
            connection_state = self.manager.connection_states.get(connection_id)
            
            if not connection_state:
                return False
            
            # Send completion message
            complete_message = {
                "type": MessageType.FILE_UPLOAD_COMPLETE.value,
                "file_id": file_id,
                "filename": upload_info["filename"],
                "url": url,
                "metadata": metadata,
                "user_id": connection_state.user_id,
                "timestamp": datetime.now().isoformat()
            }
            
            # Broadcast to user's rooms
            for room_id in connection_state.rooms:
                await self.manager.broadcast_to_room(room_id, complete_message)
            
            # Clean up upload tracking
            upload_info["status"] = "completed"
            upload_info["completed_at"] = datetime.now()
            upload_info["url"] = url
            
            logger.info(
                "File upload completed",
                file_id=file_id,
                filename=upload_info["filename"],
                url=url
            )
            
            return True
            
        except Exception as e:
            logger.error("File upload complete broadcast error", error=str(e))
            return False
    
    # Private helper methods
    
    async def _check_permissions(self, connection_id: str, message_type: str, message_data: Dict[str, Any]) -> bool:
        """Check if user has permission to send this message type."""
        try:
            connection_state = self.manager.connection_states.get(connection_id)
            if not connection_state or not connection_state.is_authenticated:
                return False
            
            # Extract resource from message if applicable
            resource = None
            if "room_id" in message_data:
                resource = message_data["room_id"]
            elif "sheet_id" in message_data:
                resource = message_data["sheet_id"]
            
            # Check permissions via authenticator
            return await self.manager.authenticator.check_permissions(
                connection_state, message_type, resource
            )
            
        except Exception as e:
            logger.error("Permission check error", error=str(e))
            return False
    
    async def _send_error(self, connection_id: str, error: str, code: Optional[str] = None) -> None:
        """Send error message to connection."""
        error_message = create_error_message(error, code)
        await self.manager.send_message(connection_id, error_message.dict())
    
    def _matches_subscription(self, notification: Dict[str, Any], subscription: Optional[NotificationSubscription]) -> bool:
        """Check if notification matches subscription filters."""
        if not subscription:
            return True  # No filter means all notifications
        
        # Check category filter
        if subscription.categories:
            notification_category = notification.get("category")
            if notification_category and notification_category not in subscription.categories:
                return False
        
        # Check module filter
        if subscription.modules:
            notification_module = notification.get("module_name")
            if notification_module and notification_module not in subscription.modules:
                return False
        
        # Check priority filter
        if subscription.priorities:
            notification_priority = notification.get("priority")
            if notification_priority and notification_priority not in [p.value for p in subscription.priorities]:
                return False
        
        return True
    
    async def _process_ai_request(self, request_id: str) -> None:
        """Process AI request (mock implementation)."""
        try:
            request_info = self.active_ai_requests.get(request_id)
            if not request_info:
                return
            
            connection_id = request_info["connection_id"]
            connection_state = self.manager.connection_states.get(connection_id)
            
            if not connection_state:
                return
            
            # Simulate AI processing with progress updates
            for i in range(1, 6):
                await asyncio.sleep(1)  # Simulate processing time
                
                # Send progress update
                progress_event = {
                    "type": MessageType.AI_EVENT.value,
                    "event_type": MessageType.AI_PROGRESS.value,
                    "request_id": request_id,
                    "user_id": connection_state.user_id,
                    "data": {
                        "progress": i * 20,
                        "status": f"Processing step {i}/5"
                    },
                    "timestamp": datetime.now().isoformat()
                }
                
                for room_id in connection_state.rooms:
                    await self.manager.broadcast_to_room(room_id, progress_event)
            
            # Send completion
            complete_event = {
                "type": MessageType.AI_EVENT.value,
                "event_type": MessageType.AI_COMPLETE.value,
                "request_id": request_id,
                "user_id": connection_state.user_id,
                "data": {
                    "result": f"AI response for: {request_info['query'][:50]}...",
                    "processing_time": (datetime.now() - request_info["started_at"]).total_seconds()
                },
                "timestamp": datetime.now().isoformat()
            }
            
            for room_id in connection_state.rooms:
                await self.manager.broadcast_to_room(room_id, complete_event)
            
            # Update request state
            request_info["status"] = "completed"
            request_info["completed_at"] = datetime.now()
            
            logger.info("AI request completed", request_id=request_id)
            
        except Exception as e:
            logger.error("AI request processing error", error=str(e), request_id=request_id)
            
            # Send error event
            if request_id in self.active_ai_requests:
                request_info = self.active_ai_requests[request_id]
                connection_id = request_info["connection_id"]
                connection_state = self.manager.connection_states.get(connection_id)
                
                if connection_state:
                    error_event = {
                        "type": MessageType.AI_EVENT.value,
                        "event_type": MessageType.AI_ERROR.value,
                        "request_id": request_id,
                        "user_id": connection_state.user_id,
                        "data": {"error": str(e)},
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    for room_id in connection_state.rooms:
                        await self.manager.broadcast_to_room(room_id, error_event)
    
    def get_handler_stats(self) -> Dict[str, Any]:
        """Get handler statistics."""
        return {
            "active_ai_requests": len(self.active_ai_requests),
            "active_uploads": len(self.active_uploads),
            "completed_ai_requests": len([
                req for req in self.active_ai_requests.values()
                if req.get("status") == "completed"
            ]),
            "completed_uploads": len([
                upload for upload in self.active_uploads.values()
                if upload.get("status") == "completed"
            ])
        }