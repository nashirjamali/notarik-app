# Deploying to the VPS

Production runs as one Docker Compose project (`compose.prod.yaml`, project name `notarik-app`) in `/root/apps/notarik-app` on the VPS. The VPS already runs a shared Traefik that terminates TLS (Let's Encrypt) and redirects http to https, so the stack only carries Traefik labels and exposes no ports.

| Service   | What it is                                              | Public host                    |
|-----------|---------------------------------------------------------|--------------------------------|
| `web`     | Next.js standalone server (`apps/web/Dockerfile`)       | `notarik-app.nashir.tech`      |
| `api`     | FastAPI via uvicorn (`apps/api/Dockerfile`)             | `api.notarik-app.nashir.tech`  |
| `migrate` | One-off `alembic upgrade head`, runs before `api`       | none                           |
| `db`      | Postgres 17, volume `pgdata`, no published port         | none                           |

The web app reaches the API over the internal network (`API_URL=http://api:8000`); the API's public host is for the mobile app and tooling.

## Environment

A `.env` next to `compose.prod.yaml` on the server (mode 600, never committed):

| Variable | Notes |
|---|---|
| `WEB_HOST`, `API_HOST` | The two hostnames above |
| `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD` | Admin role, used only by `migrate` |
| `APP_USER_PASSWORD` | Password of the non-privileged `app_user` the API connects as (RLS applies to it) |
| `JWT_SECRET` | Random, at least 48 hex characters |
| `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID` | Public client IDs. The web one is also a **build arg** for the web image |
| `OPENROUTER_API_KEY` | Needed for chat and receipt scanning |

The database init script runs only on the first start of an empty volume. Changing `APP_USER_PASSWORD` later needs `ALTER ROLE app_user PASSWORD '…'` inside the database too.

## Google sign-in

Add `https://<WEB_HOST>` to **Authorized JavaScript origins** of the web client ID in Google Cloud Console.

## Deploy or update

From the repo root on your machine:

```bash
rsync -az --delete --exclude node_modules --exclude .next --exclude .git --exclude '.env*' \
  --exclude apps/mobile --exclude test-results --exclude __pycache__ --exclude .venv \
  --filter='P .env' ./ root@<vps>:/root/apps/notarik-app/
ssh root@<vps> 'cd /root/apps/notarik-app && nice -n 15 docker compose -f compose.prod.yaml up -d --build'
```

`--filter='P .env'` protects the server's `.env` from `--delete`. Migrations run automatically on every `up`.

## Checks and logs

```bash
docker compose -f compose.prod.yaml ps -a
docker compose -f compose.prod.yaml logs api --tail 50
```

## Not done yet

- Postgres backups (`pg_dump` to off-server storage).
- A dedicated non-root deploy user instead of root over SSH.
- CI-driven deploys.
