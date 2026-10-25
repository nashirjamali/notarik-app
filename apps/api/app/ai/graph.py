from app.ai.drafts import ExpenseDraft, ExtractionFailure, ValidationIssue
from app.ai.extract import extract_draft, repair_draft
from app.ai.validate import validate_draft

GRAPH_VERSION = "receipt-1"
MAX_REPAIRS = 2


def run_until_review(image: bytes, content_type: str, source: str, model, memory_category: str | None = None) -> dict:
    trace = [{"step": "preprocess", "message": "Preparing the receipt"}]
    state = {
        "source": source,
        "attempts": 0,
        "draft": None,
        "issues": [],
        "needs_review": True,
        "trace": trace,
        "model": None,
        "latency_ms": 0,
        "cost_usd": 0,
    }
    trace.append({"step": "extract", "message": "Reading receipt"})
    try:
        draft = extract_draft(model, image, content_type, source)
        _add_usage(state, model)
    except ExtractionFailure as exc:
        draft = ExpenseDraft(source=source)
        state["issues"] = [
            ValidationIssue(code="SCHEMA_INVALID", field="draft", detail=exc.message).model_dump()
        ]
        state["draft"] = draft.model_dump(mode="json")
        state["trace"].append({"step": "review", "message": "Waiting for confirmation"})
        return state
    while True:
        issues = validate_draft(draft)
        state["issues"] = [issue.model_dump() for issue in issues]
        state["trace"].append({"step": "validate", "message": "Checking totals"})
        if issues and state["attempts"] < MAX_REPAIRS:
            state["attempts"] += 1
            state["trace"].append({"step": "repair", "message": "Re-reading total"})
            try:
                draft = repair_draft(model, image, content_type, draft, state["issues"])
                _add_usage(state, model)
            except ExtractionFailure as exc:
                state["issues"].append(
                    ValidationIssue(code="SCHEMA_INVALID", field="draft", detail=exc.message).model_dump()
                )
                break
            continue
        break
    if memory_category:
        draft.category = memory_category
        draft.field_confidence["category"] = 1.0
        state["trace"].append({"step": "categorize", "message": "Using a saved merchant category"})
    else:
        state["trace"].append({"step": "categorize", "message": "Choosing a category"})
    confidence = min(draft.field_confidence.values()) if draft.field_confidence else 1.0
    state["needs_review"] = bool(state["issues"]) or confidence < 0.8 or draft.total_minor is None
    state["draft"] = draft.model_dump(mode="json")
    state["trace"].append({"step": "review", "message": "Waiting for confirmation"})
    return state


def _add_usage(state: dict, model) -> None:
    usage = getattr(model, "last_usage", None) or {}
    state["model"] = usage.get("model")
    state["latency_ms"] += int(usage.get("latency_ms") or 0)
    state["cost_usd"] += float(usage.get("cost_usd") or 0)
