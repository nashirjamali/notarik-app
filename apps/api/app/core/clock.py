from datetime import date, datetime
from zoneinfo import ZoneInfo

JAKARTA = ZoneInfo("Asia/Jakarta")


def today_jakarta() -> date:
    """The calendar date in Asia/Jakarta, so a late night is not tomorrow on a UTC server."""
    return datetime.now(JAKARTA).date()
