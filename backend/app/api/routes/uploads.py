import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Attachment, User
from app.core.config import settings
from app.api.deps import get_current_user

router = APIRouter(prefix="/upload", tags=["Uploads"])

# Max file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024

@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    file_size = 0
    async with aiofiles.open(file_path, "wb") as out_file:
        while content := await file.read(1024 * 1024):  # 1MB chunks
            file_size += len(content)
            if file_size > MAX_FILE_SIZE:
                os.remove(file_path)
                raise HTTPException(status_code=400, detail="File too large (max 10MB)")
            await out_file.write(content)

    public_url = f"/uploads/{unique_filename}"

    attachment = Attachment(
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        storage_path=public_url
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return {
        "id": attachment.id,
        "filename": attachment.filename,
        "content_type": attachment.content_type,
        "file_size": attachment.file_size,
        "url": public_url
    }

