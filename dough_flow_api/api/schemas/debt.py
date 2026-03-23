import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict

from api.models.debt import CompoundingFrequency


class DebtCreate(BaseModel):
    account_id: uuid.UUID
    principal_amount: float
    current_balance: float
    interest_rate: float
    minimum_payment: float
    compounding_frequency: CompoundingFrequency = CompoundingFrequency.MONTHLY
    priority_order: int = 0
    target_payoff_date: date | None = None


class DebtUpdate(BaseModel):
    current_balance: float | None = None
    interest_rate: float | None = None
    minimum_payment: float | None = None
    compounding_frequency: CompoundingFrequency | None = None
    priority_order: int | None = None
    target_payoff_date: date | None = None


class DebtResponse(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    user_id: uuid.UUID
    principal_amount: float
    current_balance: float
    interest_rate: float
    minimum_payment: float
    compounding_frequency: CompoundingFrequency
    priority_order: int
    target_payoff_date: date | None

    model_config = ConfigDict(from_attributes=True)


class AmortizationRow(BaseModel):
    month: int
    payment: float
    principal: float
    interest: float
    balance: float


class GrowthRow(BaseModel):
    month: int
    interest_accrued: float
    balance: float


class PayoffProjection(BaseModel):
    debt_id: uuid.UUID
    months_to_payoff: int
    total_interest: float
    total_paid: float
    payoff_date: date
    schedule: list[AmortizationRow]


class GrowthProjection(BaseModel):
    debt_id: uuid.UUID
    principal_amount: float
    interest_rate: float
    compounding_frequency: CompoundingFrequency
    schedule: list[GrowthRow]
    total_interest_accrued: float
    final_balance: float


class PayoffSummary(BaseModel):
    projections: list[PayoffProjection]
    total_debt: float
    total_interest: float
    debt_free_date: date
    interest_saved_vs_minimum: float


class DebtGroupSummary(BaseModel):
    debt_ids: list[uuid.UUID]
    total_principal: float
    total_current_balance: float
    weighted_interest_rate: float
    total_minimum_payment: float
    debt_count: int
