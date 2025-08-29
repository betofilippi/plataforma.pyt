"""
FastAPI Complete Backend with Authentication
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import jwt
import bcrypt
import os
from uuid import uuid4

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Create FastAPI app
app = FastAPI(
    title="Plataforma Python Backend",
    description="Complete Python backend with authentication",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3333",
        "http://localhost:3000",
        "http://localhost:3002",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# MODELS
# =====================================================================

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

# =====================================================================
# MOCK DATABASE
# =====================================================================

users_db = {
    # Original admin user
    "admin@example.com": {
        "id": "user-1",
        "email": "admin@example.com",
        "name": "Admin User",
        "password": "$2b$12$KzOoOhrzUW9.EoIs5WeaPukdZc3M71s2C1GPlkfADvdhNf9iwXZwm",  # admin123
        "role": "admin",
        "roles": [{"id": "role-1", "name": "admin", "displayName": "Administrator", "level": 1}],
        "avatarUrl": None,
        "createdAt": "2024-01-01T00:00:00Z",
        "lastLogin": None
    },
    # Frontend expected users
    "admin@plataforma.app": {
        "id": "user-2",
        "email": "admin@plataforma.app",
        "name": "Platform Admin",
        "password": "$2b$12$KzOoOhrzUW9.EoIs5WeaPukdZc3M71s2C1GPlkfADvdhNf9iwXZwm",  # admin123
        "role": "admin",
        "roles": [{"id": "role-1", "name": "admin", "displayName": "Administrator", "level": 1}],
        "avatarUrl": None,
        "createdAt": "2024-01-01T00:00:00Z",
        "lastLogin": None
    },
    "user@plataforma.app": {
        "id": "user-3",
        "email": "user@plataforma.app",
        "name": "Regular User",
        "password": "$2b$12$9zuyf45Uw9oSNCkVF7Yuz./dv71RYGEW/VcOwiPqmZmMKutRMxPR6",  # user123
        "role": "user",
        "roles": [{"id": "role-2", "name": "user", "displayName": "User", "level": 3}],
        "avatarUrl": None,
        "createdAt": "2024-01-01T00:00:00Z",
        "lastLogin": None
    },
    "manager@plataforma.app": {
        "id": "user-4",
        "email": "manager@plataforma.app",
        "name": "Manager User",
        "password": "$2b$12$ornjaEZSZxHYn44aQfvWQO7gfbwyF79oBmPNUpX8YrtFr1mRTROoy",  # manager123
        "role": "manager",
        "roles": [{"id": "role-3", "name": "manager", "displayName": "Manager", "level": 2}],
        "avatarUrl": None,
        "createdAt": "2024-01-01T00:00:00Z",
        "lastLogin": None
    },
    "demo@example.com": {
        "id": "user-5",
        "email": "demo@example.com",
        "name": "Demo User",
        "password": "$2b$12$Rd4rRUy9u57WTLKh7jNBOubikMPKR6QJHPmYxqTVmPwsp38mWSqdu",  # demo
        "role": "user",
        "roles": [{"id": "role-2", "name": "user", "displayName": "User", "level": 3}],
        "avatarUrl": None,
        "createdAt": "2024-01-01T00:00:00Z",
        "lastLogin": None
    }
}

# =====================================================================
# JWT FUNCTIONS
# =====================================================================

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

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# =====================================================================
# AUTHENTICATION ENDPOINTS
# =====================================================================

@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Login endpoint - authenticate user and return JWT tokens"""
    # Find user in database
    user = users_db.get(request.email)
    
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    user["lastLogin"] = datetime.utcnow().isoformat() + "Z"
    
    # Create tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": user["email"], "role": user["role"]}
    )
    
    # Remove password from user data
    user_data = {k: v for k, v in user.items() if k != "password"}
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user_data
    }

