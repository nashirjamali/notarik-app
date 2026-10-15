.PHONY: db api migrate migrate-down test

db:
	docker compose up -d --wait

api:
	cd apps/api && uv run uvicorn main:app --host 127.0.0.1 --port 8000

migrate:
	cd apps/api && uv run alembic upgrade head

migrate-down:
	cd apps/api && uv run alembic downgrade base

test:
	cd apps/api && uv run pytest
