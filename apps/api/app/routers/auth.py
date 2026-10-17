from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.engine import Connection

from app.dependencies import settings, write_connection
from app.schemas.auth import LoginRequest, RefreshRequest, SignupRequest, TokenPair
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail={"code": "unauthorized", "message": "Wrong email or password"},
    )


@router.post("/signup", response_model=TokenPair, status_code=201)
def signup(body: SignupRequest, connection: Connection = Depends(write_connection)):
    pair = auth_service.create_account(
        connection, body.email, body.password, settings
    )
    if pair is None:
        raise HTTPException(
            status_code=409,
            detail={"code": "conflict", "message": "Email is already registered"},
        )
    return pair


@router.post("/login", response_model=TokenPair)
def login(body: LoginRequest, connection: Connection = Depends(write_connection)):
    pair = auth_service.login(connection, body.email, body.password, settings)
    if pair is None:
        raise _unauthorized()
    return pair


@router.post("/refresh", response_model=TokenPair)
def refresh(body: RefreshRequest, connection: Connection = Depends(write_connection)):
    pair = auth_service.refresh(connection, body.refresh_token, settings)
    if pair is None:
        raise HTTPException(
            status_code=401,
            detail={"code": "unauthorized", "message": "Refresh token is not valid"},
        )
    return pair


@router.post("/logout", status_code=204)
def logout(body: RefreshRequest, connection: Connection = Depends(write_connection)):
    auth_service.logout(connection, body.refresh_token)
