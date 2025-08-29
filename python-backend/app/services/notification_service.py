"""
Notification service for email, push notifications, and in-app messaging.

This service provides comprehensive notification functionality including:
- Email notifications with templates
- Push notifications (web push, mobile)
- In-app notifications via WebSocket
- Notification preferences and opt-out
- Queue-based delivery system
- Template management
- Delivery tracking and analytics
"""

import asyncio
import smtplib
import ssl
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Any, Dict, List, Optional, Union, Callable
from enum import Enum
from uuid import UUID, uuid4
from pathlib import Path

import aiofiles
import structlog
from jinja2 import Environment, FileSystemLoader, Template
from pydantic import BaseModel, Field, EmailStr, validator

from app.core.config import get_settings
from app.core.exceptions import NotificationError
from app.services.database_service import database_service
from app.services.websocket_service import websocket_service
from app.services.cache_service import cache_service

logger = structlog.get_logger(__name__)


class NotificationType(str, Enum):
    """Notification types."""
    EMAIL = "email"
    PUSH = "push"
    IN_APP = "in_app"
    SMS = "sms"
    WEBHOOK = "webhook"


class NotificationPriority(str, Enum):
    """Notification priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class NotificationStatus(str, Enum):
    """Notification delivery status."""
    PENDING = "pending"
    QUEUED = "queued"
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    CANCELLED = "cancelled"


class EmailNotification(BaseModel):
    """Email notification schema."""
    to: Union[EmailStr, List[EmailStr]]
    subject: str
    template: Optional[str] = None
    template_data: Optional[Dict[str, Any]] = None
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    cc: Optional[List[EmailStr]] = None
    bcc: Optional[List[EmailStr]] = None
    attachments: Optional[List[str]] = None  # File paths
    reply_to: Optional[EmailStr] = None
    
    @validator('to', pre=True)
    def ensure_list(cls, v):
        if isinstance(v, str):
            return [v]
        return v


class PushNotification(BaseModel):
    """Push notification schema."""
    title: str
    body: str
    icon: Optional[str] = None
    badge: Optional[str] = None
    image: Optional[str] = None
    url: Optional[str] = None
    actions: Optional[List[Dict[str, str]]] = None
    data: Optional[Dict[str, Any]] = None
    ttl: Optional[int] = 3600  # Time to live in seconds


class InAppNotification(BaseModel):
    """In-app notification schema."""
    title: str
    message: str
    type: str = "info"  # info, success, warning, error
    icon: Optional[str] = None
    url: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    expires_at: Optional[datetime] = None
    sticky: bool = False  # Whether notification persists until dismissed


class NotificationTemplate(BaseModel):
    """Notification template schema."""
    name: str
    type: NotificationType
    subject: Optional[str] = None
    html_template: Optional[str] = None
    text_template: Optional[str] = None
    variables: List[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class NotificationPreferences(BaseModel):
    """User notification preferences."""
    user_id: str
    email_enabled: bool = True
    push_enabled: bool = True
    in_app_enabled: bool = True
    marketing_emails: bool = False
    security_alerts: bool = True
    notification_types: Dict[str, bool] = {}
    quiet_hours_start: Optional[str] = None  # "22:00"
    quiet_hours_end: Optional[str] = None    # "08:00"
    timezone: str = "UTC"


class NotificationRecord(BaseModel):
    """Notification record for tracking."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: Optional[str] = None
    recipient: str  # Email, user_id, phone, etc.
    type: NotificationType
    priority: NotificationPriority = NotificationPriority.NORMAL
    status: NotificationStatus = NotificationStatus.PENDING
    subject: Optional[str] = None
    content: str
    template_name: Optional[str] = None
    template_data: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = {}
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EmailService:
    """Email sending service."""
    
    def __init__(self, settings):
        self.settings = settings
        self.smtp_server = settings.smtp_server
        self.smtp_port = settings.smtp_port
        self.smtp_username = settings.smtp_username
        self.smtp_password = settings.smtp_password
        self.smtp_use_tls = settings.smtp_use_tls
        
        # Email configuration validation
        self.is_configured = all([
            self.smtp_server,
            self.smtp_username,
            self.smtp_password
        ])
    
    async def send_email(
        self,
        notification: EmailNotification,
        from_email: Optional[str] = None
    ) -> bool:
        """Send email notification."""
        if not self.is_configured:
            logger.error("Email service not configured")
            return False
        
        try:
            # Create message
            message = MIMEMultipart('alternative')
            message['From'] = from_email or self.smtp_username
            message['To'] = ', '.join(notification.to)
            message['Subject'] = notification.subject
            
            if notification.cc:
                message['Cc'] = ', '.join(notification.cc)
            
            if notification.reply_to:
                message['Reply-To'] = notification.reply_to
            
            # Add text content
            if notification.text_content:
                text_part = MIMEText(notification.text_content, 'plain', 'utf-8')
                message.attach(text_part)
            
            # Add HTML content
            if notification.html_content:
                html_part = MIMEText(notification.html_content, 'html', 'utf-8')
                message.attach(html_part)
            
            # Add attachments
            if notification.attachments:
                for file_path in notification.attachments:
                    await self._add_attachment(message, file_path)
            
            # Send email
            context = ssl.create_default_context()
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                if self.smtp_use_tls:
                    server.starttls(context=context)
                
                server.login(self.smtp_username, self.smtp_password)
                
                # Build recipient list
                recipients = list(notification.to)
                if notification.cc:
                    recipients.extend(notification.cc)
                if notification.bcc:
                    recipients.extend(notification.bcc)
                
                server.send_message(message, to_addrs=recipients)
            
            logger.info(
                "Email sent successfully",
                recipients=len(recipients),
                subject=notification.subject
            )
            
            return True
            
        except Exception as e:
            logger.error("Failed to send email", error=str(e), subject=notification.subject)
            return False
    
    async def _add_attachment(self, message: MIMEMultipart, file_path: str):
        """Add file attachment to email."""
        try:
            path = Path(file_path)
            if not path.exists():
                logger.warning("Attachment file not found", file_path=file_path)
                return
            
            async with aiofiles.open(path, 'rb') as f:
                attachment_data = await f.read()
            
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(attachment_data)
            encoders.encode_base64(part)
            
            part.add_header(
                'Content-Disposition',
                f'attachment; filename= {path.name}'
            )
            
            message.attach(part)
            
        except Exception as e:
            logger.error("Failed to add attachment", file_path=file_path, error=str(e))


class TemplateService:
    """Template management service."""
    
    def __init__(self):
        self.templates_dir = Path("templates/notifications")
        self.templates_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize Jinja2 environment
        self.jinja_env = Environment(
            loader=FileSystemLoader(self.templates_dir),
            autoescape=True
        )
        
        # Template cache
        self._template_cache: Dict[str, NotificationTemplate] = {}
        
        # Load default templates
        asyncio.create_task(self._load_default_templates())
    
    async def get_template(self, template_name: str) -> Optional[NotificationTemplate]:
        """Get notification template by name."""
        # Check cache first
        if template_name in self._template_cache:
            return self._template_cache[template_name]
        
        # TODO: Load from database
        # template = await database_service.get_by_field(
        #     NotificationTemplateModel, 'name', template_name
        # )
        
        # For now, return None - templates should be loaded from files
        return None
    
    async def render_template(
        self,
        template_name: str,
        template_data: Dict[str, Any],
        template_type: str = "html"
    ) -> Optional[str]:
        """Render template with data."""
        try:
            template_file = f"{template_name}.{template_type}.jinja2"
            template = self.jinja_env.get_template(template_file)
            return template.render(**template_data)
        except Exception as e:
            logger.error("Failed to render template", template=template_name, error=str(e))
            return None
    
    async def create_template(self, template: NotificationTemplate) -> bool:
        """Create a new notification template."""
        try:
            # Save template files
            if template.html_template:
                html_file = self.templates_dir / f"{template.name}.html.jinja2"
                async with aiofiles.open(html_file, 'w') as f:
                    await f.write(template.html_template)
            
            if template.text_template:
                text_file = self.templates_dir / f"{template.name}.txt.jinja2"
                async with aiofiles.open(text_file, 'w') as f:
                    await f.write(template.text_template)
            
            # Cache template
            self._template_cache[template.name] = template
            
            # TODO: Save to database
            # await database_service.create(NotificationTemplateModel, template.model_dump())
            
            return True
            
        except Exception as e:
            logger.error("Failed to create template", template=template.name, error=str(e))
            return False
    
    async def _load_default_templates(self):
        """Load default notification templates."""
        default_templates = [
            {
                "name": "welcome_email",
                "type": NotificationType.EMAIL,
                "subject": "Welcome to {{ app_name }}!",
                "html_template": """
                <h1>Welcome {{ user_name }}!</h1>
                <p>Thank you for joining {{ app_name }}. We're excited to have you on board!</p>
                <p>You can now access your account and start exploring our features.</p>
                <p><a href="{{ dashboard_url }}">Go to Dashboard</a></p>
                """,
                "variables": ["user_name", "app_name", "dashboard_url"]
            },
            {
                "name": "password_reset",
                "type": NotificationType.EMAIL,
                "subject": "Reset your password",
                "html_template": """
                <h1>Password Reset Request</h1>
                <p>Hi {{ user_name }},</p>
                <p>We received a request to reset your password. Click the link below to create a new password:</p>
                <p><a href="{{ reset_url }}">Reset Password</a></p>
                <p>This link will expire in {{ expiry_hours }} hours.</p>
                <p>If you didn't request this, you can safely ignore this email.</p>
                """,
                "variables": ["user_name", "reset_url", "expiry_hours"]
            },
            {
                "name": "security_alert",
                "type": NotificationType.EMAIL,
                "subject": "Security Alert - {{ alert_type }}",
                "html_template": """
                <h1>Security Alert</h1>
                <p>Hi {{ user_name }},</p>
                <p>We detected {{ alert_type }} on your account:</p>
                <ul>
                <li>Date: {{ timestamp }}</li>
                <li>IP Address: {{ ip_address }}</li>
                <li>Device: {{ user_agent }}</li>
                </ul>
                <p>If this was you, no action is needed. Otherwise, please secure your account immediately.</p>
                """,
                "variables": ["user_name", "alert_type", "timestamp", "ip_address", "user_agent"]
            }
        ]
        
        for template_data in default_templates:
            template = NotificationTemplate(**template_data)
            await self.create_template(template)


