from contextlib import asynccontextmanager

import uvicorn
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine

from settings import Settings

settings = Settings()
engine: Engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 3},
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    engine.dispose()


app = FastAPI(lifespan=lifespan)


def db_connection():
    try:
        connection = engine.connect()
    except Exception:
        raise HTTPException(status_code=503, detail="database unavailable")
    try:
        yield connection
    finally:
        connection.close()


@app.get("/health")
def health(connection: Connection = Depends(db_connection)):
    try:
        connection.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status_code=503, detail="database unavailable")
    return {"status": "ok", "database": "ok"}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
