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

`POST /auth/signup` takes an optional `name` (at most 80 characters, trimmed; blank means none). `GET /me` returns `{ "user_id": "uuid", "name": "Ada" | null, "email": "ada@example.com" | null }`. Accounts created before the name existed have `name: null`.

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

## Settings and export

`GET /me/settings` returns `{ "auto_read_receipts": bool, "notifications": bool }` (both `true` until changed). `PATCH /me/settings` takes any subset of those two fields and returns the full object. The values are stored per user with RLS.

- `auto_read_receipts` is enforced by the client: when it is `false` the Snap screen does not upload the photo. The API itself still accepts `POST /receipts`.
- `notifications` is only stored. Nothing sends notifications yet.
- "Confirm before saving" has no field on purpose: the agent never writes without a confirmation, so the switch is shown on and locked.
- The app is light only for now (it ignores the system appearance), so Settings has no theme row.

`GET /transactions/export` returns every expense of the caller as `text/csv` (`date, merchant, category, amount_idr, payment_method, source, note`, newest first) with a `Content-Disposition` attachment name. Amounts are whole IDR. Text cells that start with `=`, `+`, `-` or `@` get a leading `'` so spreadsheets do not run them as formulas.

## Sign in with Google

`POST /auth/social` (no bearer token). Body: `{"provider": "google", "id_token": "...", "nonce": "..."}`. The app gets the ID token from Google with a random `nonce` it generated, and sends both. Response is the same `TokenPair` as `/auth/login`.

- `401 unauthorized`, message `Google sign-in failed`: bad signature, wrong audience or issuer, expired, nonce mismatch, or Google is not configured.
- `401 unauthorized`, message `Google did not confirm this email address`: the Google email is not verified, so no account is created or linked.
- `422`: unknown `provider` (only `google` exists).
- A verified email that already has a password account is linked to it. An account made with Google has no password, so `/auth/login` for it returns the usual `Wrong email or password`.

## Transactions list, details and search

`GET /transactions` is ordered by the day the expense happened (`date`), newest first, then by when it was entered. So an expense typed in today for last week sits with last week. Paging uses `next_cursor` as before; a cursor from an older build is `422`. New query parameter `q` (at most 100 characters) matches the merchant, the note, or an item name, ignoring case. `%` and `_` in `q` are taken literally. `month` must be `YYYY-MM`.

A transaction now also has:
- `payment_method`: `Cash`, `QRIS`, `Debit card`, `Credit card`, `E-wallet`, `Bank transfer`, `Other`, or `null`. Send it on create, or with `PATCH` (`null` clears it).
- `receipt_run_id`: the receipt run it came from, or `null`. Fetch the picture with `GET /receipts/{receipt_run_id}/image` and the bearer token.
- `note` (see above) and `created_at`, which the app shows as the time of day.

## Home: recap, budget, projection (step 16)

All three take `month=YYYY-MM`. The expense `date` is a calendar date, so a late night does not move it into another month. "Today" for the projection uses Asia/Jakarta.

`GET /recap?month=2026-10`

```json
{
  "month": "2026-10",
  "currency": "IDR",
  "total_minor": 25000,
  "count": 1,
  "previous_total_minor": 40000,
  "insight": { "category": "Dining", "change_percent": -12, "text": "Food is down 12% vs last month. Nice!" },
  "categories": [
    { "category": "Dining", "total_minor": 25000, "count": 1, "share": 1 }
  ]
}
```

Categories with no spend are omitted. `share` is `0..1`. `previous_total_minor` and `insight` compare with last month. For the current month that means the same number of days so far, so a half-finished month is not set against a whole one. `insight` is the biggest move (5% or more, on a category that had at least Rp 50.000 last month) or `null`; show `text` as is.

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

`days_left` is the days left in the month in Asia/Jakarta (0 for a past month, the whole month for a future one). `limit_minor` is `null` when unset (`status` `unset`, `label` `No budget`). Otherwise `status` is `on-track` (under 80%), `near-limit` (80–100), or `over` (above 100). Show `label` as text next to the color.

