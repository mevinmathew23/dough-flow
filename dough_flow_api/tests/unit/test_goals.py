from httpx import AsyncClient


async def test_create_goal(auth_client: AsyncClient):
    response = await auth_client.post(
        "/api/goals",
        json={"name": "Emergency Fund", "target_amount": 10000, "icon": "🏦"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Emergency Fund"
    assert data["target_amount"] == 10000
    assert data["current_amount"] == 0


async def test_list_goals(auth_client: AsyncClient):
    await auth_client.post(
        "/api/goals",
        json={"name": "Vacation", "target_amount": 5000},
    )
    response = await auth_client.get("/api/goals")
    assert response.status_code == 200
    assert len(response.json()) == 1


async def test_update_goal(auth_client: AsyncClient):
    goal = await auth_client.post(
        "/api/goals",
        json={"name": "Emergency Fund", "target_amount": 10000},
    )
    response = await auth_client.patch(
        f"/api/goals/{goal.json()['id']}",
        json={"current_amount": 2500, "name": "Rainy Day Fund"},
    )
    assert response.status_code == 200
    assert response.json()["current_amount"] == 2500
    assert response.json()["name"] == "Rainy Day Fund"


async def test_delete_goal(auth_client: AsyncClient):
    goal = await auth_client.post(
        "/api/goals",
        json={"name": "Delete Me", "target_amount": 1000},
    )
    response = await auth_client.delete(f"/api/goals/{goal.json()['id']}")
    assert response.status_code == 204


async def test_unauthorized_goals(client: AsyncClient):
    response = await client.get("/api/goals")
    assert response.status_code == 401
