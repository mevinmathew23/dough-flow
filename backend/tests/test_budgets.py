from httpx import AsyncClient


async def test_create_budget(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories")
    expense_cat = next(c for c in cats.json() if c["name"] == "Housing")

    response = await auth_client.post(
        "/api/budgets",
        json={"category_id": expense_cat["id"], "amount": 1500, "month": "2026-03-01"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["amount"] == 1500
    assert data["category_id"] == expense_cat["id"]


async def test_list_budgets(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories")
    expense_cat = next(c for c in cats.json() if c["name"] == "Housing")

    await auth_client.post(
        "/api/budgets",
        json={"category_id": expense_cat["id"], "amount": 1500, "month": "2026-03-01"},
    )

    response = await auth_client.get("/api/budgets?month=2026-03-01")
    assert response.status_code == 200
    assert len(response.json()) >= 1


async def test_list_budgets_with_spending(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories")
    food_cat = next(c for c in cats.json() if c["name"] == "Food & Groceries")

    await auth_client.post(
        "/api/budgets",
        json={"category_id": food_cat["id"], "amount": 500, "month": "2026-03-01"},
    )

    # Create account and transactions in that category
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase"},
    )
    await auth_client.post(
        "/api/transactions",
        json={
            "account_id": acc.json()["id"],
            "date": "2026-03-10",
            "amount": -150,
            "description": "Grocery Store",
            "type": "expense",
            "category_id": food_cat["id"],
        },
    )

    response = await auth_client.get("/api/budgets/spending?month=2026-03-01")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    food_budget = next(b for b in data if b["category_id"] == food_cat["id"])
    assert food_budget["amount"] == 500
    assert food_budget["spent"] == 150


async def test_update_budget(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories")
    expense_cat = next(c for c in cats.json() if c["name"] == "Housing")

    budget = await auth_client.post(
        "/api/budgets",
        json={"category_id": expense_cat["id"], "amount": 1500, "month": "2026-03-01"},
    )
    response = await auth_client.patch(
        f"/api/budgets/{budget.json()['id']}",
        json={"amount": 2000},
    )
    assert response.status_code == 200
    assert response.json()["amount"] == 2000


async def test_delete_budget(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories")
    expense_cat = next(c for c in cats.json() if c["name"] == "Housing")

    budget = await auth_client.post(
        "/api/budgets",
        json={"category_id": expense_cat["id"], "amount": 1500, "month": "2026-03-01"},
    )
    response = await auth_client.delete(f"/api/budgets/{budget.json()['id']}")
    assert response.status_code == 204


async def test_duplicate_budget_same_category_month(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories")
    expense_cat = next(c for c in cats.json() if c["name"] == "Housing")

    await auth_client.post(
        "/api/budgets",
        json={"category_id": expense_cat["id"], "amount": 1500, "month": "2026-03-01"},
    )
    response = await auth_client.post(
        "/api/budgets",
        json={"category_id": expense_cat["id"], "amount": 2000, "month": "2026-03-01"},
    )
    assert response.status_code == 409


async def test_unauthorized_budgets(client: AsyncClient):
    response = await client.get("/api/budgets?month=2026-03-01")
    assert response.status_code == 401
