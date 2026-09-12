from fastapi import Request, status
from fastapi.responses import JSONResponse

class AppException(Exception):
    def __init__(self, status_code: int, error_code: str, message: str, details: list = None):
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.details = details or []

class AuthenticationError(AppException):
    def __init__(self, message: str = "Authentication failed", details: list = None):
        super().__init__(status.HTTP_401_UNAUTHORIZED, "UNAUTHORIZED", message, details)

class AuthorizationError(AppException):
    def __init__(self, message: str = "Permission denied", details: list = None):
        super().__init__(status.HTTP_403_FORBIDDEN, "FORBIDDEN", message, details)

class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found", details: list = None):
        super().__init__(status.HTTP_404_NOT_FOUND, "NOT_FOUND", message, details)

class ValidationError(AppException):
    def __init__(self, message: str = "Validation failed", details: list = None):
        super().__init__(status.HTTP_422_UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", message, details)

class ConflictError(AppException):
    def __init__(self, message: str = "Resource conflict", details: list = None):
        super().__init__(status.HTTP_409_CONFLICT, "CONFLICT", message, details)

class RateLimitError(AppException):
    def __init__(self, message: str = "Too many requests", details: list = None):
        super().__init__(status.HTTP_429_TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED", message, details)

from app.core.logging import get_logger

logger = get_logger("exceptions")

async def app_exception_handler(request: Request, exc: AppException):
    if exc.status_code >= 500:
        logger.error(f"[{exc.error_code}] {exc.message} on {request.method} {request.url.path}")
    else:
        logger.warning(f"[{exc.error_code}] {exc.message} on {request.method} {request.url.path}")

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )
