from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile

from app.api.v1.endpoints.utils import raise_service_error
from app.auth.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.file import FileUploadRead
from app.services.exceptions import ServiceError
from app.services.file_service import file_service


router = APIRouter(
    prefix="/files",
    tags=["Files"],
)


@router.post("/upload", response_model=FileUploadRead)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
) -> FileUploadRead:
    try:
        result = await file_service.save_upload_file(file)
        return FileUploadRead(**result)
    except ServiceError as exc:
        raise_service_error(exc)