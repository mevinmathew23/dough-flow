from typing import NotRequired, TypedDict

from api.services.category_resolver import CategoryMappingDict


class InstitutionMappingDict(TypedDict):
    institution_name: str
    column_mapping: dict[str, str]
    date_format: str
    category_mapping: NotRequired[CategoryMappingDict | None]


INSTITUTION_MAPPINGS: list[InstitutionMappingDict] = [
    {
        "institution_name": "Chase Credit Card",
        "column_mapping": {
            "date": "Transaction Date",
            "description": "Description",
            "amount": "Amount",
            "category": "Category",
        },
        "date_format": "%m/%d/%Y",
        "category_mapping": {
            "entries": [
                {"source": "Food & Drink", "target": "Dining Out"},
                {"source": "Groceries", "target": "Food & Groceries"},
                {"source": "Health & Wellness", "target": "Healthcare"},
                {"source": "Shopping", "target": "Clothing"},
                {"source": "Travel", "target": "Travel"},
                {"source": "Gas", "target": "Transportation"},
                {"source": "Bills & Utilities", "target": "Utilities"},
                {"source": "Entertainment", "target": "Entertainment"},
                {"source": "Home", "target": "Home Maintenance"},
                {"source": "Personal", "target": "Personal Care"},
                {"source": "Education", "target": "Education"},
                {"source": "Gifts & Donations", "target": "Gifts & Donations"},
                {"source": "Fees & Adjustments", "target": "Fees & Charges"},
                {"source": "Professional Services", "target": "Other Expense"},
            ],
        },
    },
    {
        "institution_name": "Chase Checking",
        "column_mapping": {
            "date": "Posting Date",
            "description": "Description",
            "amount": "Amount",
        },
        "date_format": "%m/%d/%Y",
        "category_mapping": None,
    },
    {
        "institution_name": "Bank of America Credit Card",
        "column_mapping": {
            "date": "Posted Date",
            "description": "Payee",
            "amount": "Amount",
        },
        "date_format": "%m/%d/%Y",
        "category_mapping": None,
    },
    {
        "institution_name": "Bank of America Checking",
        "column_mapping": {
            "date": "Date",
            "description": "Description",
            "amount": "Amount",
        },
        "date_format": "%m/%d/%Y",
        "category_mapping": None,
    },
    {
        "institution_name": "American Express",
        "column_mapping": {
            "date": "Date",
            "description": "Description",
            "amount": "Amount",
            "category": "Category",
        },
        "date_format": "%m/%d/%Y",
        "category_mapping": {
            "entries": [
                {"source": "Merchandise & Supplies-Groceries", "target": "Food & Groceries"},
                {"source": "Restaurant-Restaurant", "target": "Dining Out"},
                {"source": "Transportation-Fuel", "target": "Transportation"},
                {"source": "Travel-Airline", "target": "Travel"},
                {"source": "Travel-Lodging", "target": "Travel"},
                {"source": "Travel-Other", "target": "Travel"},
                {"source": "Entertainment-General", "target": "Entertainment"},
                {"source": "Merchandise & Supplies-General Merchandise", "target": "Clothing"},
                {"source": "Healthcare-Healthcare", "target": "Healthcare"},
                {"source": "Fees & Adjustments-Fees & Adjustments", "target": "Fees & Charges"},
                {"source": "Business Services-Insurance", "target": "Insurance"},
                {"source": "Communications-Cable & Streaming", "target": "Subscriptions"},
                {"source": "Education-Education", "target": "Education"},
            ],
        },
    },
    {
        "institution_name": "Wells Fargo",
        "column_mapping": {
            "date": "Date",
            "description": "Description",
            "amount": "Amount",
        },
        "date_format": "%m/%d/%Y",
        "category_mapping": None,
    },
    {
        "institution_name": "Capital One Credit Card",
        "column_mapping": {
            "date": "Transaction Date",
            "description": "Description",
            "amount": "Debit",
            "category": "Category",
        },
        "date_format": "%Y-%m-%d",
        "category_mapping": {
            "entries": [
                {"source": "Dining", "target": "Dining Out"},
                {"source": "Groceries", "target": "Food & Groceries"},
                {"source": "Gas/Automotive", "target": "Transportation"},
                {"source": "Entertainment", "target": "Entertainment"},
                {"source": "Shopping", "target": "Clothing"},
                {"source": "Health/Medical", "target": "Healthcare"},
                {"source": "Travel", "target": "Travel"},
                {"source": "Bills/Utilities", "target": "Utilities"},
                {"source": "Education", "target": "Education"},
                {"source": "Personal Care", "target": "Personal Care"},
                {"source": "Fees/Adjustments", "target": "Fees & Charges"},
                {"source": "Home", "target": "Home Maintenance"},
            ],
        },
    },
    {
        "institution_name": "Capital One Checking",
        "column_mapping": {
            "date": "Transaction Date",
            "description": "Transaction Description",
            "amount": "Transaction Amount",
        },
        "date_format": "%Y-%m-%d",
        "category_mapping": None,
    },
    {
        "institution_name": "Citi Credit Card",
        "column_mapping": {
            "date": "Date",
            "description": "Description",
            "amount": "Debit",
        },
        "date_format": "%m/%d/%Y",
        "category_mapping": None,
    },
    {
        "institution_name": "Discover",
        "column_mapping": {
            "date": "Trans. Date",
            "description": "Description",
            "amount": "Amount",
            "category": "Category",
        },
        "date_format": "%m/%d/%Y",
        "category_mapping": {
            "entries": [
                {"source": "Restaurants", "target": "Dining Out"},
                {"source": "Supermarkets", "target": "Food & Groceries"},
                {"source": "Gasoline", "target": "Transportation"},
                {"source": "Travel/ Entertainment", "target": "Travel"},
                {"source": "Merchandise", "target": "Clothing"},
                {"source": "Services", "target": "Other Expense"},
                {"source": "Medical Services", "target": "Healthcare"},
                {"source": "Education", "target": "Education"},
            ],
        },
    },
    {
        "institution_name": "Apple Card",
        "column_mapping": {
            "date": "Transaction Date",
            "description": "Description",
            "amount": "Amount (USD)",
            "category": "Category",
        },
        "date_format": "%m/%d/%Y",
        "category_mapping": {
            "entries": [
                {"source": "Food & Drink", "target": "Dining Out"},
                {"source": "Shopping", "target": "Clothing"},
                {"source": "Transportation", "target": "Transportation"},
                {"source": "Entertainment", "target": "Entertainment"},
                {"source": "Health & Fitness", "target": "Healthcare"},
                {"source": "Travel", "target": "Travel"},
                {"source": "Home", "target": "Home Maintenance"},
                {"source": "Education", "target": "Education"},
                {"source": "Personal Care", "target": "Personal Care"},
                {"source": "Groceries", "target": "Food & Groceries"},
            ],
        },
    },
    {
        "institution_name": "US Bank",
        "column_mapping": {
            "date": "Date",
            "description": "Name",
            "amount": "Amount",
        },
        "date_format": "%Y-%m-%d",
        "category_mapping": None,
    },
    {
        "institution_name": "PNC",
        "column_mapping": {
            "date": "Date",
            "description": "Description",
            "amount": "Amount",
        },
        "date_format": "%m/%d/%Y",
        "category_mapping": None,
    },
    {
        "institution_name": "TD Bank",
        "column_mapping": {
            "date": "Date",
            "description": "Description",
            "amount": "Amount",
        },
        "date_format": "%m/%d/%Y",
        "category_mapping": None,
    },
    {
        "institution_name": "Ally Bank",
        "column_mapping": {
            "date": "Date",
            "description": "Description",
            "amount": "Amount",
        },
        "date_format": "%Y-%m-%d",
        "category_mapping": None,
    },
    {
        "institution_name": "Marcus (Goldman Sachs)",
        "column_mapping": {
            "date": "Date",
            "description": "Description",
            "amount": "Amount",
        },
        "date_format": "%m/%d/%Y",
        "category_mapping": None,
    },
    {
        "institution_name": "Navy Federal",
        "column_mapping": {
            "date": "Date",
            "description": "Description",
            "amount": "Amount",
        },
        "date_format": "%m/%d/%Y",
        "category_mapping": None,
    },
    {
        "institution_name": "USAA",
        "column_mapping": {
            "date": "Date",
            "description": "Description",
            "amount": "Amount",
        },
        "date_format": "%m/%d/%Y",
        "category_mapping": None,
    },
]
