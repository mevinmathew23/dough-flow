from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.category import Category, CategoryType

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
    result = await db.execute(select(Category).where(Category.is_default.is_(True)).limit(1))
    if result.scalar_one_or_none() is not None:
        return

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
