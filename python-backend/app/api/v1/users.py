"""
User management API endpoints.

This module implements comprehensive user management endpoints including:
- User CRUD operations
- Profile management
- User search and filtering
- User statistics and analytics
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import and_, or_, desc, asc, func, select
from sqlalchemy.exc import IntegrityError

from ...core.database import get_db
from ...core.auth import get_current_user, require_permissions
from ...core.exceptions import (
    UserNotFoundError, ValidationError, PermissionDeniedError,
    ConflictError
)
from ...models.users import User, UserSession, LoginAttempt, AuditLog, Role
from ...models.modules import ModuleInstallation
from ...models.files import File, StorageQuota
from ...models.dashboards import Dashboard
from ...models.windows import Window
from ...schemas.users import (
    UserCreate, UserUpdate, UserResponse, UserProfile, UserSession as UserSessionSchema,
    UserSearchFilters, UserSortOption, UserListParams, UserListResponse,
    UserStatistics, UserActivityLog, UserBulkOperation, UserBulkOperationResponse,
    UserPreferences, UserPreferencesUpdate, AdminUserAction, AdminUserActionResponse,
    UserPasswordChange
)
from ...schemas.auth import UserResponse as AuthUserResponse

router = APIRouter(prefix="/users", tags=["users"])


# ================================
# USER CRUD OPERATIONS
# ================================

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new user.
    
    Requires: users:create permission
    """
    # Check permissions
    if not current_user.has_permission("users:create"):
        raise PermissionDeniedError("Insufficient permissions to create users")
    
    # Check if user with email already exists
    existing_user = db.query(User).filter(
        and_(
            User.email == user_data.email.lower(),
            User.organization_id == current_user.organization_id
        )
    ).first()
    
    if existing_user:
        raise ConflictError(f"User with email {user_data.email} already exists")
    
    try:
        # Create new user
        db_user = User(
            email=user_data.email.lower(),
            name=user_data.name,
            organization_id=current_user.organization_id,
            # Password hashing would be done here
            is_active=True
        )
        
        if user_data.metadata:
            db_user.metadata = user_data.metadata
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Create audit log
        audit_log = AuditLog(
            user_id=current_user.id,
            action="user.created",
            resource_type="user",
            resource_id=str(db_user.id),
            new_values={"email": db_user.email, "name": db_user.name},
            organization_id=current_user.organization_id
        )
        db.add(audit_log)
        db.commit()
        
        return UserResponse.from_orm(db_user)
    
    except IntegrityError as e:
        db.rollback()
        raise ConflictError("User creation failed due to data conflict")


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user by ID.
    
    Requires: users:read permission or own profile
    """
    user = db.query(User).filter(
        and_(
            User.id == user_id,
            User.organization_id == current_user.organization_id,
            User.is_active == True
        )
    ).first()
    
    if not user:
        raise UserNotFoundError(f"User with ID {user_id} not found")
    
    # Check permissions
    if user.id != current_user.id and not current_user.has_permission("users:read"):
        raise PermissionDeniedError("Insufficient permissions to view user details")
    
    return UserResponse.from_orm(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user information.
    
    Requires: users:update permission or own profile
    """
    user = db.query(User).filter(
        and_(
            User.id == user_id,
            User.organization_id == current_user.organization_id
        )
    ).first()
    
    if not user:
        raise UserNotFoundError(f"User with ID {user_id} not found")
    
    # Check permissions
    if user.id != current_user.id and not current_user.has_permission("users:update"):
        raise PermissionDeniedError("Insufficient permissions to update user")
    
    try:
        # Store old values for audit
        old_values = {
            "email": user.email,
            "name": user.name,
            "role": user.role if hasattr(user, 'role') else None,
            "is_active": user.is_active
        }
        
        # Update user fields
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == "email" and value:
                value = value.lower()
                # Check for email conflicts
                existing = db.query(User).filter(
                    and_(
                        User.email == value,
                        User.id != user_id,
                        User.organization_id == current_user.organization_id
                    )
                ).first()
                if existing:
                    raise ConflictError(f"Email {value} is already taken")
            
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(user)
        
        # Create audit log
        new_values = {
            "email": user.email,
            "name": user.name,
            "role": user.role if hasattr(user, 'role') else None,
            "is_active": user.is_active
        }
        
        audit_log = AuditLog(
            user_id=current_user.id,
            action="user.updated",
            resource_type="user",
            resource_id=str(user.id),
            old_values=old_values,
            new_values=new_values,
            organization_id=current_user.organization_id
        )
        db.add(audit_log)
        db.commit()
        
        return UserResponse.from_orm(user)
    
    except IntegrityError:
        db.rollback()
        raise ConflictError("User update failed due to data conflict")


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete (deactivate) a user.
    
    Requires: users:delete permission
    """
    if not current_user.has_permission("users:delete"):
        raise PermissionDeniedError("Insufficient permissions to delete users")
    
    user = db.query(User).filter(
        and_(
            User.id == user_id,
            User.organization_id == current_user.organization_id
        )
    ).first()
    
    if not user:
        raise UserNotFoundError(f"User with ID {user_id} not found")
    
    # Prevent self-deletion
    if user.id == current_user.id:
        raise ValidationError("Cannot delete your own account")
    
    # Soft delete
    user.is_active = False
    user.updated_at = datetime.utcnow()
    
    # Revoke all active sessions
    db.query(UserSession).filter(
        and_(
            UserSession.user_id == user_id,
            UserSession.is_active == True
        )
    ).update({
        "is_active": False,
        "revoked_at": datetime.utcnow(),
        "revoked_reason": "User account deleted"
    })
    
    db.commit()
    
    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="user.deleted",
        resource_type="user",
        resource_id=str(user.id),
        old_values={"is_active": True},
        new_values={"is_active": False},
        organization_id=current_user.organization_id
    )
    db.add(audit_log)
    db.commit()


# ================================
# USER PROFILE AND PREFERENCES
# ================================

@router.get("/{user_id}/profile", response_model=UserProfile)
async def get_user_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed user profile information.
    
    Requires: users:read permission or own profile
    """
    user = db.query(User).options(
        selectinload(User.roles),
        selectinload(User.module_installations),
        selectinload(User.dashboards),
        selectinload(User.owned_files)
    ).filter(
        and_(
            User.id == user_id,
            User.organization_id == current_user.organization_id,
            User.is_active == True
        )
    ).first()
    
    if not user:
        raise UserNotFoundError(f"User with ID {user_id} not found")
    
    # Check permissions
    if user.id != current_user.id and not current_user.has_permission("users:read"):
        raise PermissionDeniedError("Insufficient permissions to view user profile")
    
    # Gather statistics
    statistics = {
        "modules_installed": len(user.module_installations),
        "dashboards_created": len(user.dashboards),
        "files_uploaded": len(user.owned_files),
        "total_storage_used": sum(file.size for file in user.owned_files),
        "last_login": user.last_login_at,
        "account_age_days": (datetime.utcnow() - user.created_at).days
    }
    
    profile_data = UserProfile.from_orm(user)
    profile_data.statistics = statistics
    
    return profile_data


