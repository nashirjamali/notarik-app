# Notarik web

Next.js (App Router) for the public landing page (`/`) and the signed-in web app (`/app`). Decision: `docs/adr/007-web-nextjs-for-landing-and-web-app.md`.

## Run

```bash
make db && make migrate   # from the repo root: Postgres and schema
make api                  # FastAPI on :8000
cd apps/web && npm install && npm run dev
```

`API_URL` (server only, default `http://127.0.0.1:8000`) points the web server at the API. Never put a secret in a `NEXT_PUBLIC_` variable.

**Google sign-in** uses Google Identity Services. Set `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the web OAuth client ID (public, baked in at build time; the button is hidden without it) and set the same value as `GOOGLE_WEB_CLIENT_ID` for the API, which verifies the ID token (ADR-006). In Google Cloud Console add the site origin (for local work `http://localhost:3000`) under "Authorized JavaScript origins". The tests replace Google's script, so the real round trip with Google is checked by hand.

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

## Same screens as the mobile app
The signed-in app mirrors `apps/mobile`: under 768px it looks like the mobile app (pill menu, top bars, sheets); from 768px it is a sidebar layout with the same menu. The artwork comes from the mobile app: run `npm run sync:assets` after its `assets/` change (the copies in `public/app-assets` are committed). Parser logic (`quickAdd`, `numberWords`) is ported from the mobile app with its tests; keep the two in step. The plan and what is left are in `docs/plans/web-mobile-parity.md`.
