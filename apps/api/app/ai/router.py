import re

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
CAPTURE_WORDS = ("beli", "nasi", "kopi", "goceng")


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
    if re.search(r"\d", cleaned) and (
        any(word in cleaned for word in ("rb", "ribu", "jt", "juta", "k"))
        or any(word in cleaned for word in CAPTURE_WORDS)
    ):
        return "capture"
    return "smalltalk"
