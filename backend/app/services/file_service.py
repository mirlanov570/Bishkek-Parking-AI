from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import settings
from app.services.exceptions import ValidationError


class FileService:
    def ensure_upload_dir_exists(self) -> None:
        settings.upload_path.mkdir(parents=True, exist_ok=True)

    def validate_extension(
        self,
        filename: str,
    ) -> str:
        suffix = Path(filename).suffix.lower()

        if not suffix:
            raise ValidationError(
                message="File extension is required",
                code="FILE_EXTENSION_REQUIRED",
            )

        allowed_extensions = {
            extension.lower()
            for extension in settings.allowed_upload_extensions
        }

        if suffix not in allowed_extensions:
            raise ValidationError(
                message=(
                    "File extension is not allowed. "
                    f"Allowed extensions: {', '.join(sorted(allowed_extensions))}"
                ),
                code="FILE_EXTENSION_NOT_ALLOWED",
            )

        return suffix

    def build_safe_filename(
        self,
        original_filename: str,
    ) -> str:
        suffix = self.validate_extension(original_filename)
        return f"{uuid4().hex}{suffix}"

    async def save_upload_file(
        self,
        file: UploadFile,
    ) -> dict[str, str | int | None]:
        if not file.filename:
            raise ValidationError(
                message="Filename is required",
                code="FILENAME_REQUIRED",
            )

        self.ensure_upload_dir_exists()

        safe_filename = self.build_safe_filename(file.filename)
        destination = settings.upload_path / safe_filename

        size_bytes = 0
        chunk_size = 1024 * 1024

        try:
            with destination.open("wb") as buffer:
                while True:
                    chunk = await file.read(chunk_size)

                    if not chunk:
                        break

                    size_bytes += len(chunk)

                    if size_bytes > settings.max_upload_size_bytes:
                        buffer.close()
                        destination.unlink(missing_ok=True)

                        raise ValidationError(
                            message=(
                                f"File is too large. "
                                f"Max size is {settings.max_upload_size_mb} MB"
                            ),
                            code="FILE_TOO_LARGE",
                        )

                    buffer.write(chunk)
        finally:
            await file.close()

        relative_path = f"{settings.upload_dir.rstrip('/')}/{safe_filename}".replace("\\", "/")
        url = f"/uploads/{safe_filename}"

        return {
            "original_filename": file.filename,
            "filename": safe_filename,
            "content_type": file.content_type,
            "size_bytes": size_bytes,
            "relative_path": relative_path,
            "url": url,
        }


file_service = FileService()