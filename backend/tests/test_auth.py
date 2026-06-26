from fastapi.testclient import TestClient


def test_register_and_me(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={"username": "student", "email": "student@example.com", "password": "password123"},
    )

    assert response.status_code == 201
    token = response.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "student@example.com"


def test_login_rejects_wrong_password(client: TestClient) -> None:
    client.post(
        "/auth/register",
        json={"username": "student", "email": "student@example.com", "password": "password123"},
    )

    response = client.post(
        "/auth/login",
        json={"email": "student@example.com", "password": "wrong"},
    )

    assert response.status_code == 401
