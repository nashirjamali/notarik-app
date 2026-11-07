FROM python:3.12-slim

# psycopg is installed without its binary wheel, so it needs the system libpq.
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir uv && useradd --create-home --uid 10001 app

# The code sits at /srv/apps/api so the settings file's relative ROOT_ENV path still resolves; production passes real env vars.
WORKDIR /srv/apps/api
ENV UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_COMPILE_BYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project

COPY alembic.ini ./
COPY app ./app

# Receipt images live on a volume the non-root user can write to.
RUN mkdir -p /data/receipts && chown -R app:app /data
ENV RECEIPTS_DIR=/data/receipts

USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
