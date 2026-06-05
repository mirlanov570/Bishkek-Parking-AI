from __future__ import annotations


class ServiceError(Exception):
    def __init__(
        self,
        message: str,
        code: str = "SERVICE_ERROR",
        status_code: int = 400,
    ) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(ServiceError):
    def __init__(
        self,
        message: str = "Object not found",
        code: str = "NOT_FOUND",
    ) -> None:
        super().__init__(
            message=message,
            code=code,
            status_code=404,
        )


class ConflictError(ServiceError):
    def __init__(
        self,
        message: str = "Conflict",
        code: str = "CONFLICT",
    ) -> None:
        super().__init__(
            message=message,
            code=code,
            status_code=409,
        )


class ValidationError(ServiceError):
    def __init__(
        self,
        message: str = "Validation error",
        code: str = "VALIDATION_ERROR",
    ) -> None:
        super().__init__(
            message=message,
            code=code,
            status_code=400,
        )


class PermissionDeniedError(ServiceError):
    def __init__(
        self,
        message: str = "Permission denied",
        code: str = "PERMISSION_DENIED",
    ) -> None:
        super().__init__(
            message=message,
            code=code,
            status_code=403,
        )


class AuthenticationError(ServiceError):
    def __init__(
        self,
        message: str = "Authentication failed",
        code: str = "AUTHENTICATION_FAILED",
    ) -> None:
        super().__init__(
            message=message,
            code=code,
            status_code=401,
        )