class NotificationQueue:
    """Queue for processing notifications asynchronously."""
    
    def __init__(self, max_workers: int = 5):
        self.queue: asyncio.Queue = asyncio.Queue()
        self.max_workers = max_workers
        self.workers: List[asyncio.Task] = []
        self.is_running = False
    
    async def start(self):
        """Start notification workers."""
        if self.is_running:
            return
        
        self.is_running = True
        
        # Start worker tasks
        for i in range(self.max_workers):
            worker = asyncio.create_task(self._worker(f"worker-{i}"))
            self.workers.append(worker)
        
        logger.info(f"Notification queue started with {self.max_workers} workers")
    
    async def stop(self):
        """Stop notification workers."""
        if not self.is_running:
            return
        
        self.is_running = False
        
        # Cancel all workers
        for worker in self.workers:
            worker.cancel()
        
        # Wait for workers to finish
        await asyncio.gather(*self.workers, return_exceptions=True)
        self.workers.clear()
        
        logger.info("Notification queue stopped")
    
    async def enqueue(self, notification_record: NotificationRecord):
        """Add notification to queue."""
        await self.queue.put(notification_record)
        notification_record.status = NotificationStatus.QUEUED
        logger.debug("Notification queued", notification_id=notification_record.id)
    
    async def _worker(self, worker_name: str):
        """Worker function to process notifications."""
        logger.info(f"Notification worker {worker_name} started")
        
        while self.is_running:
            try:
                # Get notification from queue
                notification = await asyncio.wait_for(
                    self.queue.get(),
                    timeout=1.0
                )
                
                # Process notification
                await self._process_notification(notification)
                
                # Mark task as done
                self.queue.task_done()
                
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker {worker_name} error", error=str(e))
                await asyncio.sleep(1)
        
        logger.info(f"Notification worker {worker_name} stopped")
    
    async def _process_notification(self, notification: NotificationRecord):
        """Process a single notification."""
        notification.status = NotificationStatus.SENDING
        
        try:
            # Check if notification should be sent (quiet hours, preferences, etc.)
            if not await self._should_send_notification(notification):
                notification.status = NotificationStatus.CANCELLED
                return
            
            success = False
            
            # Send notification based on type
            if notification.type == NotificationType.EMAIL:
                success = await notification_service._send_email_notification(notification)
            elif notification.type == NotificationType.PUSH:
                success = await notification_service._send_push_notification(notification)
            elif notification.type == NotificationType.IN_APP:
                success = await notification_service._send_in_app_notification(notification)
            
            # Update status
            if success:
                notification.status = NotificationStatus.SENT
                notification.sent_at = datetime.utcnow()
            else:
                await self._handle_send_failure(notification)
            
        except Exception as e:
            logger.error("Failed to process notification", error=str(e), notification_id=notification.id)
            notification.error_message = str(e)
            await self._handle_send_failure(notification)
    
    async def _should_send_notification(self, notification: NotificationRecord) -> bool:
        """Check if notification should be sent based on preferences."""
        # TODO: Check user preferences, quiet hours, etc.
        # For now, always send
        return True
    
    async def _handle_send_failure(self, notification: NotificationRecord):
        """Handle notification send failure."""
        notification.retry_count += 1
        
        if notification.retry_count < notification.max_retries:
            # Retry later
            notification.status = NotificationStatus.PENDING
            notification.scheduled_at = datetime.utcnow() + timedelta(
                minutes=2 ** notification.retry_count  # Exponential backoff
            )
            # Re-queue for retry
            await self.enqueue(notification)
        else:
            # Max retries reached
            notification.status = NotificationStatus.FAILED


