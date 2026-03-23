from datetime import date

from dateutil.relativedelta import relativedelta

from app.models.debt import CompoundingFrequency, Debt
from app.schemas.debt import (
    AmortizationRow,
    DebtGroupSummary,
    GrowthProjection,
    GrowthRow,
    PayoffProjection,
    PayoffSummary,
)


# Number of compounding periods per year for each frequency
PERIODS_PER_YEAR: dict[CompoundingFrequency, int] = {
    CompoundingFrequency.DAILY: 365,
    CompoundingFrequency.WEEKLY: 52,
    CompoundingFrequency.BIWEEKLY: 26,
    CompoundingFrequency.MONTHLY: 12,
    CompoundingFrequency.BIMONTHLY: 6,
    CompoundingFrequency.QUARTERLY: 4,
    CompoundingFrequency.SEMIANNUALLY: 2,
    CompoundingFrequency.ANNUALLY: 1,
}


def _effective_monthly_rate(annual_rate: float, frequency: CompoundingFrequency) -> float:
    """Convert annual rate to effective monthly rate based on compounding frequency.

    For non-monthly compounding, we first compute the effective annual rate (EAR)
    from the nominal rate and compounding frequency, then convert to a monthly rate.
    """
    if annual_rate == 0:
        return 0.0
    n = PERIODS_PER_YEAR[frequency]
    # EAR = (1 + r/n)^n - 1
    ear = (1 + annual_rate / n) ** n - 1
    # Effective monthly rate from EAR: (1 + EAR)^(1/12) - 1
    monthly_rate = (1 + ear) ** (1 / 12) - 1
    return monthly_rate


def calculate_amortization(
    balance: float,
    annual_rate: float,
    monthly_payment: float,
    start_date: date,
    frequency: CompoundingFrequency = CompoundingFrequency.MONTHLY,
) -> list[AmortizationRow]:
    """Generate month-by-month amortization schedule for a single debt.

    Payments are applied interest-first: each month's payment covers accrued
    interest first, with any remainder reducing the principal.
    """
    schedule: list[AmortizationRow] = []
    remaining = balance
    monthly_rate = _effective_monthly_rate(annual_rate, frequency)
    month = 0

    while remaining > 0.01 and month < 600:  # Cap at 50 years
        month += 1
        interest = round(remaining * monthly_rate, 2)
        payment = min(monthly_payment, remaining + interest)
        principal = round(payment - interest, 2)
        remaining = round(remaining - principal, 2)
        if remaining < 0:
            remaining = 0.0
        schedule.append(
            AmortizationRow(
                month=month,
                payment=round(payment, 2),
                principal=principal,
                interest=interest,
                balance=remaining,
            )
        )

    return schedule


def project_payoff(
    debt: Debt,
    extra_payment: float,
    start_date: date,
) -> PayoffProjection:
    """Project payoff for a single debt with optional extra monthly payment."""
    monthly_payment = float(debt.minimum_payment) + extra_payment
    frequency = debt.compounding_frequency or CompoundingFrequency.MONTHLY
    schedule = calculate_amortization(
        balance=float(debt.current_balance),
        annual_rate=float(debt.interest_rate),
        monthly_payment=monthly_payment,
        start_date=start_date,
        frequency=frequency,
    )

    total_interest = sum(row.interest for row in schedule)
    total_paid = sum(row.payment for row in schedule)
    months = len(schedule)
    payoff_date = start_date + relativedelta(months=months)

    return PayoffProjection(
        debt_id=debt.id,
        months_to_payoff=months,
        total_interest=round(total_interest, 2),
        total_paid=round(total_paid, 2),
        payoff_date=payoff_date,
        schedule=schedule,
    )


def project_growth(
    debt: Debt,
    months: int = 12,
) -> GrowthProjection:
    """Project how a debt grows over time with interest only (no payments).

    Shows the balance increase month-over-month from interest accrual alone.
    """
    frequency = debt.compounding_frequency or CompoundingFrequency.MONTHLY
    monthly_rate = _effective_monthly_rate(float(debt.interest_rate), frequency)
    balance = float(debt.current_balance)
    schedule: list[GrowthRow] = []
    total_interest = 0.0

    for month in range(1, months + 1):
        interest = round(balance * monthly_rate, 2)
        balance = round(balance + interest, 2)
        total_interest += interest
        schedule.append(GrowthRow(
            month=month,
            interest_accrued=interest,
            balance=balance,
        ))

    return GrowthProjection(
        debt_id=debt.id,
        principal_amount=float(debt.principal_amount),
        interest_rate=float(debt.interest_rate),
        compounding_frequency=frequency,
        schedule=schedule,
        total_interest_accrued=round(total_interest, 2),
        final_balance=balance,
    )


