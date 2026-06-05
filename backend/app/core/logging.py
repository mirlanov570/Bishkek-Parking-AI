from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler

from app.core.config import settings


LOG_FORMAT = (
    "%(asctime)s | %(levelname)s | %(name)s | "
    "%(filename)s:%(lineno)d | %(message)s"
)


def get_log_level() -> int:
    level_name = settings.log_level.upper()
    return getattr(logging, level_name, logging.INFO)


def setup_logging() -> None:
    settings.log_path.parent.mkdir(parents=True, exist_ok=True)

    app_logger = logging.getLogger("app")
    app_logger.setLevel(get_log_level())
    app_logger.propagate = False

    has_project_handler = any(
        getattr(handler, "_bishkek_parking_handler", False)
        for handler in app_logger.handlers
    )

    if has_project_handler:
        return

    formatter = logging.Formatter(LOG_FORMAT)

    file_handler = RotatingFileHandler(
        filename=settings.log_path,
        maxBytes=settings.log_max_bytes,
        backupCount=settings.log_backup_count,
        encoding="utf-8",
    )
    file_handler.setLevel(get_log_level())
    file_handler.setFormatter(formatter)
    file_handler._bishkek_parking_handler = True

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(get_log_level())
    console_handler.setFormatter(formatter)
    console_handler._bishkek_parking_handler = True

    app_logger.addHandler(file_handler)
    app_logger.addHandler(console_handler)

    logging.getLogger("app.startup").info(
        "Logging initialized. log_file=%s level=%s",
        settings.log_path,
        settings.log_level.upper(),
    )