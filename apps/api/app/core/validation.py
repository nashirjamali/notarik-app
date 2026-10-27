import re
from datetime import date

from fastapi import HTTPException

_MONTH = re.compile(r"(\d{4})-(0[1-9]|1[0-2])")


def parse_month(value: str) -> date:
    """'2026-10' as the first day of that month. Anything else is a 422."""
    match = _MONTH.fullmatch(value)
    if match is None:
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "month must be YYYY-MM"},
        )
    return date(int(match.group(1)), int(match.group(2)), 1)
