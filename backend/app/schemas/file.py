from __future__ import annotations

from app.schemas.common import SchemaBase


class FileUploadRead(SchemaBase):
    original_filename: str
    filename: str
    content_type: str | None
    size_bytes: int
    relative_path: str
    url: str