`GET /budget/categories?month=2026-10` lists every category that has spending or a limit that month, biggest spender first:

```json
[{ "category": "Groceries", "spent_minor": 816000, "limit_minor": 750000, "over_minor": 66000, "percent_used": 109 }]
```

`limit_minor`, `over_minor` and `percent_used` are `null` when the category has no limit. `PUT /budget/categories` with `{ "month": "2026-10", "category": "Dining", "total_minor": 1000000 }` sets a limit (`null` removes it) and returns the same list.

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

`POST /chat` with `{ "message": "kopi 25rb tadi pagi", "thread_id": null }`. The response is `text/event-stream`, sent as one piece:

```
event: token
data: {"text":"Got it. Here's what I'll log:"}

event: pending_action
data: {"kind":"create_expense","payload":{...},"summary":"Save Rp 25.000 as Food & Drink?"}

event: done
data: {"thread_id":"uuid","route":"capture"}
```

React Native cannot read a streamed body, so read the whole text and split on blank lines. `pending_action` is omitted when nothing is proposed. Keep `thread_id` and send it on the next message so "and last month?" keeps the subject of the question before it and only changes the period.

Text is for people: amounts are formatted as `Rp 342.500`, and the answers read like "You spent Rp 342.500 on food this week, about 12% less than last week." Show it as is (the amounts can be set in a medium weight).

`kind` is `create_expense`, `delete_expense`, or `set_budget`.
- `create_expense`: `payload` matches `ExpenseDraft`: `merchant` (from "di warteg", else null), `date` (today in Asia/Jakarta, or yesterday for "kemarin"), `total_minor`, `category`, `items`, `source: "chat"`. A bare number under 1000 is a quantity, not rupiah, so "2 packs of tea" proposes nothing.
- `delete_expense`: `payload` is `{ transaction_id, merchant }`.
- `set_budget`: `payload` is `{ month, total_minor }`; the month is the one named in the message (this month by default).

Questions understand `today`, `yesterday`, `this week`, `last week`, `this month`, `last month`, a month name or `YYYY-MM`, and the Indonesian equivalents (`hari ini`, `kemarin`, `minggu ini`, `bulan lalu`). With no period it means this month. Weeks run Monday to Sunday in Asia/Jakarta. Food, makan, groceries, belanja, transport, shopping, bills and similar words pick a category.

Nothing is written until:

`POST /chat/{thread_id}/confirm`

```json
{ "decision": "approve" }
```

`decision` is `approve`, `reject`, or `edit`. `edit` includes `"payload"`; the fields you send replace the proposed ones and anything you leave out keeps its proposed value, so `{ "category": "Dining" }` is enough.

`200`: `{ "status": "approved", "transaction_id": "uuid" }` (no `transaction_id` for budgets and deletes) or `{ "status": "rejected" }`. Reject leaves the database unchanged. An edit that is not valid (a total that is not a number, a date too far away, a month that is not `YYYY-MM`) is `422` `validation_error` with a `message`, and the proposal is kept so it can be corrected and sent again.

`429` `rate_limited` means wait a minute. `429` `budget_exceeded` means the daily token budget is used up. Show `message` and do not retry in a loop.

Routes you can ignore in the UI, but they explain the answer: `capture`, `insights`, `budget`, `smalltalk`, `refuse`. A message that both logs an amount and asks a question is handled as `capture` only. The amount is proposed; the question is not answered in the same turn. A short message about food with no price ("nasi goreng") is `capture` too, and the answer asks how much.

Limits: amounts (`total_minor`, item totals and budgets) are at most 10,000,000,000,000 rupiah; larger is `422`. `month` is always `YYYY-MM` with a month from 01 to 12.

## What is not in this API yet

There is no chart, and chat history is not stored for reading back: the conversation lives on the phone until the thread is dropped. Receipt photos of real spending are not in the repo. Extraction calls OpenRouter only when `OPENROUTER_API_KEY` is set; without it, `POST /receipts` returns a validation-style model failure unless a test double is installed.
