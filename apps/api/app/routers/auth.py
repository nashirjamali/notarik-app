from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.engine import Connection

from app.core.security import TokenError, verify_google_token
from app.dependencies import google_key_client, settings, write_connection
from app.schemas.auth import LoginRequest, RefreshRequest, SignupRequest, SocialLoginRequest, TokenPair
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail={"code": "unauthorized", "message": "Wrong email or password"},
    )


@router.post("/signup", response_model=TokenPair, status_code=201)
def signup(body: SignupRequest, connection: Connection = Depends(write_connection, scope="function")):
    pair = auth_service.create_account(
        connection, body.email, body.password, settings, body.name
    )
    if pair is None:
        raise HTTPException(
            status_code=409,
            detail={"code": "conflict", "message": "Email is already registered"},
        )
    return pair


@router.post("/login", response_model=TokenPair)
def login(body: LoginRequest, connection: Connection = Depends(write_connection, scope="function")):
    pair = auth_service.login(connection, body.email, body.password, settings)
    if pair is None:
        raise _unauthorized()
    return pair


@router.post("/social", response_model=TokenPair)
def social(
    body: SocialLoginRequest,
    connection: Connection = Depends(write_connection, scope="function"),
    key_client=Depends(google_key_client),
):
    try:
        identity = verify_google_token(body.id_token, body.nonce, settings, key_client)
    except TokenError:
        raise HTTPException(
            status_code=401,
            detail={"code": "unauthorized", "message": "Google sign-in failed"},
        )
    pair = auth_service.social_login(connection, body.provider, identity, settings)
    if pair is None:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "unauthorized",
                "message": "Google did not confirm this email address",
            },
        )
    return pair


@router.post("/refresh", response_model=TokenPair)
def refresh(body: RefreshRequest, connection: Connection = Depends(write_connection, scope="function")):
    pair = auth_service.refresh(connection, body.refresh_token, settings)
    if pair is None:
        raise HTTPException(
            status_code=401,
            detail={"code": "unauthorized", "message": "Refresh token is not valid"},
        )
    return pair


@router.post("/logout", status_code=204)
def logout(body: RefreshRequest, connection: Connection = Depends(write_connection, scope="function")):
    auth_service.logout(connection, body.refresh_token)
