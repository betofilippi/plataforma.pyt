"""
Database models initialization and registry.

This module imports all models for Alembic discovery, provides database
initialization functions, and maintains the model registry for the application.
"""

# Import all models to ensure they are registered with SQLAlchemy
from .base import Base, BaseModel, EnhancedBaseModel, NamedEntityModel, ConfigurableModel
from .users import (
    Organization, User, Role, Permission, UserPermission, Group, GroupMember, 
    GroupPermission, UserSession, LoginAttempt, AuditLog,
    user_roles_table, role_permissions_table, user_permissions_table
)
from .core import (
    Module, ModulePermission, UserModuleSettings, Window, DashboardLayout, 
    DashboardWidget, Worksheet, ColumnConfig, Cell, WorksheetRelationship,
    SystemSetting, Notification, NotificationTemplate
)
from .storage import (
    StorageBucket, File, FileVersion, FileThumbnail, FileShare, Document,
    DocumentAttachment, DocumentAnnotation, MediaCollection, MediaCollectionItem
)

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from typing import Optional, Dict, Any, List
import logging
import uuid
from datetime import datetime


# Configure logging
logger = logging.getLogger(__name__)

# Global session factory
SessionLocal: Optional[sessionmaker] = None

# Model registry for easy access
MODEL_REGISTRY = {
    # Base models
    'BaseModel': BaseModel,
    'EnhancedBaseModel': EnhancedBaseModel,
    'NamedEntityModel': NamedEntityModel,
    'ConfigurableModel': ConfigurableModel,
    
    # User and authentication models
    'Organization': Organization,
    'User': User,
    'Role': Role,
    'Permission': Permission,
    'UserPermission': UserPermission,
    'Group': Group,
    'GroupMember': GroupMember,
    'GroupPermission': GroupPermission,
    'UserSession': UserSession,
    'LoginAttempt': LoginAttempt,
    'AuditLog': AuditLog,
    
    # Core business models
    'Module': Module,
    'ModulePermission': ModulePermission,
    'UserModuleSettings': UserModuleSettings,
    'Window': Window,
    'DashboardLayout': DashboardLayout,
    'DashboardWidget': DashboardWidget,
    'Worksheet': Worksheet,
    'ColumnConfig': ColumnConfig,
    'Cell': Cell,
    'WorksheetRelationship': WorksheetRelationship,
    'SystemSetting': SystemSetting,
    'Notification': Notification,
    'NotificationTemplate': NotificationTemplate,
    
    # Storage and file models
    'StorageBucket': StorageBucket,
    'File': File,
    'FileVersion': FileVersion,
    'FileThumbnail': FileThumbnail,
    'FileShare': FileShare,
    'Document': Document,
    'DocumentAttachment': DocumentAttachment,
    'DocumentAnnotation': DocumentAnnotation,
    'MediaCollection': MediaCollection,
    'MediaCollectionItem': MediaCollectionItem,
}

# Association tables registry
ASSOCIATION_TABLES = {
    'user_roles': user_roles_table,
    'role_permissions': role_permissions_table,
    'user_permissions': user_permissions_table,
}


def get_model_class(model_name: str):
    """
    Get a model class by name.
    
    Args:
        model_name: Name of the model class
        
    Returns:
        Model class or None if not found
    """
    return MODEL_REGISTRY.get(model_name)


def get_all_models() -> Dict[str, Any]:
    """Get all registered models."""
    return MODEL_REGISTRY.copy()


def get_table_names() -> List[str]:
    """Get all table names from registered models."""
    table_names = []
    
    for model_class in MODEL_REGISTRY.values():
        if hasattr(model_class, '__tablename__'):
            table_names.append(model_class.__tablename__)
    
    # Add association tables
    for table in ASSOCIATION_TABLES.values():
        table_names.append(table.name)
    
    return sorted(table_names)


