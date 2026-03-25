import uuid

from httpx import AsyncClient


async def _create_debt_account(auth_client: AsyncClient) -> str:
    res = await auth_client.post("/api/accounts", json={
        "name": "Credit Card", "type": "credit", "institution": "Bank",
        "balance": -5000, "interest_rate": 0.20, "minimum_payment": 100,
        "compounding_frequency": "monthly",
    })
    return res.json()["id"]


async def _get_debt_id(auth_client: AsyncClient) -> str:
    res = await auth_client.get("/api/debts")
    return res.json()[0]["id"]


async def test_create_debt_group(auth_client: AsyncClient):
    response = await auth_client.post("/api/debt-groups", json={"name": "Big Debts"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Big Debts"
    assert data["debt_ids"] == []
    assert "id" in data
    assert "created_at" in data


async def test_list_debt_groups(auth_client: AsyncClient):
    await auth_client.post("/api/debt-groups", json={"name": "Group A"})
    await auth_client.post("/api/debt-groups", json={"name": "Group B"})
    response = await auth_client.get("/api/debt-groups")
    assert response.status_code == 200
    assert len(response.json()) == 2


async def test_rename_debt_group(auth_client: AsyncClient):
    create_res = await auth_client.post("/api/debt-groups", json={"name": "Old Name"})
    group_id = create_res.json()["id"]
    response = await auth_client.patch(f"/api/debt-groups/{group_id}", json={"name": "New Name"})
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"


async def test_delete_debt_group(auth_client: AsyncClient):
    create_res = await auth_client.post("/api/debt-groups", json={"name": "To Delete"})
    group_id = create_res.json()["id"]
    response = await auth_client.delete(f"/api/debt-groups/{group_id}")
    assert response.status_code == 204

    list_res = await auth_client.get("/api/debt-groups")
    assert len(list_res.json()) == 0


async def test_set_group_debts(auth_client: AsyncClient):
    await _create_debt_account(auth_client)
    debt_id = await _get_debt_id(auth_client)

    create_res = await auth_client.post("/api/debt-groups", json={"name": "My Group"})
    group_id = create_res.json()["id"]

    response = await auth_client.put(
        f"/api/debt-groups/{group_id}/debts",
        json={"debt_ids": [debt_id]},
    )
    assert response.status_code == 200
    assert debt_id in response.json()["debt_ids"]


async def test_debt_in_multiple_groups(auth_client: AsyncClient):
    await _create_debt_account(auth_client)
    debt_id = await _get_debt_id(auth_client)

    g1 = await auth_client.post("/api/debt-groups", json={"name": "Group 1"})
    g2 = await auth_client.post("/api/debt-groups", json={"name": "Group 2"})

    await auth_client.put(f"/api/debt-groups/{g1.json()['id']}/debts", json={"debt_ids": [debt_id]})
    await auth_client.put(f"/api/debt-groups/{g2.json()['id']}/debts", json={"debt_ids": [debt_id]})

    groups = await auth_client.get("/api/debt-groups")
    for g in groups.json():
        assert debt_id in g["debt_ids"]


async def test_delete_group_does_not_delete_debts(auth_client: AsyncClient):
    await _create_debt_account(auth_client)
    debt_id = await _get_debt_id(auth_client)

    create_res = await auth_client.post("/api/debt-groups", json={"name": "Temp"})
    group_id = create_res.json()["id"]
    await auth_client.put(f"/api/debt-groups/{group_id}/debts", json={"debt_ids": [debt_id]})

    await auth_client.delete(f"/api/debt-groups/{group_id}")

    debts_res = await auth_client.get("/api/debts")
    assert len(debts_res.json()) > 0


async def test_delete_nonexistent_group_returns_404(auth_client: AsyncClient):
    response = await auth_client.delete(f"/api/debt-groups/{uuid.uuid4()}")
    assert response.status_code == 404


async def test_set_group_debts_invalid_id(auth_client: AsyncClient):
    create_res = await auth_client.post("/api/debt-groups", json={"name": "Group"})
    group_id = create_res.json()["id"]
    response = await auth_client.put(
        f"/api/debt-groups/{group_id}/debts",
        json={"debt_ids": [str(uuid.uuid4())]},
    )
    assert response.status_code == 400


async def test_create_group_empty_name(auth_client: AsyncClient):
    response = await auth_client.post("/api/debt-groups", json={"name": ""})
    assert response.status_code == 422


async def test_create_group_name_too_long(auth_client: AsyncClient):
    response = await auth_client.post("/api/debt-groups", json={"name": "x" * 101})
    assert response.status_code == 422
