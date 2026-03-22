# Dough Flow — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the full Docker Compose stack with FastAPI backend, PostgreSQL database, all data models, JWT auth, seed data, and a minimal React frontend shell.

**Architecture:** Monolith FastAPI backend with SQLAlchemy ORM and Alembic migrations, PostgreSQL 16 for storage, React + TypeScript frontend served by nginx. All containerized via Docker Compose (3 services). Poetry manages Python dependencies with in-project virtualenv.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL 16, Poetry, React 18, TypeScript, Tailwind CSS, Docker Compose, nginx

**Spec:** `docs/superpowers/specs/2026-03-22-dough-flow-design.md`

---

## File Map

### Backend (`backend/`)
| File | Responsibility |
|------|---------------|
| `Dockerfile` | Python 3.12 image, Poetry install, uvicorn entrypoint |
| `pyproject.toml` | Python dependencies |
| `poetry.toml` | In-project virtualenv config |
| `app/__init__.py` | Package init |
| `app/main.py` | FastAPI app, CORS, router includes, lifespan (seed on startup) |
| `app/config.py` | Pydantic Settings (DATABASE_URL, SECRET_KEY, etc.) |
| `app/database.py` | SQLAlchemy async engine, session factory, Base |
| `app/models/__init__.py` | Re-export all models |
| `app/models/user.py` | User model |
| `app/models/account.py` | Account model with AccountType enum |
| `app/models/transaction.py` | Transaction model with TransactionType, TransactionSource enums |
| `app/models/category.py` | Category model with CategoryType enum |
| `app/models/debt.py` | Debt model |
| `app/models/budget.py` | Budget model |
| `app/models/goal.py` | Goal model |
| `app/models/csv_mapping.py` | CSVMapping model |
| `app/schemas/__init__.py` | Package init |
| `app/schemas/user.py` | User create/response schemas |
| `app/schemas/auth.py` | Token/login schemas |
| `app/schemas/account.py` | Account CRUD schemas |
| `app/schemas/category.py` | Category schemas |
| `app/routers/__init__.py` | Package init |
| `app/routers/auth.py` | Register + login endpoints |
| `app/routers/accounts.py` | Account CRUD endpoints |
| `app/routers/categories.py` | Category list + create endpoints |
| `app/services/__init__.py` | Package init |
| `app/services/auth.py` | JWT token creation, password hashing, user verification |
| `app/seed.py` | Default categories seeder |
| `app/dependencies.py` | get_db, get_current_user dependencies |
| `alembic.ini` | Alembic config |
| `alembic/env.py` | Migration environment with async support |
| `alembic/script.py.mako` | Migration template |
| `tests/__init__.py` | Package init |
| `tests/conftest.py` | Test fixtures (test DB, client, auth helpers) |
| `tests/test_auth.py` | Auth endpoint tests |
| `tests/test_accounts.py` | Account CRUD tests |
| `tests/test_categories.py` | Category endpoint tests |
| `tests/test_models.py` | Model creation/relationship tests |

### Frontend (`frontend/`)
| File | Responsibility |
|------|---------------|
| `Dockerfile` | Node build + nginx serve |
| `nginx.conf` | Serve SPA, proxy `/api` to backend |
| `package.json` | React + dependencies |
| `tsconfig.json` | TypeScript config |
| `tailwind.config.js` | Tailwind dark theme config |
| `postcss.config.js` | PostCSS for Tailwind |
| `index.html` | Vite HTML entry |
| `src/main.tsx` | React entry point |
| `src/App.tsx` | Router setup, layout shell |
| `src/index.css` | Tailwind imports + global styles |
| `src/api/client.ts` | Axios instance with auth interceptor |
| `src/types/index.ts` | Shared TypeScript interfaces |
| `src/components/Sidebar.tsx` | Navigation sidebar |
| `src/components/ProtectedRoute.tsx` | Auth guard wrapper |
| `src/pages/Login.tsx` | Login/register page |
| `src/pages/Dashboard.tsx` | Placeholder dashboard |
| `vite.config.ts` | Vite config with proxy for dev |

