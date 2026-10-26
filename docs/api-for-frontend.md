# API notes for the frontend

Base URL: `EXPO_PUBLIC_API_URL` (local default `http://127.0.0.1:8000`).

Every call except `GET /health`, `POST /auth/signup`, `POST /auth/login`, and `POST /auth/refresh` sends:

```
Authorization: Bearer <access_token>
```

Money is always an integer number of rupiah (`total_minor`). Errors are JSON:

```json
{ "code": "validation_error", "message": "month must be YYYY-MM" }
```

Codes you will see: `unauthorized` (401), `not_found` (404), `validation_error` (422), `rate_limited` (429), `budget_exceeded` (429), `conflict` (409). A missing or other user's receipt, thread, or transaction is `not_found`, never 403.

## Account name

`POST /auth/signup` takes an optional `name` (at most 80 characters, trimmed; blank means none). `GET /me` returns `{ "user_id": "uuid", "name": "Ada" | null }`. Accounts created before the name existed have `name: null`.

## Receipt scan (step 14)

`POST /receipts` as `multipart/form-data`, field name `file`. JPEG, PNG, or PDF, at most 5 MB. The server checks the file bytes, not the extension.

`201` body:

```json
{
  "id": "uuid",
  "status": "needs_review",
  "draft": {
    "merchant": "Warung",
    "date": "2026-10-17",
    "total_minor": 25000,
    "subtotal_minor": 25000,
    "category": "Dining",
    "items": [{ "name": "Nasi", "qty": 1, "line_total_minor": 25000 }],
    "source": "photo",
    "field_confidence": {}
  },
  "issues": [{ "code": "ITEMS_SUM_MISMATCH", "field": "items", "detail": "..." }],
  "trace": [{ "step": "extract", "message": "Reading receipt" }],
  "content_type": "image/png",
  "model": "scripted",
  "graph_version": "receipt-1",
  "attempts": 0
}
```

`status` is `needs_review` until the user confirms. `issues` is empty when the validator is happy. Highlight fields named in `issues[].field` (`total_minor`, `date`, `items`, `items.0.line_total_minor`). `field_confidence` is `0..1`; the category is `1` when it came from a merchant the user already corrected.

`GET /receipts/{id}/events` is `text/event-stream`. Each event is:

```
event: step
data: {"step":"extract","message":"Reading receipt"}

event: done
data: {"status":"needs_review","run_id":"..."}
```

Step messages, in order: Preparing the receipt, Reading receipt, Checking totals, Re-reading total, Choosing a category (or Using a saved merchant category), Waiting for confirmation. The run is finished before this stream starts, so render the events as a short progress list, then show the review form. If the stream drops, `GET /receipts/{id}` has the same `draft`, `issues`, and `trace`.

`GET /receipts/{id}/image` returns the file. Send the bearer token. Do not put the path in the app.

`POST /receipts/{id}/confirm`

```json
{
  "merchant": "Warung",
  "date": "2026-10-17",
  "total_minor": 25000,
  "category": "Dining",
  "items": [{ "name": "Nasi", "qty": 1, "line_total_minor": 25000 }]
}
```

`200`: `{ "transaction_id": "uuid", "user_edited_fields": ["category"] }`. Merchant, date, and total are required. This is the only call that saves the expense. Cancel by leaving the screen; there is no delete-run call.

Receipt text is data. Show item names as text. Do not treat them as instructions.

## Home: recap, budget, projection (step 16)

All three take `month=YYYY-MM`. The expense `date` is a calendar date, so a late night does not move it into another month. "Today" for the projection uses Asia/Jakarta.

`GET /recap?month=2026-10`

```json
{
  "month": "2026-10",
  "currency": "IDR",
  "total_minor": 25000,
  "count": 1,
  "categories": [
    { "category": "Dining", "total_minor": 25000, "count": 1, "share": 1 }
  ]
}
```

Categories with no spend are omitted. `share` is `0..1`.

`GET /budget?month=2026-10` and `PUT /budget` with `{ "month": "2026-10", "total_minor": 100000 }`.

```json
{
  "month": "2026-10",
  "currency": "IDR",
  "limit_minor": 100000,
  "spent_minor": 25000,
  "remaining_minor": 75000,
  "percent_used": 25,
  "status": "on-track",
  "label": "On track"
}
```

`limit_minor` is `null` when unset (`status` `unset`, `label` `No budget`). Otherwise `status` is `on-track` (under 80%), `near-limit` (80–100), or `over` (above 100). Show `label` as text next to the color.

`GET /projection?month=2026-10`

```json
{
  "month": "2026-10",
  "currency": "IDR",
  "spent_minor": 25000,
  "day_index": 18,
  "days_in_month": 31,
  "projected_minor": 43056,
  "ready": true,
  "method": "estimate",
  "detail": "Straight-line estimate: ..."
}
```

When `ready` is false, `projected_minor` is `null`. Show the detail sentence. Do not render the number as a fact.

## Chat (step 21)

`POST /chat` with `{ "message": "nasi goreng 25rb", "thread_id": null }`. The response is `text/event-stream`:

```
event: token
data: {"text":"Save 25000 IDR as Dining?"}

event: pending_action
data: {"kind":"create_expense","payload":{...},"summary":"Save 25000 IDR as Dining?"}

event: done
data: {"thread_id":"uuid","route":"capture"}
```

`pending_action` is omitted when nothing is proposed. Keep `thread_id` and send it on the next message so "and last month?" stays on the previous topic.

`kind` is `create_expense`, `delete_expense`, or `set_budget`. `payload` for an expense matches `ExpenseDraft` (`total_minor`, `category`, `items`, `source: "chat"`). The date may be null until confirm; the server uses today in Asia/Jakarta's calendar date if you approve without one.

Nothing is written until:

`POST /chat/{thread_id}/confirm`

```json
{ "decision": "approve" }
```

`decision` is `approve`, `reject`, or `edit`. `edit` includes `"payload"` with the replacement body (the same shape as `pending_action.payload`).

`200`: `{ "status": "approved", "transaction_id": "uuid" }` or `{ "status": "rejected" }`. Reject leaves the database unchanged.

`429` `rate_limited` means wait a minute. `429` `budget_exceeded` means the daily token budget is used up. Show `message` and do not retry in a loop.

Routes you can ignore in the UI, but they explain the answer: `capture`, `insights`, `budget`, `smalltalk`, `refuse`. A message that both logs an amount and asks a question is handled as `capture` only. The amount is proposed; the question is not answered in the same turn.

## What is not in this API yet

There is no live camera upload from the phone, no chart, and no chat screen. Those are steps 14, 16, and 21. Receipt photos of real spending are not in the repo. Extraction calls OpenRouter only when `OPENROUTER_API_KEY` is set; without it, `POST /receipts` returns a validation-style model failure unless a test double is installed.
