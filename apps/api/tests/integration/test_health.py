import pytest

pytestmark = pytest.mark.integration


def test_health(api_client, make_user):
    from app.core.config import Settings
    from app.core.security import verify_access_token

    user_id = make_user()
    with api_client(user_id) as client:
        token = client.headers["Authorization"].removeprefix("Bearer ")
        assert verify_access_token(token, Settings()) == user_id
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}
