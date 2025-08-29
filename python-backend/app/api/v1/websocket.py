"""
WebSocket API endpoints and integration with FastAPI.

This module provides WebSocket endpoints, connection lifecycle management,
error handling, and integration with the FastAPI application.
"""

import asyncio
import json
from typing import Dict, List, Optional

import redis.asyncio as redis
import structlog
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.main import get_redis_client
from app.schemas.websocket import ConnectionStats, RoomStats
from app.websocket import WebSocketHandlers, WebSocketManager

logger = structlog.get_logger(__name__)

# Global WebSocket manager instance
websocket_manager: Optional[WebSocketManager] = None
websocket_handlers: Optional[WebSocketHandlers] = None

router = APIRouter()


async def get_websocket_manager() -> WebSocketManager:
    """Get or create WebSocket manager instance."""
    global websocket_manager, websocket_handlers
    
    if websocket_manager is None:
        redis_client = get_redis_client()
        websocket_manager = WebSocketManager(redis_client)
        websocket_handlers = WebSocketHandlers(websocket_manager, redis_client)
        logger.info("WebSocket manager initialized")
    
    return websocket_manager


async def get_websocket_handlers() -> WebSocketHandlers:
    """Get WebSocket handlers instance."""
    await get_websocket_manager()  # Ensure manager is initialized
    return websocket_handlers


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    manager: WebSocketManager = Depends(get_websocket_manager),
    handlers: WebSocketHandlers = Depends(get_websocket_handlers)
):
    """
    Main WebSocket endpoint for real-time communication.
    
    Handles WebSocket connections, authentication, message routing,
    and connection lifecycle management.
    """
    connection_id = None
    
    try:
        # Accept and authenticate connection
        connection_state = await manager.connect(websocket)
        if not connection_state:
            logger.warning("WebSocket connection failed during authentication")
            return
        
        connection_id = connection_state.connection_id
        
        logger.info(
            "WebSocket connection established",
            connection_id=connection_id,
            user_id=connection_state.user_id,
            username=connection_state.username
        )
        
        # Handle messages
        while True:
            try:
                # Receive message from client
                raw_message = await websocket.receive_text()
                
                # Handle the message
                success = await handlers.handle_message(connection_id, raw_message)
                if not success:
                    logger.warning(
                        "Message handling failed",
                        connection_id=connection_id,
                        message_preview=raw_message[:100]
                    )
                
            except WebSocketDisconnect:
                logger.info("WebSocket client disconnected", connection_id=connection_id)
                break
                
            except json.JSONDecodeError:
                logger.warning("Invalid JSON received", connection_id=connection_id)
                await manager.send_message(connection_id, {
                    "type": "error",
                    "error": "Invalid JSON format",
                    "code": "INVALID_JSON"
                })
                
            except Exception as e:
                logger.error(
                    "Error processing WebSocket message",
                    error=str(e),
                    connection_id=connection_id
                )
                await manager.send_message(connection_id, {
                    "type": "error",
                    "error": "Internal server error",
                    "code": "INTERNAL_ERROR"
                })
    
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected during setup")
        
    except Exception as e:
        logger.error("WebSocket connection error", error=str(e))
        
    finally:
        # Clean up connection
        if connection_id and manager:
            await manager.disconnect(connection_id)


@router.get("/ws/stats", response_model=ConnectionStats)
async def get_websocket_stats(
    manager: WebSocketManager = Depends(get_websocket_manager)
):
    """
    Get WebSocket connection statistics.
    
    Returns comprehensive statistics about active connections, rooms,
    message throughput, and system health.
    """
    try:
        stats = manager.get_stats()
        
        return ConnectionStats(
            total_connections=stats["total_connections"],
            authenticated_connections=stats["total_connections"],  # All are authenticated
            rooms_active=stats["total_rooms"],
            messages_per_second=stats["messages_per_second"],
            uptime_seconds=int(stats["uptime_seconds"])
        )
        
    except Exception as e:
        logger.error("Error getting WebSocket stats", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get WebSocket statistics"
        )


