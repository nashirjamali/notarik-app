import re
from datetime import date, timedelta

from app.ai.drafts import ExpenseDraft, ItemDraft
from app.ai.money import find_amount
from app.core.clock import today_jakarta

# Dining first: "nasi goreng 25rb gojek" is a meal even though gojek is a ride app.
CATEGORY_WORDS: list[tuple[str, tuple[str, ...]]] = [
    ("Dining", ("nasi", "makan", "minum", "kopi", "coffee", "teh", "ayam", "bakso", "mie", "warteg", "warung", "resto", "restoran", "cafe", "lunch", "dinner", "breakfast", "sarapan", "jajan", "snack", "sate", "soto", "gofood", "grabfood", "food")),
    ("Transport", ("gojek", "grab", "ojek", "taksi", "taxi", "bensin", "parkir", "tol", "bus", "kereta", "mrt", "krl", "transjakarta", "uber", "ojol")),
    ("Bills", ("listrik", "pln", "pdam", "wifi", "internet", "pulsa", "token", "tagihan", "bpjs", "cicilan", "sewa", "kos", "kontrakan")),
    ("Groceries", ("belanja", "indomaret", "alfamart", "supermarket", "sayur", "buah", "groceries", "pasar", "telur", "beras", "sembako")),
    ("Shopping", ("baju", "sepatu", "tas", "shopee", "tokopedia", "lazada", "mall", "elektronik", "celana")),
]
FOOD = CATEGORY_WORDS[0][1]

_MERCHANT = re.compile(
    r"\b(?:di|at|@)\s+([^\d\n]+?)(?=\s+(?:kemarin|yesterday|hari ini|today|tadi|barusan)\b|\s*\d|\s*$)",
    re.IGNORECASE,
)
_DATE_WORDS = re.compile(
    r"\b(kemarin|yesterday|hari ini|today|barusan|tadi\s+(?:pagi|siang|sore|malam)|tadi)\b",
    re.IGNORECASE,
)


def guess_category(text: str) -> str:
    words = set(re.findall(r"[a-z]+", text.lower()))
    for category, keywords in CATEGORY_WORDS:
        if any(keyword in words for keyword in keywords):
            return category
    return "Other"


def _title(value: str) -> str:
    return re.sub(r"\b\w", lambda match: match.group(0).upper(), value)


def draft_from_text(text: str, today: date | None = None) -> ExpenseDraft:
    today = today or today_jakarta()
    cleaned = " ".join(text.split())
    found = find_amount(cleaned)
    total = found[0] if found else None
    without_amount = f"{cleaned[: found[1]]} {cleaned[found[2] :]}" if found else cleaned

    merchant_match = _MERCHANT.search(without_amount)
    merchant = merchant_match.group(1).strip() if merchant_match else ""
    merchant = _title(merchant) if merchant and len(merchant) <= 40 else None

    expense_date = today - timedelta(days=1) if re.search(r"\b(kemarin|yesterday)\b", cleaned, re.IGNORECASE) else today

    description = without_amount.replace(merchant_match.group(0), " ") if merchant_match else without_amount
    description = _DATE_WORDS.sub(" ", description)
    description = re.sub(r"\b(rp|idr)\b\.?", " ", description, flags=re.IGNORECASE)
    description = " ".join(description.split())
    description = description[:1].upper() + description[1:] if description else ""

    items = []
    if description and total is not None:
        items.append(ItemDraft(name=description, qty=1, line_total_minor=total))
    return ExpenseDraft(
        merchant=merchant,
        date=expense_date,
        total_minor=total,
        category=guess_category(cleaned),
        items=items,
        source="chat",
        field_confidence={"total_minor": 0.9 if total is not None else 0.0},
    )