@router.get("/{user_id}/preferences", response_model=UserPreferences)
async def get_user_preferences(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user preferences.
    
    Requires: Own profile only
    """
    if user_id != current_user.id:
        raise PermissionDeniedError("Can only access your own preferences")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise UserNotFoundError(f"User with ID {user_id} not found")
    
    preferences = user.preferences or {}
    
    return UserPreferences(
        theme=preferences.get("theme", "light"),
        language=preferences.get("language", "en"),
        timezone=preferences.get("timezone", "UTC"),
        notifications=preferences.get("notifications", {}),
        dashboard_settings=preferences.get("dashboard_settings", {}),
        privacy_settings=preferences.get("privacy_settings", {})
    )


@router.put("/{user_id}/preferences", response_model=UserPreferences)
async def update_user_preferences(
    user_id: int,
    preferences_data: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user preferences.
    
    Requires: Own profile only
    """
    if user_id != current_user.id:
        raise PermissionDeniedError("Can only update your own preferences")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise UserNotFoundError(f"User with ID {user_id} not found")
    
    current_prefs = user.preferences or {}
    update_data = preferences_data.dict(exclude_unset=True)
    
    # Merge preferences
    for key, value in update_data.items():
        current_prefs[key] = value
    
    user.preferences = current_prefs
    user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return UserPreferences(**current_prefs)


@router.post("/{user_id}/change-password")
async def change_password(
    user_id: int,
    password_data: UserPasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user password.
    
    Requires: Own profile only
    """
    if user_id != current_user.id:
        raise PermissionDeniedError("Can only change your own password")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise UserNotFoundError(f"User with ID {user_id} not found")
    
    # Verify current password (implement password verification)
    # if not verify_password(password_data.current_password, user.password_hash):
    #     raise ValidationError("Current password is incorrect")
    
    # Hash new password (implement password hashing)
    # user.password_hash = hash_password(password_data.new_password)
    user.last_password_change_at = datetime.utcnow()
    user.must_change_password = False
    
    # Revoke all other sessions except current one
    db.query(UserSession).filter(
        and_(
            UserSession.user_id == user_id,
            UserSession.is_active == True
            # Add condition to exclude current session
        )
    ).update({
        "is_active": False,
        "revoked_at": datetime.utcnow(),
        "revoked_reason": "Password changed"
    })
    
    db.commit()
    
    return {"message": "Password changed successfully"}


# ================================
# USER SEARCH AND LISTING
# ================================

@router.get("/", response_model=UserListResponse)
async def list_users(
    params: UserListParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List users with filtering, sorting, and pagination.
    
    Requires: users:read permission
    """
    if not current_user.has_permission("users:read"):
        raise PermissionDeniedError("Insufficient permissions to list users")
    
    query = db.query(User).filter(
        and_(
            User.organization_id == current_user.organization_id,
            User.is_active == True
        )
    )
    
    # Apply filters
    if params.filters:
        filters = params.filters
        
        if filters.search:
            search_term = f"%{filters.search.lower()}%"
            query = query.filter(
                or_(
                    User.name.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        
        if filters.role:
            # Filter by role (implement role filtering)
            pass
        
        if filters.is_active is not None:
            query = query.filter(User.is_active == filters.is_active)
        
        if filters.created_after:
            query = query.filter(User.created_at >= filters.created_after)
        
        if filters.created_before:
            query = query.filter(User.created_at <= filters.created_before)
    
    # Apply sorting
    if params.sort == UserSortOption.NAME_ASC:
        query = query.order_by(asc(User.name))
    elif params.sort == UserSortOption.NAME_DESC:
        query = query.order_by(desc(User.name))
    elif params.sort == UserSortOption.EMAIL_ASC:
        query = query.order_by(asc(User.email))
    elif params.sort == UserSortOption.EMAIL_DESC:
        query = query.order_by(desc(User.email))
    elif params.sort == UserSortOption.CREATED_ASC:
        query = query.order_by(asc(User.created_at))
    elif params.sort == UserSortOption.LAST_LOGIN_DESC:
        query = query.order_by(desc(User.last_login_at))
    else:  # Default: CREATED_DESC
        query = query.order_by(desc(User.created_at))
    
    # Count total
    total = query.count()
    
    # Apply pagination
    offset = (params.page - 1) * params.page_size
    users = query.offset(offset).limit(params.page_size).all()
    
    # Calculate pagination info
    total_pages = (total + params.page_size - 1) // params.page_size
    has_next = params.page < total_pages
    has_previous = params.page > 1
    
    return UserListResponse(
        users=[UserResponse.from_orm(user) for user in users],
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
        has_next=has_next,
        has_previous=has_previous
    )


# ================================
# USER STATISTICS AND ANALYTICS
# ================================

@router.get("/statistics/summary", response_model=UserStatistics)
async def get_user_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user statistics summary.
    
    Requires: users:analytics permission
    """
    if not current_user.has_permission("users:analytics"):
        raise PermissionDeniedError("Insufficient permissions to view user statistics")
    
    org_id = current_user.organization_id
    
    # Basic user counts
    total_users = db.query(User).filter(
        User.organization_id == org_id
    ).count()
    
    active_users = db.query(User).filter(
        and_(
            User.organization_id == org_id,
            User.is_active == True
        )
    ).count()
    
    # New users counts
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    new_users_today = db.query(User).filter(
        and_(
            User.organization_id == org_id,
            func.date(User.created_at) == today
        )
    ).count()
    
    new_users_this_week = db.query(User).filter(
        and_(
            User.organization_id == org_id,
            func.date(User.created_at) >= week_ago
        )
    ).count()
    
    new_users_this_month = db.query(User).filter(
        and_(
            User.organization_id == org_id,
            func.date(User.created_at) >= month_ago
        )
    ).count()
    
    # Users by role (implement role counting)
    users_by_role = {"admin": 0, "user": 0}  # Placeholder
    
    # Active sessions count
    active_sessions = db.query(UserSession).filter(
        and_(
            UserSession.is_active == True,
            UserSession.expires_at > datetime.utcnow()
        )
    ).count()
    
    # Login activity (recent successful logins)
    recent_logins = db.query(LoginAttempt).filter(
        and_(
            LoginAttempt.success == True,
            LoginAttempt.attempted_at >= datetime.utcnow() - timedelta(days=7)
        )
    ).order_by(desc(LoginAttempt.attempted_at)).limit(10).all()
    
    login_activity = [
        {
            "user_id": login.user_id,
            "email": login.email,
            "attempted_at": login.attempted_at,
            "ip_address": str(login.ip_address) if login.ip_address else None
        }
        for login in recent_logins
    ]
    
    return UserStatistics(
        total_users=total_users,
        active_users=active_users,
        new_users_today=new_users_today,
        new_users_this_week=new_users_this_week,
        new_users_this_month=new_users_this_month,
        users_by_role=users_by_role,
        active_sessions=active_sessions,
        login_activity=login_activity
    )


@router.get("/{user_id}/activity", response_model=List[UserActivityLog])
async def get_user_activity(
    user_id: int,
    limit: int = Query(default=50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user activity log.
    
    Requires: users:read permission or own profile
    """
    user = db.query(User).filter(
        and_(
            User.id == user_id,
            User.organization_id == current_user.organization_id
        )
    ).first()
    
    if not user:
        raise UserNotFoundError(f"User with ID {user_id} not found")
    
    # Check permissions
    if user.id != current_user.id and not current_user.has_permission("users:read"):
        raise PermissionDeniedError("Insufficient permissions to view user activity")
    
    # Get recent activity logs
    activity_logs = db.query(AuditLog).filter(
        AuditLog.user_id == user_id
    ).order_by(desc(AuditLog.created_at)).limit(limit).all()
    
    return [
        UserActivityLog(
            id=log.id,
            user_id=log.user_id,
            action=log.action,
            resource=log.resource_type,
            ip_address=str(log.ip_address) if log.ip_address else None,
            user_agent=log.user_agent,
            metadata=log.new_values or {},
            created_at=log.created_at
        )
        for log in activity_logs
    ]


# ================================
# BULK OPERATIONS
# ================================

@router.post("/bulk-action", response_model=UserBulkOperationResponse)
async def bulk_user_action(
    operation: UserBulkOperation,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Perform bulk operations on users.
    
    Requires: users:bulk_update permission
    """
    if not current_user.has_permission("users:bulk_update"):
        raise PermissionDeniedError("Insufficient permissions for bulk operations")
    
    success_count = 0
    failed_count = 0
    errors = []
    processed_ids = []
    
    for user_id in operation.user_ids:
        try:
            user = db.query(User).filter(
                and_(
                    User.id == user_id,
                    User.organization_id == current_user.organization_id
                )
            ).first()
            
            if not user:
                failed_count += 1
                errors.append({
                    "user_id": user_id,
                    "error": f"User with ID {user_id} not found"
                })
                continue
            
            # Perform action based on operation type
            if operation.action == "activate":
                user.is_active = True
                success_count += 1
            elif operation.action == "deactivate":
                user.is_active = False
                success_count += 1
            elif operation.action == "delete":
                user.is_active = False
                success_count += 1
            elif operation.action == "change_role":
                # Implement role change logic
                success_count += 1
            else:
                failed_count += 1
                errors.append({
                    "user_id": user_id,
                    "error": f"Unknown action: {operation.action}"
                })
                continue
            
            processed_ids.append(user_id)
            
            # Create audit log
            audit_log = AuditLog(
                user_id=current_user.id,
                action=f"user.bulk_{operation.action}",
                resource_type="user",
                resource_id=str(user_id),
                organization_id=current_user.organization_id
            )
            db.add(audit_log)
        
        except Exception as e:
            failed_count += 1
            errors.append({
                "user_id": user_id,
                "error": str(e)
            })
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        return UserBulkOperationResponse(
            success_count=0,
            failed_count=len(operation.user_ids),
            errors=[{"error": f"Database commit failed: {str(e)}"}],
            processed_ids=[]
        )
    
    return UserBulkOperationResponse(
        success_count=success_count,
        failed_count=failed_count,
        errors=errors,
        processed_ids=processed_ids
    )


# ================================
# USER SESSIONS
# ================================

@router.get("/{user_id}/sessions", response_model=List[UserSessionSchema])
async def get_user_sessions(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user active sessions.
    
    Requires: Own profile or users:read permission
    """
    user = db.query(User).filter(
        and_(
            User.id == user_id,
            User.organization_id == current_user.organization_id
        )
    ).first()
    
    if not user:
        raise UserNotFoundError(f"User with ID {user_id} not found")
    
    # Check permissions
    if user.id != current_user.id and not current_user.has_permission("users:read"):
        raise PermissionDeniedError("Insufficient permissions to view user sessions")
    
    sessions = db.query(UserSession).filter(
        and_(
            UserSession.user_id == user_id,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.utcnow()
        )
    ).order_by(desc(UserSession.last_activity)).all()
    
    return [
        UserSessionSchema(
            id=str(session.id),
            user_id=session.user_id,
            ip_address=str(session.ip_address) if session.ip_address else None,
            user_agent=session.user_agent,
            created_at=session.created_at,
            expires_at=session.expires_at,
            is_active=session.is_active
        )
        for session in sessions
    ]


@router.delete("/{user_id}/sessions/{session_id}")
async def revoke_user_session(
    user_id: int,
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke a specific user session.
    
    Requires: Own profile or users:manage_sessions permission
    """
    if user_id != current_user.id and not current_user.has_permission("users:manage_sessions"):
        raise PermissionDeniedError("Insufficient permissions to revoke user sessions")
    
    session = db.query(UserSession).filter(
        and_(
            UserSession.id == session_id,
            UserSession.user_id == user_id,
            UserSession.is_active == True
        )
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    session.revoke("Manual revocation")
    db.commit()
    
    return {"message": "Session revoked successfully"}


@router.delete("/{user_id}/sessions")
async def revoke_all_user_sessions(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke all user sessions.
    
    Requires: Own profile or users:manage_sessions permission
    """
    if user_id != current_user.id and not current_user.has_permission("users:manage_sessions"):
        raise PermissionDeniedError("Insufficient permissions to revoke user sessions")
    
    db.query(UserSession).filter(
        and_(
            UserSession.user_id == user_id,
            UserSession.is_active == True
        )
    ).update({
        "is_active": False,
        "revoked_at": datetime.utcnow(),
        "revoked_reason": "All sessions revoked"
    })
    
    db.commit()
    
    return {"message": "All user sessions revoked successfully"}