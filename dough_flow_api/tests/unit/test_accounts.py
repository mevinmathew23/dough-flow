import uuid

from httpx import AsyncClient
from sqlalchemy import select

from api.models.debt import Debt
from tests.conftest import TestingSessionLocal


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
    assert len(data) == 1


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


async def test_create_credit_account_auto_creates_debt(auth_client: AsyncClient):
    response = await auth_client.post(
        "/api/accounts",
        json={
            "name": "Visa Card",
            "type": "credit",
            "institution": "Chase",
            "balance": -1500,
            "interest_rate": 0.199,
            "minimum_payment": 25,
        },
    )
    assert response.status_code == 201
    account_id = response.json()["id"]

    async with TestingSessionLocal() as session:
        result = await session.execute(select(Debt).where(Debt.account_id == uuid.UUID(account_id)))
        debt = result.scalar_one_or_none()
        assert debt is not None
        assert float(debt.principal_amount) == 1500
        assert float(debt.interest_rate) == 0.199
        assert float(debt.minimum_payment) == 25


async def test_create_loan_account_auto_creates_debt(auth_client: AsyncClient):
    response = await auth_client.post(
        "/api/accounts",
        json={
            "name": "Car Loan",
            "type": "loan",
            "institution": "Bank of America",
            "balance": -20000,
            "interest_rate": 0.049,
        },
    )
    assert response.status_code == 201
    account_id = response.json()["id"]

    async with TestingSessionLocal() as session:
        result = await session.execute(select(Debt).where(Debt.account_id == uuid.UUID(account_id)))
        debt = result.scalar_one_or_none()
        assert debt is not None
        assert float(debt.principal_amount) == 20000
        assert float(debt.interest_rate) == 0.049


async def test_create_checking_account_no_debt(auth_client: AsyncClient):
    response = await auth_client.post(
        "/api/accounts",
        json={
            "name": "Main Checking",
            "type": "checking",
            "institution": "Wells Fargo",
            "balance": 5000,
        },
    )
    assert response.status_code == 201
    account_id = response.json()["id"]

    async with TestingSessionLocal() as session:
        result = await session.execute(select(Debt).where(Debt.account_id == uuid.UUID(account_id)))
        debt = result.scalar_one_or_none()
        assert debt is None


async def test_create_credit_with_custom_debt_fields(auth_client: AsyncClient):
    response = await auth_client.post(
        "/api/accounts",
        json={
            "name": "Amex Gold",
            "type": "credit",
            "institution": "Amex",
            "balance": -3000,
            "interest_rate": 0.249,
            "minimum_payment": 50,
            "compounding_frequency": "daily",
        },
    )
    assert response.status_code == 201
    account_id = response.json()["id"]

    async with TestingSessionLocal() as session:
        result = await session.execute(select(Debt).where(Debt.account_id == uuid.UUID(account_id)))
        debt = result.scalar_one_or_none()
        assert debt is not None
        assert float(debt.minimum_payment) == 50
        assert debt.compounding_frequency.value == "daily"


async def test_create_retirement_account(auth_client: AsyncClient):
    response = await auth_client.post(
        "/api/accounts",
        json={"name": "My 401k", "type": "retirement", "institution": "Fidelity", "balance": 50000},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["type"] == "retirement"
    assert data["name"] == "My 401k"


async def test_create_investment_account(auth_client: AsyncClient):
    response = await auth_client.post(
        "/api/accounts",
        json={"name": "Brokerage", "type": "investment", "institution": "Vanguard", "balance": 10000},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["type"] == "investment"


async def test_retirement_account_does_not_create_debt(auth_client: AsyncClient):
    response = await auth_client.post(
        "/api/accounts",
        json={"name": "Roth IRA", "type": "retirement", "institution": "Vanguard", "balance": 25000},
    )
    assert response.status_code == 201
    account_id = response.json()["id"]

    async with TestingSessionLocal() as session:
        result = await session.execute(select(Debt).where(Debt.account_id == uuid.UUID(account_id)))
        debt = result.scalar_one_or_none()
        assert debt is None
