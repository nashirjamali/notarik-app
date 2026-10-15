# 02 — API skeleton, database and migrations

**Label:** BE · **Phase:** 1 · **Depends on:** none (ADR-001 Python is decided) · **Size:** ~6–8 h

## Goal
A running API connected to a local Postgres, with the schema managed by migrations and a health check.

## You will learn
- Structuring a web API project (routers, settings, dependency injection)
- Running Postgres locally with Docker
- Schema migrations and why they beat hand-run SQL
- Money as integers, UUID primary keys, timestamps

## Build
- [x] Create `apps/api/` and `apps/mobile/`, a root `.env.example`, and a task runner (`Makefile` or similar). Add the real commands to `CLAUDE.md` and update its stack section (Python decided).
- [x] Run Postgres locally (Docker Compose) with a separate test database.
- [x] Create the API project with config from environment variables (validated at startup) and a `GET /health` endpoint.
- [x] Choose a migration tool (for example Alembic, or the provider's own) and create the first migration.
- [x] Schema from `PLAN.md` Part 3: `transactions`, `transaction_items`, `budgets`, `merchant_memory`, `extraction_runs`. Every table has `user_id`. Amounts are integers.
- [x] Add constraints: `total >= 0`, category check, foreign keys with `ON DELETE CASCADE` for items.
- [x] Add indexes on `user_id` and `(user_id, date)`.
- [x] Create two roles: an admin/migration role and a plain `app_user` role with only the grants it needs.

## Done when
- `docker compose up` starts the database, the API starts, and `/health` returns OK including a database check.
- You can run migrations up and down on a clean database.

## Tests
- A smoke test that boots the app and hits `/health` (full test setup comes in step 03).

## Pitfalls
- Using floats for money.
- Running the app as the database owner. That bypasses RLS later. Use `app_user` from the start.
- Committing secrets. Only `.env.example` goes in git.

## Read
- FastAPI docs (dependencies, settings); Alembic tutorial; Postgres docs on `GRANT`
