"""Tests verifying that one user cannot access another user's data."""

import pytest
from httpx import ASGITransport, AsyncClient


async def _register_and_login(client: AsyncClient, email: str, password: str) -> str:
    """Register a user and return their access token.

    Args:
        client: The HTTP client to use for requests.
        email: Email address for the new user.
        password: Password for the new user.

    Returns:
        JWT access token for the registered user.
    """
    await client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": "User"},
    )
    resp = await client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
    )
    return resp.json()["access_token"]


@pytest.fixture
async def user_a_client(client: AsyncClient) -> AsyncClient:
    """Authenticated client for user A."""
    token = await _register_and_login(client, "a@test.com", "pass123")
    client.headers["Authorization"] = f"Bearer {token}"
    return client


@pytest.fixture
async def user_b_client(setup_db) -> AsyncClient:
    """Authenticated client for user B, using a separate HTTP client."""
    from api.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        token = await _register_and_login(ac, "b@test.com", "pass123")
        ac.headers["Authorization"] = f"Bearer {token}"
        yield ac


async def test_user_b_cannot_see_user_a_accounts(user_a_client: AsyncClient, user_b_client: AsyncClient) -> None:
    """User B should not be able to list, get, or delete user A's accounts."""
    # User A creates an account
    resp = await user_a_client.post(
        "/api/accounts",
        json={
            "name": "A's Checking",
            "type": "checking",
            "institution": "Bank A",
            "balance": 1000,
        },
    )
    assert resp.status_code == 201
    account_id = resp.json()["id"]

    # User B cannot list it
    resp = await user_b_client.get("/api/accounts")
    assert resp.status_code == 200
    assert all(a["id"] != account_id for a in resp.json())

    # User B cannot get it directly
    resp = await user_b_client.get(f"/api/accounts/{account_id}")
    assert resp.status_code == 404

    # User B cannot delete it
    resp = await user_b_client.delete(f"/api/accounts/{account_id}")
    assert resp.status_code == 404


async def test_user_b_cannot_see_user_a_transactions(user_a_client: AsyncClient, user_b_client: AsyncClient) -> None:
    """User B should not be able to see transactions created by user A."""
    acct = await user_a_client.post(
        "/api/accounts",
        json={
            "name": "A's Checking",
            "type": "checking",
            "institution": "Bank",
            "balance": 0,
        },
    )
    account_id = acct.json()["id"]

    txn = await user_a_client.post(
        "/api/transactions",
        json={
            "account_id": account_id,
            "date": "2026-01-15",
            "amount": -50.0,
            "description": "Groceries",
            "type": "expense",
        },
    )
    assert txn.status_code == 201
    txn_id = txn.json()["id"]

    resp = await user_b_client.get("/api/transactions")
    assert all(t["id"] != txn_id for t in resp.json())


async def test_user_b_cannot_see_user_a_debts(user_a_client: AsyncClient, user_b_client: AsyncClient) -> None:
    """User B should not be able to see debts created by user A."""
    await user_a_client.post(
        "/api/accounts",
        json={
            "name": "A's Card",
            "type": "credit",
            "institution": "Bank",
            "balance": -500,
            "interest_rate": 0.2,
            "minimum_payment": 25,
            "compounding_frequency": "monthly",
        },
    )

    resp_a = await user_a_client.get("/api/debts")
    assert len(resp_a.json()) >= 1
    debt_id = resp_a.json()[0]["id"]

    resp_b = await user_b_client.get("/api/debts")
    assert all(d["id"] != debt_id for d in resp_b.json())
