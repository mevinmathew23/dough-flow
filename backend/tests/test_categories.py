import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_categories_includes_defaults(auth_client: AsyncClient):
    response = await auth_client.get("/api/categories")
    assert response.status_code == 200
    data = response.json()
    names = [c["name"] for c in data]
    assert "Housing" in names
    assert "Salary" in names


@pytest.mark.asyncio
async def test_create_custom_category(auth_client: AsyncClient):
    response = await auth_client.post(
        "/api/categories",
        json={"name": "Pet Expenses", "type": "expense", "icon": "🐕"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Pet Expenses"
    assert data["is_default"] is False


@pytest.mark.asyncio
async def test_delete_custom_category(auth_client: AsyncClient):
    create = await auth_client.post(
        "/api/categories",
        json={"name": "Temp", "type": "expense"},
    )
    cat_id = create.json()["id"]
    response = await auth_client.delete(f"/api/categories/{cat_id}")
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_cannot_delete_default_category(auth_client: AsyncClient):
    response = await auth_client.get("/api/categories")
    default_cat = next(c for c in response.json() if c["is_default"])
    response = await auth_client.delete(f"/api/categories/{default_cat['id']}")
    assert response.status_code == 403
