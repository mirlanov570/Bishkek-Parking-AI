def setup_logging() -> None:
    # Проверяем, запущено ли приложение в Vercel
    import os
    is_vercel = os.environ.get("VERCEL", "0") == "1"

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

    # ДОБАВЛЯЕМ УСЛОВИЕ: файл создаем только если НЕ Vercel
    if not is_vercel:
        settings.log_path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            filename=settings.log_path,
            maxBytes=settings.log_max_bytes,
            backupCount=settings.log_backup_count,
            encoding="utf-8",
        )
        file_handler.setLevel(get_log_level())
        file_handler.setFormatter(formatter)
        file_handler._bishkek_parking_handler = True
        app_logger.addHandler(file_handler)

    # Консоль работает везде, её оставляем всегда
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(get_log_level())
    console_handler.setFormatter(formatter)
    console_handler._bishkek_parking_handler = True
    app_logger.addHandler(console_handler)

    logging.getLogger("app.startup").info("Logging initialized. Vercel mode: %s", is_vercel)