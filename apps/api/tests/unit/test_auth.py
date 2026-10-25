from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.database import engine
from app.main import app
from support import access_token


def test_api_engine_uses_app_user():
    assert engine.url.username == "app_user"


def test_missing_token_returns_401():
    with TestClient(app) as client:
        response = client.get("/me")
    assert response.status_code == 401


def test_malformed_token_returns_401():
    with TestClient(app) as client:
        response = client.get("/me", headers={"Authorization": "Bearer not-a-token"})
    assert response.status_code == 401


def test_expired_token_returns_401():
    settings = Settings()
    token = access_token(
        uuid4(),
        secret=settings.jwt_secret,
        audience=settings.jwt_audience,
        expired=True,
    )
    with TestClient(app) as client:
        response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_invalid_signature_returns_401():
    settings = Settings()
    token = access_token(
        uuid4(),
        secret=settings.jwt_secret,
        audience=settings.jwt_audience,
        secret_override="not-the-real-jwt-secret-value!!!",
    )
    with TestClient(app) as client:
        response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_wrong_audience_returns_401():
    settings = Settings()
    token = access_token(
        uuid4(),
        secret=settings.jwt_secret,
        audience=settings.jwt_audience,
        audience_override="anon",
    )
    with TestClient(app) as client:
        response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_non_uuid_subject_returns_401():
    settings = Settings()
    token = access_token(
        uuid4(),
        secret=settings.jwt_secret,
        audience=settings.jwt_audience,
        subject="not-a-uuid",
    )
    with TestClient(app) as client:
        response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
