import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from api.models.account import Account, AccountType
from api.models.debt import CompoundingFrequency, Debt
from api.schemas.account import AccountCreate


async def create_account_with_debt(
    db: AsyncSession,
    data: AccountCreate,
    user_id: uuid.UUID,
) -> Account:
    """Create an account, and a linked Debt record if the account type requires one.

    For CREDIT and LOAN account types a companion Debt row is created in the same
    database transaction using flush-before-commit so both share the same commit.

    Args:
        db: Async database session.
        data: Validated account creation payload.
        user_id: Owner's user id to attach to both the account and any debt.

    Returns:
        The newly created and refreshed Account instance.
    """
    account_data = data.model_dump(exclude={"minimum_payment", "compounding_frequency"})
    account = Account(**account_data, user_id=user_id)
    db.add(account)

    if data.type in (AccountType.CREDIT, AccountType.LOAN):
        # Flush to generate account.id without committing so the debt FK resolves
        await db.flush()
        debt = Debt(
            account_id=account.id,
            user_id=user_id,
            principal_amount=abs(data.balance) if data.balance else 0,
            current_balance=abs(data.balance) if data.balance else 0,
            interest_rate=data.interest_rate or 0,
            minimum_payment=data.minimum_payment or 0,
            compounding_frequency=(
                CompoundingFrequency(data.compounding_frequency)
                if data.compounding_frequency
                else CompoundingFrequency.MONTHLY
            ),
        )
        db.add(debt)

    await db.commit()
    await db.refresh(account)
    return account
