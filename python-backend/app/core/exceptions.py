"""
Custom exceptions and global exception handlers for the FastAPI application.

This module provides:
- Custom exception classes
- Global exception handlers
- API error response formatting
- Error logging and monitoring
"""

import traceback
from typing import Any, Dict, Optional, Union

import structlog
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
from sqlalchemy.exc import (
    DBAPIError,
    IntegrityError,
    SQLAlchemyError,
    StatementError,
)
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = structlog.get_logger(__name__)


class ErrorResponse(BaseModel):
    """Standard error response model."""
    success: bool = False
    message: str
    code: str
    details: Optional[Dict[str, Any]] = None
    errors: Optional[list[Dict[str, Any]]] = None
    timestamp: Optional[float] = None
    request_id: Optional[str] = None


class APIException(Exception):
    """Base class for API exceptions."""
    
    def __init__(
        self,
        message: str = "An error occurred",
        code: str = "API_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        self.headers = headers or {}
        super().__init__(self.message)


class ValidationException(APIException):
    """Exception raised for validation errors."""
    
    def __init__(
        self,
        message: str = "Validation error",
        code: str = "VALIDATION_ERROR",
        details: Optional[Dict[str, Any]] = None,
        field_errors: Optional[list[Dict[str, Any]]] = None,
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )
        self.field_errors = field_errors or []


class AuthenticationException(APIException):
    """Exception raised for authentication errors."""
    
    def __init__(
        self,
        message: str = "Authentication failed",
        code: str = "AUTHENTICATION_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
            headers={"WWW-Authenticate": "Bearer"},
        )


class AuthorizationException(APIException):
    """Exception raised for authorization errors."""
    
    def __init__(
        self,
        message: str = "Access denied",
        code: str = "AUTHORIZATION_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class NotFoundError(APIException):
    """Exception raised when a resource is not found."""
    
    def __init__(
        self,
        message: str = "Resource not found",
        code: str = "NOT_FOUND",
        resource: Optional[str] = None,
        resource_id: Optional[Union[str, int]] = None,
    ):
        details = {}
        if resource:
            details["resource"] = resource
        if resource_id:
            details["resource_id"] = str(resource_id)
            
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class ConflictError(APIException):
    """Exception raised when a resource conflict occurs."""
    
    def __init__(
        self,
        message: str = "Resource conflict",
        code: str = "CONFLICT_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class DatabaseException(APIException):
    """Exception raised for database-related errors."""
    
    def __init__(
        self,
        message: str = "Database error occurred",
        code: str = "DATABASE_ERROR",
        original_error: Optional[Exception] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        if details is None:
            details = {}
            
        if original_error:
            details["original_error"] = str(original_error)
            
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details,
        )
        self.original_error = original_error


class RateLimitException(APIException):
    """Exception raised when rate limit is exceeded."""
    
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        code: str = "RATE_LIMIT_EXCEEDED",
        retry_after: Optional[int] = None,
    ):
        headers = {}
        details = {}
        
        if retry_after:
            headers["Retry-After"] = str(retry_after)
            details["retry_after"] = retry_after
            
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details,
            headers=headers,
        )


class ExternalServiceException(APIException):
    """Exception raised when external service calls fail."""
    
    def __init__(
        self,
        message: str = "External service error",
        code: str = "EXTERNAL_SERVICE_ERROR",
        service_name: Optional[str] = None,
        original_error: Optional[Exception] = None,
    ):
        details = {}
        if service_name:
            details["service"] = service_name
        if original_error:
            details["original_error"] = str(original_error)
            
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )


def create_error_response(
    message: str,
    code: str,
    status_code: int,
    details: Optional[Dict[str, Any]] = None,
    errors: Optional[list[Dict[str, Any]]] = None,
    request: Optional[Request] = None,
) -> ErrorResponse:
    """Create a standardized error response."""
    import time
    
    error_response = ErrorResponse(
        success=False,
        message=message,
        code=code,
        details=details,
        errors=errors,
        timestamp=time.time(),
    )
    
    # Add request ID if available
    if request and hasattr(request.state, "request_id"):
        error_response.request_id = request.state.request_id
    
    return error_response