### Root
| File | Responsibility |
|------|---------------|
| `docker-compose.yml` | 3 services: postgres, api, frontend |
| `.gitignore` | Python, Node, Docker, env ignores |
| `.env.example` | Template for required env vars |

---

## Task 1: Project Scaffolding & Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create `.env.example`**

```env
POSTGRES_USER=doughflow
POSTGRES_PASSWORD=doughflow_dev
POSTGRES_DB=doughflow
DATABASE_URL=postgresql+asyncpg://doughflow:doughflow_dev@postgres:5432/doughflow
SECRET_KEY=change-me-in-production-use-a-real-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-doughflow}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-doughflow_dev}
      POSTGRES_DB: ${POSTGRES_DB:-doughflow}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-doughflow}"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    env_file:
      - .env.example
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend/app:/app/app

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - api

volumes:
  pgdata:
```

- [ ] **Step 3: Update `.gitignore`**

```gitignore
# Python
__pycache__/
*.py[cod]
.venv/
*.egg-info/
dist/
build/

# Node
node_modules/
frontend/dist/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/

# Docker
pgdata/

# Superpowers
.superpowers/

# OS
.DS_Store
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example .gitignore
git commit -m "feat: add Docker Compose config and project scaffolding"
```

---

## Task 2: Backend Poetry & FastAPI Setup

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/poetry.toml`
- Create: `backend/Dockerfile`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`

- [ ] **Step 1: Create `backend/poetry.toml`**

```toml
[virtualenvs]
in-project = true
create = true
```

- [ ] **Step 2: Create `backend/pyproject.toml`**

```toml
[tool.poetry]
name = "dough-flow-api"
version = "0.1.0"
description = "Dough Flow - Personal Finance Tracking API"
authors = ["Dough Flow"]

[tool.poetry.dependencies]
python = "^3.12"
fastapi = "^0.115.0"
uvicorn = {extras = ["standard"], version = "^0.34.0"}
sqlalchemy = {extras = ["asyncio"], version = "^2.0.0"}
asyncpg = "^0.30.0"
alembic = "^1.14.0"
pydantic = "^2.10.0"
pydantic-settings = "^2.7.0"
python-jose = {extras = ["cryptography"], version = "^3.3.0"}
passlib = {extras = ["bcrypt"], version = "^1.7.4"}
python-multipart = "^0.0.18"
pandas = "^2.2.0"

[tool.poetry.group.dev.dependencies]
pytest = "^8.3.0"
pytest-asyncio = "^0.24.0"
httpx = "^0.28.0"
aiosqlite = "^0.20.0"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 3: Create `backend/app/__init__.py`**

```python
```

(Empty file)

- [ ] **Step 4: Create `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://doughflow:doughflow_dev@localhost:5432/doughflow"
    secret_key: str = "change-me-in-production-use-a-real-secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
```

- [ ] **Step 5: Create `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Dough Flow API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
```

- [ ] **Step 6: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN pip install poetry

COPY pyproject.toml poetry.toml poetry.lock* ./

RUN poetry install --no-root --no-interaction

COPY . .

EXPOSE 8000

CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

- [ ] **Step 7: Generate poetry.lock**

```bash
cd backend && poetry lock --no-update
```

- [ ] **Step 8: Verify FastAPI starts locally**

```bash
cd backend && poetry install && poetry run uvicorn app.main:app --port 8000 &
sleep 2 && curl http://localhost:8000/api/health
# Expected: {"status":"ok"}
kill %1
```

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat: add FastAPI backend with Poetry and health endpoint"
```

---

## Task 3: Database Connection & SQLAlchemy Base

**Files:**
- Create: `backend/app/database.py`

- [ ] **Step 1: Create `backend/app/database.py`**

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/database.py
git commit -m "feat: add SQLAlchemy async database connection"
```

---

## Task 4: All Data Models

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/account.py`
- Create: `backend/app/models/transaction.py`
- Create: `backend/app/models/category.py`
- Create: `backend/app/models/debt.py`
- Create: `backend/app/models/budget.py`
- Create: `backend/app/models/goal.py`
- Create: `backend/app/models/csv_mapping.py`

