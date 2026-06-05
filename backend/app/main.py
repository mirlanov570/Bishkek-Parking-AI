from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.db.session import engine


setup_logging()

logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup started")

    settings.upload_path.mkdir(parents=True, exist_ok=True)
    settings.log_path.parent.mkdir(parents=True, exist_ok=True)

    logger.info("Upload directory ready: %s", settings.upload_path)
    logger.info("Application startup completed")

    yield

    logger.info("Application shutdown started")

    await engine.dispose()

    logger.info("Database engine disposed")
    logger.info("Application shutdown completed")


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    version="0.1.0",
    description="Backend API для дипломного проекта Bishkek Parking AI",
    lifespan=lifespan,
)


register_exception_handlers(app)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount(
    "/uploads",
    StaticFiles(directory=settings.upload_path),
    name="uploads",
)


@app.get("/health", tags=["System"])
async def health_check() -> dict[str, str]:
    logger.debug("Health check requested")

    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.app_env,
    }


@app.get("/health/db", tags=["System"])
async def database_health_check() -> dict[str, str]:
    logger.debug("Database health check requested")

    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))

    return {
        "status": "ok",
        "database": "connected",
    }


app.include_router(api_router, prefix=settings.api_v1_prefix)