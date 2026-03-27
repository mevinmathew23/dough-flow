from api.seed import DEFAULT_CATEGORIES


def test_default_categories_include_new_entries():
    names = [name for name, _, _ in DEFAULT_CATEGORIES]
    assert "Travel" in names
    assert "Dining Out" in names
    assert "Pets" in names
    assert "Home Maintenance" in names
    assert "Taxes" in names
    assert "Childcare" in names
    assert "Fees & Charges" in names
    assert len(DEFAULT_CATEGORIES) == 24
