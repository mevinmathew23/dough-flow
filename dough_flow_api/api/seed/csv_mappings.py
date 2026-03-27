from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.csv_mapping import CSVMapping
from api.seed.institution_data import INSTITUTION_MAPPINGS


async def seed_default_csv_mappings(db: AsyncSession) -> None:
    result = await db.execute(select(CSVMapping).where(CSVMapping.is_default.is_(True)).limit(1))
    if result.scalar_one_or_none() is not None:
        return

    for inst in INSTITUTION_MAPPINGS:
        mapping = CSVMapping(
            institution_name=inst["institution_name"],
            column_mapping=inst["column_mapping"],
            date_format=inst.get("date_format", "%m/%d/%Y"),
            category_mapping=inst.get("category_mapping"),
            is_default=True,
            user_id=None,
        )
        db.add(mapping)
    await db.commit()
