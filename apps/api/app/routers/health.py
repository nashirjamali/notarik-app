from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.dependencies import db_connection

router = APIRouter()


@router.get("/health")
def health(connection: Connection = Depends(db_connection)):
    try:
        connection.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status_code=503, detail="database unavailable")
    return {"status": "ok", "database": "ok"}
