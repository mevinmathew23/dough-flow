import uuid

from pydantic import BaseModel

from app.models.category import CategoryType


class CategoryCreate(BaseModel):
    name: str
    type: CategoryType
    icon: str = ""


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: CategoryType
    icon: str
    is_default: bool

    model_config = {"from_attributes": True}
