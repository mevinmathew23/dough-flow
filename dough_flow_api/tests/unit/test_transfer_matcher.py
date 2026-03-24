import io

from httpx import AsyncClient


def _make_csv(rows: list[list[str]]) -> bytes:
    lines = [",".join(row) for row in rows]
    return "\n".join(lines).encode("utf-8")


async def _create_account(auth_client: AsyncClient, name: str, acc_type: str = "checking") -> str:
    resp = await auth_client.post(
        "/api/accounts",
        json={"name": name, "type": acc_type, "institution": "TestBank"},
    )
    return resp.json()["id"]


async def _import_transactions(
    auth_client: AsyncClient,
    account_id: str,
    rows: list[dict],
) -> None:
    await auth_client.post(
        "/api/csv/confirm",
        json={"account_id": account_id, "rows": rows},
    )


async def test_transfer_match_basic(auth_client: AsyncClient):
    """A credit card payment in checking should match a payment received in the credit card CSV."""
    checking_id = await _create_account(auth_client, "Checking", "checking")
    credit_id = await _create_account(auth_client, "Credit Card", "credit")

    # Import a payment from checking (negative = money leaving)
    await _import_transactions(
        auth_client,
        checking_id,
        [
            {"date": "2026-03-15", "description": "PAYMENT TO CREDIT CARD", "amount": -500.00, "is_duplicate": False},
        ],
    )

    # Preview a credit card CSV with the matching payment received (positive = money arriving)
    csv_data = _make_csv(
        [
            ["Date", "Description", "Amount"],
            ["03/17/2026", "PAYMENT RECEIVED", "500.00"],
        ]
    )
    response = await auth_client.post(
        "/api/csv/preview",
        data={
            "column_mapping": '{"date": "Date", "description": "Description", "amount": "Amount"}',
            "date_format": "%m/%d/%Y",
            "account_id": credit_id,
        },
        files={"file": ("cc.csv", io.BytesIO(csv_data), "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["transfer_match_count"] == 1
    row = data["rows"][0]
    assert row["transfer_match"] is not None
    assert row["transfer_match"]["account_name"] == "Checking"
    assert row["transfer_match"]["amount"] == -500.00


async def test_transfer_match_no_match_different_amount(auth_client: AsyncClient):
    """Different amounts should not match."""
    checking_id = await _create_account(auth_client, "Checking", "checking")
    credit_id = await _create_account(auth_client, "Credit Card", "credit")

    await _import_transactions(
        auth_client,
        checking_id,
        [
            {"date": "2026-03-15", "description": "PAYMENT", "amount": -500.00, "is_duplicate": False},
        ],
    )

    csv_data = _make_csv(
        [
            ["Date", "Description", "Amount"],
            ["03/17/2026", "PAYMENT RECEIVED", "250.00"],
        ]
    )
    response = await auth_client.post(
        "/api/csv/preview",
        data={
            "column_mapping": '{"date": "Date", "description": "Description", "amount": "Amount"}',
            "date_format": "%m/%d/%Y",
            "account_id": credit_id,
        },
        files={"file": ("cc.csv", io.BytesIO(csv_data), "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["transfer_match_count"] == 0
    assert data["rows"][0]["transfer_match"] is None


async def test_transfer_match_outside_date_window(auth_client: AsyncClient):
    """Transactions outside the date tolerance should not match."""
    checking_id = await _create_account(auth_client, "Checking", "checking")
    credit_id = await _create_account(auth_client, "Credit Card", "credit")

    await _import_transactions(
        auth_client,
        checking_id,
        [
            {"date": "2026-03-01", "description": "PAYMENT", "amount": -500.00, "is_duplicate": False},
        ],
    )

    csv_data = _make_csv(
        [
            ["Date", "Description", "Amount"],
            ["03/20/2026", "PAYMENT RECEIVED", "500.00"],
        ]
    )
    response = await auth_client.post(
        "/api/csv/preview",
        data={
            "column_mapping": '{"date": "Date", "description": "Description", "amount": "Amount"}',
            "date_format": "%m/%d/%Y",
            "account_id": credit_id,
            "date_tolerance_days": "5",
        },
        files={"file": ("cc.csv", io.BytesIO(csv_data), "text/csv")},
    )
    assert response.status_code == 200
    assert response.json()["transfer_match_count"] == 0


async def test_transfer_match_closest_date_wins(auth_client: AsyncClient):
    """When multiple existing txns could match, the closest date wins."""
    checking_id = await _create_account(auth_client, "Checking", "checking")
    credit_id = await _create_account(auth_client, "Credit Card", "credit")

    await _import_transactions(
        auth_client,
        checking_id,
        [
            {"date": "2026-03-10", "description": "PAYMENT EARLY", "amount": -500.00, "is_duplicate": False},
            {"date": "2026-03-14", "description": "PAYMENT CLOSE", "amount": -500.00, "is_duplicate": False},
        ],
    )

    csv_data = _make_csv(
        [
            ["Date", "Description", "Amount"],
            ["03/15/2026", "PAYMENT RECEIVED", "500.00"],
        ]
    )
    response = await auth_client.post(
        "/api/csv/preview",
        data={
            "column_mapping": '{"date": "Date", "description": "Description", "amount": "Amount"}',
            "date_format": "%m/%d/%Y",
            "account_id": credit_id,
        },
        files={"file": ("cc.csv", io.BytesIO(csv_data), "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["transfer_match_count"] == 1
    assert data["rows"][0]["transfer_match"]["description"] == "PAYMENT CLOSE"


async def test_transfer_match_already_linked_excluded(auth_client: AsyncClient):
    """Transactions already linked as transfers should not match again."""
    checking_id = await _create_account(auth_client, "Checking", "checking")
    savings_id = await _create_account(auth_client, "Savings", "savings")
    credit_id = await _create_account(auth_client, "Credit Card", "credit")

    # Import a payment from checking
    await _import_transactions(
        auth_client,
        checking_id,
        [
            {"date": "2026-03-15", "description": "PAYMENT", "amount": -500.00, "is_duplicate": False},
        ],
    )

    # Import into savings and link as transfer
    csv_data = _make_csv(
        [
            ["Date", "Description", "Amount"],
            ["03/15/2026", "TRANSFER IN", "500.00"],
        ]
    )
    preview = await auth_client.post(
        "/api/csv/preview",
        data={
            "column_mapping": '{"date": "Date", "description": "Description", "amount": "Amount"}',
            "date_format": "%m/%d/%Y",
            "account_id": savings_id,
        },
        files={"file": ("savings.csv", io.BytesIO(csv_data), "text/csv")},
    )
    match = preview.json()["rows"][0]["transfer_match"]
    assert match is not None

    # Confirm the import with transfer link
    await auth_client.post(
        "/api/csv/confirm",
        json={
            "account_id": savings_id,
            "rows": [
                {
                    "date": "2026-03-15",
                    "description": "TRANSFER IN",
                    "amount": 500.00,
                    "is_duplicate": False,
                    "link_transfer_id": match["transaction_id"],
                },
            ],
        },
    )

    # Now try to import into credit card — the checking txn should NOT match since it's already linked
    csv_data2 = _make_csv(
        [
            ["Date", "Description", "Amount"],
            ["03/15/2026", "PAYMENT RECEIVED", "500.00"],
        ]
    )
    response = await auth_client.post(
        "/api/csv/preview",
        data={
            "column_mapping": '{"date": "Date", "description": "Description", "amount": "Amount"}',
            "date_format": "%m/%d/%Y",
            "account_id": credit_id,
        },
        files={"file": ("cc.csv", io.BytesIO(csv_data2), "text/csv")},
    )
    assert response.status_code == 200
    assert response.json()["transfer_match_count"] == 0


async def test_transfer_match_same_sign_no_match(auth_client: AsyncClient):
    """Two transactions with the same sign should not match as transfers."""
    checking_id = await _create_account(auth_client, "Checking", "checking")
    savings_id = await _create_account(auth_client, "Savings", "savings")

    await _import_transactions(
        auth_client,
        checking_id,
        [
            {"date": "2026-03-15", "description": "DEPOSIT", "amount": 500.00, "is_duplicate": False},
        ],
    )

    csv_data = _make_csv(
        [
            ["Date", "Description", "Amount"],
            ["03/15/2026", "DEPOSIT", "500.00"],
        ]
    )
    response = await auth_client.post(
        "/api/csv/preview",
        data={
            "column_mapping": '{"date": "Date", "description": "Description", "amount": "Amount"}',
            "date_format": "%m/%d/%Y",
            "account_id": savings_id,
        },
        files={"file": ("savings.csv", io.BytesIO(csv_data), "text/csv")},
    )
    assert response.status_code == 200
    assert response.json()["transfer_match_count"] == 0


async def test_confirm_links_transfer(auth_client: AsyncClient):
    """Confirming with link_transfer_id should set both transactions as transfers with shared transfer_id."""
    checking_id = await _create_account(auth_client, "Checking", "checking")
    credit_id = await _create_account(auth_client, "Credit Card", "credit")

    await _import_transactions(
        auth_client,
        checking_id,
        [
            {"date": "2026-03-15", "description": "CC PAYMENT", "amount": -500.00, "is_duplicate": False},
        ],
    )

    # Get the existing transaction's ID via preview
    csv_data = _make_csv(
        [
            ["Date", "Description", "Amount"],
            ["03/16/2026", "PAYMENT RECEIVED", "500.00"],
        ]
    )
    preview = await auth_client.post(
        "/api/csv/preview",
        data={
            "column_mapping": '{"date": "Date", "description": "Description", "amount": "Amount"}',
            "date_format": "%m/%d/%Y",
            "account_id": credit_id,
        },
        files={"file": ("cc.csv", io.BytesIO(csv_data), "text/csv")},
    )
    match = preview.json()["rows"][0]["transfer_match"]
    assert match is not None

    # Confirm with transfer link
    confirm_resp = await auth_client.post(
        "/api/csv/confirm",
        json={
            "account_id": credit_id,
            "rows": [
                {
                    "date": "2026-03-16",
                    "description": "PAYMENT RECEIVED",
                    "amount": 500.00,
                    "is_duplicate": False,
                    "link_transfer_id": match["transaction_id"],
                },
            ],
        },
    )
    assert confirm_resp.status_code == 201
    assert confirm_resp.json()["imported_count"] == 1

    # Verify both transactions are now transfers with the same transfer_id
    txns = await auth_client.get("/api/transactions")
    txn_list = txns.json()
    transfers = [t for t in txn_list if t["type"] == "transfer"]
    assert len(transfers) == 2
    assert transfers[0]["transfer_id"] is not None
    assert transfers[0]["transfer_id"] == transfers[1]["transfer_id"]