def _simulate_snowball(
    debts: list[Debt],
    extra_monthly: float,
    start_date: date,
) -> list[PayoffProjection]:
    """Simulate month-by-month snowball payoff across all debts.

    Each month: pay minimums on all debts, then apply any extra to the
    highest-priority (lowest priority_order) debt with a remaining balance.
    When a debt is paid off, its freed minimum rolls into extra for the next.

    Payments are interest-first: each payment covers accrued interest before
    reducing principal.
    """
    sorted_debts = sorted(debts, key=lambda d: d.priority_order)
    balances = [float(d.current_balance) for d in sorted_debts]
    rates = [
        _effective_monthly_rate(
            float(d.interest_rate),
            d.compounding_frequency or CompoundingFrequency.MONTHLY,
        )
        for d in sorted_debts
    ]
    minimums = [float(d.minimum_payment) for d in sorted_debts]
    schedules: list[list[AmortizationRow]] = [[] for _ in sorted_debts]
    month = 0

    while any(b > 0.01 for b in balances) and month < 600:
        month += 1
        interests = [round(balances[i] * rates[i], 2) if balances[i] > 0.01 else 0.0 for i in range(len(sorted_debts))]

        payments = [0.0] * len(sorted_debts)
        for i in range(len(sorted_debts)):
            if balances[i] <= 0.01:
                continue
            payment = min(minimums[i], balances[i] + interests[i])
            payments[i] = payment

        remaining_extra = extra_monthly
        for i in range(len(sorted_debts)):
            if balances[i] <= 0.01:
                remaining_extra += minimums[i]
                continue
            if remaining_extra <= 0:
                break
            can_apply = balances[i] + interests[i] - payments[i]
            apply = min(remaining_extra, can_apply)
            payments[i] += apply
            remaining_extra -= apply
            break

        for i in range(len(sorted_debts)):
            if balances[i] <= 0.01 and payments[i] == 0:
                continue
            principal = round(payments[i] - interests[i], 2)
            balances[i] = round(balances[i] - principal, 2)
            if balances[i] < 0:
                balances[i] = 0.0
            schedules[i].append(AmortizationRow(
                month=month,
                payment=round(payments[i], 2),
                principal=principal,
                interest=interests[i],
                balance=balances[i],
            ))

    projections = []
    for i, debt in enumerate(sorted_debts):
        schedule = schedules[i]
        total_interest = sum(r.interest for r in schedule)
        total_paid = sum(r.payment for r in schedule)
        months_count = len(schedule)
        payoff_date = start_date + relativedelta(months=months_count)
        projections.append(PayoffProjection(
            debt_id=debt.id,
            months_to_payoff=months_count,
            total_interest=round(total_interest, 2),
            total_paid=round(total_paid, 2),
            payoff_date=payoff_date,
            schedule=schedule,
        ))

    return projections


def calculate_payoff_summary(
    debts: list[Debt],
    extra_monthly: float,
    start_date: date,
) -> PayoffSummary:
    """Calculate payoff projections for all debts using snowball strategy."""
    min_only_projections = [project_payoff(d, 0.0, start_date) for d in debts]
    min_only_interest = sum(p.total_interest for p in min_only_projections)

    projections = _simulate_snowball(debts, extra_monthly, start_date)

    total_debt = sum(float(d.current_balance) for d in debts)
    total_interest = sum(p.total_interest for p in projections)
    debt_free_date = max(p.payoff_date for p in projections) if projections else start_date
    interest_saved = round(min_only_interest - total_interest, 2)

    return PayoffSummary(
        projections=projections,
        total_debt=round(total_debt, 2),
        total_interest=round(total_interest, 2),
        debt_free_date=debt_free_date,
        interest_saved_vs_minimum=interest_saved,
    )


def calculate_group_summary(debts: list[Debt]) -> DebtGroupSummary:
    """Calculate grouped summary with weighted average interest rate."""
    total_principal = sum(float(d.principal_amount) for d in debts)
    total_balance = sum(float(d.current_balance) for d in debts)
    total_minimum = sum(float(d.minimum_payment) for d in debts)

    # Weighted interest rate by current balance
    if total_balance > 0:
        weighted_rate = sum(
            float(d.interest_rate) * float(d.current_balance) for d in debts
        ) / total_balance
    else:
        weighted_rate = 0.0

    return DebtGroupSummary(
        debt_ids=[d.id for d in debts],
        total_principal=round(total_principal, 2),
        total_current_balance=round(total_balance, 2),
        weighted_interest_rate=round(weighted_rate, 4),
        total_minimum_payment=round(total_minimum, 2),
        debt_count=len(debts),
    )
