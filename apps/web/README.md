# Notarik web

Next.js (App Router) for the public landing page (`/`) and the signed-in web app (`/app`). Decision: `docs/adr/007-web-nextjs-for-landing-and-web-app.md`.

## Run

```bash
make db && make migrate   # from the repo root: Postgres and schema
make api                  # FastAPI on :8000
cd apps/web && npm install && npm run dev
```

`API_URL` (server only, default `http://127.0.0.1:8000`) points the web server at the API. Never put a secret in a `NEXT_PUBLIC_` variable.

## How sign-in works

The browser never sees a token. `/api/auth/login|signup|logout` call the API and keep the access and refresh tokens in `httpOnly`, `SameSite=Lax` cookies. Pages fetch data from `/api/proxy/*`, which adds the bearer token, renews it once on a 401 (parallel renewals share one call, since refresh tokens rotate) and only forwards an allow-list of API areas. State-changing requests must come from the same origin. `proxy.ts` sends visitors without a session cookie from `/app/*` to `/login`; the API decides whether the session is still valid.

## Scripts

| Command | What |
|---------|------|
| `npm run dev` | dev server |
| `npm run lint`, `npm run typecheck` | eslint, tsc |
| `npm test` | unit tests (vitest) |
| `npm run test:e2e` | Playwright; starts the API and a production build |
| `npm run gen:api` | regenerate `src/lib/schema.d.ts` from `apps/mobile/openapi.json` |

Set `COOKIE_INSECURE=1` only to run a production build over plain http (the e2e config does).
