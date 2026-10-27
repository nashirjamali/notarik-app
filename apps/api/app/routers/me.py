from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.dependencies import current_user, user_connection

router = APIRouter()


class Settings(BaseModel):
    auto_read_receipts: bool
    notifications: bool


class SettingsUpdate(BaseModel):
    auto_read_receipts: bool | None = None
    notifications: bool | None = None


@router.get("/me")
def me(connection: Connection = Depends(user_connection)):
    user_id = connection.execute(text("SELECT auth.uid()")).scalar_one()
    name = connection.execute(text("SELECT auth.current_name()")).scalar_one()
    email = connection.execute(text("SELECT auth.current_email()")).scalar_one()
    return {"user_id": str(user_id), "name": name, "email": email}


def _read(connection: Connection, user_id: UUID) -> Settings:
    row = connection.execute(
        text(
            "SELECT auto_read_receipts, notifications FROM user_settings WHERE user_id = :user_id"
        ),
        {"user_id": user_id},
    ).first()
    # No row yet means nobody changed anything: the defaults apply.
    return Settings(
        auto_read_receipts=row.auto_read_receipts if row else True,
        notifications=row.notifications if row else True,
    )


@router.get("/me/settings", response_model=Settings)
def read_settings(
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    return _read(connection, user_id)


@router.patch("/me/settings", response_model=Settings)
def update_settings(
    body: SettingsUpdate,
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    current = _read(connection, user_id)
    merged = current.model_copy(update=body.model_dump(exclude_none=True))
    connection.execute(
        text(
            """
            INSERT INTO user_settings (user_id, auto_read_receipts, notifications)
            VALUES (:user_id, :auto, :notifications)
            ON CONFLICT (user_id) DO UPDATE
              SET auto_read_receipts = EXCLUDED.auto_read_receipts,
                  notifications = EXCLUDED.notifications
            """
        ),
        {
            "user_id": user_id,
            "auto": merged.auto_read_receipts,
            "notifications": merged.notifications,
        },
    )
    return merged
