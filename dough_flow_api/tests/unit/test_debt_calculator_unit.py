"""Unit tests for debt_calculator service functions.

These tests exercise the pure calculation functions directly, using mock Debt
objects to avoid any database dependency.
"""

import uuid
from datetime import date
from unittest.mock import MagicMock

import pytest

from api.models.debt import CompoundingFrequency
from api.services.debt_calculator import (
    _effective_monthly_rate,
    calculate_amortization,
    calculate_group_summary,
    project_growth,
)


def _make_debt(
    *,
    balance: float,
    rate: float,
    minimum_payment: float,
    frequency: CompoundingFrequency = CompoundingFrequency.MONTHLY,
    principal: float | None = None,
    priority_order: int = 0,
) -> MagicMock:
    """Build a mock Debt object with the given attributes.

    Args:
        balance: Current balance on the debt.
        rate: Annual interest rate as a decimal (e.g. 0.20 for 20%).
        minimum_payment: Monthly minimum payment amount.
        frequency: Compounding frequency enum value.
        principal: Original principal; defaults to balance if not provided.
        priority_order: Snowball priority ordering.

    Returns:
        MagicMock configured to behave like a Debt ORM instance.
    """
    debt = MagicMock()
    debt.id = uuid.uuid4()
    debt.current_balance = balance
    debt.interest_rate = rate
    debt.minimum_payment = minimum_payment
    debt.compounding_frequency = frequency
    debt.principal_amount = principal if principal is not None else balance
    debt.priority_order = priority_order
    return debt


# ---------------------------------------------------------------------------
# _effective_monthly_rate
# ---------------------------------------------------------------------------


def test_effective_monthly_rate_zero() -> None:
    """Zero annual rate should produce a zero monthly rate."""
    assert _effective_monthly_rate(0.0, CompoundingFrequency.MONTHLY) == 0.0


def test_effective_monthly_rate_monthly_compounding() -> None:
    """Monthly compounding at 12% should give ~1% per month."""
    rate = _effective_monthly_rate(0.12, CompoundingFrequency.MONTHLY)
    assert abs(rate - 0.01) < 1e-6


def test_effective_monthly_rate_daily_higher_than_monthly() -> None:
    """Daily compounding should yield a slightly higher monthly rate than monthly compounding."""
    monthly = _effective_monthly_rate(0.12, CompoundingFrequency.MONTHLY)
    daily = _effective_monthly_rate(0.12, CompoundingFrequency.DAILY)
    assert daily > monthly


def test_effective_monthly_rate_annually() -> None:
    """Annual compounding at 12% should produce the correct EAR-based monthly rate."""
    rate = _effective_monthly_rate(0.12, CompoundingFrequency.ANNUALLY)
    # EAR = 0.12; monthly = (1.12)^(1/12) - 1
    expected = (1.12) ** (1 / 12) - 1
    assert abs(rate - expected) < 1e-9


# ---------------------------------------------------------------------------
# calculate_amortization
# ---------------------------------------------------------------------------


def test_amortization_zero_balance() -> None:
    """Zero balance should produce an empty schedule immediately."""
    schedule = calculate_amortization(
        balance=0.0,
        annual_rate=0.20,
        monthly_payment=200.0,
        start_date=date(2026, 1, 1),
    )
    assert schedule == []


def test_amortization_zero_interest() -> None:
    """With zero interest the principal reduces by the payment amount each month."""
    schedule = calculate_amortization(
        balance=300.0,
        annual_rate=0.0,
        monthly_payment=100.0,
        start_date=date(2026, 1, 1),
    )
    assert len(schedule) == 3
    for row in schedule:
        assert row.interest == 0.0
    assert schedule[-1].balance == 0.0