@router.get("/ws/stats/detailed")
async def get_detailed_websocket_stats(
    manager: WebSocketManager = Depends(get_websocket_manager),
    handlers: WebSocketHandlers = Depends(get_websocket_handlers)
):
    """
    Get detailed WebSocket statistics including room details and handler stats.
    """
    try:
        manager_stats = manager.get_stats()
        handler_stats = handlers.get_handler_stats()
        
        detailed_stats = {
            "manager": manager_stats,
            "handlers": handler_stats,
            "timestamp": manager_stats.get("uptime_seconds", 0)
        }
        
        return JSONResponse(content=detailed_stats)
        
    except Exception as e:
        logger.error("Error getting detailed WebSocket stats", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get detailed WebSocket statistics"
        )


@router.get("/ws/rooms", response_model=List[RoomStats])
async def get_active_rooms(
    manager: WebSocketManager = Depends(get_websocket_manager)
):
    """
    Get information about all active WebSocket rooms.
    """
    try:
        stats = manager.get_stats()
        room_details = stats.get("room_details", [])
        
        rooms = []
        for room_detail in room_details:
            rooms.append(RoomStats(
                room_id=room_detail["room_id"],
                user_count=room_detail["user_count"],
                active_sheets_count=room_detail.get("active_sheets", 0),
                last_activity=room_detail["last_activity"],
                messages_sent=0,  # TODO: Implement message counting per room
                avg_users_per_hour=0.0  # TODO: Implement average calculation
            ))
        
        return rooms
        
    except Exception as e:
        logger.error("Error getting active rooms", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get active rooms"
        )


@router.get("/ws/rooms/{room_id}/users")
async def get_room_users(
    room_id: str,
    manager: WebSocketManager = Depends(get_websocket_manager)
):
    """
    Get all users currently in a specific room.
    """
    try:
        users = manager.get_room_users(room_id)
        
        return JSONResponse(content={
            "room_id": room_id,
            "user_count": len(users),
            "users": [user.dict() for user in users]
        })
        
    except Exception as e:
        logger.error("Error getting room users", error=str(e), room_id=room_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get room users"
        )


