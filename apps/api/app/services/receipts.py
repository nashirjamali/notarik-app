from pathlib import Path
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.ai.drafts import ExpenseDraft
from app.ai.graph import GRAPH_VERSION, run_until_review
from app.ai.memory import embed_text, memory_text, normalize_merchant
from app.ai.models import get_model
from app.ai.tools import remembered_category
from app.core.config import Settings
from app.services.transactions import create_transaction
from app.schemas.transaction import ItemIn, TransactionCreate

_ROOT: Path | None = None
MAX_ACTIVE = 3


def receipt_root() -> Path:
    if _ROOT is not None:
        return _ROOT
    return Path(__file__).resolve().parents[2] / "data" / "receipts"


def set_receipt_root(path: Path | None) -> None:
    global _ROOT
    _ROOT = path


def sniff_type(payload: bytes) -> str | None:
    if payload.startswith(b"\x89PNG"):
        return "image/png"
    if payload.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if payload.startswith(b"%PDF"):
        return "application/pdf"
    return None


def create_run(connection: Connection, user_id: UUID, payload: bytes, settings: Settings) -> dict:
    content_type = sniff_type(payload)
    if content_type is None:
        raise ValueError("type")
    if len(payload) > settings.receipt_max_bytes:
        raise ValueError("size")
    active = connection.execute(
        text(
            """
            SELECT COUNT(*) FROM extraction_runs
            WHERE user_id = :user_id AND status = 'needs_review'
            """
        ),
        {"user_id": user_id},
    ).scalar_one()
    if active >= MAX_ACTIVE:
        raise ValueError("concurrency")
    run_id = uuid4()
    folder = receipt_root() / str(user_id)
    folder.mkdir(parents=True, exist_ok=True)
    suffix = {"image/png": ".png", "image/jpeg": ".jpg", "application/pdf": ".pdf"}[content_type]
    path = folder / f"{run_id}{suffix}"
    path.write_bytes(payload)
    source = "pdf" if content_type == "application/pdf" else "photo"
    connection.execute(
        text(
            """
            INSERT INTO extraction_runs (
              id, user_id, model, graph_version, status, image_path, content_type
            )
            VALUES (
              :id, :user_id, 'pending', :graph_version, 'needs_review', :image_path, :content_type
            )
            """
        ),
        {
            "id": run_id,
            "user_id": user_id,
            "graph_version": GRAPH_VERSION,
            "image_path": str(path),
            "content_type": content_type,
        },
    )
    state = run_until_review(payload, content_type, source, get_model(), None)
    draft = state.get("draft") or {}
    merchant = draft.get("merchant")
    memory_category = remembered_category(connection, user_id, merchant)
    if memory_category and draft:
        draft["category"] = memory_category
        confidence = dict(draft.get("field_confidence") or {})
        confidence["category"] = 1
        draft["field_confidence"] = confidence
        state["draft"] = draft
    connection.execute(
        text(
            """
            UPDATE extraction_runs
            SET model = :model,
                latency_ms = :latency_ms,
                cost_usd = :cost_usd,
                validator_result = CAST(:issues AS jsonb),
                draft = CAST(:draft AS jsonb),
                issues = CAST(:issues AS jsonb),
                trace = CAST(:trace AS jsonb),
                attempts = :attempts,
                status = 'needs_review'
            WHERE id = :id AND user_id = :user_id
            """
        ),
        {
            "id": run_id,
            "user_id": user_id,
            "model": state.get("model") or "scripted",
            "latency_ms": state.get("latency_ms") or 0,
            "cost_usd": state.get("cost_usd") or 0,
            "draft": _json(state.get("draft")),
            "issues": _json(state.get("issues")),
            "trace": _json(state.get("trace")),
            "attempts": state.get("attempts") or 0,
        },
    )
    return get_run(connection, user_id, run_id)


def get_run(connection: Connection, user_id: UUID, run_id: UUID) -> dict | None:
    row = connection.execute(
        text(
            """
            SELECT id, status, draft, issues, trace, content_type, image_path, model,
                   graph_version, latency_ms, cost_usd, attempts
            FROM extraction_runs
            WHERE id = :id AND user_id = :user_id
            """
        ),
        {"id": run_id, "user_id": user_id},
    ).mappings().first()
    if row is None:
        return None
    data = dict(row)
    data["id"] = str(data["id"])
    if data.get("cost_usd") is not None:
        data["cost_usd"] = float(data["cost_usd"])
    return data


