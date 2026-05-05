from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from api.schemas.csv_import import CategoryMappingEntryDict


@dataclass(frozen=True)
class CategoryMatch:
    resolved_name: str | None
    method: Literal["exact", "institution", "unmatched"]
    confidence: float | None


def resolve_category(
    category_name: str | None,
    category_names: list[str],
    institution_entries: list[CategoryMappingEntryDict],
) -> CategoryMatch:
    """Resolve a CSV category name to an app category via exact or institution match.

    Resolution order:
    1. Exact match (case-insensitive) against category_names
    2. Institution mapping lookup (source -> target)
    3. Unmatched — caller should forward to LLM classification

    Args:
        category_name: Raw category string from the CSV row.
        category_names: List of known app category names.
        institution_entries: Institution-specific source-to-target mappings.

    Returns:
        CategoryMatch with resolved name, method used, and optional confidence score.
    """
    if not category_name or not category_name.strip():
        return CategoryMatch(resolved_name=None, method="unmatched", confidence=None)

    name = category_name.strip()
    name_lower = name.lower()

    cat_lookup = {c.lower(): c for c in category_names}

    # 1. Exact match
    if name_lower in cat_lookup:
        return CategoryMatch(resolved_name=cat_lookup[name_lower], method="exact", confidence=1.0)

    # 2. Institution mapping
    for entry in institution_entries:
        if entry["source"].lower() == name_lower and entry["target"].lower() in cat_lookup:
            return CategoryMatch(resolved_name=cat_lookup[entry["target"].lower()], method="institution", confidence=1.0)

    return CategoryMatch(resolved_name=None, method="unmatched", confidence=None)
