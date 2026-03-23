import io
from datetime import date, datetime

import pandas as pd


class CSVParseError(Exception):
    pass


def parse_csv(
    file_content: bytes,
    column_mapping: dict,
    date_format: str = "%m/%d/%Y",
) -> list[dict]:
    """Parse a CSV file using the provided column mapping.

    column_mapping maps our field names to CSV column names:
        {"date": "Transaction Date", "description": "Description", "amount": "Amount"}

    Returns list of dicts with keys: date, description, amount (and optionally category).
    """
    try:
        df = pd.read_csv(io.BytesIO(file_content))
    except Exception as e:
        raise CSVParseError(f"Failed to read CSV: {e}") from e

    # Validate required columns exist
    required_fields = ["date", "description", "amount"]
    for field in required_fields:
        csv_col = column_mapping.get(field)
        if csv_col is None:
            raise CSVParseError(f"Missing mapping for required field: {field}")
        if csv_col not in df.columns:
            raise CSVParseError(f"Column '{csv_col}' not found in CSV. Available: {list(df.columns)}")

    rows: list[dict] = []
    for _, row in df.iterrows():
        try:
            raw_date = str(row[column_mapping["date"]]).strip()
            parsed_date = datetime.strptime(raw_date, date_format).date()
        except ValueError:
            raise CSVParseError(f"Invalid date '{raw_date}' for format '{date_format}'")

        try:
            raw_amount = str(row[column_mapping["amount"]]).strip()
            # Handle common formats: "$1,234.56", "(1234.56)", "-1234.56"
            cleaned = raw_amount.replace("$", "").replace(",", "")
            if cleaned.startswith("(") and cleaned.endswith(")"):
                cleaned = "-" + cleaned[1:-1]
            amount = float(cleaned)
        except ValueError:
            raise CSVParseError(f"Invalid amount '{raw_amount}'")

        description = str(row[column_mapping["description"]]).strip()

        entry: dict = {
            "date": parsed_date.isoformat(),
            "description": description,
            "amount": amount,
        }

        # Optional category column
        if "category" in column_mapping and column_mapping["category"] in df.columns:
            entry["category_name"] = str(row[column_mapping["category"]]).strip()

        rows.append(entry)

    return rows


def detect_columns(file_content: bytes) -> list[str]:
    """Return the column headers from a CSV file."""
    try:
        df = pd.read_csv(io.BytesIO(file_content), nrows=0)
        return list(df.columns)
    except Exception as e:
        raise CSVParseError(f"Failed to read CSV headers: {e}") from e


def find_duplicates(
    parsed_rows: list[dict],
    existing_transactions: list[dict],
) -> list[int]:
    """Return indices of parsed_rows that appear to be duplicates."""
    existing_set = {
        (t["date"], t["amount"], t["description"])
        for t in existing_transactions
    }
    duplicates = []
    for i, row in enumerate(parsed_rows):
        key = (row["date"], row["amount"], row["description"])
        if key in existing_set:
            duplicates.append(i)
    return duplicates