@app.post("/api/v1/auth/refresh")
async def refresh_token(refresh_token: str):
    """Refresh access token using refresh token"""
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        email: str = payload.get("sub")
        user = users_db.get(email)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Create new access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        new_access_token = create_access_token(
            data={"sub": user["email"], "role": user["role"]},
            expires_delta=access_token_expires
        )
        
        # Remove password from user data
        user_data = {k: v for k, v in user.items() if k != "password"}
        
        return {
            "access_token": new_access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user_data
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@app.get("/api/v1/auth/me")
async def get_me(authorization: Optional[str] = None):
    """Get current user information"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        user = users_db.get(email)
        if user:
            user_data = {k: v for k, v in user.items() if k != "password"}
            return user_data
    except:
        pass
    
    raise HTTPException(status_code=401, detail="Invalid token")

# =====================================================================
# DASHBOARD ENDPOINTS
# =====================================================================

@app.get("/api/v1/dashboard/kpis")
async def get_kpis():
    """Get dashboard KPIs"""
    return [
        {"id": "kpi-1", "title": "Total Users", "value": len(users_db), "change": 12.5, "trend": "up"},
        {"id": "kpi-2", "title": "Active Sessions", "value": 42, "change": -5.3, "trend": "down"},
        {"id": "kpi-3", "title": "Revenue", "value": "$45,231", "change": 18.2, "trend": "up"},
        {"id": "kpi-4", "title": "Conversion Rate", "value": "3.2%", "change": 0.5, "trend": "up"}
    ]

@app.get("/api/v1/dashboard/activities")
async def get_activities(limit: int = 50):
    """Get recent activities"""
    activities = []
    for i in range(min(limit, 10)):
        activities.append({
            "id": f"activity-{i}",
            "type": "user_action",
            "title": f"Activity {i+1}",
            "description": f"User performed action {i+1}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "userId": f"user-{i}",
            "userName": f"User {i}"
        })
    return {"items": activities, "total": len(activities)}

@app.get("/api/v1/dashboard/modules")
async def get_modules():
    """Get modules status"""
    return [
        {
            "name": "Authentication",
            "status": "active",
            "usage": 85,
            "lastActive": datetime.utcnow().isoformat() + "Z",
            "uptime": 99.9,
            "errorCount": 0
        },
        {
            "name": "Dashboard",
            "status": "active",
            "usage": 92,
            "lastActive": datetime.utcnow().isoformat() + "Z",
            "uptime": 100,
            "errorCount": 0
        }
    ]

@app.get("/api/v1/dashboard/health")
async def get_health():
    """Get system health metrics"""
    return {
        "apiResponseTime": 45,
        "uptime": 99.99,
        "errorRate": 0.01,
        "memoryUsage": 68,
        "cpuUsage": 42,
        "databaseConnections": 10,
        "redisConnections": 5
    }

@app.get("/api/v1/dashboard/settings")
async def get_dashboard_settings():
    """Get dashboard settings"""
    return {
        "theme": "light",
        "refreshInterval": 30000,
        "showNotifications": True,
        "compactMode": False
    }

# =====================================================================
# RBAC ENDPOINTS
# =====================================================================

@app.get("/api/v1/rbac/users/{user_id}/permissions")
async def get_user_permissions(user_id: str):
    """Get user permissions"""
    permissions = []
    
    # Mock permissions based on role
    for email, user in users_db.items():
        if user["id"] == user_id:
            if user["role"] == "admin":
                permissions = [
                    "users:read", "users:create", "users:update", "users:delete",
                    "data:read", "data:write", "data:delete",
                    "system:admin", "modules:install", "modules:configure"
                ]
            else:
                permissions = ["data:read"]
            break
    
    return permissions

@app.post("/api/v1/rbac/check-permission")
async def check_permission(permission: str):
    """Check if current user has specific permission"""
    # Mock implementation - always return true for demo
    return True

# =====================================================================
# NOTIFICATIONS ENDPOINTS
# =====================================================================

@app.get("/api/v1/notifications")
async def get_notifications(limit: int = 50):
    """Get user notifications"""
    notifications = []
    for i in range(min(limit, 5)):
        notifications.append({
            "id": f"notif-{i}",
            "user_id": "user-1",
            "title": f"Notification {i+1}",
            "message": f"This is notification message {i+1}",
            "type": "info",
            "priority": "normal",
            "category": "system",
            "read": i > 2,
            "archived": False,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z"
        })
    
    return {
        "items": notifications,
        "total": len(notifications),
        "pagination": {"page": 1, "limit": limit}
    }

@app.get("/api/v1/notifications/stats")
async def get_notification_stats():
    """Get notification statistics"""
    return {
        "user_id": "user-1",
        "total": 10,
        "unread": 3,
        "by_type": {"info": 5, "warning": 3, "error": 2},
        "by_category": {"system": 6, "user": 4},
        "by_priority": {"low": 2, "normal": 6, "high": 2},
        "recent_activity": datetime.utcnow().isoformat() + "Z"
    }

# =====================================================================
# ROOT ENDPOINTS
# =====================================================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Python FastAPI Backend Running",
        "status": "online",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "plataforma-python-backend",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("[STARTUP] Starting Complete Python FastAPI Backend")
    print("="*50)
    print("[URL] Local: http://localhost:8001")
    print("[DOCS] Documentation: http://localhost:8001/docs")
    print("[LOGIN] Test credentials:")
    print("  - admin@plataforma.app / admin123")
    print("  - user@plataforma.app / user123")
    print("  - manager@plataforma.app / manager123")
    print("  - demo@example.com / demo")
    print("="*50 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)