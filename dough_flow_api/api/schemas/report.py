import uuid

from pydantic import BaseModel


class MonthlySummary(BaseModel):
    month: str
    income: float
    expenses: float
    savings: float
    savings_rate: float


class CategorySpending(BaseModel):
    category_id: uuid.UUID
    category_name: str
    category_icon: str
    total: float


class CategoryComparison(BaseModel):
    category_id: uuid.UUID
    category_name: str
    category_icon: str
    total: float
    prior_total: float
    pct_change: float


class NetWorth(BaseModel):
    net_worth: float
