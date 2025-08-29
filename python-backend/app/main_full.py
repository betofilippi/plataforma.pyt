"""
FastAPI Complete Backend - Full Implementation
All endpoints needed for 100% Python migration
"""

from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Union
import jwt
import bcrypt
import os
import json
from uuid import uuid4
from enum import Enum
import asyncio

# Email service functions (will be imported after app starts)
email_service = None
send_welcome_email = None
send_verification_email = None
send_approval_email = None
send_rejection_email = None

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Create FastAPI app
app = FastAPI(
    title="Plataforma Python Backend - Complete",
    description="Complete Python backend with all endpoints for 100% migration",
    version="2.0.0"
)

# Email service functions are implemented as individual helper functions in the HELPER FUNCTIONS section

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3333",
        "http://localhost:3000",
        "http://localhost:3002",
        "http://localhost:5173",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# ENUMS
# =====================================================================

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    GUEST = "guest"

class UserStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    REJECTED = "rejected"

class PermissionType(str, Enum):
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"

class ModuleStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    INSTALLING = "installing"
    ERROR = "error"

class LogLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    DEBUG = "debug"

class UserStatus(str, Enum):
    PENDING_EMAIL_VERIFICATION = "pending_email_verification"
    PENDING_ADMIN_APPROVAL = "pending_admin_approval"
    ACTIVE = "active"
    REJECTED = "rejected"
    SUSPENDED = "suspended"

# =====================================================================
# PYDANTIC MODELS
# =====================================================================

# Authentication Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.USER
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    is_active: bool = True
    status: UserStatus = UserStatus.ACTIVE

class UserCreate(UserBase):
    password: str
    send_welcome_email: bool = True

