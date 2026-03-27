from api.services.category_resolver import CategoryMatch, resolve_category


def test_exact_match():
    categories = ["Food & Groceries", "Healthcare", "Travel"]
    result = resolve_category("Food & Groceries", categories, institution_entries=[])
    assert result == CategoryMatch(resolved_name="Food & Groceries", method="exact", confidence=1.0)


def test_exact_match_case_insensitive():
    categories = ["Food & Groceries", "Healthcare", "Travel"]
    result = resolve_category("food & groceries", categories, institution_entries=[])
    assert result == CategoryMatch(resolved_name="Food & Groceries", method="exact", confidence=1.0)


def test_institution_mapping_match():
    categories = ["Food & Groceries", "Healthcare", "Travel"]
    entries = [{"source": "Food & Drink", "target": "Food & Groceries"}]
    result = resolve_category("Food & Drink", categories, institution_entries=entries)
    assert result == CategoryMatch(resolved_name="Food & Groceries", method="institution", confidence=1.0)


def test_institution_mapping_case_insensitive():
    categories = ["Healthcare"]
    entries = [{"source": "Health & Wellness", "target": "Healthcare"}]
    result = resolve_category("health & wellness", categories, institution_entries=entries)
    assert result == CategoryMatch(resolved_name="Healthcare", method="institution", confidence=1.0)


def test_fuzzy_match_above_threshold():
    categories = ["Food & Groceries", "Healthcare", "Transportation"]
    result = resolve_category("Groceries", categories, institution_entries=[])
    assert result.method == "fuzzy"
    assert result.resolved_name == "Food & Groceries"
    assert result.confidence >= 0.70


def test_fuzzy_match_below_threshold_returns_unmatched():
    categories = ["Food & Groceries", "Healthcare", "Transportation"]
    result = resolve_category("xyzabc123", categories, institution_entries=[])
    assert result == CategoryMatch(resolved_name=None, method="unmatched", confidence=None)


def test_institution_mapping_takes_priority_over_fuzzy():
    categories = ["Dining Out", "Food & Groceries"]
    entries = [{"source": "Restaurant", "target": "Dining Out"}]
    result = resolve_category("Restaurant", categories, institution_entries=entries)
    assert result.method == "institution"
    assert result.resolved_name == "Dining Out"


def test_empty_category_name_returns_unmatched():
    categories = ["Food & Groceries"]
    result = resolve_category("", categories, institution_entries=[])
    assert result == CategoryMatch(resolved_name=None, method="unmatched", confidence=None)


def test_none_category_name_returns_unmatched():
    result = resolve_category(None, ["Food & Groceries"], institution_entries=[])
    assert result == CategoryMatch(resolved_name=None, method="unmatched", confidence=None)


def test_institution_target_not_in_categories_skipped():
    categories = ["Healthcare"]
    entries = [{"source": "Food & Drink", "target": "Nonexistent Category"}]
    result = resolve_category("Food & Drink", categories, institution_entries=entries)
    assert result.method in ("fuzzy", "unmatched")
