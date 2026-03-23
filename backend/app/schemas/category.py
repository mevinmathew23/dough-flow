import uuid

from pydantic import BaseModel, ConfigDict

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

    model_config = ConfigDict(from_attributes=True)