def init_database(database_url: str, echo: bool = False, pool_pre_ping: bool = True) -> sessionmaker:
    """
    Initialize database connection and create session factory.
    
    Args:
        database_url: Database connection URL
        echo: Whether to echo SQL statements
        pool_pre_ping: Whether to enable connection pool pre-ping
        
    Returns:
        Session factory
    """
    global SessionLocal
    
    # Create engine with optimized settings
    engine_kwargs = {
        'echo': echo,
        'pool_pre_ping': pool_pre_ping,
        'pool_recycle': 3600,  # Recycle connections after 1 hour
        'pool_size': 10,
        'max_overflow': 20,
    }
    
    # Handle SQLite special case
    if database_url.startswith('sqlite'):
        engine_kwargs.update({
            'poolclass': StaticPool,
            'connect_args': {'check_same_thread': False}
        })
        # Remove postgres-specific settings
        engine_kwargs.pop('pool_recycle', None)
        engine_kwargs.pop('pool_size', None)
        engine_kwargs.pop('max_overflow', None)
    
    engine = create_engine(database_url, **engine_kwargs)
    
    # Add event listeners for better database behavior
    setup_database_events(engine)
    
    # Create session factory
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    logger.info(f"Database initialized with URL: {database_url}")
    return SessionLocal


def setup_database_events(engine):
    """
    Set up database event listeners for optimization and logging.
    
    Args:
        engine: SQLAlchemy engine instance
    """
    
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        """Set SQLite pragmas for better performance."""
        if 'sqlite' in str(engine.url):
            cursor = dbapi_connection.cursor()
            # Enable foreign key constraints
            cursor.execute("PRAGMA foreign_keys=ON")
            # Use WAL mode for better concurrency
            cursor.execute("PRAGMA journal_mode=WAL")
            # Optimize for speed
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA cache_size=10000")
            cursor.execute("PRAGMA temp_store=MEMORY")
            cursor.close()
    
    @event.listens_for(engine, "connect")
    def set_postgres_settings(dbapi_connection, connection_record):
        """Set PostgreSQL settings for better performance."""
        if 'postgresql' in str(engine.url):
            # Set timezone to UTC
            with dbapi_connection.cursor() as cursor:
                cursor.execute("SET timezone TO 'UTC'")
    
    # Log slow queries
    @event.listens_for(engine, "before_cursor_execute")
    def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        context._query_start_time = datetime.now()
    
    @event.listens_for(engine, "after_cursor_execute")  
    def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        total = (datetime.now() - context._query_start_time).total_seconds()
        if total > 1.0:  # Log queries taking more than 1 second
            logger.warning(f"Slow query ({total:.2f}s): {statement[:200]}...")