def image_path(connection: Connection, user_id: UUID, run_id: UUID) -> Path | None:
    row = get_run(connection, user_id, run_id)
    if row is None or not row.get("image_path"):
        return None
    path = Path(row["image_path"]).resolve()
    root = receipt_root().resolve()
    if root not in path.parents and path != root:
        return None
    if not path.is_file():
        return None
    return path


def confirm_run(connection: Connection, user_id: UUID, run_id: UUID, edits: dict) -> dict | None:
    row = get_run(connection, user_id, run_id)
    if row is None or row["status"] != "needs_review":
        return None
    draft = ExpenseDraft.model_validate(row["draft"] or {})
    edited = _edited_fields(draft, edits)
    merged = draft.model_dump()
    merged.update({key: value for key, value in edits.items() if value is not None})
    final = ExpenseDraft.model_validate(merged)
    if not final.merchant or final.total_minor is None or final.date is None:
        raise ValueError("incomplete")
    created = create_transaction(
        connection,
        user_id,
        TransactionCreate(
            merchant=final.merchant,
            date=final.date,
            total_minor=final.total_minor,
            category=final.category,
            source=final.source if final.source in {"photo", "pdf"} else "photo",
            items=[
                ItemIn(name=item.name, qty=item.qty, line_total_minor=item.line_total_minor or 0)
                for item in final.items
                if item.name and item.line_total_minor is not None
            ],
        ),
    )
    connection.execute(
        text(
            """
            UPDATE transactions SET extraction_run_id = :run_id, receipt_image_path = :path
            WHERE id = :id AND user_id = :user_id
            """
        ),
        {
            "run_id": run_id,
            "path": row["image_path"],
            "id": created.id,
            "user_id": user_id,
        },
    )
    connection.execute(
        text(
            """
            UPDATE extraction_runs
            SET status = 'confirmed', user_edited_fields = CAST(:edited AS jsonb), draft = CAST(:draft AS jsonb)
            WHERE id = :id AND user_id = :user_id
            """
        ),
        {
            "id": run_id,
            "user_id": user_id,
            "edited": _json(edited),
            "draft": _json(final.model_dump(mode="json")),
        },
    )
    _remember(connection, user_id, created.id, final, edited)
    return {"transaction_id": created.id, "user_edited_fields": edited}


def _remember(connection, user_id, transaction_id, draft: ExpenseDraft, edited: list[str]) -> None:
    merchant = normalize_merchant(draft.merchant or "")
    names = [item.name for item in draft.items]
    text_value = memory_text(draft.merchant or "", names, draft.category)
    connection.execute(
        text(
            """
            INSERT INTO spending_memory (user_id, kind, source_id, merchant_normalized, text, embedding)
            VALUES (:user_id, 'transaction', :source_id, :merchant, :text, CAST(:embedding AS double precision[]))
            """
        ),
        {
            "user_id": user_id,
            "source_id": transaction_id,
            "merchant": merchant,
            "text": text_value,
            "embedding": _vector(embed_text(text_value)),
        },
    )
    if "category" in edited:
        correction = f"{draft.merchant} -> {draft.category}"
        connection.execute(
            text(
                """
                INSERT INTO spending_memory (user_id, kind, source_id, merchant_normalized, text, embedding)
                VALUES (:user_id, 'correction', :source_id, :merchant, :text, CAST(:embedding AS double precision[]))
                """
            ),
            {
                "user_id": user_id,
                "source_id": transaction_id,
                "merchant": merchant,
                "text": correction,
                "embedding": _vector(embed_text(correction)),
            },
        )
    connection.execute(
        text(
            """
            INSERT INTO merchant_memory (user_id, merchant_normalized, category, confirmed_count)
            VALUES (:user_id, :merchant, :category, 1)
            ON CONFLICT (user_id, merchant_normalized)
            DO UPDATE SET category = EXCLUDED.category, confirmed_count = merchant_memory.confirmed_count + 1
            """
        ),
        {"user_id": user_id, "merchant": merchant, "category": draft.category},
    )


def _edited_fields(draft: ExpenseDraft, edits: dict) -> list[str]:
    current = draft.model_dump(mode="json")
    changed = []
    for key, value in edits.items():
        if value is None:
            continue
        if key == "items":
            if value != current.get("items"):
                changed.append("items")
            continue
        if str(current.get(key)) != str(value):
            changed.append(key)
    return changed


def _vector(values: list[float]) -> str:
    return "{" + ",".join(str(item) for item in values) + "}"


def _json(value) -> str:
    import json

    return json.dumps(value)
