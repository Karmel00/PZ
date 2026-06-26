from fastapi.testclient import TestClient

from tests.conftest import register_and_login


def test_note_crud(client: TestClient) -> None:
    headers = register_and_login(client)

    created = client.post(
        "/notes",
        headers=headers,
        json={"title": "Projekt", "content": "Opis notatki", "tag_ids": []},
    )
    assert created.status_code == 201
    note_id = created.json()["id"]

    notes = client.get("/notes", headers=headers)
    assert notes.status_code == 200
    assert len(notes.json()) == 1

    updated = client.put(
        f"/notes/{note_id}",
        headers=headers,
        json={"title": "Projekt v2", "content": "Nowa tresc", "tag_ids": []},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Projekt v2"

    deleted = client.delete(f"/notes/{note_id}", headers=headers)
    assert deleted.status_code == 204

    after_delete = client.get(f"/notes/{note_id}", headers=headers)
    assert after_delete.json()["is_deleted"] is True