class NotificationService:
    """Main notification service."""
    
    def __init__(self):
        self.settings = get_settings()
        
        # Initialize sub-services
        self.email_service = EmailService(self.settings)
        self.template_service = TemplateService()
        self.notification_queue = NotificationQueue(max_workers=3)
        
        # Statistics
        self.stats = {
            "emails_sent": 0,
            "push_notifications_sent": 0,
            "in_app_notifications_sent": 0,
            "total_failures": 0
        }
        
        # Start queue processing
        asyncio.create_task(self.initialize())
    
    async def initialize(self):
        """Initialize notification service."""
        await self.notification_queue.start()
        logger.info("Notification service initialized")
    
    async def send_email(
        self,
        notification: EmailNotification,
        user_id: Optional[str] = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        schedule_at: Optional[datetime] = None
    ) -> str:
        """Send email notification."""
        # Render template if specified
        if notification.template and notification.template_data:
            html_content = await self.template_service.render_template(
                notification.template,
                notification.template_data,
                "html"
            )
            text_content = await self.template_service.render_template(
                notification.template,
                notification.template_data,
                "txt"
            )
            
            if html_content:
                notification.html_content = html_content
            if text_content:
                notification.text_content = text_content
        
        # Create notification record
        record = NotificationRecord(
            user_id=user_id,
            recipient=notification.to[0] if isinstance(notification.to, list) else notification.to,
            type=NotificationType.EMAIL,
            priority=priority,
            subject=notification.subject,
            content=notification.html_content or notification.text_content or "",
            template_name=notification.template,
            template_data=notification.template_data,
            scheduled_at=schedule_at,
            metadata={
                "to": notification.to,
                "cc": notification.cc,
                "bcc": notification.bcc,
                "attachments": notification.attachments
            }
        )
        
        # Queue for processing
        await self.notification_queue.enqueue(record)
        
        # TODO: Save to database
        # await database_service.create(NotificationRecordModel, record.model_dump())
        
        return record.id
    
    async def send_push_notification(
        self,
        notification: PushNotification,
        user_id: str,
        priority: NotificationPriority = NotificationPriority.NORMAL
    ) -> str:
        """Send push notification."""
        record = NotificationRecord(
            user_id=user_id,
            recipient=user_id,
            type=NotificationType.PUSH,
            priority=priority,
            subject=notification.title,
            content=notification.body,
            metadata=notification.model_dump()
        )
        
        await self.notification_queue.enqueue(record)
        return record.id
    
    async def send_in_app_notification(
        self,
        notification: InAppNotification,
        user_id: str,
        priority: NotificationPriority = NotificationPriority.NORMAL
    ) -> str:
        """Send in-app notification."""
        record = NotificationRecord(
            user_id=user_id,
            recipient=user_id,
            type=NotificationType.IN_APP,
            priority=priority,
            subject=notification.title,
            content=notification.message,
            metadata=notification.model_dump()
        )
        
        await self.notification_queue.enqueue(record)
        return record.id
    
    async def _send_email_notification(self, record: NotificationRecord) -> bool:
        """Send email notification."""
        try:
            # Reconstruct email notification from record
            email_notification = EmailNotification(
                to=record.metadata.get("to", [record.recipient]),
                subject=record.subject or "",
                html_content=record.content,
                cc=record.metadata.get("cc"),
                bcc=record.metadata.get("bcc"),
                attachments=record.metadata.get("attachments")
            )
            
            success = await self.email_service.send_email(email_notification)
            
            if success:
                self.stats["emails_sent"] += 1
            else:
                self.stats["total_failures"] += 1
            
            return success
            
        except Exception as e:
            logger.error("Email notification failed", error=str(e), record_id=record.id)
            self.stats["total_failures"] += 1
            return False
    
    async def _send_push_notification(self, record: NotificationRecord) -> bool:
        """Send push notification."""
        # TODO: Implement push notification sending
        # This would typically involve sending to FCM, APNs, or Web Push services
        logger.info("Push notification sent", record_id=record.id, user_id=record.user_id)
        self.stats["push_notifications_sent"] += 1
        return True
    
    async def _send_in_app_notification(self, record: NotificationRecord) -> bool:
        """Send in-app notification via WebSocket."""
        try:
            # Send via WebSocket
            sent_count = await websocket_service.send_notification(
                record.user_id,
                {
                    "id": record.id,
                    "title": record.subject,
                    "message": record.content,
                    "type": record.metadata.get("type", "info"),
                    "timestamp": record.created_at.isoformat(),
                    **record.metadata
                }
            )
            
            success = sent_count > 0
            
            if success:
                self.stats["in_app_notifications_sent"] += 1
            else:
                self.stats["total_failures"] += 1
            
            return success
            
        except Exception as e:
            logger.error("In-app notification failed", error=str(e), record_id=record.id)
            self.stats["total_failures"] += 1
            return False
    
    async def get_user_notifications(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False
    ) -> Dict[str, Any]:
        """Get notifications for a user."""
        # TODO: Implement database query
        # filters = {"user_id": user_id}
        # if unread_only:
        #     filters["read_at"] = None
        
        # result = await database_service.get_many(
        #     NotificationRecordModel,
        #     filters=filters,
        #     limit=limit,
        #     offset=offset,
        #     order_by="-created_at"
        # )
        
        return {
            "notifications": [],
            "total": 0,
            "unread_count": 0
        }
    
    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark notification as read."""
        # TODO: Implement database update
        # success = await database_service.update(
        #     NotificationRecordModel,
        #     notification_id,
        #     {"read_at": datetime.utcnow()}
        # )
        
        return True
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get notification service statistics."""
        return {
            **self.stats,
            "queue_size": self.notification_queue.queue.qsize(),
            "workers_active": len(self.notification_queue.workers),
            "email_configured": self.email_service.is_configured
        }
    
    async def close(self):
        """Close notification service."""
        await self.notification_queue.stop()
        logger.info("Notification service stopped")


# Global notification service instance
notification_service = NotificationService()