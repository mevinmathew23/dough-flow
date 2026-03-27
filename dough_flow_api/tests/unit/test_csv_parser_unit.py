"""Unit tests for csv_parser service functions.

These tests exercise parse_csv, detect_columns, and find_duplicates directly,
without touching the database or HTTP layer.
"""

import pytest

from api.schemas.csv_import import ExistingTransaction, ParsedCSVRow
from api.services.csv_parser import CSVParseError, detect_columns, find_duplicates, parse_csv

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_COLUMN_MAPPING = {
    "date": "Date",
    "description": "Description",
    "amount": "Amount",
}


def _csv_bytes(*rows: str, header: str = "Date,Description,Amount") -> bytes:
    """Build CSV bytes from a header and data rows.

    Args:
        *rows: Data row strings (no newline required).
        header: CSV header line.

    Returns:
        UTF-8 encoded CSV bytes.
    """
    lines = [header] + list(rows)
    return "\n".join(lines).encode("utf-8")


# ---------------------------------------------------------------------------
# parse_csv — happy path
# ---------------------------------------------------------------------------


def test_parse_csv_basic() -> None:
    """Basic CSV with one row should produce one ParsedCSVRow."""
    content = _csv_bytes("01/15/2026,Grocery Store,-50.00")
    rows = parse_csv(content, _COLUMN_MAPPING)
    assert len(rows) == 1
    assert rows[0].date == "2026-01-15"
    assert rows[0].description == "Grocery Store"
    assert rows[0].amount == -50.0


def test_parse_csv_multiple_rows() -> None:
    """Multiple data rows should all be parsed."""
    content = _csv_bytes(
        "01/01/2026,Salary,3000.00",
        "01/05/2026,Rent,-1200.00",
        "01/10/2026,Coffee,-4.50",
    )
    rows = parse_csv(content, _COLUMN_MAPPING)
    assert len(rows) == 3
    assert rows[0].amount == 3000.0
    assert rows[1].amount == -1200.0
    assert rows[2].amount == -4.50


def test_parse_csv_dollar_sign_and_commas() -> None:
    """Amounts with dollar signs and thousands separators should be handled."""
    # The amount must be quoted in the CSV to avoid pandas treating the comma as a separator
    content = _csv_bytes('01/15/2026,Big Purchase,"-$1,234.56"')
    rows = parse_csv(content, _COLUMN_MAPPING)
    assert rows[0].amount == -1234.56


def test_parse_csv_parenthetical_negative() -> None:
    """Amounts in parentheses should be treated as negative."""
    content = _csv_bytes("01/15/2026,Refund,(99.99)")
    rows = parse_csv(content, _COLUMN_MAPPING)
    assert rows[0].amount == -99.99


def test_parse_csv_with_category_column() -> None:
    """When a category mapping is present it should be captured on each row."""
    content = _csv_bytes(
        "01/15/2026,Grocery Store,-50.00,Food",
        header="Date,Description,Amount,Category",
    )
    mapping = dict(_COLUMN_MAPPING)
    mapping["category"] = "Category"
    rows = parse_csv(content, mapping)
    assert rows[0].category_name == "Food"


def test_parse_csv_category_column_missing_in_mapping() -> None:
    """When no category mapping is provided category_name should be None."""
    content = _csv_bytes("01/15/2026,Store,-20.00")
    rows = parse_csv(content, _COLUMN_MAPPING)
    assert rows[0].category_name is None


# ---------------------------------------------------------------------------
# parse_csv — error cases
# ---------------------------------------------------------------------------


def test_parse_csv_missing_date_mapping() -> None:
    """Missing required field mapping should raise CSVParseError."""
    with pytest.raises(CSVParseError, match="Missing mapping for required field: date"):
        parse_csv(_csv_bytes("01/01/2026,Store,-10.00"), {"description": "Description", "amount": "Amount"})


