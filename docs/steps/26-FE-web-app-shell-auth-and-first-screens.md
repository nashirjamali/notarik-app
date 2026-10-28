# 26 — Web app shell, auth and first screens

**Label:** FE · **Phase:** 6 (web) · **Depends on:** 05 (transactions API), 25 · **Size:** ~10–12 h

## Goal
A logged-in web app under `/app` with the responsive shell from the Figma designs (sidebar, top bar, bottom bar), cookie-based sign-in through a Next.js backend-for-frontend, and the Transactions and Home screens reading real data.

## You will learn
- Auth on the web: `httpOnly` cookies, route handlers as a BFF, `SameSite`, CSRF
- Protecting routes with Next.js middleware
- Generating TypeScript types from the FastAPI OpenAPI spec
- Data fetching with server components and TanStack Query on the client

## Build
- [ ] Types: generate them from `apps/mobile/openapi.json` (or the live `/openapi.json`) with `openapi-typescript`. Write down where the generated file lives and how to regenerate it.
- [ ] BFF: route handlers for `/api/auth/login`, `/signup`, `/logout` and a refresh. They call the FastAPI `/auth/*` routes and store the tokens in `httpOnly`, `Secure`, `SameSite` cookies. The browser never reads a token.
- [ ] Middleware: `/app/*` redirects to `/login` without a session.
- [ ] Shell by breakpoint: sidebar at ≥ 1024, top bar at 768, bottom bar at 390. One navigation config, three presentations.
- [ ] Screens: Transactions (month switcher, category filters, grouped list) and Home (greeting, quick links, month stats, recent). Recap and Ask Notarik come later; leave routes with a placeholder.
- [ ] A `Money` formatter for integer IDR (`1500000` → `Rp 1.500.000`). Same test cases as the Expo `Money`.
- [ ] Empty, loading and error states for each list.

## Done when
- You can sign up, log in, see your transactions on `/app/transactions`, and log out; a second user cannot see them.
- The shell switches correctly at 1440, 768 and 390.
- No token is visible in `localStorage`, in the JS bundle or to `document.cookie`.

## Tests
- `Money` unit tests (positive, zero, negative, large).
- Playwright: log in, open Transactions, check a seeded row, log out; direct visit to `/app` without a session redirects to `/login`.
- A test that a user B cookie never returns user A's rows (the RLS check from step 04, seen through the web).

## Pitfalls
- CORS and cookies: same-site cookies through the BFF are simpler than calling the API from the browser with a token.
- Refresh races: two parallel requests refreshing the same token at once.
- Putting `JWT_SECRET` or any API secret in a `NEXT_PUBLIC_` variable.
- Floats for money anywhere in the UI.
- Rendering receipt or merchant text as HTML.

## Read
- Next.js docs (middleware, route handlers, cookies); OWASP session management and CSRF cheat sheets; `openapi-typescript` docs
