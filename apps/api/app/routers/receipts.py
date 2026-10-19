import json
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.engine import Connection

from app.dependencies import current_user, settings, user_connection
from app.services.receipts import confirm_run, create_run, get_run, image_path

router = APIRouter(prefix="/receipts", tags=["receipts"])


class ConfirmBody(BaseModel):
    merchant: str | None = None
    date: str | None = None
    total_minor: int | None = None
    category: str | None = None
    items: list[dict] | None = None


def _missing() -> HTTPException:
    return HTTPException(status_code=404, detail={"code": "not_found", "message": "Receipt run not found"})


@router.post("", status_code=201)
def upload(
    file: UploadFile = File(...),
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    payload = file.file.read()
    try:
        return create_run(connection, user_id, payload, settings)
    except ValueError as exc:
        code = str(exc)
        if code == "concurrency":
            raise HTTPException(
                status_code=429,
                detail={"code": "rate_limited", "message": "Too many receipts are waiting for review"},
            )
        raise HTTPException(
            status_code=422,
            detail={
                "code": "validation_error",
                "message": "Upload a JPEG, PNG, or PDF under 5 MB",
            },
        )


@router.get("/{run_id}")
def read_run(
    run_id: UUID,
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    row = get_run(connection, user_id, run_id)
    if row is None:
        raise _missing()
    row.pop("image_path", None)
    return row


@router.get("/{run_id}/events")
def events(
    run_id: UUID,
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    row = get_run(connection, user_id, run_id)
    if row is None:
        raise _missing()

    def stream():
        for event in row["trace"] or []:
            yield f"event: step\ndata: {json.dumps(event)}\n\n"
        yield f"event: done\ndata: {json.dumps({'status': row['status'], 'run_id': str(run_id)})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.get("/{run_id}/image")
def image(
    run_id: UUID,
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    path = image_path(connection, user_id, run_id)
    if path is None:
        raise _missing()
    return FileResponse(path)


@router.post("/{run_id}/confirm")
def confirm(
    run_id: UUID,
    body: ConfirmBody,
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    try:
        result = confirm_run(connection, user_id, run_id, body.model_dump(exclude_none=True))
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "Merchant, date, and total are required"},
        )
    if result is None:
        raise _missing()
    result["transaction_id"] = str(result["transaction_id"])
    return result
