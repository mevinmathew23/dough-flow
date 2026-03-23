from httpx import AsyncClient


async def test_create_debt(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Credit Card", "type": "credit", "institution": "Chase", "balance": -5000},
    )
    response = await auth_client.post(
        "/api/debts",
        json={
            "account_id": acc.json()["id"],
            "original_amount": 5000,
            "current_balance": 5000,
            "interest_rate": 0.1999,
            "minimum_payment": 150,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["original_amount"] == 5000
    assert data["current_balance"] == 5000
    assert data["priority_order"] == 0


async def test_list_debts(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Loan", "type": "loan", "institution": "Bank"},
    )
    await auth_client.post(
        "/api/debts",
        json={
            "account_id": acc.json()["id"],
            "original_amount": 10000,
            "current_balance": 8000,
            "interest_rate": 0.05,
            "minimum_payment": 200,
        },
    )
    response = await auth_client.get("/api/debts")
    assert response.status_code == 200
    assert len(response.json()) >= 1


async def test_update_debt(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Loan", "type": "loan", "institution": "Bank"},
    )
    debt = await auth_client.post(
        "/api/debts",
        json={
            "account_id": acc.json()["id"],
            "original_amount": 10000,
            "current_balance": 8000,
            "interest_rate": 0.05,
            "minimum_payment": 200,
        },
    )
    response = await auth_client.patch(
        f"/api/debts/{debt.json()['id']}",
        json={"current_balance": 7500, "priority_order": 1},
    )
    assert response.status_code == 200
    assert response.json()["current_balance"] == 7500
    assert response.json()["priority_order"] == 1


async def test_delete_debt(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Loan", "type": "loan", "institution": "Bank"},
    )
    debt = await auth_client.post(
        "/api/debts",
        json={
            "account_id": acc.json()["id"],
            "original_amount": 5000,
            "current_balance": 5000,
            "interest_rate": 0.10,
            "minimum_payment": 100,
        },
    )
    response = await auth_client.delete(f"/api/debts/{debt.json()['id']}")
    assert response.status_code == 204


async def test_payoff_projection(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Credit Card", "type": "credit", "institution": "Chase"},
    )
    await auth_client.post(
        "/api/debts",
        json={
            "account_id": acc.json()["id"],
            "original_amount": 5000,
            "current_balance": 5000,
            "interest_rate": 0.20,
            "minimum_payment": 150,
            "priority_order": 1,
        },
    )

    response = await auth_client.get("/api/debts/payoff?extra_monthly=100")
    assert response.status_code == 200
    data = response.json()
    assert "projections" in data
    assert "total_debt" in data
    assert "debt_free_date" in data
    assert "interest_saved_vs_minimum" in data
    assert data["total_debt"] == 5000
    assert data["interest_saved_vs_minimum"] > 0
    assert len(data["projections"]) == 1
    assert len(data["projections"][0]["schedule"]) > 0


async def test_unauthorized_debts(client: AsyncClient):
    response = await client.get("/api/debts")
    assert response.status_code == 401
