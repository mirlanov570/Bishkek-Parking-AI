from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.services.exceptions import ServiceError


logger = logging.getLogger("app.errors")


ERROR_CODE_BY_STATUS = {
    status.HTTP_400_BAD_REQUEST: "BAD_REQUEST",
    status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
    status.HTTP_403_FORBIDDEN: "FORBIDDEN",
    status.HTTP_404_NOT_FOUND: "NOT_FOUND",
    status.HTTP_409_CONFLICT: "CONFLICT",
    status.HTTP_422_UNPROCESSABLE_ENTITY: "VALIDATION_ERROR",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
}


DEFAULT_DETAIL_BY_STATUS = {
    status.HTTP_400_BAD_REQUEST: "Bad request",
    status.HTTP_401_UNAUTHORIZED: "Unauthorized",
    status.HTTP_403_FORBIDDEN: "Forbidden",
    status.HTTP_404_NOT_FOUND: "Not found",
    status.HTTP_409_CONFLICT: "Conflict",
    status.HTTP_422_UNPROCESSABLE_ENTITY: "Validation error",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "Internal server error",
}


def build_error_response(
    detail: str,
    code: str,
    status_code: int,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "detail": detail,
            "code": code,
        },
        headers=headers,
    )


def get_default_error_code(status_code: int) -> str:
    return ERROR_CODE_BY_STATUS.get(status_code, "HTTP_ERROR")


def get_default_detail(status_code: int) -> str:
    return DEFAULT_DETAIL_BY_STATUS.get(status_code, "HTTP error")


def normalize_http_exception_detail(
    detail: Any,
    status_code: int,
) -> tuple[str, str]:
    if isinstance(detail, dict):
        message = detail.get("detail")
        code = detail.get("code")

        if isinstance(message, str) and isinstance(code, str):
            return message, code

    if isinstance(detail, str):
        return detail, get_default_error_code(status_code)

    return get_default_detail(status_code), get_default_error_code(status_code)


def format_validation_error(exc: RequestValidationError) -> str:
    errors = exc.errors()

    if not errors:
        return "Validation error"

    first_error = errors[0]
    location = first_error.get("loc", [])
    message = first_error.get("msg", "Invalid value")

    location_text = ".".join(str(item) for item in location)

    if location_text:
        return f"Validation error at {location_text}: {message}"

    return f"Validation error: {message}"


async def service_exception_handler(
    request: Request,
    exc: ServiceError,
) -> JSONResponse:
    logger.warning(
        "ServiceError handled | method=%s path=%s status_code=%s code=%s detail=%s",
        request.method,
        request.url.path,
        exc.status_code,
        exc.code,
        exc.message,
    )

    return build_error_response(
        detail=exc.message,
        code=exc.code,
        status_code=exc.status_code,
    )


async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    detail, code = normalize_http_exception_detail(
        detail=exc.detail,
        status_code=exc.status_code,
    )

    if exc.status_code >= 500:
        logger.error(
            "HTTPException handled | method=%s path=%s status_code=%s code=%s detail=%s",
            request.method,
            request.url.path,
            exc.status_code,
            code,
            detail,
        )
    else:
        logger.info(
            "HTTPException handled | method=%s path=%s status_code=%s code=%s detail=%s",
            request.method,
            request.url.path,
            exc.status_code,
            code,
            detail,
        )

    return build_error_response(
        detail=detail,
        code=code,
        status_code=exc.status_code,
        headers=exc.headers,
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    detail = format_validation_error(exc)

    logger.info(
        "Validation error handled | method=%s path=%s detail=%s",
        request.method,
        request.url.path,
        detail,
    )

    return build_error_response(
        detail=detail,
        code="VALIDATION_ERROR",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    logger.exception(
        "Unhandled exception | method=%s path=%s",
        request.method,
        request.url.path,
    )

    return build_error_response(
        detail="Internal server error",
        code="INTERNAL_SERVER_ERROR",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ServiceError, service_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)