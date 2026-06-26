from fastapi.testclient import TestClient

from tests.conftest import register_and_login


def test_user_cannot_read_other_users_note(client: TestClient) -> None:
    first_headers = register_and_login(client, "first@example.com")
    second_headers = register_and_login(client, "second@example.com")

    created = client.post(
        "/notes",
        headers=first_headers,
        json={"title": "Private", "content": "Secret", "tag_ids": []},
    )
    note_id = created.json()["id"]

    response = client.get(f"/notes/{note_id}", headers=second_headers)

    assert response.status_code == 404