async def api_exception_handler(request: Request, exc: APIException) -> JSONResponse:
    """Handler for custom API exceptions."""
    
    # Log the exception
    logger.error(
        "API exception occurred",
        exception=exc.__class__.__name__,
        message=exc.message,
        code=exc.code,
        status_code=exc.status_code,
        details=exc.details,
        path=request.url.path,
        method=request.method,
    )
    
    # Create error response
    error_response = create_error_response(
        message=exc.message,
        code=exc.code,
        status_code=exc.status_code,
        details=exc.details,
        request=request,
    )
    
    # Add field errors for validation exceptions
    if isinstance(exc, ValidationException) and exc.field_errors:
        error_response.errors = exc.field_errors
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.dict(exclude_none=True),
        headers=exc.headers,
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handler for FastAPI HTTP exceptions."""
    
    logger.warning(
        "HTTP exception occurred",
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
        method=request.method,
    )
    
    # Map common HTTP status codes to our error codes
    code_mapping = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        406: "NOT_ACCEPTABLE",
        408: "REQUEST_TIMEOUT",
        409: "CONFLICT",
        410: "GONE",
        413: "PAYLOAD_TOO_LARGE",
        415: "UNSUPPORTED_MEDIA_TYPE",
        422: "UNPROCESSABLE_ENTITY",
        429: "RATE_LIMIT_EXCEEDED",
        500: "INTERNAL_SERVER_ERROR",
        502: "BAD_GATEWAY",
        503: "SERVICE_UNAVAILABLE",
        504: "GATEWAY_TIMEOUT",
    }
    
    code = code_mapping.get(exc.status_code, "HTTP_ERROR")
    
    error_response = create_error_response(
        message=str(exc.detail),
        code=code,
        status_code=exc.status_code,
        request=request,
    )
    
    headers = getattr(exc, "headers", {})
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.dict(exclude_none=True),
        headers=headers,
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handler for Pydantic validation errors."""
    
    # Format validation errors
    field_errors = []
    for error in exc.errors():
        field_name = ".".join(str(loc) for loc in error["loc"])
        field_errors.append({
            "field": field_name,
            "message": error["msg"],
            "type": error["type"],
            "input": error.get("input"),
        })
    
    logger.warning(
        "Validation error occurred",
        errors=field_errors,
        path=request.url.path,
        method=request.method,
    )
    
    error_response = create_error_response(
        message="Validation error",
        code="VALIDATION_ERROR",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        errors=field_errors,
        request=request,
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.dict(exclude_none=True),
    )


async def database_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handler for SQLAlchemy database errors."""
    
    # Log full error details
    logger.error(
        "Database error occurred",
        exception=exc.__class__.__name__,
        error=str(exc),
        path=request.url.path,
        method=request.method,
        traceback=traceback.format_exc(),
    )
    
    # Determine specific error type and message
    if isinstance(exc, IntegrityError):
        message = "Data integrity constraint violated"
        code = "INTEGRITY_ERROR"
        status_code = status.HTTP_409_CONFLICT
    elif isinstance(exc, StatementError):
        message = "Invalid database query"
        code = "STATEMENT_ERROR"
        status_code = status.HTTP_400_BAD_REQUEST
    elif isinstance(exc, DBAPIError):
        message = "Database connection error"
        code = "DATABASE_CONNECTION_ERROR"
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    else:
        message = "Database error occurred"
        code = "DATABASE_ERROR"
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    
    error_response = create_error_response(
        message=message,
        code=code,
        status_code=status_code,
        request=request,
    )
    
    return JSONResponse(
        status_code=status_code,
        content=error_response.dict(exclude_none=True),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handler for unhandled exceptions."""
    
    # Log full error details
    logger.error(
        "Unhandled exception occurred",
        exception=exc.__class__.__name__,
        error=str(exc),
        path=request.url.path,
        method=request.method,
        traceback=traceback.format_exc(),
    )
    
    error_response = create_error_response(
        message="Internal server error",
        code="INTERNAL_SERVER_ERROR",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        request=request,
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.dict(exclude_none=True),
    )


def setup_exception_handlers(app: FastAPI) -> None:
    """Setup all exception handlers for the FastAPI application."""
    
    # Custom API exceptions
    app.add_exception_handler(APIException, api_exception_handler)
    
    # FastAPI HTTP exceptions
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    
    # Validation errors
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(ValidationError, validation_exception_handler)
    
    # Database errors
    app.add_exception_handler(SQLAlchemyError, database_exception_handler)
    
    # Generic exceptions (catch-all)
    app.add_exception_handler(Exception, generic_exception_handler)
    
    logger.info("Exception handlers configured")


# Utility functions for raising common exceptions
def raise_not_found(resource: str, resource_id: Union[str, int]) -> None:
    """Raise a not found error for a specific resource."""
    raise NotFoundError(
        message=f"{resource} not found",
        resource=resource,
        resource_id=resource_id,
    )


def raise_validation_error(message: str, field_errors: Optional[list[Dict[str, Any]]] = None) -> None:
    """Raise a validation error."""
    raise ValidationException(
        message=message,
        field_errors=field_errors,
    )


def raise_authentication_error(message: str = "Authentication failed") -> None:
    """Raise an authentication error."""
    raise AuthenticationException(message=message)


def raise_authorization_error(message: str = "Access denied") -> None:
    """Raise an authorization error."""
    raise AuthorizationException(message=message)


def raise_conflict_error(message: str, details: Optional[Dict[str, Any]] = None) -> None:
    """Raise a conflict error."""
    raise ConflictError(message=message, details=details)


def raise_rate_limit_error(retry_after: Optional[int] = None) -> None:
    """Raise a rate limit error."""
    raise RateLimitException(retry_after=retry_after)


def raise_external_service_error(service_name: str, original_error: Exception) -> None:
    """Raise an external service error."""
    raise ExternalServiceException(
        message=f"Error communicating with {service_name}",
        service_name=service_name,
        original_error=original_error,
    )