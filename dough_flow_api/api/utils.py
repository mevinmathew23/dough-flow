from datetime import date


def first_of_next_month(d: date) -> date:
    """Return the first day of the month following the given date.

    Args:
        d: Any date whose month should be advanced by one.

    Returns:
        A date representing the first day of the next calendar month.
    """
    if d.month == 12:
        return date(d.year + 1, 1, 1)
    return date(d.year, d.month + 1, 1)