def test_parse_csv_column_not_in_file() -> None:
    """Mapping to a column name not present in the CSV should raise CSVParseError."""
    mapping = {"date": "TxnDate", "description": "Description", "amount": "Amount"}
    with pytest.raises(CSVParseError, match="Column 'TxnDate' not found"):
        parse_csv(_csv_bytes("01/01/2026,Store,-10.00"), mapping)


def test_parse_csv_invalid_date() -> None:
    """A date that does not match the format should raise CSVParseError."""
    content = _csv_bytes("2026-01-15,Store,-10.00")  # Default format is %m/%d/%Y
    with pytest.raises(CSVParseError, match="Invalid date"):
        parse_csv(content, _COLUMN_MAPPING)


def test_parse_csv_invalid_amount() -> None:
    """A non-numeric amount should raise CSVParseError."""
    content = _csv_bytes("01/15/2026,Store,not-a-number")
    with pytest.raises(CSVParseError, match="Invalid amount"):
        parse_csv(content, _COLUMN_MAPPING)


# ---------------------------------------------------------------------------
# detect_columns
# ---------------------------------------------------------------------------


def test_detect_columns_returns_header_names() -> None:
    """detect_columns should return the exact column names from the CSV header."""
    content = _csv_bytes("01/01/2026,Test,-1.00")
    cols = detect_columns(content)
    assert cols == ["Date", "Description", "Amount"]


def test_detect_columns_empty_csv_returns_empty_list() -> None:
    """A CSV with only a header and no rows should still return the column names."""
    content = "Date,Description,Amount\n".encode("utf-8")
    cols = detect_columns(content)
    assert cols == ["Date", "Description", "Amount"]


def test_detect_columns_returns_all_header_names() -> None:
    """detect_columns should return every column name including extra ones."""
    content = _csv_bytes(
        "01/01/2026,Test,-1.00,Food",
        header="Date,Description,Amount,Category",
    )
    cols = detect_columns(content)
    assert cols == ["Date", "Description", "Amount", "Category"]


# ---------------------------------------------------------------------------
# find_duplicates
# ---------------------------------------------------------------------------


def test_find_duplicates_no_duplicates() -> None:
    """When there are no existing transactions that match, no indices are returned."""
    parsed = [
        ParsedCSVRow(date="2026-01-15", description="Store", amount=-50.0),
    ]
    existing: list[ExistingTransaction] = []
    assert find_duplicates(parsed, existing) == []


def test_find_duplicates_exact_match() -> None:
    """An exact match on (date, amount, description) should be flagged as duplicate."""
    parsed = [
        ParsedCSVRow(date="2026-01-15", description="Store", amount=-50.0),
        ParsedCSVRow(date="2026-01-16", description="Coffee", amount=-4.50),
    ]
    existing = [
        ExistingTransaction(date="2026-01-15", amount=-50.0, description="Store"),
    ]
    dupes = find_duplicates(parsed, existing)
    assert dupes == [0]


def test_find_duplicates_multiple_dupes() -> None:
    """Multiple duplicate rows should all appear in the returned indices."""
    parsed = [
        ParsedCSVRow(date="2026-01-15", description="Store", amount=-50.0),
        ParsedCSVRow(date="2026-01-16", description="Coffee", amount=-4.50),
        ParsedCSVRow(date="2026-01-17", description="New", amount=-10.0),
    ]
    existing = [
        ExistingTransaction(date="2026-01-15", amount=-50.0, description="Store"),
        ExistingTransaction(date="2026-01-16", amount=-4.50, description="Coffee"),
    ]
    dupes = find_duplicates(parsed, existing)
    assert dupes == [0, 1]


def test_find_duplicates_partial_match_not_flagged() -> None:
    """A partial match (same date and amount, different description) is not a duplicate."""
    parsed = [
        ParsedCSVRow(date="2026-01-15", description="Different Store", amount=-50.0),
    ]
    existing = [
        ExistingTransaction(date="2026-01-15", amount=-50.0, description="Store"),
    ]
    assert find_duplicates(parsed, existing) == []
