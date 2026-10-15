import pytest

pytestmark = pytest.mark.integration


def test_health(api_client, make_user):
    user_id = make_user()
    with api_client(user_id) as client:
        assert client.headers["Authorization"] == f"Bearer test:{user_id}"
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}
