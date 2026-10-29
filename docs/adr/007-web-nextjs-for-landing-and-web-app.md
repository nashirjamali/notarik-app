# ADR-007: Next.js for the landing page and the web app

**Status:** accepted · **Date:** 2026-10-28

## Context
`docs/PLAN.md` chose Expo (React Native Web) for the web target and argued that weak SEO and bundle size "don't matter for a logged-in app". Two things changed:

- There is now a **public landing page** (Figma, page "Web"). It has to be found by search, share well, and load fast. That is the case the PLAN's argument excluded.
- The Figma web designs are **desktop-first** (1440, with 768 and 390 variants): a sidebar on desktop, a top bar on tablet, a bottom bar on mobile. They are not a phone-width column.

Options considered:

| Option | Landing | Web app | Main cost |
|--------|---------|---------|-----------|
| Astro landing, Expo web app | static, best SEO | reuses the Expo code | two web stacks, Expo web for desktop layouts |
| Expo web for everything | weak SEO, heavy bundle | reuses the Expo code | public page is the worst fit for RN Web |
| **Next.js for everything** | server-rendered or static | Next.js (React DOM) | the web UI is a second UI next to the Expo app |

## Decision
`apps/web/` is a Next.js app (App Router, TypeScript). It serves:

- the public landing page (`/`), rendered on the server or statically, and
- the logged-in web app (`/app/...`), responsive at the three Figma widths.

`apps/mobile/` stays Expo and is the iOS and Android app. Its web target is no longer the product's web version (it can remain a development convenience).

The FastAPI backend does not change. The browser never receives a token it can read from JavaScript: Next.js route handlers (a thin backend-for-frontend) call the API and keep the access and refresh tokens in `httpOnly` cookies.

## Consequences
- **Two UIs.** Screens are written twice (React Native and React DOM). Shared: the API contract (`openapi.json` → generated TypeScript types), design token values, copy, and the product rules. Not shared: components. Revisit a shared `packages/` folder only if duplication actually hurts.
- **Better fit for the designs:** real HTML for SEO and accessibility, CSS media queries for the 1440/768/390 layouts, no React Native Web translation layer.
- **Auth is different on web.** ADR-002's API-issued tokens stay. The web uses cookies through the BFF; the mobile app keeps secure storage. Cookie-based requests need CSRF and `SameSite` thinking that the mobile app does not.
- **Non-negotiables still apply:** money is integer IDR minor units (a second `Money` formatter, tested with the same cases as the Expo one), row-level security stays in Postgres, and receipt, merchant and item text is untrusted when rendered (React escapes it; never use `dangerouslySetInnerHTML` for it).
- **Deployment:** the web app can go on Vercel or Cloudflare, separate from the API.
- **PLAN.md is out of date** on this point (the Client row, the repo layout and the "web with Expo" argument). Update it, or leave a note pointing here.
- v1 was also Next.js. Do not copy v1 code (CLAUDE.md); reuse only the ideas.