- [ ] **Step 1: Create `backend/app/models/user.py`**

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default_factory=lambda: datetime.now(timezone.utc))

    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    debts = relationship("Debt", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    csv_mappings = relationship("CSVMapping", back_populates="user", cascade="all, delete-orphan")
```

- [ ] **Step 2: Create `backend/app/models/account.py`**

```python
import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Numeric, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AccountType(str, enum.Enum):
    CHECKING = "checking"
    SAVINGS = "savings"
    CREDIT = "credit"
    INVESTMENT = "investment"
    LOAN = "loan"


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[AccountType] = mapped_column(Enum(AccountType))
    institution: Mapped[str] = mapped_column(String(255))
    balance: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    interest_rate: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default_factory=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
    debts = relationship("Debt", back_populates="account", cascade="all, delete-orphan")
```

- [ ] **Step 3: Create `backend/app/models/category.py`**

```python
import enum
import uuid

from sqlalchemy import String, Boolean, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CategoryType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[CategoryType] = mapped_column(Enum(CategoryType))
    icon: Mapped[str] = mapped_column(String(50), default="")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category")
```

- [ ] **Step 4: Create `backend/app/models/transaction.py`**

```python
import enum
import uuid
from datetime import date, datetime

from sqlalchemy import String, Date, DateTime, Numeric, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"


class TransactionSource(str, enum.Enum):
    MANUAL = "manual"
    CSV_IMPORT = "csv_import"
    PLAID = "plaid"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("accounts.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    description: Mapped[str] = mapped_column(String(500))
    category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType))
    source: Mapped[TransactionSource] = mapped_column(Enum(TransactionSource), default=TransactionSource.MANUAL)
    transfer_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default_factory=lambda: datetime.now(timezone.utc))

    account = relationship("Account", back_populates="transactions")
    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
```

- [ ] **Step 5: Create `backend/app/models/debt.py`**

```python
import uuid
from datetime import date

from sqlalchemy import Integer, Date, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Debt(Base):
    __tablename__ = "debts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("accounts.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    original_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    current_balance: Mapped[float] = mapped_column(Numeric(12, 2))
    interest_rate: Mapped[float] = mapped_column(Numeric(5, 4))
    minimum_payment: Mapped[float] = mapped_column(Numeric(12, 2))
    priority_order: Mapped[int] = mapped_column(Integer, default=0)
    target_payoff_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    account = relationship("Account", back_populates="debts")
    user = relationship("User", back_populates="debts")
```

- [ ] **Step 6: Create `backend/app/models/budget.py`**

```python
import uuid
from datetime import date

from sqlalchemy import Date, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id"), index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    month: Mapped[date] = mapped_column(Date)

    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")
```

- [ ] **Step 7: Create `backend/app/models/goal.py`**

```python
import uuid
from datetime import date

from sqlalchemy import String, Date, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    target_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    current_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    icon: Mapped[str] = mapped_column(String(50), default="")

    user = relationship("User", back_populates="goals")
```

- [ ] **Step 8: Create `backend/app/models/csv_mapping.py`**

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CSVMapping(Base):
    __tablename__ = "csv_mappings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    institution_name: Mapped[str] = mapped_column(String(255))
    column_mapping: Mapped[dict] = mapped_column(JSON)
    date_format: Mapped[str] = mapped_column(String(50), default="%m/%d/%Y")
    created_at: Mapped[datetime] = mapped_column(DateTime, default_factory=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="csv_mappings")
```

- [ ] **Step 9: Create `backend/app/models/__init__.py`**

```python
from app.models.user import User
from app.models.account import Account, AccountType
from app.models.transaction import Transaction, TransactionType, TransactionSource
from app.models.category import Category, CategoryType
from app.models.debt import Debt
from app.models.budget import Budget
from app.models.goal import Goal
from app.models.csv_mapping import CSVMapping

__all__ = [
    "User",
    "Account",
    "AccountType",
    "Transaction",
    "TransactionType",
    "TransactionSource",
    "Category",
    "CategoryType",
    "Debt",
    "Budget",
    "Goal",
    "CSVMapping",
]
```

- [ ] **Step 10: Commit**

```bash
git add backend/app/models/
git commit -m "feat: add all SQLAlchemy data models (8 entities)"
```

---

