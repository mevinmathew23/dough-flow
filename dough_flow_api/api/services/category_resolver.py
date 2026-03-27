from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, TypedDict

from rapidfuzz import fuzz


class CategoryMappingEntryDict(TypedDict):
    source: str
    target: str

FUZZY_THRESHOLD = 70.0


@dataclass(frozen=True)
class CategoryMatch:
    resolved_name: str | None
    method: Literal["exact", "institution", "fuzzy", "unmatched"]
    confidence: float | None


def resolve_category(
    category_name: str | None,
    category_names: list[str],
    institution_entries: list[CategoryMappingEntryDict],
) -> CategoryMatch:
    """Resolve a CSV category name to an app category.

    Resolution order:
    1. Exact match (case-insensitive) against category_names
    2. Institution mapping lookup (source -> target)
    3. Fuzzy match via rapidfuzz (>= 70% threshold)
    4. Unmatched
    """
    if not category_name or not category_name.strip():
        return CategoryMatch(resolved_name=None, method="unmatched", confidence=None)

    name = category_name.strip()
    name_lower = name.lower()

    # Build case-insensitive lookup: lowercase -> original name
    cat_lookup = {c.lower(): c for c in category_names}

    # 1. Exact match
    if name_lower in cat_lookup:
        return CategoryMatch(resolved_name=cat_lookup[name_lower], method="exact", confidence=1.0)

    # 2. Institution mapping
    for entry in institution_entries:
        source = entry["source"]
        target = entry["target"]
        if source.lower() == name_lower and target.lower() in cat_lookup:
            return CategoryMatch(resolved_name=cat_lookup[target.lower()], method="institution", confidence=1.0)

    # 3. Fuzzy match
    best_score = 0.0
    best_match: str | None = None
    for cat_name in category_names:
        score = fuzz.ratio(name_lower, cat_name.lower())
        if score > best_score:
            best_score = score
            best_match = cat_name

    if best_score >= FUZZY_THRESHOLD and best_match is not None:
        return CategoryMatch(resolved_name=best_match, method="fuzzy", confidence=round(best_score / 100.0, 2))

    # 4. Unmatched
    return CategoryMatch(resolved_name=None, method="unmatched", confidence=None)
