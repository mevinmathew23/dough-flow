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
            "principal_amount": 5000,
            "current_balance": 5000,
            "interest_rate": 0.1999,
            "minimum_payment": 150,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["principal_amount"] == 5000
    assert data["current_balance"] == 5000
    assert data["priority_order"] == 0
    assert data["compounding_frequency"] == "monthly"


async def test_create_debt_with_compounding_frequency(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Student Loan", "type": "loan", "institution": "SallieMae"},
    )
    response = await auth_client.post(
        "/api/debts",
        json={
            "account_id": acc.json()["id"],
            "principal_amount": 20000,
            "current_balance": 18000,
            "interest_rate": 0.065,
            "minimum_payment": 250,
            "compounding_frequency": "daily",
        },
    )
    assert response.status_code == 201
    assert response.json()["compounding_frequency"] == "daily"


async def test_list_debts(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Loan", "type": "loan", "institution": "Bank"},
    )
    await auth_client.post(
        "/api/debts",
        json={
            "account_id": acc.json()["id"],
            "principal_amount": 10000,
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
            "principal_amount": 10000,
            "current_balance": 8000,
            "interest_rate": 0.05,
            "minimum_payment": 200,
        },
    )
    response = await auth_client.patch(
        f"/api/debts/{debt.json()['id']}",
        json={"current_balance": 7500, "priority_order": 1, "compounding_frequency": "quarterly"},
    )
    assert response.status_code == 200
    assert response.json()["current_balance"] == 7500
    assert response.json()["priority_order"] == 1
    assert response.json()["compounding_frequency"] == "quarterly"


async def test_delete_debt(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Loan", "type": "loan", "institution": "Bank"},
    )
    debt = await auth_client.post(
        "/api/debts",
        json={
            "account_id": acc.json()["id"],
            "principal_amount": 5000,
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
            "principal_amount": 5000,
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


async def test_payoff_with_daily_compounding(auth_client: AsyncClient):
    """Daily compounding should result in more total interest than monthly."""
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Loan", "type": "loan", "institution": "Bank"},
    )
    # Create debt with daily compounding
    await auth_client.post(
        "/api/debts",
        json={
            "account_id": acc.json()["id"],
            "principal_amount": 10000,
            "current_balance": 10000,
            "interest_rate": 0.10,
            "minimum_payment": 300,
            "compounding_frequency": "daily",
        },
    )

    response = await auth_client.get("/api/debts/payoff")
    assert response.status_code == 200
    data = response.json()
    daily_interest = data["total_interest"]
    assert daily_interest > 0

    # The schedule should show interest-first payments
    schedule = data["projections"][0]["schedule"]
    first_row = schedule[0]
    assert first_row["interest"] > 0
    assert first_row["principal"] > 0
    assert abs(first_row["payment"] - first_row["interest"] - first_row["principal"]) < 0.02


async def test_growth_projection(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Credit Card", "type": "credit", "institution": "Chase"},
    )
    await auth_client.post(
        "/api/debts",
        json={
            "account_id": acc.json()["id"],
            "principal_amount": 5000,
            "current_balance": 5000,
            "interest_rate": 0.20,
            "minimum_payment": 150,
        },
    )

    response = await auth_client.get("/api/debts/growth?months=12")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    projection = data[0]
    assert projection["principal_amount"] == 5000
    assert projection["interest_rate"] == 0.20
    assert len(projection["schedule"]) == 12
    assert projection["total_interest_accrued"] > 0
    assert projection["final_balance"] > 5000
    # Each month should show increasing balance
    for row in projection["schedule"]:
        assert row["interest_accrued"] > 0
        assert row["balance"] > 5000


async def test_grouped_summary(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Credit Card", "type": "credit", "institution": "Chase"},
    )
    acc2 = await auth_client.post(
        "/api/accounts",
        json={"name": "Student Loan", "type": "loan", "institution": "Bank"},
    )

    await auth_client.post(
        "/api/debts",
        json={
            "account_id": acc.json()["id"],
            "principal_amount": 5000,
            "current_balance": 5000,
            "interest_rate": 0.20,
            "minimum_payment": 150,
        },
    )
    await auth_client.post(
        "/api/debts",
        json={
            "account_id": acc2.json()["id"],
            "principal_amount": 15000,
            "current_balance": 10000,
            "interest_rate": 0.05,
            "minimum_payment": 200,
        },
    )

    response = await auth_client.get("/api/debts/grouped")
    assert response.status_code == 200
    data = response.json()
    assert data["debt_count"] == 2
    assert data["total_principal"] == 20000
    assert data["total_current_balance"] == 15000
    assert data["total_minimum_payment"] == 350
    # Weighted rate: (5000*0.20 + 10000*0.05) / 15000 = 1500/15000 = 0.1
    assert abs(data["weighted_interest_rate"] - 0.1) < 0.001


async def test_unauthorized_debts(client: AsyncClient):
    response = await client.get("/api/debts")
    assert response.status_code == 401
