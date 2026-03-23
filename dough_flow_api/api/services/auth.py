from datetime import datetime, timedelta, timezone
from typing import TypedDict

import bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import settings
from api.models.user import User


class TokenData(TypedDict):
    sub: str


class TokenPayload(TypedDict):
    sub: str
    exp: datetime


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: TokenData, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode: dict[str, str | datetime] = {"sub": data["sub"], "exp": expire}
    encoded: str = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded


def decode_access_token(token: str) -> TokenPayload | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return TokenPayload(sub=payload["sub"], exp=payload["exp"])
    except (JWTError, KeyError):
        return None


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, email: str, password: str, name: str) -> User:
    user = User(email=email, password_hash=hash_password(password), name=name)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    user = await get_user_by_email(db, email)
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user
