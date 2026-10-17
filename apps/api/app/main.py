from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db.database import engine
from app.routers.auth import router as auth_router
from app.routers.health import router as health_router
from app.routers.me import router as me_router
from app.routers.transactions import router as transactions_router

_STATUS_CODES = {
    401: "unauthorized",
    404: "not_found",
    409: "conflict",
    422: "validation_error",
    503: "unavailable",
}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    engine.dispose()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router)
app.include_router(me_router)
app.include_router(auth_router)
app.include_router(transactions_router)


@app.exception_handler(HTTPException)
def http_error(_request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        body = exc.detail
    else:
        body = {
            "code": _STATUS_CODES.get(exc.status_code, "error"),
            "message": str(exc.detail),
        }
    return JSONResponse(status_code=exc.status_code, content=body)


@app.exception_handler(RequestValidationError)
def validation_error(_request: Request, exc: RequestValidationError):
    details = []
    messages = []
    for error in exc.errors():
        loc = ".".join(str(part) for part in error["loc"] if part != "body")
        message = error["msg"]
        details.append({"loc": loc, "message": message})
        messages.append(f"{loc}: {message}" if loc else message)
    return JSONResponse(
        status_code=422,
        content={
            "code": "validation_error",
            "message": "; ".join(messages),
            "details": details,
        },
    )


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