def test_amortization_normal_case() -> None:
    """A normal amortization should produce a schedule that terminates with zero balance."""
    schedule = calculate_amortization(
        balance=1000.0,
        annual_rate=0.12,
        monthly_payment=200.0,
        start_date=date(2026, 1, 1),
    )
    assert len(schedule) > 0
    assert schedule[-1].balance == 0.0
    # Each row: payment = principal + interest
    for row in schedule:
        assert abs(row.payment - row.principal - row.interest) < 0.02


def test_amortization_caps_at_600_months() -> None:
    """When the payment barely covers interest, the schedule should be capped at 600 months."""
    # 1% monthly rate on 10_000, minimum payment of 100 covers just the interest
    schedule = calculate_amortization(
        balance=10_000.0,
        annual_rate=0.12,
        monthly_payment=1.0,  # Far too small to pay down principal
        start_date=date(2026, 1, 1),
    )
    assert len(schedule) == 600


# ---------------------------------------------------------------------------
# project_growth
# ---------------------------------------------------------------------------


def test_project_growth_returns_correct_month_count() -> None:
    """project_growth should return one GrowthRow per requested month."""
    debt = _make_debt(balance=5000.0, rate=0.20, minimum_payment=150.0)
    result = project_growth(debt, months=12)
    assert len(result.schedule) == 12


def test_project_growth_balance_increases() -> None:
    """Without payments, balance should grow every month."""
    debt = _make_debt(balance=5000.0, rate=0.20, minimum_payment=150.0)
    result = project_growth(debt, months=6)
    for row in result.schedule:
        assert row.balance > 5000.0
        assert row.interest_accrued > 0.0


def test_project_growth_zero_rate() -> None:
    """With zero interest rate the balance should never increase."""
    debt = _make_debt(balance=1000.0, rate=0.0, minimum_payment=50.0)
    result = project_growth(debt, months=6)
    for row in result.schedule:
        assert row.interest_accrued == 0.0
        assert row.balance == 1000.0
    assert result.total_interest_accrued == 0.0
    assert result.final_balance == 1000.0


def test_project_growth_metadata() -> None:
    """The projection metadata should mirror the input debt's values."""
    debt = _make_debt(balance=2000.0, rate=0.15, minimum_payment=60.0, principal=2500.0)
    result = project_growth(debt, months=3)
    assert result.debt_id == debt.id
    assert result.principal_amount == 2500.0
    assert result.interest_rate == 0.15


# ---------------------------------------------------------------------------
# calculate_group_summary
# ---------------------------------------------------------------------------


def test_group_summary_empty_list() -> None:
    """Empty debt list should produce all-zero totals."""
    result = calculate_group_summary([])
    assert result.debt_count == 0
    assert result.total_principal == 0.0
    assert result.total_current_balance == 0.0
    assert result.total_minimum_payment == 0.0
    assert result.weighted_interest_rate == 0.0


def test_group_summary_single_debt() -> None:
    """Single debt summary should reflect the debt's own values exactly."""
    debt = _make_debt(balance=5000.0, rate=0.20, minimum_payment=150.0, principal=5000.0)
    result = calculate_group_summary([debt])
    assert result.debt_count == 1
    assert result.total_current_balance == 5000.0
    assert result.total_principal == 5000.0
    assert result.total_minimum_payment == 150.0
    assert abs(result.weighted_interest_rate - 0.20) < 1e-4


def test_group_summary_weighted_rate() -> None:
    """Weighted rate should be the balance-weighted average of individual rates."""
    debt_a = _make_debt(balance=5000.0, rate=0.20, minimum_payment=100.0, principal=5000.0)
    debt_b = _make_debt(balance=10_000.0, rate=0.05, minimum_payment=200.0, principal=10_000.0)
    result = calculate_group_summary([debt_a, debt_b])
    # (5000*0.20 + 10000*0.05) / 15000 = 1500/15000 = 0.1
    assert abs(result.weighted_interest_rate - 0.1) < 0.001
    assert result.debt_count == 2
    assert result.total_principal == 15_000.0
    assert result.total_minimum_payment == 300.0
