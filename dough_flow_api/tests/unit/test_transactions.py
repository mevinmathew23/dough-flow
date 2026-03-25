from httpx import AsyncClient


async def test_create_transaction(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase", "balance": 5000},
    )
    account_id = acc.json()["id"]

    response = await auth_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-03-15",
            "amount": -50.00,
            "description": "Grocery Store",
            "type": "expense",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["amount"] == -50.00
    assert data["description"] == "Grocery Store"
    assert data["type"] == "expense"
    assert data["source"] == "manual"


async def test_list_transactions(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase"},
    )
    account_id = acc.json()["id"]

    await auth_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-03-01",
            "amount": 3000,
            "description": "Paycheck",
            "type": "income",
        },
    )
    await auth_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-03-05",
            "amount": -100,
            "description": "Electric Bill",
            "type": "expense",
        },
    )

    response = await auth_client.get("/api/transactions")
    assert response.status_code == 200
    assert len(response.json()) == 2


async def test_list_transactions_filter_by_account(auth_client: AsyncClient):
    acc1 = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase"},
    )
    acc2 = await auth_client.post(
        "/api/accounts",
        json={"name": "Savings", "type": "savings", "institution": "Ally"},
    )

    await auth_client.post(
        "/api/transactions",
        json={
            "account_id": acc1.json()["id"],
            "date": "2026-03-01",
            "amount": 100,
            "description": "A",
            "type": "income",
        },
    )
    await auth_client.post(
        "/api/transactions",
        json={
            "account_id": acc2.json()["id"],
            "date": "2026-03-01",
            "amount": 200,
            "description": "B",
            "type": "income",
        },
    )

    response = await auth_client.get(f"/api/transactions?account_id={acc1.json()['id']}")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["description"] == "A"


async def test_list_transactions_filter_by_date_range(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase"},
    )
    account_id = acc.json()["id"]

    await auth_client.post(
        "/api/transactions",
        json={"account_id": account_id, "date": "2026-01-15", "amount": 100, "description": "Jan", "type": "income"},
    )
    await auth_client.post(
        "/api/transactions",
        json={"account_id": account_id, "date": "2026-03-15", "amount": 200, "description": "Mar", "type": "income"},
    )

    response = await auth_client.get("/api/transactions?start_date=2026-03-01&end_date=2026-03-31")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["description"] == "Mar"


async def test_list_transactions_filter_by_type(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase"},
    )
    account_id = acc.json()["id"]

    await auth_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-03-01",
            "amount": 3000,
            "description": "Paycheck",
            "type": "income",
        },
    )
    await auth_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-03-05",
            "amount": -50,
            "description": "Coffee",
            "type": "expense",
        },
    )

    response = await auth_client.get("/api/transactions?type=expense")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["type"] == "expense"


async def test_list_transactions_search(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase"},
    )
    account_id = acc.json()["id"]

    await auth_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-03-01",
            "amount": -50,
            "description": "Whole Foods Market",
            "type": "expense",
        },
    )
    await auth_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-03-02",
            "amount": -30,
            "description": "Gas Station",
            "type": "expense",
        },
    )

    response = await auth_client.get("/api/transactions?search=whole+foods")
    assert response.status_code == 200
    assert len(response.json()) == 1


async def test_get_transaction(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase"},
    )
    txn = await auth_client.post(
        "/api/transactions",
        json={
            "account_id": acc.json()["id"],
            "date": "2026-03-01",
            "amount": -50,
            "description": "Test Txn",
            "type": "expense",
        },
    )
    txn_id = txn.json()["id"]

    response = await auth_client.get(f"/api/transactions/{txn_id}")
    assert response.status_code == 200
    assert response.json()["description"] == "Test Txn"


async def test_update_transaction(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase"},
    )
    txn = await auth_client.post(
        "/api/transactions",
        json={
            "account_id": acc.json()["id"],
            "date": "2026-03-01",
            "amount": -50,
            "description": "Old",
            "type": "expense",
        },
    )
    txn_id = txn.json()["id"]

    response = await auth_client.patch(
        f"/api/transactions/{txn_id}",
        json={"description": "Updated", "amount": -75},
    )
    assert response.status_code == 200
    assert response.json()["description"] == "Updated"
    assert response.json()["amount"] == -75


async def test_delete_transaction(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase"},
    )
    txn = await auth_client.post(
        "/api/transactions",
        json={
            "account_id": acc.json()["id"],
            "date": "2026-03-01",
            "amount": -50,
            "description": "Delete me",
            "type": "expense",
        },
    )
    txn_id = txn.json()["id"]

    response = await auth_client.delete(f"/api/transactions/{txn_id}")
    assert response.status_code == 204

    get_response = await auth_client.get(f"/api/transactions/{txn_id}")
    assert get_response.status_code == 404


