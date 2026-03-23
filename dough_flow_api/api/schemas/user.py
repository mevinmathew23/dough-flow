import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserUpdate(BaseModel):
    currency: str | None = None


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    currency: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
