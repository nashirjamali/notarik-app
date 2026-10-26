import re

from app.ai.capture import FOOD
from app.ai.money import find_amount

REFUSE = ("stock", "saham", "transfer", "invest", "user 2", "user2", "other user")
INSIGHTS = (
    "berapa",
    "how much",
    "why did",
    "which merchant",
    "spent",
    "pengeluaran",
    "spending",
    "go up",
)
BUDGET = ("budget", "on track", "afford")
SMALLTALK = {"hi", "hello", "hey", "help", "what can you do?", "what can you do"}
FOLLOWUPS = {"and last month?", "and last month", "what about last month?"}


def route_message(text: str, attachments: list[str] | None = None, previous: str | None = None) -> str:
    if attachments:
        return "capture"
    cleaned = " ".join(text.lower().split())
    if not cleaned:
        return "smalltalk"
    if any(word in cleaned for word in REFUSE):
        return "refuse"
    if cleaned in SMALLTALK:
        return "smalltalk"
    if previous == "insights" and cleaned in FOLLOWUPS:
        return "insights"
    if any(word in cleaned for word in BUDGET):
        return "budget"
    if any(word in cleaned for word in INSIGHTS):
        return "insights"
    if any(word in cleaned for word in ("delete", "hapus", "change that", "ubah")):
        return "capture"
    if find_amount(cleaned) is not None:
        return "capture"
    # "nasi goreng" with no price is still a purchase; the capture step will ask how much.
    if len(cleaned.split()) <= 4 and set(re.findall(r"[a-z]+", cleaned)) & (set(FOOD) | {"beli"}):
        return "capture"
    return "smalltalk"
