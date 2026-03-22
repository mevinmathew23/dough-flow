# Dough Flow — Design Specification & Implementation Plan

## Context

Build a comprehensive personal finance tracking application ("Dough Flow") that provides a complete picture of financial wellbeing — income, expenses, account allocations, debt management, and budgeting. The application runs locally via Docker Compose with all data stored in a local PostgreSQL database. The goal is to replace spreadsheet-based finance tracking with a polished, purpose-built tool.

---

## Architecture

### Stack
- **Backend**: FastAPI (Python 3.12) with Poetry for dependency management
- **Frontend**: React + TypeScript served by nginx
- **Database**: PostgreSQL 16 with SQLAlchemy ORM + Alembic migrations
- **Infrastructure**: Docker Compose (3 containers: `api`, `frontend`, `postgres`)

### Docker Compose Services
| Service | Image | Port | Notes |
|---------|-------|------|-------|
| `postgres` | postgres:16-alpine | 5432 | Volume mount for data persistence |
| `api` | Custom (Python 3.12) | 8000 | Poetry venv via poetry.toml, SQLAlchemy |
| `frontend` | Custom (node build → nginx) | 3000 | nginx proxies `/api` → backend |

### Project Structure
```
dough_flow/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── poetry.toml          # in-project virtualenv config
│   ├── poetry.lock
│   ├── alembic/
│   │   ├── alembic.ini
│   │   └── versions/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry
│   │   ├── config.py         # Settings via pydantic-settings
│   │   ├── database.py       # SQLAlchemy engine/session
│   │   ├── models/           # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── account.py
│   │   │   ├── transaction.py
│   │   │   ├── category.py
│   │   │   ├── debt.py
│   │   │   ├── budget.py
│   │   │   ├── goal.py
│   │   │   └── csv_mapping.py
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── routers/          # FastAPI routers (one per domain)
│   │   │   ├── auth.py
│   │   │   ├── accounts.py
│   │   │   ├── transactions.py
│   │   │   ├── categories.py
│   │   │   ├── debts.py
│   │   │   ├── budgets.py
│   │   │   ├── goals.py
│   │   │   ├── reports.py
│   │   │   └── csv_import.py
│   │   ├── services/         # Business logic layer
│   │   │   ├── debt_calculator.py    # Payoff projections, amortization
│   │   │   ├── csv_parser.py         # CSV parsing + column mapping
│   │   │   └── report_generator.py   # Monthly comparisons, aggregations
│   │   └── seed.py           # Default categories seeder
│   └── tests/
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/              # API client (axios/fetch wrapper)
│   │   ├── components/       # Shared UI components
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Accounts.tsx
│   │   │   ├── Transactions.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── DebtPayoff.tsx
│   │   │   ├── Budgets.tsx
│   │   │   ├── CsvImport.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── Login.tsx
│   │   ├── hooks/            # Custom React hooks
│   │   └── types/            # TypeScript interfaces
│   └── public/
└── .gitignore
```

---

## Data Model

### User
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| email | varchar | unique |
| password_hash | varchar | bcrypt |
| name | varchar | |
| created_at | timestamp | |

### Account
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → User |
| name | varchar | e.g., "Chase Checking" |
| type | enum | checking, savings, credit, investment, loan |
| institution | varchar | e.g., "Chase", "Ally" |
| balance | decimal | current balance |
| interest_rate | decimal | nullable, for credit/loan/savings |
| external_id | varchar | nullable, for Plaid account linking (v2) |
| created_at | timestamp | |

### Transaction
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| account_id | UUID | FK → Account |
| user_id | UUID | FK → User |
| date | date | transaction date |
| amount | decimal | positive=credit, negative=debit |
| description | varchar | merchant/description |
| category_id | UUID | FK → Category, nullable |
| type | enum | income, expense, transfer |
| source | enum | manual, csv_import, plaid (v2) |
| transfer_id | UUID | nullable, links paired transfers |
| created_at | timestamp | |

### Category
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → User, null = system default |
| name | varchar | e.g., "Housing", "Food" |
| type | enum | income, expense |
| icon | varchar | emoji or icon name |
| is_default | boolean | true for seeded categories |

**Default categories**: Housing, Food & Groceries, Transportation, Utilities, Entertainment, Healthcare, Insurance, Subscriptions, Personal Care, Education, Clothing, Gifts & Donations, Salary, Freelance, Investments, Other Income, Other Expense

### Debt
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| account_id | UUID | FK → Account (loan/credit type) |
| user_id | UUID | FK → User |
| original_amount | decimal | starting balance |
| current_balance | decimal | remaining balance |
| interest_rate | decimal | APR |
| minimum_payment | decimal | monthly minimum |
| priority_order | integer | user-defined payoff priority |
| target_payoff_date | date | nullable, user-set goal |

### Budget
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → User |
| category_id | UUID | FK → Category |
| amount | decimal | monthly budget limit |
| month | date | first day of month |

### Goal
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → User |
| name | varchar | e.g., "Emergency Fund" |
| target_amount | decimal | goal target |
| current_amount | decimal | progress |
| target_date | date | nullable |
| icon | varchar | emoji |

### CSVMapping
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → User |
| institution_name | varchar | e.g., "Chase Checking" |
| column_mapping | JSON | maps CSV columns → fields |
| date_format | varchar | e.g., "%m/%d/%Y" |
| created_at | timestamp | |

---

## Pages & UI

Layout: **Sidebar navigation** (fixed left) with main content area.

### Sidebar Navigation Items
1. Dashboard
2. Accounts
3. Transactions
4. Reports
5. Debt Payoff
6. Budgets & Goals
7. Import CSV
8. Settings

### Page Details

#### 1. Dashboard
- **KPI cards row**: Net Worth, Monthly Income, Monthly Spend, Total Debt (with % change from prior month)
- **Income vs Expense trend line**: 6-month SVG/Recharts line chart
- **Cash flow waterfall**: Income → Fixed Expenses → Variable Expenses → Debt Payments → Savings
- **Spending by category**: Bar chart of current month
- **Account balances**: Compact list with color-coded amounts

#### 2. Accounts
- List all accounts grouped by type
- Each row: name, institution, type badge, balance
- Add/edit/delete account actions
- Click account → filtered transactions view

#### 3. Transactions
- **Search bar**: Free text search by merchant/description
- **Filters**: Account, Category, Date Range (picker), Type (income/expense/transfer)
- **Bulk categorize**: Checkboxes + assign category to selected
- **Manual entry** button → modal form
- **Import CSV** button → navigates to import page
- Transaction rows: date, description, category tag, amount

#### 4. Reports (Monthly Comparison)
- **Income vs Expense grouped bar chart**: Side-by-side bars for each month (6-12 months)
- **Category breakdown table**: Current month vs prior month with % change
- **Savings rate**: Percentage and absolute amount
- Date range selector to adjust comparison window

#### 5. Debt Payoff
- **What-if simulator**: Slider for extra monthly payment → recalculates projected payoff date and interest saved
- **Priority-ordered debt list**: Drag to reorder priority, each with progress bar (% paid off)
- **Amortization schedule**: Expandable per-debt table (month, payment, principal, interest, balance)
- **Summary**: Total debt, projected debt-free date, total interest saved vs minimum payments

#### 6. Budgets & Goals
- **Monthly budgets**: Per-category budget with progress bar (green < 80%, yellow 80-100%, red > 100%)
- **Financial goals**: Cards with progress bar, target amount, current amount, estimated completion date
- Add/edit/delete budgets and goals

#### 7. CSV Import
- **Step 1**: Drag-and-drop or file picker, select target account
- **Step 2**: Column mapping UI — auto-detect or manual map (date, description, amount, category)
- **Step 3**: Preview imported transactions, edit categories before confirming
- **Save mapping**: Checkbox to save as reusable mapping for this institution

#### 8. Settings
- User profile (name, email, password change)
- Manage custom categories
- Export data (CSV download)

---

## Authentication
- JWT-based auth with access + refresh tokens
- bcrypt password hashing
- Login/register pages
- Token stored in httpOnly cookie or localStorage

---

## Key Backend Services

### debt_calculator.py
- Calculate amortization schedule for each debt
- Project payoff dates given custom priority order and extra payment amount
- Compare total interest paid: minimum-only vs custom strategy

### csv_parser.py
- Parse uploaded CSV using saved or new column mapping
- Validate data types (dates, amounts)
- Return preview for user confirmation before insert
- Handle duplicate detection (same date + amount + description)

### report_generator.py
- Monthly spending aggregation by category
- Month-over-month comparison with % changes
- Income vs expense trend data
- Cash flow waterfall breakdown
- Savings rate calculation

---

## Technical Decisions

### Poetry Configuration (poetry.toml)
```toml
[virtualenvs]
in-project = true
create = true
```

### Key Python Dependencies
- fastapi, uvicorn, sqlalchemy, alembic, pydantic, pydantic-settings
- python-jose (JWT), passlib[bcrypt] (password hashing)
- python-multipart (file uploads), pandas (CSV parsing)

### Key Frontend Dependencies
- react, react-router-dom, typescript
- recharts (charting library)
- axios (HTTP client)
- tailwindcss (styling)
- react-dropzone (file upload)
- date-fns (date utilities)

### Frontend Design
- Use the `frontend-design` skill for polished, production-grade UI
- Dark theme (navy/slate palette matching wireframes)
- Responsive but desktop-first (primary use case is desktop browser)

---

## Verification

### How to test end-to-end
1. `docker compose up --build` — all 3 services start
2. Open `http://localhost:3000` — frontend loads
3. Register a new user → login
4. Add accounts (checking, savings, credit card, loan)
5. Manual transaction entry → appears in transaction list
6. Upload a CSV → map columns → preview → confirm import
7. Dashboard shows KPI cards, charts populated with data
8. Set budgets per category → progress bars update
9. Add debts → adjust what-if slider → verify projections change
10. Reports page shows monthly comparison

### Automated tests
- Backend: pytest with httpx for API testing, test database
- Frontend: Vitest + React Testing Library for component tests

---

## v2 Roadmap: Plaid Bank Connectivity

**Not in v1** — CSV + manual entry only. Architecture is Plaid-ready with `source: plaid` enum value and `Account.external_id` field included from the start.

### How Plaid works (for v2)
- **Plaid Link**: Secure frontend widget handles all credential entry — your server never sees bank passwords
- **Plaid stores credentials**: Encrypted on their infrastructure, not yours
- **Your server stores**: Only a Plaid `access_token` (encrypted at rest) to pull transactions
- **Free tier**: 100 connected accounts (more than enough for personal use)
- **Auto-sync**: Plaid webhooks notify your backend when new transactions are available

### v2 additions needed
- `PlaidItem` model: stores encrypted access_token, institution, consent status
- `plaid_sync` service: webhook handler + transaction sync into existing Transaction model
- Settings page: "Link Account" button → Plaid Link widget
- Encryption: Fernet symmetric encryption for access tokens at rest
