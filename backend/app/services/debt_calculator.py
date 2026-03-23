from datetime import date

from dateutil.relativedelta import relativedelta

from app.models.debt import Debt
from app.schemas.debt import AmortizationRow, PayoffProjection, PayoffSummary


def calculate_amortization(
    balance: float,
    annual_rate: float,
    monthly_payment: float,
    start_date: date,
) -> list[AmortizationRow]:
    """Generate month-by-month amortization schedule for a single debt."""
    schedule: list[AmortizationRow] = []
    remaining = balance
    monthly_rate = annual_rate / 12
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
    schedule = calculate_amortization(
        balance=float(debt.current_balance),
        annual_rate=float(debt.interest_rate),
        monthly_payment=monthly_payment,
        start_date=start_date,
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


def _simulate_snowball(
    debts: list[Debt],
    extra_monthly: float,
    start_date: date,
) -> list[PayoffProjection]:
    """Simulate month-by-month snowball payoff across all debts."""
    sorted_debts = sorted(debts, key=lambda d: d.priority_order)
    balances = [float(d.current_balance) for d in sorted_debts]
    rates = [float(d.interest_rate) / 12 for d in sorted_debts]
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
