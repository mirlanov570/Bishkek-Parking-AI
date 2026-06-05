from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, Field
import os


BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE)


class Settings(BaseModel):
    app_name: str = Field(default="Bishkek Parking AI")
    app_env: str = Field(default="local")
    debug: bool = Field(default=True)
    api_v1_prefix: str = Field(default="/api/v1")

    host: str = Field(default="127.0.0.1")
    port: int = Field(default=8000)

    postgres_host: str = Field(default="localhost")
    postgres_port: int = Field(default=5432)
    postgres_db: str = Field(default="bishkek_parking_ai")
    postgres_user: str = Field(default="postgres")
    postgres_password: str = Field(default="123")

    database_url: str
    sync_database_url: str

    secret_key: str = Field(default="change_this_secret_key_for_local_development")
    algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=30)
    refresh_token_expire_days: int = Field(default=7)

    backend_cors_origins: list[str] = Field(default_factory=list)

    upload_dir: str = Field(default="uploads")
    max_upload_size_mb: int = Field(default=10)
    allowed_upload_extensions: list[str] = Field(default_factory=list)

    log_dir: str = Field(default="logs")
    log_file: str = Field(default="app.log")
    log_level: str = Field(default="INFO")
    log_max_bytes: int = Field(default=5 * 1024 * 1024)
    log_backup_count: int = Field(default=5)

    @property
    def upload_path(self) -> Path:
        upload_path = Path(self.upload_dir)

        if not upload_path.is_absolute():
            upload_path = BASE_DIR / upload_path

        return upload_path

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def log_path(self) -> Path:
        log_dir_path = Path(self.log_dir)

        if not log_dir_path.is_absolute():
            log_dir_path = BASE_DIR / log_dir_path

        return log_dir_path / self.log_file


def _get_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _get_int(value: str | None, default: int) -> int:
    if value is None or value.strip() == "":
        return default

    return int(value)


def _get_list(value: str | None) -> list[str]:
    if value is None or value.strip() == "":
        return []

    return [item.strip() for item in value.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    postgres_user = os.getenv("POSTGRES_USER", "postgres")
    postgres_password = os.getenv("POSTGRES_PASSWORD", "123")
    postgres_host = os.getenv("POSTGRES_HOST", "localhost")
    postgres_port = _get_int(os.getenv("POSTGRES_PORT"), 5432)
    postgres_db = os.getenv("POSTGRES_DB", "bishkek_parking_ai")

    default_async_database_url = (
        f"postgresql+asyncpg://{postgres_user}:{postgres_password}"
        f"@{postgres_host}:{postgres_port}/{postgres_db}"
    )

    default_sync_database_url = (
        f"postgresql://{postgres_user}:{postgres_password}"
        f"@{postgres_host}:{postgres_port}/{postgres_db}"
    )

    return Settings(
        app_name=os.getenv("APP_NAME", "Bishkek Parking AI"),
        app_env=os.getenv("APP_ENV", "local"),
        debug=_get_bool(os.getenv("DEBUG"), True),
        api_v1_prefix=os.getenv("API_V1_PREFIX", "/api/v1"),
        host=os.getenv("HOST", "127.0.0.1"),
        port=_get_int(os.getenv("PORT"), 8000),
        postgres_host=postgres_host,
        postgres_port=postgres_port,
        postgres_db=postgres_db,
        postgres_user=postgres_user,
        postgres_password=postgres_password,
        database_url=os.getenv("DATABASE_URL", default_async_database_url),
        sync_database_url=os.getenv("SYNC_DATABASE_URL", default_sync_database_url),
        secret_key=os.getenv("SECRET_KEY", "change_this_secret_key_for_local_development"),
        algorithm=os.getenv("ALGORITHM", "HS256"),
        access_token_expire_minutes=_get_int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"),
            30,
        ),
        refresh_token_expire_days=_get_int(
            os.getenv("REFRESH_TOKEN_EXPIRE_DAYS"),
            7,
        ),
        backend_cors_origins=_get_list(os.getenv("BACKEND_CORS_ORIGINS")),
        upload_dir=os.getenv("UPLOAD_DIR", "uploads"),
        max_upload_size_mb=_get_int(os.getenv("MAX_UPLOAD_SIZE_MB"), 10),
        allowed_upload_extensions=_get_list(
            os.getenv(
                "ALLOWED_UPLOAD_EXTENSIONS",
                ".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx",
            )
        ),
        log_dir=os.getenv("LOG_DIR", "logs"),
        log_file=os.getenv("LOG_FILE", "app.log"),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        log_max_bytes=_get_int(os.getenv("LOG_MAX_BYTES"), 5 * 1024 * 1024),
        log_backup_count=_get_int(os.getenv("LOG_BACKUP_COUNT"), 5),
    )


settings = get_settings()