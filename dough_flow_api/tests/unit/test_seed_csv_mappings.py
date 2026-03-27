from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.csv_mapping import CSVMapping
from api.seed_csv_mappings import INSTITUTION_MAPPINGS, seed_default_csv_mappings


async def test_seed_creates_default_mappings(db_session: AsyncSession):
    await seed_default_csv_mappings(db_session)
    result = await db_session.execute(select(CSVMapping).where(CSVMapping.is_default.is_(True)))
    mappings = result.scalars().all()
    assert len(mappings) == len(INSTITUTION_MAPPINGS)
    for m in mappings:
        assert m.user_id is None
        assert m.is_default is True


async def test_seed_is_idempotent(db_session: AsyncSession):
    await seed_default_csv_mappings(db_session)
    await seed_default_csv_mappings(db_session)
    result = await db_session.execute(select(CSVMapping).where(CSVMapping.is_default.is_(True)))
    mappings = result.scalars().all()
    assert len(mappings) == len(INSTITUTION_MAPPINGS)


async def test_institution_mappings_have_required_fields():
    for inst in INSTITUTION_MAPPINGS:
        assert "institution_name" in inst
        assert "column_mapping" in inst
        assert "date" in inst["column_mapping"]
        assert "description" in inst["column_mapping"]
        assert "amount" in inst["column_mapping"]