def create_tables(engine):
    """
    Create all database tables.
    
    Args:
        engine: SQLAlchemy engine instance
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        raise


def drop_tables(engine):
    """
    Drop all database tables.
    
    Args:
        engine: SQLAlchemy engine instance
    """
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("Database tables dropped successfully")
    except Exception as e:
        logger.error(f"Error dropping tables: {e}")
        raise


def get_db_session() -> Session:
    """
    Get a database session.
    
    Returns:
        Database session instance
        
    Raises:
        RuntimeError: If database is not initialized
    """
    if SessionLocal is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    
    return SessionLocal()


def get_database_info() -> Dict[str, Any]:
    """
    Get information about the database schema.
    
    Returns:
        Dictionary with database information
    """
    info = {
        'total_models': len(MODEL_REGISTRY),
        'total_tables': len(get_table_names()),
        'models_by_category': {
            'user_auth': ['Organization', 'User', 'Role', 'Permission', 'UserPermission', 
                         'Group', 'GroupMember', 'GroupPermission', 'UserSession', 
                         'LoginAttempt', 'AuditLog'],
            'core_business': ['Module', 'ModulePermission', 'UserModuleSettings', 'Window',
                            'DashboardLayout', 'DashboardWidget', 'Worksheet', 'ColumnConfig',
                            'Cell', 'WorksheetRelationship', 'SystemSetting', 'Notification',
                            'NotificationTemplate'],
            'storage_files': ['StorageBucket', 'File', 'FileVersion', 'FileThumbnail', 
                            'FileShare', 'Document', 'DocumentAttachment', 'DocumentAnnotation',
                            'MediaCollection', 'MediaCollectionItem']
        },
        'association_tables': list(ASSOCIATION_TABLES.keys()),
        'table_names': get_table_names()
    }
    return info


def seed_initial_data(session: Session):
    """
    Seed the database with initial required data.
    
    Args:
        session: Database session
    """
    try:
        # Create default organization if it doesn't exist
        default_org = session.query(Organization).filter_by(name='plataforma').first()
        if not default_org:
            default_org = Organization(
                id=uuid.UUID('00000000-0000-0000-0000-000000000001'),
                name='plataforma',
                display_name='Plataforma.dev',
                domain='plataforma.dev',
                description='Default organization for Plataforma.dev'
            )
            session.add(default_org)
            logger.info("Created default organization")
        
        # Create system permissions
        system_permissions = [
            # System permissions
            ('system:admin_panel', 'Admin Panel', 'Access to admin panel', 'system', 'system', 'admin_panel'),
            ('system:system_settings', 'System Settings', 'Manage system configuration', 'system', 'system', 'settings'),
            ('system:audit_logs', 'Audit Logs', 'View system audit logs', 'system', 'audit', 'read'),
            
            # User management
            ('users:create', 'Create Users', 'Create new user accounts', 'user_management', 'users', 'create'),
            ('users:read', 'View Users', 'View user accounts', 'user_management', 'users', 'read'),
            ('users:update', 'Update Users', 'Edit user accounts', 'user_management', 'users', 'update'),
            ('users:delete', 'Delete Users', 'Delete user accounts', 'user_management', 'users', 'delete'),
            ('users:manage_roles', 'Manage User Roles', 'Assign/remove user roles', 'user_management', 'user_roles', 'manage'),
            
            # Role management
            ('roles:create', 'Create Roles', 'Create new roles', 'user_management', 'roles', 'create'),
            ('roles:read', 'View Roles', 'View roles', 'user_management', 'roles', 'read'),
            ('roles:update', 'Update Roles', 'Edit roles', 'user_management', 'roles', 'update'),
            ('roles:delete', 'Delete Roles', 'Delete roles', 'user_management', 'roles', 'delete'),
            ('roles:manage_permissions', 'Manage Role Permissions', 'Assign permissions to roles', 'user_management', 'role_permissions', 'manage'),
            
            # Module management
            ('modules:install', 'Install Modules', 'Install new modules', 'module_management', 'modules', 'install'),
            ('modules:configure', 'Configure Modules', 'Configure module settings', 'module_management', 'modules', 'configure'),
            ('modules:uninstall', 'Uninstall Modules', 'Remove modules', 'module_management', 'modules', 'uninstall'),
            
            # Data access
            ('data:read', 'Read Data', 'Read data from database', 'data_access', 'data', 'read'),
            ('data:write', 'Write Data', 'Write data to database', 'data_access', 'data', 'write'),
            ('data:delete', 'Delete Data', 'Delete data from database', 'data_access', 'data', 'delete'),
        ]
        
        for perm_name, display_name, description, category, resource, action in system_permissions:
            existing_perm = session.query(Permission).filter_by(name=perm_name).first()
            if not existing_perm:
                permission = Permission(
                    name=perm_name,
                    display_name=display_name,
                    description=description,
                    category=category,
                    resource=resource,
                    action=action,
                    is_system_permission=True
                )
                session.add(permission)
        
        # Create system roles
        system_roles = [
            ('super_admin', 'Super Admin', 'System super administrator with full access', 0, '#dc2626', 'Crown'),
            ('admin', 'Administrator', 'Organization administrator', 1, '#ea580c', 'Shield'),
            ('manager', 'Manager', 'Department manager', 2, '#2563eb', 'Users'),
            ('user', 'User', 'Standard user', 3, '#16a34a', 'User'),
            ('readonly', 'Read Only', 'Read-only access', 4, '#6b7280', 'Eye'),
        ]
        
        for role_name, display_name, description, level, color, icon in system_roles:
            existing_role = session.query(Role).filter_by(name=role_name, organization_id=default_org.id).first()
            if not existing_role:
                role = Role(
                    name=role_name,
                    display_name=display_name,
                    description=description,
                    level=level,
                    color=color,
                    icon=icon,
                    organization_id=default_org.id,
                    is_system_role=True
                )
                session.add(role)
        
        # Create default storage bucket
        default_bucket = session.query(StorageBucket).filter_by(bucket_key='default').first()
        if not default_bucket:
            default_bucket = StorageBucket(
                name='default',
                display_name='Default Storage',
                description='Default storage bucket for files',
                bucket_key='default',
                provider='local',
                provider_bucket_name='default-bucket',
                max_file_size=100 * 1024 * 1024,  # 100MB
                storage_quota=10 * 1024 * 1024 * 1024,  # 10GB
                is_public=False,
                public_read=False
            )
            session.add(default_bucket)
            logger.info("Created default storage bucket")
        
        # Create system settings
        default_settings = [
            ('platform.name', 'Plataforma.dev', 'string', 'general', True),
            ('platform.version', '1.0.0', 'string', 'general', True),
            ('platform.description', 'Modern business platform', 'string', 'general', True),
            ('auth.session_timeout', 3600, 'number', 'security', False),
            ('auth.max_login_attempts', 5, 'number', 'security', False),
            ('files.max_upload_size', 104857600, 'number', 'storage', False),  # 100MB
            ('notifications.default_expiry_hours', 168, 'number', 'notifications', False),  # 7 days
        ]
        
        for setting_key, setting_value, data_type, category, is_public in default_settings:
            existing_setting = session.query(SystemSetting).filter_by(setting_key=setting_key).first()
            if not existing_setting:
                setting = SystemSetting(
                    name=setting_key,
                    display_name=setting_key.replace('.', ' ').replace('_', ' ').title(),
                    setting_key=setting_key,
                    setting_value=setting_value,
                    data_type=data_type,
                    category=category,
                    is_public=is_public
                )
                session.add(setting)
        
        # Commit all changes
        session.commit()
        logger.info("Database seeded with initial data successfully")
        
    except Exception as e:
        session.rollback()
        logger.error(f"Error seeding database: {e}")
        raise


def validate_database_schema(session: Session) -> Dict[str, Any]:
    """
    Validate the database schema and return status information.
    
    Args:
        session: Database session
        
    Returns:
        Dictionary with validation results
    """
    validation_results = {
        'valid': True,
        'errors': [],
        'warnings': [],
        'table_counts': {},
        'indexes_missing': [],
        'constraints_missing': []
    }
    
    try:
        # Check if required tables exist and get counts
        for model_name, model_class in MODEL_REGISTRY.items():
            if hasattr(model_class, '__tablename__'):
                try:
                    count = session.query(model_class).count()
                    validation_results['table_counts'][model_class.__tablename__] = count
                except Exception as e:
                    validation_results['errors'].append(f"Error querying {model_class.__tablename__}: {e}")
                    validation_results['valid'] = False
        
        # Check for required initial data
        org_count = session.query(Organization).count()
        if org_count == 0:
            validation_results['warnings'].append("No organizations found - consider running seed_initial_data()")
        
        perm_count = session.query(Permission).count()
        if perm_count == 0:
            validation_results['warnings'].append("No permissions found - consider running seed_initial_data()")
        
        role_count = session.query(Role).count()
        if role_count == 0:
            validation_results['warnings'].append("No roles found - consider running seed_initial_data()")
        
        bucket_count = session.query(StorageBucket).count()
        if bucket_count == 0:
            validation_results['warnings'].append("No storage buckets found - consider running seed_initial_data()")
        
    except Exception as e:
        validation_results['errors'].append(f"Schema validation error: {e}")
        validation_results['valid'] = False
    
    return validation_results


# Export commonly used items
__all__ = [
    'Base', 'BaseModel', 'EnhancedBaseModel', 'NamedEntityModel', 'ConfigurableModel',
    'Organization', 'User', 'Role', 'Permission', 'UserPermission', 'Group',
    'Module', 'Window', 'DashboardLayout', 'Worksheet', 'Cell',
    'StorageBucket', 'File', 'Document',
    'MODEL_REGISTRY', 'ASSOCIATION_TABLES',
    'init_database', 'create_tables', 'drop_tables', 'get_db_session',
    'seed_initial_data', 'validate_database_schema', 'get_database_info'
]