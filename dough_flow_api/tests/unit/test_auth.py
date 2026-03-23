from httpx import AsyncClient


async def test_register_user(client: AsyncClient):
    response = await client.post(
        "/api/auth/register",
        json={"email": "new@example.com", "password": "securepass123", "name": "New User"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@example.com"
    assert data["name"] == "New User"
    assert "password" not in data
    assert "password_hash" not in data


async def test_register_duplicate_email(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={"email": "dup@example.com", "password": "pass123", "name": "First"},
    )
    response = await client.post(
        "/api/auth/register",
        json={"email": "dup@example.com", "password": "pass456", "name": "Second"},
    )
    assert response.status_code == 400


async def test_login_success(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={"email": "login@example.com", "password": "mypassword", "name": "Login User"},
    )
    response = await client.post(
        "/api/auth/login",
        data={"username": "login@example.com", "password": "mypassword"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={"email": "wrong@example.com", "password": "correct", "name": "User"},
    )
    response = await client.post(
        "/api/auth/login",
        data={"username": "wrong@example.com", "password": "incorrect"},
    )
    assert response.status_code == 401


async def test_get_me(auth_client: AsyncClient):
    response = await auth_client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["currency"] == "USD"


async def test_update_currency(auth_client: AsyncClient):
    response = await auth_client.patch("/api/auth/settings", json={"currency": "EUR"})
    assert response.status_code == 200
    assert response.json()["currency"] == "EUR"
    me = await auth_client.get("/api/auth/me")
    assert me.json()["currency"] == "EUR"
