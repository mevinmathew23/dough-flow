# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dough Flow is a personal finance application with a FastAPI async backend, React/TypeScript frontend, and PostgreSQL database. All backend operations use async/await with SQLAlchemy 2.0 async sessions.

## Commands

### Development (Docker Compose)
```bash
docker compose up              # Start all services (postgres, api, frontend)
docker compose up -d postgres  # Start just the database
```

### Backend
```bash
cd dough_flow_api
poetry install                 # Install dependencies
poetry run uvicorn api.main:app --reload --port 8000  # Run dev server
poetry run pytest tests/       # Run all tests
poetry run pytest tests/unit/test_auth.py -v               # Run single test file
poetry run pytest tests/unit/test_auth.py::test_register -v # Run single test
```

### Frontend
```bash
cd dough_flow_ui
npm install          # Install dependencies
npm run dev          # Vite dev server on port 3000
npm run build        # Production build
```

### Database Migrations
```bash
cd dough_flow_api
poetry run alembic revision --autogenerate -m "description"  # Create migration
poetry run alembic upgrade head                               # Apply migrations
```

## Architecture

### Backend (`dough_flow_api/api/`)

Layered architecture: **Routers** (HTTP) -> **Services** (business logic) -> **Models** (ORM) with **Schemas** (Pydantic DTOs) at the boundary.

- `main.py` - FastAPI app with lifespan that seeds default categories on startup. CORS allows localhost:3000.
- `config.py` - Pydantic Settings loading from env vars
- `database.py` - Async SQLAlchemy engine and session factory (asyncpg driver)
- `dependencies.py` - `get_db()` yields AsyncSession; `get_current_user()` validates JWT and returns User
- `seed.py` - Creates 17 default categories (13 expense, 4 income) with emojis if none exist
- `models/` - SQLAlchemy ORM: User, Account, Transaction, Category, Budget, Goal, Debt, CSVMapping (all use UUID primary keys)
- `routers/` - auth (register/login/me), accounts (CRUD), categories (list/create/delete)
- `schemas/` - Pydantic models for request validation and response serialization
- `services/auth.py` - Password hashing (bcrypt), JWT creation/validation (HS256)

### Frontend (`dough_flow_ui/src/`)

- `api/client.ts` - Axios instance with Bearer token interceptor; 401 responses clear token and redirect to /login
- `App.tsx` - Route definitions with ProtectedRoute wrapper; sidebar layout for authenticated pages
- `components/Sidebar.tsx` - Navigation with 8 sections (dashboard, accounts, transactions, reports, debt, budgets, import, settings)
- `types/index.ts` - TypeScript interfaces mirroring backend schemas

### Auth Flow
1. Register/login -> backend returns JWT access_token
2. Token stored in localStorage
3. Axios interceptor attaches `Authorization: Bearer <token>` to all requests
4. Backend `get_current_user` dependency validates token on protected endpoints
5. All user data is filtered by `user_id` for isolation

### Testing
Tests use SQLite in-memory database (`aiosqlite`) instead of PostgreSQL. Key fixtures in `conftest.py`:
- `setup_db` - Creates tables, seeds defaults, tears down per test
- `client` - Unauthenticated AsyncClient
- `auth_client` - Pre-authenticated client with test user token

### Infrastructure
Docker Compose runs three services: `postgres` (port 5432), `api` (port 8000 with hot-reload), `frontend` (port 3000 via nginx with `/api` proxy to backend).

## Environment Variables
Defined in `.env` at project root. Key vars: `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `POSTGRES_USER/PASSWORD/DB`.

## Workflow Standards

### Git
- Branch from `main` for all work: `feature/`, `fix/`, `chore/` prefixes
- Write concise commit messages: imperative mood, explain *why* not *what*
- Run tests before committing; do not commit broken code
- Never commit `.env`, credentials, or secrets

### Code Quality
- All new backend code must have corresponding tests
- Run `poetry run pytest tests/` from `dough_flow_api/` before considering backend work done
- Run `npm run build` from `dough_flow_ui/` before considering frontend work done
- Follow existing patterns: new endpoints get a router, schema, and test file
- Keep routers thin — business logic belongs in `services/`
- All database queries must use async sessions (`await session.execute(...)`)
- Pydantic schemas enforce API contracts; do not return raw ORM models from endpoints

### Code Style
- No wildcard imports; explicit imports only

## TypeScript / React Standards

### Tooling
- **TypeScript 5.6** with strict mode (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- **Vite 5.4** dev server on port 3000 with `/api` proxy to `localhost:8000`
- **TailwindCSS 3.4** with class-based dark mode (`darkMode: 'class'`)
- **Prettier** configured with `.prettierrc` (no semi, single quotes, trailing commas)
- No test framework configured for frontend yet
- `npm run build` runs `tsc -b && vite build` — TypeScript must compile cleanly

### Conventions
- Functional components with `export default function ComponentName()`
- Inline prop types: `{ children }: { children: React.ReactNode }`
- All shared interfaces/types live in `src/types/index.ts`; use `snake_case` field names to match backend API responses
- Union string literal types for enums: `type AccountType = 'checking' | 'savings' | ...`
- API calls go through `src/api/client.ts` (Axios instance) — never use raw `fetch` or create new Axios instances
- Token stored in `localStorage` under key `'token'`

### Component Patterns
- Pages go in `src/pages/`, reusable components in `src/components/`
- Protected routes wrap with `<ProtectedRoute>` which checks for token in localStorage
- App layout: `<Sidebar />` + `<main>` wrapper defined in `App.tsx`
- Styling: TailwindCSS utility classes only, dark theme palette (slate-950/900/800 backgrounds, blue-500/600 accents)
- No CSS modules, styled-components, or CSS-in-JS

### Adding New Pages
1. Create component in `src/pages/NewPage.tsx`
2. Add route in `App.tsx` inside the protected `<Routes>` block
3. Add nav link in `Sidebar.tsx`
4. Add any new TypeScript interfaces to `src/types/index.ts`

## Python Standards

### Tooling
- **Python 3.12**, managed by Poetry (virtualenv in-project: `dough_flow_api/.venv/`)
- **pytest** with `asyncio_mode = "auto"` — no need for `@pytest.mark.asyncio` decorators
- **black** + **isort** for formatting, **pylint** + **mypy** (strict) for linting, **bandit** for security

### Conventions
- Type hints on all function signatures (params and return types)
- `snake_case` for functions, variables, modules; `PascalCase` for classes and Pydantic models
- All DB operations are async: `async def` + `await session.execute(...)`
- Use `select()` style queries (SQLAlchemy 2.0), not legacy `session.query()`
- Models use `Mapped[]` type annotations with `mapped_column()`
- UUID primary keys on all models (`uuid.uuid4` default)
- Pydantic v2 schemas with `model_config = ConfigDict(from_attributes=True)` for ORM mode

### FastAPI Patterns
- Routers use `APIRouter(prefix="/api/...", tags=[...])` and are included in `main.py`
- Protected endpoints take `current_user: User = Depends(get_current_user)` and `db: AsyncSession = Depends(get_db)`
- Raise `HTTPException` for error responses; do not return error dicts
- Use `status_code=status.HTTP_201_CREATED` for creation endpoints

### Testing Patterns
- Tests run against SQLite (`aiosqlite`), not PostgreSQL
- Use `client` fixture for unauthenticated requests, `auth_client` for authenticated
- Test files mirror router files: `routers/accounts.py` → `tests/unit/test_accounts.py`
- Assert both status codes and response body structure
- Each test function is independent — `setup_db` fixture recreates tables per test
