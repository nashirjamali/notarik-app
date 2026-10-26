from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.dependencies import user_connection

router = APIRouter()


@router.get("/me")
def me(connection: Connection = Depends(user_connection)):
    user_id = connection.execute(text("SELECT auth.uid()")).scalar_one()
    name = connection.execute(text("SELECT auth.current_name()")).scalar_one()
    return {"user_id": str(user_id), "name": name}
