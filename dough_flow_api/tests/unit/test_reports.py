from httpx import AsyncClient


async def _seed_transactions(auth_client: AsyncClient) -> str:
    """Helper to create an account with transactions for reports."""
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase", "balance": 5000},
    )
    account_id = acc.json()["id"]

    cats = await auth_client.get("/api/categories")
    food_cat = next(c for c in cats.json() if c["name"] == "Food & Groceries")
    housing_cat = next(c for c in cats.json() if c["name"] == "Housing")
    salary_cat = next(c for c in cats.json() if c["name"] == "Salary")

    # March income
    await auth_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-03-01",
            "amount": 5000,
            "description": "Paycheck",
            "type": "income",
            "category_id": salary_cat["id"],
        },
    )
    # March expenses
    await auth_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-03-05",
            "amount": -1500,
            "description": "Rent",
            "type": "expense",
            "category_id": housing_cat["id"],
        },
    )
    await auth_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-03-10",
            "amount": -300,
            "description": "Groceries",
            "type": "expense",
            "category_id": food_cat["id"],
        },
    )

    return account_id


async def test_monthly_summary(auth_client: AsyncClient):
    await _seed_transactions(auth_client)

    response = await auth_client.get("/api/reports/monthly?month=2026-03-01")
    assert response.status_code == 200
    data = response.json()
    assert data["income"] == 5000
    assert data["expenses"] == 1800
    assert data["savings"] == 3200
    assert data["savings_rate"] == 64.0


async def test_category_breakdown(auth_client: AsyncClient):
    await _seed_transactions(auth_client)

    response = await auth_client.get("/api/reports/categories?month=2026-03-01")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Sorted by total descending
    assert data[0]["category_name"] == "Housing"
    assert data[0]["total"] == 1500
    assert data[1]["category_name"] == "Food & Groceries"
    assert data[1]["total"] == 300


async def test_category_comparison(auth_client: AsyncClient):
    await _seed_transactions(auth_client)

    response = await auth_client.get("/api/reports/categories/comparison?month=2026-03-01")
    assert response.status_code == 200
    data = response.json()
    # Should have categories with prior_total and pct_change fields
    for entry in data:
        assert "prior_total" in entry
        assert "pct_change" in entry


async def test_income_vs_expense_trend(auth_client: AsyncClient):
    await _seed_transactions(auth_client)

    response = await auth_client.get("/api/reports/trend?months=6")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 6
    # Each entry should have month, income, expenses, savings, savings_rate
    for entry in data:
        assert "month" in entry
        assert "income" in entry
        assert "expenses" in entry


async def test_net_worth(auth_client: AsyncClient):
    await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase", "balance": 5000},
    )
    await auth_client.post(
        "/api/accounts",
        json={"name": "Savings", "type": "savings", "institution": "Ally", "balance": 10000},
    )
    await auth_client.post(
        "/api/accounts",
        json={"name": "Credit Card", "type": "credit", "institution": "Amex", "balance": -2000},
    )

    response = await auth_client.get("/api/reports/net-worth")
    assert response.status_code == 200
    assert response.json()["net_worth"] == 13000


async def test_unauthorized_reports(client: AsyncClient):
    response = await client.get("/api/reports/monthly?month=2026-03-01")
    assert response.status_code == 401
