import re

from app.ai.drafts import ExpenseDraft, ItemDraft
from app.ai.money import amount_in_text

FOOD = ("nasi", "makan", "kopi", "coffee", "teh", "ayam", "bakso", "warung")


def draft_from_text(text: str) -> ExpenseDraft:
    total = amount_in_text(text)
    description = re.sub(
        r"(\d{1,3}(?:[.\s]\d{3})+|\d+(?:[.,]\d+)?)(?:\s*)(juta|jt|ribu|rb|k)?",
        " ",
        text,
        count=1,
        flags=re.IGNORECASE,
    )
    description = " ".join(description.split())
    category = "Dining" if any(word in text.lower() for word in FOOD) else "Other"
    items = []
    if description and total is not None:
        items.append(ItemDraft(name=description, qty=1, line_total_minor=total))
    return ExpenseDraft(
        merchant=None,
        total_minor=total,
        category=category,
        items=items,
        source="chat",
        field_confidence={"total_minor": 0.9 if total is not None else 0.0},
    )
