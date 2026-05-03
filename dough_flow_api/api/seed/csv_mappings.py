from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.csv_mapping import CSVMapping
from api.seed.institution_data import INSTITUTION_MAPPINGS


async def seed_default_csv_mappings(db: AsyncSession) -> None:
    for inst in INSTITUTION_MAPPINGS:
        result = await db.execute(
            select(CSVMapping).where(
                CSVMapping.institution_name == inst["institution_name"],
                CSVMapping.is_default.is_(True),
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.column_mapping = inst["column_mapping"]
            existing.date_format = inst.get("date_format", "%m/%d/%Y")
            existing.category_mapping = inst.get("category_mapping")
            existing.positive_means_expense = inst.get("positive_means_expense", False)
        else:
            db.add(
                CSVMapping(
                    institution_name=inst["institution_name"],
                    column_mapping=inst["column_mapping"],
                    date_format=inst.get("date_format", "%m/%d/%Y"),
                    category_mapping=inst.get("category_mapping"),
                    positive_means_expense=inst.get("positive_means_expense", False),
                    is_default=True,
                    user_id=None,
                )
            )
    await db.commit()