async def test_bulk_categorize(auth_client: AsyncClient):
    cats = await auth_client.get("/api/categories")
    expense_cat = next(c for c in cats.json() if c["type"] == "expense")

    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase"},
    )
    account_id = acc.json()["id"]

    txn1 = await auth_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-03-01",
            "amount": -50,
            "description": "Store A",
            "type": "expense",
        },
    )
    txn2 = await auth_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-03-02",
            "amount": -30,
            "description": "Store B",
            "type": "expense",
        },
    )

    response = await auth_client.post(
        "/api/transactions/bulk-categorize",
        json={
            "transaction_ids": [txn1.json()["id"], txn2.json()["id"]],
            "category_id": expense_cat["id"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["updated_count"] == 2


async def test_bulk_delete_transactions(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase"},
    )
    account_id = acc.json()["id"]

    txn1 = await auth_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-03-01",
            "amount": -50,
            "description": "Delete A",
            "type": "expense",
        },
    )
    txn2 = await auth_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-03-02",
            "amount": -30,
            "description": "Delete B",
            "type": "expense",
        },
    )
    txn3 = await auth_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-03-03",
            "amount": -20,
            "description": "Keep C",
            "type": "expense",
        },
    )

    response = await auth_client.post(
        "/api/transactions/bulk-delete",
        json={"transaction_ids": [txn1.json()["id"], txn2.json()["id"]]},
    )
    assert response.status_code == 200
    assert response.json()["deleted_count"] == 2

    # Verify the remaining transaction still exists
    remaining = await auth_client.get("/api/transactions")
    assert len(remaining.json()) == 1
    assert remaining.json()[0]["id"] == txn3.json()["id"]


async def test_bulk_delete_empty_list(auth_client: AsyncClient):
    response = await auth_client.post(
        "/api/transactions/bulk-delete",
        json={"transaction_ids": []},
    )
    assert response.status_code == 200
    assert response.json()["deleted_count"] == 0


async def test_bulk_delete_nonexistent_ids(auth_client: AsyncClient):
    import uuid

    response = await auth_client.post(
        "/api/transactions/bulk-delete",
        json={"transaction_ids": [str(uuid.uuid4()), str(uuid.uuid4())]},
    )
    assert response.status_code == 200
    assert response.json()["deleted_count"] == 0


async def test_bulk_update_type(auth_client: AsyncClient):
    acct = await auth_client.post("/api/accounts", json={
        "name": "Test", "type": "checking", "institution": "Bank", "balance": 1000,
    })
    account_id = acct.json()["id"]

    txn1 = await auth_client.post("/api/transactions", json={
        "account_id": account_id, "date": "2026-01-15",
        "amount": -50.00, "description": "Expense 1", "type": "expense",
    })
    txn2 = await auth_client.post("/api/transactions", json={
        "account_id": account_id, "date": "2026-01-16",
        "amount": -75.00, "description": "Expense 2", "type": "expense",
    })
    txn1_id = txn1.json()["id"]
    txn2_id = txn2.json()["id"]

    response = await auth_client.post("/api/transactions/bulk-update-type", json={
        "transaction_ids": [txn1_id, txn2_id],
        "type": "income",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["updated_count"] == 2

    t1 = await auth_client.get(f"/api/transactions/{txn1_id}")
    t2 = await auth_client.get(f"/api/transactions/{txn2_id}")
    assert t1.json()["type"] == "income"
    assert t1.json()["amount"] == 50.00
    assert t2.json()["type"] == "income"
    assert t2.json()["amount"] == 75.00


async def test_bulk_update_type_to_expense_flips_sign(auth_client: AsyncClient):
    acct = await auth_client.post("/api/accounts", json={
        "name": "Test", "type": "checking", "institution": "Bank", "balance": 1000,
    })
    account_id = acct.json()["id"]

    txn = await auth_client.post("/api/transactions", json={
        "account_id": account_id, "date": "2026-01-15",
        "amount": 100.00, "description": "Income", "type": "income",
    })
    txn_id = txn.json()["id"]

    response = await auth_client.post("/api/transactions/bulk-update-type", json={
        "transaction_ids": [txn_id],
        "type": "expense",
    })
    assert response.status_code == 200
    assert response.json()["updated_count"] == 1

    t = await auth_client.get(f"/api/transactions/{txn_id}")
    assert t.json()["type"] == "expense"
    assert t.json()["amount"] == -100.00


async def test_bulk_update_type_empty_list(auth_client: AsyncClient):
    response = await auth_client.post("/api/transactions/bulk-update-type", json={
        "transaction_ids": [],
        "type": "income",
    })
    assert response.status_code == 422


async def test_unauthorized_transactions(client: AsyncClient):
    response = await client.get("/api/transactions")
    assert response.status_code == 401