## Task 5: Alembic Migrations

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`

- [ ] **Step 1: Create `backend/alembic.ini`**

```ini
[alembic]
script_location = alembic
prepend_sys_path = .

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 2: Create `backend/alembic/script.py.mako`**

```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

- [ ] **Step 3: Create `backend/alembic/env.py`**

```python
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.config import settings
from app.database import Base
from app.models import *  # noqa: F401,F403 — ensures all models registered

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

- [ ] **Step 4: Generate initial migration**

```bash
cd backend && poetry run alembic revision --autogenerate -m "initial schema"
```

Verify: A new file appears in `backend/alembic/versions/` with CREATE TABLE statements for all 8 tables.

- [ ] **Step 5: Commit**

```bash
git add backend/alembic.ini backend/alembic/
git commit -m "feat: add Alembic migration setup with initial schema"
```

---

## Task 6: Seed Data (Default Categories)

**Files:**
- Create: `backend/app/seed.py`

- [ ] **Step 1: Create `backend/app/seed.py`**

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category, CategoryType

DEFAULT_CATEGORIES = [
    ("Housing", CategoryType.EXPENSE, "🏠"),
    ("Food & Groceries", CategoryType.EXPENSE, "🍕"),
    ("Transportation", CategoryType.EXPENSE, "🚗"),
    ("Utilities", CategoryType.EXPENSE, "💡"),
    ("Entertainment", CategoryType.EXPENSE, "🎮"),
    ("Healthcare", CategoryType.EXPENSE, "🏥"),
    ("Insurance", CategoryType.EXPENSE, "🛡️"),
    ("Subscriptions", CategoryType.EXPENSE, "📱"),
    ("Personal Care", CategoryType.EXPENSE, "💆"),
    ("Education", CategoryType.EXPENSE, "📚"),
    ("Clothing", CategoryType.EXPENSE, "👕"),
    ("Gifts & Donations", CategoryType.EXPENSE, "🎁"),
    ("Other Expense", CategoryType.EXPENSE, "📦"),
    ("Salary", CategoryType.INCOME, "💰"),
    ("Freelance", CategoryType.INCOME, "💻"),
    ("Investments", CategoryType.INCOME, "📈"),
    ("Other Income", CategoryType.INCOME, "💵"),
]


async def seed_default_categories(db: AsyncSession) -> None:
    result = await db.execute(
        select(Category).where(Category.is_default == True).limit(1)  # noqa: E712
    )
    if result.scalar_one_or_none() is not None:
        return  # Already seeded

    for name, cat_type, icon in DEFAULT_CATEGORIES:
        category = Category(
            name=name,
            type=cat_type,
            icon=icon,
            is_default=True,
            user_id=None,
        )
        db.add(category)
    await db.commit()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/seed.py
git commit -m "feat: add default category seed data (17 categories)"
```

---

## Task 7: Auth Service

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/auth.py`
- Create: `backend/app/dependencies.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Create `backend/app/services/__init__.py`**

```python
```

(Empty file)

- [ ] **Step 2: Create `backend/app/services/auth.py`**

```python
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
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
```

- [ ] **Step 3: Create `backend/app/dependencies.py`**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth import decode_access_token, get_user_by_email
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    email: str | None = payload.get("sub")
    if email is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await get_user_by_email(db, email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
```

- [ ] **Step 4: Create test infrastructure — `backend/tests/__init__.py`**

```python
```

(Empty file)

- [ ] **Step 5: Create `backend/tests/conftest.py`**

```python
import asyncio
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def auth_client(client: AsyncClient) -> AsyncClient:
    await client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "testpass123", "name": "Test User"},
    )
    response = await client.post(
        "/api/auth/login",
        data={"username": "test@example.com", "password": "testpass123"},
    )
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
```

- [ ] **Step 6: Write failing tests — `backend/tests/test_auth.py`**

```python
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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


@pytest.mark.asyncio
async def test_get_me(auth_client: AsyncClient):
    response = await auth_client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
```

- [ ] **Step 7: Run tests to verify they fail**

```bash
cd backend && poetry run pytest tests/test_auth.py -v
```

Expected: FAIL — auth router not yet created.

- [ ] **Step 8: Commit test file**

