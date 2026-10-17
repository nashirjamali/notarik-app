# 05 — Transactions API

**Label:** BE · **Phase:** 1 · **Depends on:** 04 · **Size:** ~6–8 h

## Goal
Create, read, update and delete transactions and their items through a clean, validated, paginated API.

## You will learn
- Request/response schemas and validation (Pydantic)
- REST design, status codes, error format
- Cursor pagination versus offset
- Writing a parent and child rows atomically

## Build
- [x] Schemas for create/update/read, with validation: non-negative integer amounts, allowed categories, sane date range.
- [x] Endpoints: `POST /transactions`, `GET /transactions` (cursor pagination, filter by month and category), `GET /transactions/{id}`, `PATCH`, `DELETE`.
- [x] Items are written in the same database transaction as the parent.
- [x] A consistent error response shape (code, message) and a 404 for rows the user can't see (don't reveal that they exist).
- [x] Export the OpenAPI spec and generate TypeScript types for the app (used in step 07).

## Done when
- All endpoints work through the test client with a user token.
- Pagination returns stable pages when rows are inserted between requests.

## Tests
- CRUD happy paths; validation failures return 422 with useful messages.
- Another user's transaction ID returns 404 for get/patch/delete.
- Deleting a transaction removes its items.
- Pagination: ordering and cursor correctness.

## Pitfalls
- Offset pagination that skips or repeats rows under inserts.
- Partial writes if the item insert fails after the parent insert.
- Leaking existence of other users' rows via 403 vs 404.

## Read
- FastAPI request bodies and response models; Postgres keyset pagination
