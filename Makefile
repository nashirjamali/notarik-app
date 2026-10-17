.PHONY: db api migrate migrate-down test test-unit

db:
	docker compose up -d --wait

api:
	cd apps/api && uv run uvicorn app.main:app --host 127.0.0.1 --port 8000

migrate:
	cd apps/api && uv run python -m app.db.migrate upgrade head

migrate-down:
	cd apps/api && uv run python -m app.db.migrate downgrade base

test:
	cd apps/api && uv run pytest

test-unit:
	cd apps/api && uv run pytest tests/unit
