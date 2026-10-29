import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.engine import Connection

from app.ai.limits import LimitError
from app.dependencies import current_user, settings, user_connection
from app.services.chat import ChatActionError, confirm, send_message

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatBody(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    thread_id: UUID | None = None


class ConfirmBody(BaseModel):
    decision: str
    payload: dict | None = None


def _events(payload: dict):
    yield f"event: token\ndata: {json.dumps({'text': payload['message']})}\n\n"
    if payload.get("pending_action"):
        yield f"event: pending_action\ndata: {json.dumps(payload['pending_action'])}\n\n"
    yield (
        "event: done\ndata: "
        + json.dumps({"thread_id": str(payload["thread_id"]), "route": payload["route"]})
        + "\n\n"
    )


@router.post("")
def post_chat(
    body: ChatBody,
    connection: Connection = Depends(user_connection, scope="function"),
    user_id: UUID = Depends(current_user),
):
    try:
        payload = send_message(connection, user_id, body.message, settings, body.thread_id)
    except LimitError as exc:
        raise HTTPException(status_code=429, detail={"code": exc.code, "message": exc.message})
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "Message is too long"},
        )
    if payload is None:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Thread not found"})
    return StreamingResponse(_events(payload), media_type="text/event-stream")


@router.post("/{thread_id}/confirm")
def post_confirm(
    thread_id: UUID,
    body: ConfirmBody,
    connection: Connection = Depends(user_connection, scope="function"),
    user_id: UUID = Depends(current_user),
):
    if body.decision not in {"approve", "reject", "edit"}:
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "decision must be approve, reject, or edit"},
        )
    try:
        result = confirm(connection, user_id, thread_id, body.decision, body.payload)
    except ChatActionError as exc:
        raise HTTPException(status_code=422, detail={"code": "validation_error", "message": str(exc)})
    if result is None:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Thread not found"})
    return result
