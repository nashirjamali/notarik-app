import re
from calendar import monthrange
from dataclasses import dataclass
from datetime import date, timedelta

MONTH_NAMES = {
    "january": 1, "januari": 1, "february": 2, "februari": 2, "march": 3, "maret": 3,
    "april": 4, "may": 5, "mei": 5, "june": 6, "juni": 6, "july": 7, "juli": 7,
    "august": 8, "agustus": 8, "september": 9, "october": 10, "oktober": 10,
    "november": 11, "december": 12, "desember": 12,
}
ENGLISH_MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


@dataclass(frozen=True)
class Period:
    start: date
    end: date  # exclusive
    label: str
    previous_start: date
    previous_end: date
    previous_label: str


def month_label(month: str) -> str:
    year, number = month.split("-")
    return f"{ENGLISH_MONTHS[int(number) - 1]} {year}"


def in_label(label: str) -> str:
    """'this week' reads as is, 'October 2026' needs an 'in'."""
    return f"in {label}" if re.match(r"^[A-Z]|^\d{4}$", label) else label


def _month_start(year: int, month: int) -> date:
    return date(year + (month - 1) // 12, (month - 1) % 12 + 1, 1)


def _month_period(year: int, month: int, label: str | None = None, previous_label: str | None = None) -> Period:
    start = _month_start(year, month)
    end = _month_start(year, month + 1)
    previous = _month_start(year, month - 1)
    return Period(
        start,
        end,
        label or f"{ENGLISH_MONTHS[start.month - 1]} {start.year}",
        previous,
        start,
        previous_label or f"{ENGLISH_MONTHS[previous.month - 1]} {previous.year}",
    )


def _week_period(today: date, offset: int, label: str, previous_label: str) -> Period:
    monday = today - timedelta(days=today.weekday()) + timedelta(weeks=offset)
    return Period(monday, monday + timedelta(days=7), label, monday - timedelta(days=7), monday, previous_label)


def _day_period(day: date, label: str, previous_label: str) -> Period:
    return Period(day, day + timedelta(days=1), label, day - timedelta(days=1), day, previous_label)


def resolve_period(message: str, today: date) -> Period:
    """What 'this week', 'bulan lalu' or 'October' means. With no period, this month."""
    text = " ".join(message.lower().split())
    if re.search(r"\b(today|hari ini)\b", text):
        return _day_period(today, "today", "yesterday")
    if re.search(r"\b(yesterday|kemarin)\b", text):
        return _day_period(today - timedelta(days=1), "yesterday", "the day before")
    if re.search(r"\b(last week|minggu lalu|pekan lalu|minggu kemarin)\b", text):
        return _week_period(today, -1, "last week", "the week before")
    if re.search(r"\b(this week|minggu ini|pekan ini)\b", text):
        return _week_period(today, 0, "this week", "last week")
    if re.search(r"\b(last month|bulan lalu|bulan kemarin)\b", text):
        return _month_period(today.year, today.month - 1, "last month", "the month before")
    if re.search(r"\b(this month|bulan ini)\b", text):
        return _month_period(today.year, today.month, "this month", "last month")
    explicit = re.search(r"\b(20\d{2})-(0[1-9]|1[0-2])\b", text)
    if explicit:
        return _month_period(int(explicit.group(1)), int(explicit.group(2)))
    named = next((number for name, number in MONTH_NAMES.items() if re.search(rf"\b{name}\b", text)), None)
    if named:
        year_match = re.search(r"\b(20\d{2})\b", text)
        return _month_period(int(year_match.group(1)) if year_match else today.year, named)
    year_only = re.search(r"\b(20\d{2})\b", text)
    if year_only:
        year = int(year_only.group(1))
        return Period(date(year, 1, 1), date(year + 1, 1, 1), str(year), date(year - 1, 1, 1), date(year, 1, 1), str(year - 1))
    return _month_period(today.year, today.month, "this month", "last month")


def days_in_month(year: int, month: int) -> int:
    return monthrange(year, month)[1]
