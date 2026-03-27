import io

from httpx import AsyncClient


def _make_csv(rows: list[list[str]]) -> bytes:
    """Helper to create CSV bytes from rows."""
    lines = [",".join(row) for row in rows]
    return "\n".join(lines).encode("utf-8")


async def test_csv_preview(auth_client: AsyncClient):
    csv_data = _make_csv(
        [
            ["Date", "Description", "Amount"],
            ["03/15/2026", "Grocery Store", "-50.00"],
            ["03/16/2026", "Gas Station", "-35.00"],
        ]
    )

    response = await auth_client.post(
        "/api/csv/preview",
        data={
            "column_mapping": '{"date": "Date", "description": "Description", "amount": "Amount"}',
            "date_format": "%m/%d/%Y",
        },
        files={"file": ("transactions.csv", io.BytesIO(csv_data), "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_rows"] == 2
    assert data["rows"][0]["date"] == "2026-03-15"
    assert data["rows"][0]["amount"] == -50.00


async def test_csv_detect_columns(auth_client: AsyncClient):
    csv_data = _make_csv(
        [
            ["Transaction Date", "Merchant", "Amount", "Category"],
            ["03/15/2026", "Store", "50.00", "Food"],
        ]
    )

    response = await auth_client.post(
        "/api/csv/detect-columns",
        files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "Transaction Date" in data["columns"]
    assert "Merchant" in data["columns"]


async def test_csv_confirm_import(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase"},
    )

    response = await auth_client.post(
        "/api/csv/confirm",
        json={
            "account_id": acc.json()["id"],
            "rows": [
                {"date": "2026-03-15", "description": "Grocery Store", "amount": -50.00, "is_duplicate": False},
                {"date": "2026-03-16", "description": "Gas Station", "amount": -35.00, "is_duplicate": False},
            ],
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["imported_count"] == 2
    assert data["skipped_duplicates"] == 0

    # Verify transactions were created
    txns = await auth_client.get("/api/transactions")
    assert len(txns.json()) == 2


async def test_csv_confirm_skips_duplicates(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase"},
    )

    response = await auth_client.post(
        "/api/csv/confirm",
        json={
            "account_id": acc.json()["id"],
            "rows": [
                {"date": "2026-03-15", "description": "Grocery Store", "amount": -50.00, "is_duplicate": False},
                {"date": "2026-03-16", "description": "Gas Station", "amount": -35.00, "is_duplicate": True},
            ],
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["imported_count"] == 1
    assert data["skipped_duplicates"] == 1


async def test_csv_confirm_saves_mapping(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase"},
    )

    await auth_client.post(
        "/api/csv/confirm",
        json={
            "account_id": acc.json()["id"],
            "rows": [
                {"date": "2026-03-15", "description": "Test", "amount": -10, "is_duplicate": False},
            ],
            "save_mapping": True,
            "institution_name": "Chase Checking",
            "column_mapping": {"date": "Date", "description": "Description", "amount": "Amount"},
            "date_format": "%m/%d/%Y",
        },
    )

    mappings = await auth_client.get("/api/csv/mappings")
    assert mappings.status_code == 200
    # Includes seeded defaults + the user-saved mapping
    user_mappings = [m for m in mappings.json() if m["institution_name"] == "Chase Checking" and not m["is_default"]]
    assert len(user_mappings) == 1


async def test_list_saved_mappings(auth_client: AsyncClient):
    response = await auth_client.get("/api/csv/mappings")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


async def test_delete_saved_mapping(auth_client: AsyncClient):
    acc = await auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "institution": "Chase"},
    )
    await auth_client.post(
        "/api/csv/confirm",
        json={
            "account_id": acc.json()["id"],
            "rows": [],
            "save_mapping": True,
            "institution_name": "Delete Me",
            "column_mapping": {"date": "D", "description": "Desc", "amount": "Amt"},
        },
    )
    mappings = await auth_client.get("/api/csv/mappings")
    user_mapping = next(m for m in mappings.json() if m["institution_name"] == "Delete Me")
    mapping_id = user_mapping["id"]

    response = await auth_client.delete(f"/api/csv/mappings/{mapping_id}")
    assert response.status_code == 204


async def test_csv_preview_resolves_categories(auth_client: AsyncClient):
    csv_data = _make_csv(
        [
            ["Date", "Description", "Amount", "Category"],
            ["03/15/2026", "Whole Foods", "-50.00", "Food & Groceries"],
            ["03/17/2026", "Random Store", "-25.00", "xyzabc123nonsense"],
        ]
    )

    response = await auth_client.post(
        "/api/csv/preview",
        data={
            "column_mapping": '{"date": "Date", "description": "Description", "amount": "Amount", "category": "Category"}',
            "date_format": "%m/%d/%Y",
        },
        files={"file": ("transactions.csv", io.BytesIO(csv_data), "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()

    # Exact match
    assert data["rows"][0]["resolved_category_name"] == "Food & Groceries"
    assert data["rows"][0]["match_method"] == "exact"
    assert data["rows"][0]["confidence"] == 1.0

    # Nonsense category -> unmatched
    assert data["rows"][1]["match_method"] == "unmatched"
    assert data["rows"][1]["resolved_category_name"] is None


async def test_csv_preview_with_institution_mapping(auth_client: AsyncClient):
    # Get the seeded Chase Credit Card mapping
    mappings_res = await auth_client.get("/api/csv/mappings")
    chase_mapping = next(
        (m for m in mappings_res.json() if m["institution_name"] == "Chase Credit Card"),
        None,
    )
    assert chase_mapping is not None

    csv_data = _make_csv(
        [
            ["Transaction Date", "Description", "Amount", "Category"],
            ["03/15/2026", "Chipotle", "-12.50", "Food & Drink"],
            ["03/16/2026", "CVS Pharmacy", "-45.00", "Health & Wellness"],
        ]
    )

    response = await auth_client.post(
        "/api/csv/preview",
        data={
            "column_mapping": '{"date": "Transaction Date", "description": "Description", "amount": "Amount", "category": "Category"}',
            "date_format": "%m/%d/%Y",
            "mapping_id": chase_mapping["id"],
        },
        files={"file": ("transactions.csv", io.BytesIO(csv_data), "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()

    # "Food & Drink" resolves via institution mapping to "Dining Out"
    assert data["rows"][0]["resolved_category_name"] == "Dining Out"
    assert data["rows"][0]["match_method"] == "institution"

    # "Health & Wellness" resolves via institution mapping to "Healthcare"
    assert data["rows"][1]["resolved_category_name"] == "Healthcare"
    assert data["rows"][1]["match_method"] == "institution"


async def test_list_mappings_includes_defaults(auth_client: AsyncClient):
    from api.seed import INSTITUTION_MAPPINGS

    response = await auth_client.get("/api/csv/mappings")
    assert response.status_code == 200
    data = response.json()
    default_names = {m["institution_name"] for m in INSTITUTION_MAPPINGS}
    returned_names = {m["institution_name"] for m in data}
    assert default_names.issubset(returned_names)


async def test_unauthorized_csv(client: AsyncClient):
    response = await client.get("/api/csv/mappings")
    assert response.status_code == 401
