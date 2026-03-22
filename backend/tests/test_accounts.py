from httpx import AsyncClient


async def test_create_account(auth_client: AsyncClient):
    response = await auth_client.post(
        "/api/accounts",
        json={"name": "Chase Checking", "type": "checking", "institution": "Chase", "balance": 5000},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Chase Checking"
    assert data["type"] == "checking"
    assert data["balance"] == 5000


async def test_list_accounts(auth_client: AsyncClient):
    await auth_client.post(
        "/api/accounts",
        json={"name": "Savings", "type": "savings", "institution": "Ally", "balance": 10000},
    )
    response = await auth_client.get("/api/accounts")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


async def test_get_account(auth_client: AsyncClient):
    create = await auth_client.post(
        "/api/accounts",
        json={"name": "Test Account", "type": "checking", "institution": "Bank", "balance": 100},
    )
    account_id = create.json()["id"]
    response = await auth_client.get(f"/api/accounts/{account_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Test Account"


async def test_update_account(auth_client: AsyncClient):
    create = await auth_client.post(
        "/api/accounts",
        json={"name": "Old Name", "type": "checking", "institution": "Bank", "balance": 100},
    )
    account_id = create.json()["id"]
    response = await auth_client.patch(
        f"/api/accounts/{account_id}",
        json={"name": "New Name", "balance": 200},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"
    assert response.json()["balance"] == 200


async def test_delete_account(auth_client: AsyncClient):
    create = await auth_client.post(
        "/api/accounts",
        json={"name": "Delete Me", "type": "checking", "institution": "Bank"},
    )
    account_id = create.json()["id"]
    response = await auth_client.delete(f"/api/accounts/{account_id}")
    assert response.status_code == 204
    get_response = await auth_client.get(f"/api/accounts/{account_id}")
    assert get_response.status_code == 404


async def test_unauthorized_access(client: AsyncClient):
    response = await client.get("/api/accounts")
    assert response.status_code == 401