class UserRegistration(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: UserRole = UserRole.USER
    send_verification: bool = True

class UserApproval(BaseModel):
    user_id: str
    approved: bool
    rejection_reason: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# User Registration Models
class UserRegistration(BaseModel):
    email: EmailStr
    name: str
    password: str
    phone: Optional[str] = None
    department: Optional[str] = None

class UserApproval(BaseModel):
    user_id: str
    approved: bool
    assigned_modules: Optional[List[str]] = []
    approval_notes: Optional[str] = None

class UserModulesUpdate(BaseModel):
    assigned_modules: List[str]
    notes: Optional[str] = None

class EmailVerificationResponse(BaseModel):
    success: bool
    message: str
    requires_approval: bool = False

class PendingUserResponse(UserBase):
    id: str
    created_at: datetime
    registration_date: datetime
    email_verified: bool
    admin_approved: bool
    approval_notes: Optional[str] = None
    assigned_modules: List[str] = []

# Permission Models
class Permission(BaseModel):
    id: str
    name: str
    description: str
    resource: str
    action: PermissionType
    module: Optional[str] = None

class PermissionAssign(BaseModel):
    user_id: str
    permission_ids: List[str]

class UserPermissions(BaseModel):
    user_id: str
    permissions: List[Permission]
    roles: List[Dict[str, Any]]
    max_level: int

# Dashboard Models
class DashboardStats(BaseModel):
    total_users: int
    active_users: int
    total_modules: int
    active_modules: int
    total_logs: int
    system_health: float
    storage_used: float
    api_calls_today: int

class ChartData(BaseModel):
    labels: List[str]
    datasets: List[Dict[str, Any]]

class Activity(BaseModel):
    id: str
    user_id: str
    user_name: str
    action: str
    resource: str
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None

# Module Models
class Module(BaseModel):
    id: str
    name: str
    display_name: str
    description: str
    version: str
    author: str
    icon: str
    status: ModuleStatus
    permissions: List[str]
    dependencies: List[str]
    config: Dict[str, Any]
    installed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ModuleInstall(BaseModel):
    module_id: str
    config: Optional[Dict[str, Any]] = {}

# Profile Models
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None
    preferences: Optional[Dict[str, Any]] = None

# Settings Models
class Settings(BaseModel):
    id: str
    category: str
    key: str
    value: Any
    description: str
    is_public: bool = False
    updated_at: datetime
    updated_by: Optional[str] = None

class SettingsUpdate(BaseModel):
    settings: List[Dict[str, Any]]

# Log Models
class LogEntry(BaseModel):
    id: str
    level: LogLevel
    message: str
    source: str
    user_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime

class LogCreate(BaseModel):
    level: LogLevel
    message: str
    source: str
    metadata: Optional[Dict[str, Any]] = None

# Notification Models
class Notification(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    is_read: bool = False
    action_url: Optional[str] = None
    created_at: datetime

# Session Management Models
class WindowSessionData(BaseModel):
    id: str
    componentType: str
    title: str
    position: dict
    size: dict
    zIndex: int
    isMinimized: bool
    isMaximized: bool
    isVisible: bool
    componentData: Optional[dict] = None
    icon: Optional[str] = None
    canResize: bool = True
    canMove: bool = True
    snapPosition: Optional[str] = None

class UserSession(BaseModel):
    userId: str
    sessionId: str
    timestamp: int
    version: str
    currentRoute: str
    windowsState: List[WindowSessionData]
    appState: dict
    metadata: dict

# =====================================================================
# MOCK DATABASE
# =====================================================================

# Fixed password hashes
users_db = {
    "admin@plataforma.app": {
        "id": "user-1",
        "email": "admin@plataforma.app",
        "name": "Platform Admin",
        "password": "$2b$12$KzOoOhrzUW9.EoIs5WeaPukdZc3M71s2C1GPlkfADvdhNf9iwXZwm",  # admin123
        "role": "admin",
        "roles": ["admin"],
        "avatar_url": None,
        "phone": "+55 11 99999-9999",
        "department": "IT",
        "is_active": True,
        "status": "active",
        "email_verified": True,
        "verification_token": None,
        "status": "active",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "last_login": None,
        "registration_date": "2024-01-01T00:00:00Z",
        "email_verified": True,
        "admin_approved": True,
        "assigned_modules": ["dashboard", "crm", "inventory"],
        "approval_notes": "System Administrator - Default account",
        "bio": "System Administrator",
        "location": "São Paulo, Brazil",
        "website": "https://plataforma.app",
        "social_links": {"linkedin": "https://linkedin.com", "github": "https://github.com"},
        "preferences": {"theme": "dark", "language": "pt-BR", "notifications": True}
    },
    "user@plataforma.app": {
        "id": "user-2",
        "email": "user@plataforma.app",
        "name": "Regular User",
        "password": "$2b$12$9zuyf45Uw9oSNCkVF7Yuz./dv71RYGEW/VcOwiPqmZmMKutRMxPR6",  # user123
        "role": "user",
        "roles": ["user"],
        "avatar_url": None,
        "phone": "+55 11 88888-8888",
        "department": "Sales",
        "is_active": True,
        "status": "active",
        "email_verified": True,
        "verification_token": None,
        "status": "active",
        "created_at": "2024-01-15T00:00:00Z",
        "updated_at": "2024-01-15T00:00:00Z",
        "last_login": None,
        "registration_date": "2024-01-15T00:00:00Z",
        "email_verified": True,
        "admin_approved": True,
        "assigned_modules": ["dashboard"],
        "approval_notes": "Regular user access approved",
        "bio": "Sales Representative",
        "location": "Rio de Janeiro, Brazil",
        "website": None,
        "social_links": {},
        "preferences": {"theme": "light", "language": "pt-BR", "notifications": True}
    },
    "manager@plataforma.app": {
        "id": "user-3",
        "email": "manager@plataforma.app",
        "name": "Manager User",
        "password": "$2b$12$ornjaEZSZxHYn44aQfvWQO7gfbwyF79oBmPNUpX8YrtFr1mRTROoy",  # manager123
        "role": "manager",
        "roles": ["manager"],
        "avatar_url": None,
        "phone": "+55 11 77777-7777",
        "department": "Operations",
        "is_active": True,
        "status": "active",
        "email_verified": True,
        "verification_token": None,
        "status": "active",
        "created_at": "2024-02-01T00:00:00Z",
        "updated_at": "2024-02-01T00:00:00Z",
        "last_login": None,
        "registration_date": "2024-02-01T00:00:00Z",
        "email_verified": True,
        "admin_approved": True,
        "assigned_modules": ["dashboard", "crm"],
        "approval_notes": "Manager level access approved",
        "bio": "Operations Manager",
        "location": "Brasília, Brazil",
        "website": None,
        "social_links": {"linkedin": "https://linkedin.com"},
        "preferences": {"theme": "auto", "language": "en-US", "notifications": False}
    }
}

# Permissions database
permissions_db = {
    "perm-1": {"id": "perm-1", "name": "users.read", "description": "View users", "resource": "users", "action": "read", "module": None},
    "perm-2": {"id": "perm-2", "name": "users.write", "description": "Create/Edit users", "resource": "users", "action": "write", "module": None},
    "perm-3": {"id": "perm-3", "name": "users.delete", "description": "Delete users", "resource": "users", "action": "delete", "module": None},
    "perm-4": {"id": "perm-4", "name": "modules.read", "description": "View modules", "resource": "modules", "action": "read", "module": None},
    "perm-5": {"id": "perm-5", "name": "modules.write", "description": "Install modules", "resource": "modules", "action": "write", "module": None},
    "perm-6": {"id": "perm-6", "name": "settings.read", "description": "View settings", "resource": "settings", "action": "read", "module": None},
    "perm-7": {"id": "perm-7", "name": "settings.write", "description": "Change settings", "resource": "settings", "action": "write", "module": None},
    "perm-8": {"id": "perm-8", "name": "logs.read", "description": "View logs", "resource": "logs", "action": "read", "module": None},
}

# User permissions mapping
user_permissions_db = {
    "user-1": ["perm-1", "perm-2", "perm-3", "perm-4", "perm-5", "perm-6", "perm-7", "perm-8"],  # Admin - all permissions
    "user-2": ["perm-1", "perm-4", "perm-6"],  # User - read only
    "user-3": ["perm-1", "perm-2", "perm-4", "perm-5", "perm-6", "perm-7"],  # Manager - most permissions
}

# Modules database
modules_db = {
    "mod-1": {
        "id": "mod-1",
        "name": "dashboard",
        "display_name": "Dashboard",
        "description": "Main dashboard module with analytics",
        "version": "1.0.0",
        "author": "Platform Team",
        "icon": "LayoutDashboard",
        "status": "active",
        "permissions": ["dashboard.view", "dashboard.edit"],
        "dependencies": [],
        "config": {"refresh_interval": 30, "widgets": ["stats", "charts", "activities"]},
        "installed_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    },
    "mod-2": {
        "id": "mod-2",
        "name": "crm",
        "display_name": "CRM",
        "description": "Customer Relationship Management",
        "version": "2.1.0",
        "author": "Platform Team",
        "icon": "Users",
        "status": "active",
        "permissions": ["crm.view", "crm.edit", "crm.delete"],
        "dependencies": ["dashboard"],
        "config": {"features": ["contacts", "deals", "tasks"]},
        "installed_at": "2024-02-01T00:00:00Z",
        "updated_at": "2024-03-01T00:00:00Z"
    },
    "mod-3": {
        "id": "mod-3",
        "name": "inventory",
        "display_name": "Inventory",
        "description": "Inventory Management System",
        "version": "1.5.0",
        "author": "Platform Team",
        "icon": "Package",
        "status": "inactive",
        "permissions": ["inventory.view", "inventory.edit"],
        "dependencies": [],
        "config": {"warehouses": ["main", "secondary"]},
        "installed_at": "2024-03-01T00:00:00Z",
        "updated_at": "2024-03-15T00:00:00Z"
    }
}

# Settings database
settings_db = {
    "set-1": {
        "id": "set-1",
        "category": "system",
        "key": "app_name",
        "value": "Plataforma",
        "description": "Application name",
        "is_public": True,
        "updated_at": "2024-01-01T00:00:00Z",
        "updated_by": "user-1"
    },
    "set-2": {
        "id": "set-2",
        "category": "system",
        "key": "maintenance_mode",
        "value": False,
        "description": "Enable maintenance mode",
        "is_public": False,
        "updated_at": "2024-01-01T00:00:00Z",
        "updated_by": "user-1"
    },
    "set-3": {
        "id": "set-3",
        "category": "email",
        "key": "smtp_host",
        "value": "smtp.gmail.com",
        "description": "SMTP server host",
        "is_public": False,
        "updated_at": "2024-01-01T00:00:00Z",
        "updated_by": "user-1"
    },
    "set-4": {
        "id": "set-4",
        "category": "security",
        "key": "password_min_length",
        "value": 8,
        "description": "Minimum password length",
        "is_public": True,
        "updated_at": "2024-01-01T00:00:00Z",
        "updated_by": "user-1"
    }
}

# Logs database
logs_db = []

# Activities database
activities_db = []

# Notifications database
notifications_db = {
    "user-1": [
        {
            "id": "notif-1",
            "user_id": "user-1",
            "title": "Welcome to Plataforma",
            "message": "Your account has been created successfully",
            "type": "info",
            "is_read": True,
            "action_url": "/profile",
            "created_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": "notif-2",
            "user_id": "user-1",
            "title": "New Module Available",
            "message": "The Reports module is now available for installation",
            "type": "info",
            "is_read": False,
            "action_url": "/modules",
            "created_at": "2024-08-28T10:00:00Z"
        }
    ],
    "user-2": [
        {
            "id": "notif-3",
            "user_id": "user-2",
            "title": "Password Policy Update",
            "message": "Please update your password to meet new security requirements",
            "type": "warning",
            "is_read": False,
            "action_url": "/profile/security",
            "created_at": "2024-08-27T15:00:00Z"
        }
    ]
}

# User Sessions Storage
user_sessions_db = {}  # {user_id: UserSession}

# Email verification tokens
email_verification_tokens = {}

# Email verification tokens database
email_verification_tokens = {}  # {token: {"email": str, "expires_at": datetime, "user_id": str}}

# =====================================================================
# HELPER FUNCTIONS
# =====================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def hash_password(password: str) -> str:
    """Hash a password"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str):
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

def get_current_user(authorization: Optional[str] = None):
    """Get current user from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    email = payload.get("sub")
    
    if email and email in users_db:
        return users_db[email]
    return None

def require_auth(authorization: Optional[str] = Header(None)):
    """Require authentication"""
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user

def require_role(role: UserRole):
    """Require specific role"""
    def role_checker(user: dict = Depends(require_auth)):
        if user["role"] != role and user["role"] != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {role} required"
            )
        return user
    return role_checker

def log_activity(user_id: str, action: str, resource: str, details: Optional[Dict] = None):
    """Log user activity"""
    activity = {
        "id": f"act-{uuid4()}",
        "user_id": user_id,
        "user_name": users_db.get(user_id, {}).get("name", "Unknown"),
        "action": action,
        "resource": resource,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "details": details or {}
    }
    activities_db.append(activity)
    # Keep only last 100 activities
    if len(activities_db) > 100:
        activities_db.pop(0)
    return activity

def create_email_verification_token(email: str, user_id: str) -> str:
    """Create email verification token"""
    token = f"verify-{uuid4()}"
    email_verification_tokens[token] = {
        "email": email,
        "user_id": user_id,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(hours=24)
    }
    return token

def verify_email_token(token: str) -> Optional[Dict]:
    """Verify email verification token"""
    if token not in email_verification_tokens:
        return None
    
    token_data = email_verification_tokens[token]
    if datetime.utcnow() > token_data["expires_at"]:
        del email_verification_tokens[token]
        return None
    
    return token_data

def generate_verification_token() -> str:
    """Generate a secure verification token"""
    import secrets
    return secrets.token_urlsafe(32)

def create_email_verification_token(email: str, user_id: str) -> str:
    """Create and store email verification token"""
    token = generate_verification_token()
    expires_at = datetime.utcnow() + timedelta(hours=24)  # Token expires in 24 hours
    
    email_verification_tokens[token] = {
        "email": email,
        "user_id": user_id,
        "expires_at": expires_at,
        "created_at": datetime.utcnow()
    }
    
    # Clean up expired tokens
    current_time = datetime.utcnow()
    expired_tokens = [t for t, data in email_verification_tokens.items() if data["expires_at"] < current_time]
    for expired_token in expired_tokens:
        del email_verification_tokens[expired_token]
    
    return token

def verify_email_token(token: str) -> Optional[Dict]:
    """Verify email verification token"""
    if token not in email_verification_tokens:
        return None
    
    token_data = email_verification_tokens[token]
    
    # Check if token is expired
    if datetime.utcnow() > token_data["expires_at"]:
        del email_verification_tokens[token]
        return None
    
    return token_data

def send_verification_email(email: str, token: str):
    """Send verification email (mock implementation)"""
    # In production, use a real email service like SendGrid, SES, etc.
    verification_url = f"http://localhost:8001/api/v1/auth/verify-email/{token}"
    print(f"MOCK EMAIL: Verification email sent to {email}")
    print(f"Verification URL: {verification_url}")
    return True

# =====================================================================
# AUTHENTICATION ENDPOINTS
# =====================================================================

@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Login endpoint"""
    user = users_db.get(request.email)
    
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Update last login
    user["last_login"] = datetime.utcnow().isoformat() + "Z"
    
    # Create tokens
    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]}
    )
    refresh_token = create_refresh_token(
        data={"sub": user["email"], "role": user["role"]}
    )
    
    # Log activity
    log_activity(user["email"], "login", "auth")
    
    # Remove password from response
    user_data = {k: v for k, v in user.items() if k != "password"}
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user_data
    }

@app.post("/api/v1/auth/logout")
async def logout(authorization: Optional[str] = None):
    """Logout endpoint"""
    user = get_current_user(authorization)
    if user:
        log_activity(user["email"], "logout", "auth")
    
    return {"success": True, "message": "Logged out successfully"}

@app.post("/api/v1/auth/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token"""
    try:
        payload = decode_token(request.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        email = payload.get("sub")
        user = users_db.get(email)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Create new tokens
        access_token = create_access_token(
            data={"sub": user["email"], "role": user["role"]}
        )
        new_refresh_token = create_refresh_token(
            data={"sub": user["email"], "role": user["role"]}
        )
        
        user_data = {k: v for k, v in user.items() if k != "password"}
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@app.post("/api/v1/auth/register")
async def register_user(user_registration: UserRegistration):
    """User self-registration"""
    # Check if email already exists
    if user_registration.email in users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password strength (basic validation)
    if len(user_registration.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    # Create new user
    user_id = f"user-{uuid4()}"
    new_user = {
        "id": user_id,
        "email": user_registration.email,
        "name": user_registration.name,
        "password": hash_password(user_registration.password),
        "role": "user",  # Default role
        "avatar_url": None,
        "phone": user_registration.phone,
        "department": user_registration.department,
        "is_active": False,  # Inactive until approved
        "status": "pending_email_verification",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "last_login": None,
        "registration_date": datetime.utcnow().isoformat() + "Z",
        "email_verified": False,
        "admin_approved": False,
        "assigned_modules": [],
        "approval_notes": None,
        "bio": None,
        "location": None,
        "website": None,
        "social_links": {},
        "preferences": {"theme": "light", "language": "pt-BR", "notifications": True}
    }
    
    # Store user in database
    users_db[user_registration.email] = new_user
    user_permissions_db[user_id] = []  # No permissions until approved
    
    # Generate and send verification email
    verification_token = create_email_verification_token(user_registration.email, user_id)
    send_verification_email(user_registration.email, verification_token)
    
    # Log activity
    log_activity(user_registration.email, "user_registration", "auth", {"user_id": user_id})
    
    return {
        "success": True,
        "message": "Registration successful! Please check your email to verify your account.",
        "user_id": user_id,
        "next_step": "email_verification"
    }

@app.get("/api/v1/auth/verify-email/{token}", response_model=EmailVerificationResponse)
async def verify_email(token: str):
    """Email verification endpoint"""
    # Verify the token
    token_data = verify_email_token(token)
    
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    email = token_data["email"]
    user_id = token_data["user_id"]
    
    # Find and update user
    if email not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user = users_db[email]
    
    # Update user status
    user["email_verified"] = True
    user["status"] = "pending_admin_approval"
    user["updated_at"] = datetime.utcnow().isoformat() + "Z"
    
    # Remove used token
    del email_verification_tokens[token]
    
    # Log activity
    log_activity(email, "email_verification", "auth", {"user_id": user_id})
    
    # Create notification for admins about new user pending approval
    admin_emails = [email for email, u in users_db.items() if u["role"] == "admin"]
    for admin_email in admin_emails:
        admin_user_id = users_db[admin_email]["id"]
        if admin_user_id not in notifications_db:
            notifications_db[admin_user_id] = []
        
        notification = {
            "id": f"notif-{uuid4()}",
            "user_id": admin_user_id,
            "title": "New User Pending Approval",
            "message": f"User {user['name']} ({email}) has verified their email and is awaiting admin approval",
            "type": "info",
            "is_read": False,
            "action_url": "/admin/pending-users",
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        notifications_db[admin_user_id].append(notification)
    
    return {
        "success": True,
        "message": "Email verified successfully! Your account is now pending admin approval.",
        "requires_approval": True
    }

@app.post("/api/v1/auth/register")
async def register_user(user_registration: UserRegistration):
    """Public user registration endpoint"""
    # Check if email already exists
    if user_registration.email in users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user with pending status
    user_id = f"user-{uuid4()}"
    new_user = {
        "id": user_id,
        "email": user_registration.email,
        "name": user_registration.name,
        "password": hash_password(user_registration.password),
        "role": user_registration.role,
        "avatar_url": None,
        "phone": None,
        "department": None,
        "is_active": False,
        "status": "pending",
        "email_verified": False,
        "verification_token": None,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "last_login": None,
        "bio": None,
        "location": None,
        "website": None,
        "social_links": {},
        "preferences": {"theme": "light", "language": "pt-BR", "notifications": True}
    }
    
    users_db[user_registration.email] = new_user
    user_permissions_db[user_id] = []
    
    # Send verification email if requested
    if user_registration.send_verification:
        verification_token = create_email_verification_token(user_registration.email, user_id)
        new_user["verification_token"] = verification_token
        
        asyncio.create_task(send_verification_email(
            user_email=user_registration.email,
            user_name=user_registration.name,
            verification_token=verification_token
        ))
    
    # Log activity
    log_activity(user_registration.email, "user_registration", "auth", {"user_id": user_id})
    
    return {
        "success": True,
        "message": "Registration successful! Please check your email to verify your account." if user_registration.send_verification else "Registration successful! Your account is pending admin approval.",
        "user_id": user_id,
        "requires_verification": user_registration.send_verification,
        "requires_approval": True
    }

@app.post("/api/v1/admin/users/{user_id}/approve")
async def approve_user(
    user_id: str,
    approval: UserApproval,
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Approve or reject user account (Admin only)"""
    # Find user
    user_email = None
    for email, user in users_db.items():
        if user["id"] == user_id:
            user_email = email
            break
    
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user = users_db[user_email]
    
    if approval.approved:
        # Approve user
        user["status"] = "active"
        user["is_active"] = True
        user["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        # Send approval email
        asyncio.create_task(send_approval_email(
            user_email=user_email,
            user_name=user["name"],
            user_role=user["role"],
            approved_by=current_user["name"]
        ))
        
        # Log activity
        log_activity(current_user["email"], "approve_user", "users", {"user_id": user_id})
        
        return {
            "success": True,
            "message": f"User {user['name']} has been approved successfully",
            "action": "approved"
        }
    else:
        # Reject user
        user["status"] = "rejected"
        user["is_active"] = False
        user["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        # Send rejection email
        asyncio.create_task(send_rejection_email(
            user_email=user_email,
            user_name=user["name"],
            reviewed_by=current_user["name"],
            rejection_reason=approval.rejection_reason
        ))
        
        # Log activity
        log_activity(current_user["email"], "reject_user", "users", {
            "user_id": user_id,
            "reason": approval.rejection_reason
        })
        
        return {
            "success": True,
            "message": f"User {user['name']} has been rejected",
            "action": "rejected",
            "reason": approval.rejection_reason
        }

# Old duplicate endpoint removed

# =====================================================================
# USER MANAGEMENT ENDPOINTS
# =======================================================================

@app.get("/api/v1/users", response_model=List[UserResponse])
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    authorization: Optional[str] = Depends(require_auth)
):
    """Get all users with pagination and filters"""
    users = []
    for email, user in users_db.items():
        # Apply filters
        if role and user["role"] != role:
            continue
        if is_active is not None and user["is_active"] != is_active:
            continue
        if search and search.lower() not in user["name"].lower() and search.lower() not in email.lower():
            continue
        
        # Remove password
        user_data = {k: v for k, v in user.items() if k != "password"}
        users.append(user_data)
    
    # Apply pagination
    total = len(users)
    users = users[skip:skip + limit]
    
    return users

@app.get("/api/v1/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    authorization: Optional[str] = Depends(require_auth)
):
    """Get user by ID"""
    for email, user in users_db.items():
        if user["id"] == user_id:
            user_data = {k: v for k, v in user.items() if k != "password"}
            return user_data
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found"
    )

@app.post("/api/v1/users", response_model=UserResponse)
async def create_user(
    user_create: UserCreate,
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Create new user (Admin only)"""
    # Check if email already exists
    if user_create.email in users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user_id = f"user-{uuid4()}"
    new_user = {
        "id": user_id,
        "email": user_create.email,
        "name": user_create.name,
        "password": hash_password(user_create.password),
        "role": user_create.role,
        "avatar_url": user_create.avatar_url,
        "phone": user_create.phone,
        "department": user_create.department,
        "is_active": user_create.is_active,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "last_login": None,
        "bio": None,
        "location": None,
        "website": None,
        "social_links": {},
        "preferences": {"theme": "light", "language": "pt-BR", "notifications": True}
    }
    
    users_db[user_create.email] = new_user
    user_permissions_db[user_id] = []
    
    # Send welcome email if requested
    if user_create.send_welcome_email:
        asyncio.create_task(send_welcome_email(
            user_email=user_create.email,
            user_name=user_create.name,
            user_role=user_create.role
        ))
    
    # Log activity
    log_activity(current_user["email"], "create_user", "users", {"user_id": user_id})
    
    # Return without password
    user_response = {k: v for k, v in new_user.items() if k != "password"}
    return user_response

@app.put("/api/v1/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: dict = Depends(require_auth)
):
    """Update user"""
    # Find user
    user_email = None
    for email, user in users_db.items():
        if user["id"] == user_id:
            user_email = email
            break
    
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permissions (admin or self)
    if current_user["role"] != UserRole.ADMIN and current_user["id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other users"
        )
    
    # Update user fields
    user = users_db[user_email]
    update_data = user_update.dict(exclude_unset=True)
    
    # Don't allow non-admins to change role
    if "role" in update_data and current_user["role"] != UserRole.ADMIN:
        del update_data["role"]
    
    for field, value in update_data.items():
        if value is not None:
            user[field] = value
    
    user["updated_at"] = datetime.utcnow().isoformat() + "Z"
    
    # Log activity
    log_activity(current_user["email"], "update_user", "users", {"user_id": user_id})
    
    # Return without password
    user_response = {k: v for k, v in user.items() if k != "password"}
    return user_response

@app.delete("/api/v1/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Delete user (Admin only)"""
    # Find and remove user
    user_email = None
    for email, user in users_db.items():
        if user["id"] == user_id:
            user_email = email
            break
    
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Don't allow deleting yourself
    if current_user["id"] == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    del users_db[user_email]
    if user_id in user_permissions_db:
        del user_permissions_db[user_id]
    
    # Log activity
    log_activity(current_user["email"], "delete_user", "users", {"user_id": user_id})
    
    return {"success": True, "message": "User deleted successfully"}

@app.put("/api/v1/users/{user_id}/password")
async def change_password(
    user_id: str,
    password_change: PasswordChange,
    current_user: dict = Depends(require_auth)
):
    """Change user password"""
    # Only allow users to change their own password
    if current_user["id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only change your own password"
        )
    
    # Verify current password
    if not verify_password(password_change.current_password, current_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    for email, user in users_db.items():
        if user["id"] == user_id:
            user["password"] = hash_password(password_change.new_password)
            user["updated_at"] = datetime.utcnow().isoformat() + "Z"
            break
    
    # Log activity
    log_activity(current_user["email"], "change_password", "users")
    
    return {"success": True, "message": "Password changed successfully"}

# =====================================================================
# PERMISSION ENDPOINTS
# =====================================================================

@app.get("/api/v1/permissions", response_model=List[Permission])
async def get_permissions(
    current_user: dict = Depends(require_auth)
):
    """Get all available permissions"""
    return list(permissions_db.values())

@app.get("/api/v1/my-permissions", response_model=UserPermissions)
async def get_my_permissions(
    module: Optional[str] = None,
    current_user: dict = Depends(require_auth)
):
    """Get current user's permissions"""
    user_id = current_user["id"]
    permission_ids = user_permissions_db.get(user_id, [])
    
    permissions = []
    for perm_id in permission_ids:
        if perm_id in permissions_db:
            perm = permissions_db[perm_id]
            if module is None or perm["module"] == module:
                permissions.append(perm)
    
    # Get role info
    role = current_user["role"]
    role_levels = {"admin": 1, "manager": 2, "user": 3, "guest": 4}
    
    return {
        "user_id": user_id,
        "permissions": permissions,
        "roles": [{"name": role, "level": role_levels.get(role, 4)}],
        "max_level": role_levels.get(role, 4)
    }

@app.post("/api/v1/permissions/assign")
async def assign_permissions(
    assign: PermissionAssign,
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Assign permissions to user (Admin only)"""
    if assign.user_id not in user_permissions_db:
        user_permissions_db[assign.user_id] = []
    
    for perm_id in assign.permission_ids:
        if perm_id in permissions_db and perm_id not in user_permissions_db[assign.user_id]:
            user_permissions_db[assign.user_id].append(perm_id)
    
    # Log activity
    log_activity(current_user["email"], "assign_permissions", "permissions", 
                {"user_id": assign.user_id, "permissions": assign.permission_ids})
    
    return {"success": True, "message": "Permissions assigned successfully"}

@app.delete("/api/v1/permissions/revoke")
async def revoke_permissions(
    user_id: str,
    permission_ids: List[str],
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Revoke permissions from user (Admin only)"""
    if user_id in user_permissions_db:
        for perm_id in permission_ids:
            if perm_id in user_permissions_db[user_id]:
                user_permissions_db[user_id].remove(perm_id)
    
    # Log activity
    log_activity(current_user["email"], "revoke_permissions", "permissions",
                {"user_id": user_id, "permissions": permission_ids})
    
    return {"success": True, "message": "Permissions revoked successfully"}

# =====================================================================
# DASHBOARD ENDPOINTS
# =====================================================================

@app.get("/api/v1/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: dict = Depends(require_auth)
):
    """Get dashboard statistics"""
    active_users = sum(1 for u in users_db.values() if u["is_active"])
    active_modules = sum(1 for m in modules_db.values() if m["status"] == "active")
    
    return {
        "total_users": len(users_db),
        "active_users": active_users,
        "total_modules": len(modules_db),
        "active_modules": active_modules,
        "total_logs": len(logs_db),
        "system_health": 98.5,
        "storage_used": 45.2,
        "api_calls_today": len(activities_db)
    }

@app.get("/api/v1/dashboard/charts")
async def get_dashboard_charts(
    current_user: dict = Depends(require_auth)
):
    """Get dashboard chart data"""
    # Generate sample chart data
    return {
        "user_growth": {
            "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            "datasets": [{
                "label": "Users",
                "data": [10, 15, 22, 28, 35, 42],
                "backgroundColor": "rgba(99, 102, 241, 0.5)",
                "borderColor": "rgb(99, 102, 241)"
            }]
        },
        "activity_chart": {
            "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "datasets": [{
                "label": "Activities",
                "data": [65, 78, 90, 81, 95, 55, 40],
                "backgroundColor": "rgba(34, 197, 94, 0.5)",
                "borderColor": "rgb(34, 197, 94)"
            }]
        },
        "module_usage": {
            "labels": ["Dashboard", "CRM", "Inventory", "Reports", "Settings"],
            "datasets": [{
                "label": "Usage",
                "data": [300, 250, 180, 120, 90],
                "backgroundColor": [
                    "rgba(239, 68, 68, 0.5)",
                    "rgba(99, 102, 241, 0.5)",
                    "rgba(34, 197, 94, 0.5)",
                    "rgba(251, 191, 36, 0.5)",
                    "rgba(156, 163, 175, 0.5)"
                ]
            }]
        }
    }

@app.get("/api/v1/dashboard/activities", response_model=List[Activity])
async def get_dashboard_activities(
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(require_auth)
):
    """Get recent activities"""
    # Return last N activities
    return activities_db[-limit:] if activities_db else []

# =====================================================================
# MODULE ENDPOINTS
# =====================================================================

@app.get("/api/v1/modules", response_model=List[Module])
async def get_modules(
    status: Optional[ModuleStatus] = None,
    current_user: dict = Depends(require_auth)
):
    """Get all modules"""
    modules = []
    for module in modules_db.values():
        if status is None or module["status"] == status:
            modules.append(module)
    return modules

@app.get("/api/v1/modules/{module_id}", response_model=Module)
async def get_module(
    module_id: str,
    current_user: dict = Depends(require_auth)
):
    """Get module by ID"""
    if module_id not in modules_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    return modules_db[module_id]

@app.post("/api/v1/modules/install")
async def install_module(
    install: ModuleInstall,
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Install a module (Admin only)"""
    if install.module_id not in modules_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    module = modules_db[install.module_id]
    
    # Check if already active
    if module["status"] == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Module already active"
        )
    
    # Update module status
    module["status"] = "active"
    module["installed_at"] = datetime.utcnow().isoformat() + "Z"
    module["config"].update(install.config)
    
    # Log activity
    log_activity(current_user["email"], "install_module", "modules", {"module_id": install.module_id})
    
    return {"success": True, "message": f"Module {module['display_name']} installed successfully"}

@app.delete("/api/v1/modules/{module_id}")
async def uninstall_module(
    module_id: str,
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Uninstall a module (Admin only)"""
    if module_id not in modules_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    module = modules_db[module_id]
    module["status"] = "inactive"
    
    # Log activity
    log_activity(current_user["email"], "uninstall_module", "modules", {"module_id": module_id})
    
    return {"success": True, "message": f"Module {module['display_name']} uninstalled successfully"}

# =====================================================================
# PROFILE ENDPOINTS
# =====================================================================

@app.get("/api/v1/profile")
async def get_profile(
    current_user: dict = Depends(require_auth)
):
    """Get current user's profile"""
    profile = {k: v for k, v in current_user.items() if k != "password"}
    return profile

@app.put("/api/v1/profile")
async def update_profile(
    profile_update: ProfileUpdate,
    current_user: dict = Depends(require_auth)
):
    """Update current user's profile"""
    # Find user in database
    for email, user in users_db.items():
        if user["id"] == current_user["id"]:
            # Update profile fields
            update_data = profile_update.dict(exclude_unset=True)
            for field, value in update_data.items():
                if value is not None:
                    user[field] = value
            
            user["updated_at"] = datetime.utcnow().isoformat() + "Z"
            
            # Log activity
            log_activity(current_user["email"], "update_profile", "profile")
            
            # Return updated profile
            profile = {k: v for k, v in user.items() if k != "password"}
            return profile
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found"
    )

@app.post("/api/v1/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_auth)
):
    """Upload avatar image"""
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Generate file path (in production, save to storage service)
    file_path = f"/uploads/avatars/{current_user['id']}-{file.filename}"
    
    # Update user avatar URL
    for email, user in users_db.items():
        if user["id"] == current_user["id"]:
            user["avatar_url"] = file_path
            user["updated_at"] = datetime.utcnow().isoformat() + "Z"
            break
    
    # Log activity
    log_activity(current_user["email"], "upload_avatar", "profile")
    
    return {"success": True, "avatar_url": file_path}

# =====================================================================
# SETTINGS ENDPOINTS
# =====================================================================

@app.get("/api/v1/settings", response_model=List[Settings])
async def get_settings(
    category: Optional[str] = None,
    current_user: dict = Depends(require_auth)
):
    """Get settings"""
    settings = []
    for setting in settings_db.values():
        # Non-admins can only see public settings
        if current_user["role"] != UserRole.ADMIN and not setting["is_public"]:
            continue
        
        if category is None or setting["category"] == category:
            settings.append(setting)
    
    return settings

@app.put("/api/v1/settings")
async def update_settings(
    settings_update: SettingsUpdate,
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Update settings (Admin only)"""
    updated = []
    
    for setting_data in settings_update.settings:
        setting_id = setting_data.get("id")
        if setting_id and setting_id in settings_db:
            setting = settings_db[setting_id]
            setting["value"] = setting_data.get("value", setting["value"])
            setting["updated_at"] = datetime.utcnow().isoformat() + "Z"
            setting["updated_by"] = current_user["id"]
            updated.append(setting_id)
    
    # Log activity
    log_activity(current_user["email"], "update_settings", "settings", {"updated": updated})
    
    return {"success": True, "message": f"Updated {len(updated)} settings"}

# =====================================================================
# LOG ENDPOINTS
# =====================================================================

@app.get("/api/v1/logs", response_model=List[LogEntry])
async def get_logs(
    level: Optional[LogLevel] = None,
    source: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    current_user: dict = Depends(require_auth)
):
    """Get system logs"""
    # Filter logs
    filtered_logs = []
    for log in logs_db:
        if level and log["level"] != level:
            continue
        if source and log["source"] != source:
            continue
        filtered_logs.append(log)
    
    # Return last N logs
    return filtered_logs[-limit:]

@app.post("/api/v1/logs", response_model=LogEntry)
async def create_log(
    log_create: LogCreate,
    current_user: dict = Depends(require_auth)
):
    """Create log entry"""
    log_entry = {
        "id": f"log-{uuid4()}",
        "level": log_create.level,
        "message": log_create.message,
        "source": log_create.source,
        "user_id": current_user["id"],
        "metadata": log_create.metadata or {},
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    logs_db.append(log_entry)
    
    # Keep only last 1000 logs
    if len(logs_db) > 1000:
        logs_db.pop(0)
    
    return log_entry

# =====================================================================
# NOTIFICATION ENDPOINTS
# =====================================================================

@app.get("/api/v1/notifications", response_model=List[Notification])
async def get_notifications(
    is_read: Optional[bool] = None,
    current_user: dict = Depends(require_auth)
):
    """Get user notifications"""
    user_notifications = notifications_db.get(current_user["id"], [])
    
    if is_read is not None:
        user_notifications = [n for n in user_notifications if n["is_read"] == is_read]
    
    return user_notifications

@app.put("/api/v1/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(require_auth)
):
    """Mark notification as read"""
    user_notifications = notifications_db.get(current_user["id"], [])
    
    for notif in user_notifications:
        if notif["id"] == notification_id:
            notif["is_read"] = True
            return {"success": True, "message": "Notification marked as read"}
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Notification not found"
    )

@app.get("/api/v1/notifications/stats")
async def get_notification_stats(
    current_user: dict = Depends(require_auth)
):
    """Get notification statistics"""
    user_notifications = notifications_db.get(current_user["id"], [])
    unread = sum(1 for n in user_notifications if not n["is_read"])
    
    return {
        "total": len(user_notifications),
        "unread": unread,
        "by_type": {
            "info": sum(1 for n in user_notifications if n["type"] == "info"),
            "warning": sum(1 for n in user_notifications if n["type"] == "warning"),
            "error": sum(1 for n in user_notifications if n["type"] == "error")
        }
    }

# =====================================================================
# ADMIN USER MANAGEMENT ENDPOINTS
# =====================================================================

@app.get("/api/v1/admin/pending-users", response_model=List[PendingUserResponse])
async def get_pending_users(
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Get all users pending approval (Admin only)"""
    pending_users = []
    
    for email, user in users_db.items():
        if user["status"] in ["pending_email_verification", "pending_admin_approval"]:
            user_data = {k: v for k, v in user.items() if k != "password"}
            pending_users.append(user_data)
    
    # Sort by registration date (newest first)
    pending_users.sort(key=lambda x: x["registration_date"], reverse=True)
    
    return pending_users

@app.post("/api/v1/admin/approve-user/{user_id}")
async def approve_user(
    user_id: str,
    approval: UserApproval,
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Approve or reject user registration (Admin only)"""
    if approval.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID mismatch"
        )
    
    # Find user
    user_email = None
    for email, user in users_db.items():
        if user["id"] == user_id:
            user_email = email
            break
    
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user = users_db[user_email]
    
    # Check if user is eligible for approval
    if user["status"] not in ["pending_admin_approval"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not pending approval"
        )
    
    if not user["email_verified"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User email must be verified before approval"
        )
    
    if approval.approved:
        # Approve user
        user["admin_approved"] = True
        user["is_active"] = True
        user["status"] = "active"
        user["assigned_modules"] = approval.assigned_modules or ["dashboard"]  # Default to dashboard
        user["approval_notes"] = approval.approval_notes
        user["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        # Assign basic permissions based on assigned modules
        if user_id not in user_permissions_db:
            user_permissions_db[user_id] = []
        
        # Give basic read permissions
        basic_permissions = ["perm-1", "perm-4", "perm-6"]  # users.read, modules.read, settings.read
        for perm in basic_permissions:
            if perm not in user_permissions_db[user_id]:
                user_permissions_db[user_id].append(perm)
        
        # Create welcome notification for the user
        if user_id not in notifications_db:
            notifications_db[user_id] = []
        
        welcome_notification = {
            "id": f"notif-{uuid4()}",
            "user_id": user_id,
            "title": "Account Approved!",
            "message": f"Welcome to the platform! Your account has been approved and you now have access to: {', '.join(approval.assigned_modules or ['Dashboard'])}",
            "type": "info",
            "is_read": False,
            "action_url": "/dashboard",
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        notifications_db[user_id].append(welcome_notification)
        
        # Log activity
        log_activity(current_user["email"], "approve_user", "admin", {
            "approved_user_id": user_id,
            "assigned_modules": approval.assigned_modules,
            "notes": approval.approval_notes
        })
        
        return {
            "success": True,
            "message": f"User {user['name']} has been approved successfully",
            "user_status": "active",
            "assigned_modules": approval.assigned_modules
        }
    else:
        # Reject user
        user["admin_approved"] = False
        user["is_active"] = False
        user["status"] = "rejected"
        user["approval_notes"] = approval.approval_notes
        user["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        # Create rejection notification for the user
        if user_id not in notifications_db:
            notifications_db[user_id] = []
        
        rejection_notification = {
            "id": f"notif-{uuid4()}",
            "user_id": user_id,
            "title": "Account Application Rejected",
            "message": f"Unfortunately, your account application has been rejected. Reason: {approval.approval_notes or 'No reason provided'}",
            "type": "warning",
            "is_read": False,
            "action_url": None,
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        notifications_db[user_id].append(rejection_notification)
        
        # Log activity
        log_activity(current_user["email"], "reject_user", "admin", {
            "rejected_user_id": user_id,
            "notes": approval.approval_notes
        })
        
        return {
            "success": True,
            "message": f"User {user['name']} has been rejected",
            "user_status": "rejected"
        }

@app.put("/api/v1/admin/user-modules/{user_id}")
async def update_user_modules(
    user_id: str,
    modules_update: UserModulesUpdate,
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Update user's assigned modules (Admin only)"""
    # Find user
    user_email = None
    for email, user in users_db.items():
        if user["id"] == user_id:
            user_email = email
            break
    
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user = users_db[user_email]
    
    # Check if user is active
    if user["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update modules for active users"
        )
    
    # Validate module IDs (check if they exist)
    available_modules = list(modules_db.keys())
    module_names = [mod["name"] for mod in modules_db.values()]
    
    for module in modules_update.assigned_modules:
        if module not in available_modules and module not in module_names:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Module '{module}' does not exist"
            )
    
    # Update user's assigned modules
    user["assigned_modules"] = modules_update.assigned_modules
    user["updated_at"] = datetime.utcnow().isoformat() + "Z"
    
    if modules_update.notes:
        user["approval_notes"] = modules_update.notes
    
    # Create notification for the user about module changes
    if user_id not in notifications_db:
        notifications_db[user_id] = []
    
    module_notification = {
        "id": f"notif-{uuid4()}",
        "user_id": user_id,
        "title": "Module Access Updated",
        "message": f"Your module access has been updated. You now have access to: {', '.join(modules_update.assigned_modules)}",
        "type": "info",
        "is_read": False,
        "action_url": "/dashboard",
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    notifications_db[user_id].append(module_notification)
    
    # Log activity
    log_activity(current_user["email"], "update_user_modules", "admin", {
        "target_user_id": user_id,
        "assigned_modules": modules_update.assigned_modules,
        "notes": modules_update.notes
    })
    
    return {
        "success": True,
        "message": f"Module access updated for {user['name']}",
        "assigned_modules": modules_update.assigned_modules
    }

# =====================================================================
# HEALTH & STATUS ENDPOINTS
# =====================================================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Python FastAPI Backend - Complete Version",
        "status": "online",
        "version": "2.0.0",
        "endpoints": {
            "auth": "/api/v1/auth",
            "users": "/api/v1/users",
            "permissions": "/api/v1/permissions",
            "dashboard": "/api/v1/dashboard",
            "modules": "/api/v1/modules",
            "profile": "/api/v1/profile",
            "settings": "/api/v1/settings",
            "logs": "/api/v1/logs",
            "notifications": "/api/v1/notifications",
            "admin": "/api/v1/admin",
            "sessions": "/api/users/{user_id}/session"
        },
        "documentation": "/docs",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "plataforma-python-backend-complete",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "stats": {
            "users": len(users_db),
            "modules": len(modules_db),
            "activities": len(activities_db),
            "logs": len(logs_db)
        }
    }

@app.get("/api/v1/system/info")
async def system_info(
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Get system information (Admin only)"""
    return {
        "version": "2.0.0",
        "python_version": "3.11+",
        "framework": "FastAPI",
        "database": "In-Memory (Mock)",
        "cache": "In-Memory",
        "storage": "Local Filesystem",
        "websocket": "Not Implemented",
        "email": "Not Configured",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "uptime": "N/A",
        "memory_usage": "N/A",
        "cpu_usage": "N/A"
    }

# =====================================================================
# SESSION MANAGEMENT ENDPOINTS - User Session Persistence
# =====================================================================

@app.get("/api/users/{user_id}/session")
async def get_user_session(
    user_id: str,
    current_user: dict = Depends(get_current_user_optional)
):
    """Get user session data"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Users can only access their own session data, unless they're admin
    if current_user["id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only access your own session data"
        )
    
    session_data = user_sessions_db.get(user_id)
    if not session_data:
        return {"success": False, "data": None}
    
    log_activity(current_user["email"], f"session_load", "session")
    
    return {
        "success": True,
        "data": session_data
    }

@app.post("/api/users/{user_id}/session")
async def save_user_session(
    user_id: str,
    session_data: UserSession,
    current_user: dict = Depends(get_current_user_optional)
):
    """Save user session data"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Users can only save their own session data
    if current_user["id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only save your own session data"
        )
    
    # Validate session data belongs to the correct user
    if session_data.userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session userId must match URL parameter"
        )
    
    # Store session data
    user_sessions_db[user_id] = session_data.dict()
    
    log_activity(current_user["email"], f"session_save", "session")
    
    return {"success": True, "message": "Session saved successfully"}

@app.delete("/api/users/{user_id}/session")
async def delete_user_session(
    user_id: str,
    current_user: dict = Depends(get_current_user_optional)
):
    """Delete user session data"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Users can only delete their own session data, unless they're admin
    if current_user["id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete your own session data"
        )
    
    if user_id in user_sessions_db:
        del user_sessions_db[user_id]
        log_activity(current_user["email"], f"session_delete", "session")
        return {"success": True, "message": "Session deleted successfully"}
    
    return {"success": False, "message": "No session found to delete"}

@app.get("/api/v1/admin/sessions")
async def get_all_sessions(
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Get all user sessions (Admin only)"""
    sessions = []
    for user_id, session_data in user_sessions_db.items():
        # Get user info for context
        user_email = next((email for email, user in users_db.items() if user["id"] == user_id), "Unknown")
        sessions.append({
            "userId": user_id,
            "userEmail": user_email,
            "sessionId": session_data.get("sessionId", "N/A"),
            "timestamp": session_data.get("timestamp", 0),
            "currentRoute": session_data.get("currentRoute", "/"),
            "windowsCount": len(session_data.get("windowsState", [])),
            "lastUpdated": session_data.get("metadata", {}).get("updatedAt", 0)
        })
    
    return {
        "success": True,
        "data": sessions,
        "totalSessions": len(sessions)
    }

# =====================================================================
# MAIN ENTRY POINT
# =====================================================================

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("COMPLETE PYTHON FASTAPI BACKEND - v2.0.0")
    print("="*60)
    print("Starting server with ALL endpoints for 100% migration")
    print("\nEndpoints available:")
    print("  - Authentication: /api/v1/auth/*")
    print("    - POST /api/v1/auth/register - User self-registration")
    print("    - GET /api/v1/auth/verify-email/{token} - Email verification")
    print("  - Users: /api/v1/users/*")
    print("  - Admin: /api/v1/admin/*")
    print("    - GET /api/v1/admin/pending-users - List users awaiting approval")
    print("    - POST /api/v1/admin/approve-user/{user_id} - Approve/reject users")
    print("    - PUT /api/v1/admin/user-modules/{user_id} - Update user modules")
    print("  - Permissions: /api/v1/permissions/*")
    print("  - Dashboard: /api/v1/dashboard/*")
    print("  - Modules: /api/v1/modules/*")
    print("  - Profile: /api/v1/profile/*")
    print("  - Settings: /api/v1/settings/*")
    print("  - Logs: /api/v1/logs/*")
    print("  - Notifications: /api/v1/notifications/*")
    print("  - Sessions: /api/users/{user_id}/session - User session persistence")
    print("    - GET /api/users/{user_id}/session - Load user session")
    print("    - POST /api/users/{user_id}/session - Save user session")
    print("    - DELETE /api/users/{user_id}/session - Delete user session")
    print("    - GET /api/v1/admin/sessions - List all sessions (Admin only)")
    print("\nDocumentation: http://localhost:8001/docs")
    print("\nTest credentials:")
    print("  - admin@plataforma.app / admin123")
    print("  - user@plataforma.app / user123")
    print("  - manager@plataforma.app / manager123")
    print("="*60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)