@router.post("/ws/rooms/{room_id}/broadcast")
async def broadcast_to_room(
    room_id: str,
    message: Dict,
    manager: WebSocketManager = Depends(get_websocket_manager)
):
    """
    Broadcast a message to all users in a specific room.
    
    This endpoint allows server-side components to send messages
    to WebSocket clients in a specific room.
    """
    try:
        # Validate message format
        if not isinstance(message, dict) or "type" not in message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message must be a dictionary with 'type' field"
            )
        
        # Add server timestamp
        message["server_timestamp"] = manager.get_stats()["uptime_seconds"]
        
        # Broadcast message
        sent_count = await manager.broadcast_to_room(room_id, message)
        
        return JSONResponse(content={
            "room_id": room_id,
            "message_sent": True,
            "recipients_count": sent_count,
            "message_type": message.get("type")
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error broadcasting to room", error=str(e), room_id=room_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to broadcast message to room"
        )


@router.post("/ws/users/{user_id}/notify")
async def notify_user(
    user_id: str,
    message: Dict,
    manager: WebSocketManager = Depends(get_websocket_manager)
):
    """
    Send a notification message to a specific user's WebSocket connections.
    
    This endpoint allows server-side components to send notifications
    directly to a user across all their active WebSocket connections.
    """
    try:
        # Validate message format
        if not isinstance(message, dict) or "type" not in message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message must be a dictionary with 'type' field"
            )
        
        # Add server timestamp
        message["server_timestamp"] = manager.get_stats()["uptime_seconds"]
        
        # Send to user
        sent_count = await manager.broadcast_to_user(user_id, message)
        
        return JSONResponse(content={
            "user_id": user_id,
            "message_sent": True,
            "connections_notified": sent_count,
            "message_type": message.get("type")
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error notifying user", error=str(e), user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send notification to user"
        )


@router.post("/ws/broadcast/notification")
async def broadcast_notification(
    notification: Dict,
    event_type: str = "notification_created",
    handlers: WebSocketHandlers = Depends(get_websocket_handlers)
):
    """
    Broadcast a notification to subscribed users.
    
    This endpoint allows the notification system to broadcast
    notifications to WebSocket clients based on their subscriptions.
    """
    try:
        # Validate notification format
        required_fields = ["user_id", "title", "message"]
        for field in required_fields:
            if field not in notification:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Notification must contain '{field}' field"
                )
        
        # Broadcast notification
        notified_count = await handlers.broadcast_notification(notification, event_type)
        
        return JSONResponse(content={
            "notification_id": notification.get("id"),
            "event_type": event_type,
            "users_notified": notified_count,
            "broadcast_successful": True
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error broadcasting notification", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to broadcast notification"
        )


@router.post("/ws/file-upload/{file_id}/complete")
async def notify_file_upload_complete(
    file_id: str,
    url: str,
    metadata: Optional[Dict] = None,
    handlers: WebSocketHandlers = Depends(get_websocket_handlers)
):
    """
    Notify clients that a file upload has completed.
    
    This endpoint is called by the file upload service to notify
    WebSocket clients when their file uploads are complete.
    """
    try:
        success = await handlers.broadcast_file_upload_complete(
            file_id, url, metadata
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File upload not found or already completed"
            )
        
        return JSONResponse(content={
            "file_id": file_id,
            "url": url,
            "notification_sent": True
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error notifying file upload complete", error=str(e), file_id=file_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to notify file upload completion"
        )


@router.delete("/ws/connections/{connection_id}")
async def force_disconnect(
    connection_id: str,
    manager: WebSocketManager = Depends(get_websocket_manager)
):
    """
    Force disconnect a specific WebSocket connection.
    
    This endpoint allows administrators to forcefully disconnect
    a WebSocket connection if needed.
    """
    try:
        await manager.disconnect(connection_id)
        
        return JSONResponse(content={
            "connection_id": connection_id,
            "disconnected": True
        })
        
    except Exception as e:
        logger.error("Error force disconnecting", error=str(e), connection_id=connection_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to force disconnect connection"
        )


@router.post("/ws/shutdown")
async def shutdown_websocket_system(
    manager: WebSocketManager = Depends(get_websocket_manager)
):
    """
    Gracefully shutdown the WebSocket system.
    
    This endpoint allows for graceful shutdown of all WebSocket
    connections and cleanup of resources.
    """
    try:
        await manager.shutdown()
        
        # Reset global instances
        global websocket_manager, websocket_handlers
        websocket_manager = None
        websocket_handlers = None
        
        return JSONResponse(content={
            "shutdown": True,
            "message": "WebSocket system shutdown complete"
        })
        
    except Exception as e:
        logger.error("Error shutting down WebSocket system", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to shutdown WebSocket system"
        )


# Health check endpoint specific to WebSocket system
@router.get("/ws/health")
async def websocket_health_check():
    """
    Health check endpoint for the WebSocket system.
    
    Returns the status of the WebSocket manager and key metrics.
    """
    try:
        global websocket_manager
        
        if websocket_manager is None:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "status": "unavailable",
                    "message": "WebSocket manager not initialized"
                }
            )
        
        stats = websocket_manager.get_stats()
        
        health_status = {
            "status": "healthy",
            "websocket_manager": "active",
            "connections": stats["total_connections"],
            "rooms": stats["total_rooms"],
            "uptime_seconds": stats["uptime_seconds"],
            "error_rate": stats["errors"] / max(stats["messages_sent"], 1)
        }
        
        return JSONResponse(content=health_status)
        
    except Exception as e:
        logger.error("WebSocket health check failed", error=str(e))
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )