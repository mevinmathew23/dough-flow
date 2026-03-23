import uuid
from datetime import date

from pydantic import BaseModel


class DebtCreate(BaseModel):
    account_id: uuid.UUID
    original_amount: float
    current_balance: float
    interest_rate: float
    minimum_payment: float
    priority_order: int = 0
    target_payoff_date: date | None = None


class DebtUpdate(BaseModel):
    current_balance: float | None = None
    interest_rate: float | None = None
    minimum_payment: float | None = None
    priority_order: int | None = None
    target_payoff_date: date | None = None


class DebtResponse(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    user_id: uuid.UUID
    original_amount: float
    current_balance: float
    interest_rate: float
    minimum_payment: float
    priority_order: int
    target_payoff_date: date | None

    model_config = {"from_attributes": True}


class AmortizationRow(BaseModel):
    month: int
    payment: float
    principal: float
    interest: float
    balance: float


class PayoffProjection(BaseModel):
    debt_id: uuid.UUID
    months_to_payoff: int
    total_interest: float
    total_paid: float
    payoff_date: date
    schedule: list[AmortizationRow]


class PayoffSummary(BaseModel):
    projections: list[PayoffProjection]
    total_debt: float
    total_interest: float
    debt_free_date: date
    interest_saved_vs_minimum: float