```bash
git add backend/tests/ backend/app/services/ backend/app/dependencies.py
git commit -m "feat: add auth service, dependencies, and auth tests (red)"
```

---

## Task 8: Auth Router + Schemas (Make Tests Pass)

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/user.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/auth.py`
- Modify: `backend/app/main.py` — register router, add lifespan

- [ ] **Step 1: Create `backend/app/schemas/__init__.py`**

```python
```

- [ ] **Step 2: Create `backend/app/schemas/user.py`**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel


class UserCreate(BaseModel):
    email: str
    password: str
    name: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 3: Create `backend/app/schemas/auth.py`**

```python
from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
```

- [ ] **Step 4: Create `backend/app/routers/__init__.py`**

```python
```

- [ ] **Step 5: Create `backend/app/routers/auth.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import Token
from app.schemas.user import UserCreate, UserResponse
from app.services.auth import authenticate_user, create_user, get_user_by_email, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await get_user_by_email(db, user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await create_user(db, user_data.email, user_data.password, user_data.name)
    return user


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(data={"sub": user.email})
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
```

- [ ] **Step 6: Update `backend/app/main.py` with router and lifespan**

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import async_session
from app.routers import auth
from app.seed import seed_default_categories


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with async_session() as db:
        await seed_default_categories(db)
    yield


app = FastAPI(title="Dough Flow API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd backend && poetry run pytest tests/test_auth.py -v
```

Expected: All 5 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/app/schemas/ backend/app/routers/ backend/app/main.py
git commit -m "feat: add auth router with register, login, and me endpoints"
```

---

## Task 9: Account CRUD Endpoints (TDD)

**Files:**
- Create: `backend/app/schemas/account.py`
- Create: `backend/app/routers/accounts.py`
- Create: `backend/tests/test_accounts.py`
- Modify: `backend/app/main.py` — include accounts router

- [ ] **Step 1: Create `backend/app/schemas/account.py`**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.account import AccountType


class AccountCreate(BaseModel):
    name: str
    type: AccountType
    institution: str
    balance: float = 0
    interest_rate: float | None = None


class AccountUpdate(BaseModel):
    name: str | None = None
    institution: str | None = None
    balance: float | None = None
    interest_rate: float | None = None


class AccountResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: AccountType
    institution: str
    balance: float
    interest_rate: float | None
    external_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Write failing tests — `backend/tests/test_accounts.py`**

```python
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
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


@pytest.mark.asyncio
async def test_list_accounts(auth_client: AsyncClient):
    await auth_client.post(
        "/api/accounts",
        json={"name": "Savings", "type": "savings", "institution": "Ally", "balance": 10000},
    )
    response = await auth_client.get("/api/accounts")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_account(auth_client: AsyncClient):
    create = await auth_client.post(
        "/api/accounts",
        json={"name": "Test Account", "type": "checking", "institution": "Bank", "balance": 100},
    )
    account_id = create.json()["id"]
    response = await auth_client.get(f"/api/accounts/{account_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Test Account"


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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


@pytest.mark.asyncio
async def test_unauthorized_access(client: AsyncClient):
    response = await client.get("/api/accounts")
    assert response.status_code == 401
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend && poetry run pytest tests/test_accounts.py -v
```

Expected: FAIL — accounts router not yet created.

- [ ] **Step 4: Create `backend/app/routers/accounts.py`**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.account import Account
from app.models.user import User
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: AccountCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = Account(**data.model_dump(), user_id=user.id)
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@router.get("", response_model=list[AccountResponse])
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Account).where(Account.user_id == user.id))
    return result.scalars().all()


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.patch("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: uuid.UUID,
    data: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(account, field, value)
    await db.commit()
    await db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    await db.delete(account)
    await db.commit()
```

- [ ] **Step 5: Register accounts router in `backend/app/main.py`**

Add after `app.include_router(auth.router)`:

```python
from app.routers import auth, accounts

app.include_router(auth.router)
app.include_router(accounts.router)
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd backend && poetry run pytest tests/test_accounts.py -v
```

Expected: All 6 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas/account.py backend/app/routers/accounts.py backend/tests/test_accounts.py backend/app/main.py
git commit -m "feat: add account CRUD endpoints with tests"
```

---

## Task 10: Categories Endpoint (TDD)

**Files:**
- Create: `backend/app/schemas/category.py`
- Create: `backend/app/routers/categories.py`
- Create: `backend/tests/test_categories.py`
- Modify: `backend/app/main.py` — include categories router

- [ ] **Step 1: Create `backend/app/schemas/category.py`**

```python
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
```

- [ ] **Step 2: Write failing tests — `backend/tests/test_categories.py`**

```python
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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend && poetry run pytest tests/test_categories.py -v
```

- [ ] **Step 4: Create `backend/app/routers/categories.py`**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category).where(
            or_(Category.user_id == user.id, Category.user_id.is_(None))
        )
    )
    return result.scalars().all()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    category = Category(**data.model_dump(), user_id=user.id, is_default=False)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    if category.is_default:
        raise HTTPException(status_code=403, detail="Cannot delete default categories")
    if category.user_id != user.id:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(category)
    await db.commit()
```

- [ ] **Step 5: Register categories router in `backend/app/main.py`**

Add import and include:

```python
from app.routers import auth, accounts, categories

app.include_router(categories.router)
```

- [ ] **Step 6: Seed default categories in test setup**

Update `backend/tests/conftest.py` — add after `Base.metadata.create_all`:

```python
from app.seed import seed_default_categories

@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with TestingSessionLocal() as session:
        await seed_default_categories(session)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd backend && poetry run pytest tests/test_categories.py -v
```

Expected: All 4 tests PASS.

- [ ] **Step 8: Run all tests**

```bash
cd backend && poetry run pytest -v
```

Expected: All auth + account + category tests pass.

- [ ] **Step 9: Commit**

```bash
git add backend/app/schemas/category.py backend/app/routers/categories.py backend/tests/test_categories.py backend/tests/conftest.py backend/app/main.py
git commit -m "feat: add category endpoints with default/custom category support"
```

---

## Task 11: Frontend Scaffolding

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.css`
- Create: `frontend/src/vite-env.d.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Create: `frontend/src/pages/Login.tsx`
- Create: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "dough-flow-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.28.0",
    "axios": "^1.7.0",
    "recharts": "^2.13.0",
    "react-dropzone": "^14.3.0",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 4: Create `frontend/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 5: Create `frontend/postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: Create `frontend/index.html`**

```html
<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dough Flow</title>
  </head>
  <body class="bg-slate-950 text-slate-100">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `frontend/src/vite-env.d.ts`**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 8: Create `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 9: Create `frontend/src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

- [ ] **Step 10: Create `frontend/src/types/index.ts`**

```typescript
export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'loan'

export interface Account {
  id: string
  name: string
  type: AccountType
  institution: string
  balance: number
  interest_rate: number | null
  external_id: string | null
  created_at: string
}

export type CategoryType = 'income' | 'expense'

export interface Category {
  id: string
  name: string
  type: CategoryType
  icon: string
  is_default: boolean
}

export type TransactionType = 'income' | 'expense' | 'transfer'
export type TransactionSource = 'manual' | 'csv_import' | 'plaid'

export interface Transaction {
  id: string
  account_id: string
  date: string
  amount: number
  description: string
  category_id: string | null
  type: TransactionType
  source: TransactionSource
  created_at: string
}
```

- [ ] **Step 11: Create `frontend/src/api/client.ts`**

```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
```

- [ ] **Step 12: Create `frontend/src/components/Sidebar.tsx`**

```tsx
import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/accounts', label: 'Accounts', icon: '🏦' },
  { path: '/transactions', label: 'Transactions', icon: '💳' },
  { path: '/reports', label: 'Reports', icon: '📈' },
  { path: '/debt', label: 'Debt Payoff', icon: '📉' },
  { path: '/budgets', label: 'Budgets & Goals', icon: '🎯' },
  { path: '/import', label: 'Import CSV', icon: '📄' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 min-h-screen p-4 flex flex-col">
      <div className="text-blue-500 font-bold text-lg mb-8">Dough Flow</div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 13: Create `frontend/src/components/ProtectedRoute.tsx`**

```tsx
import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
```

- [ ] **Step 14: Create `frontend/src/pages/Login.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (isRegister) {
        await api.post('/auth/register', { email, password, name })
      }
      const params = new URLSearchParams()
      params.append('username', email)
      params.append('password', password)
      const res = await api.post('/auth/login', params)
      localStorage.setItem('token', res.data.access_token)
      navigate('/')
    } catch {
      setError(isRegister ? 'Registration failed' : 'Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 w-full max-w-md">
        <h1 className="text-2xl font-bold text-blue-500 mb-6">Dough Flow</h1>
        <h2 className="text-lg text-slate-200 mb-4">{isRegister ? 'Create Account' : 'Sign In'}</h2>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        <button
          onClick={() => setIsRegister(!isRegister)}
          className="text-blue-400 text-sm mt-4 hover:underline"
        >
          {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 15: Create `frontend/src/pages/Dashboard.tsx`**

```tsx
export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <p className="text-slate-400">Dashboard will be implemented in Plan 3 (Frontend).</p>
    </div>
  )
}
```

- [ ] **Step 16: Create `frontend/src/App.tsx`**

```tsx
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/accounts" element={<div className="text-slate-400">Accounts — Plan 3</div>} />
                <Route path="/transactions" element={<div className="text-slate-400">Transactions — Plan 3</div>} />
                <Route path="/reports" element={<div className="text-slate-400">Reports — Plan 3</div>} />
                <Route path="/debt" element={<div className="text-slate-400">Debt Payoff — Plan 3</div>} />
                <Route path="/budgets" element={<div className="text-slate-400">Budgets & Goals — Plan 3</div>} />
                <Route path="/import" element={<div className="text-slate-400">Import CSV — Plan 3</div>} />
                <Route path="/settings" element={<div className="text-slate-400">Settings — Plan 3</div>} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
```

- [ ] **Step 17: Create `frontend/nginx.conf`**

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location /api {
        proxy_pass http://api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 18: Create `frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 19: Install dependencies and verify build**

```bash
cd frontend && npm install && npm run build
```

Expected: Build succeeds, `dist/` directory created.

- [ ] **Step 20: Commit**

```bash
git add frontend/
git commit -m "feat: add React frontend shell with sidebar, auth, and routing"
```

---

## Task 12: Docker Compose Integration Test

- [ ] **Step 1: Copy `.env.example` to `.env`**

```bash
cp .env.example .env
```

- [ ] **Step 2: Build and start all services**

```bash
docker compose up --build -d
```

Expected: All 3 services start. Check with `docker compose ps`.

- [ ] **Step 3: Wait for healthy postgres, then run migrations**

```bash
docker compose exec api poetry run alembic upgrade head
```

Expected: Migration applies, all tables created.

- [ ] **Step 4: Verify API health**

```bash
curl http://localhost:8000/api/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 5: Verify frontend loads**

```bash
curl -s http://localhost:3000 | head -5
```

Expected: HTML with `<div id="root">` visible.

- [ ] **Step 6: Test full auth flow via API**

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@doughflow.app","password":"demo123","name":"Demo User"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -d "username=demo@doughflow.app&password=demo123"
```

Expected: Registration returns user JSON, login returns `{"access_token":"...","token_type":"bearer"}`.

- [ ] **Step 7: Tear down**

```bash
docker compose down
```

- [ ] **Step 8: Run all backend tests one final time**

```bash
cd backend && poetry run pytest -v
```

Expected: All tests pass (auth: 5, accounts: 6, categories: 4 = 15 tests).

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "feat: complete Plan 1 foundation — Docker Compose, models, auth, frontend shell"
```

---

## Summary

After completing Plan 1, you have:

- **Docker Compose** running 3 services (postgres, api, frontend)
- **8 SQLAlchemy models** with Alembic migrations
- **JWT authentication** (register, login, protected routes)
- **Account CRUD** endpoints with full test coverage
- **Categories** with 17 default categories + custom category support
- **React frontend** with sidebar nav, auth flow, and placeholder pages
- **15 passing tests** covering auth, accounts, and categories

**Next:** Plan 2 will add the remaining backend routers (transactions, debts, budgets, goals, CSV import, reports) and services (debt_calculator, csv_parser, report_generator).
