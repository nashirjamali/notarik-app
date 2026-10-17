# ADR-002: Supabase Auth, self-managed Postgres

**Status:** accepted · **Date:** 2026-10-15

## Context
The API must accept bearer tokens from the Expo app (phone and web) and enforce row ownership in Postgres. The options were Supabase (auth and database), Clerk plus Neon, and self-managed Postgres with our own accounts.

Steps 02 and 03 already run Postgres 17 in Docker, migrate it with Alembic, and connect the API as `app_user`. PLAN.md Part 2c sets the user id per transaction and uses RLS as the backstop. PLAN.md also rejects hand-rolled sessions: a native app needs signup, refresh, and secure storage.

Checked limits (October 2026):

- Supabase Free: 50,000 monthly active users, 500 MB database, two active projects, project pauses after a week idle. Auth issues JWTs, has email and OAuth, and a React Native client. RLS is ordinary Postgres. The anon key is public; the service role bypasses RLS and must stay off the app.
- Clerk Hobby: 50,000 monthly retained users, Expo-ready sign-in. Clerk does not enforce RLS. Neon Free adds a separate Postgres (100 CU-hours, 1 GB, scales to zero) and still needs our policies.
- Self-managed auth: full control, and RLS already runs on the local database. We would build signup, refresh, and password reset ourselves.

## Decision
Supabase Auth issues access tokens. The database stays the Postgres this repo already migrates.

The API verifies the JWT (HS256 signature, expiry, audience `authenticated`) and then sets `request.jwt.claims` for that transaction only. `JWT_SECRET` is the Supabase project's JWT secret. Tests sign tokens with the same secret. `auth.uid()` reads `sub` from that setting. The API connects as `app_user`. The Supabase service role is not a database login and is not in the API.

## Amendment (2026-10-17)
There is no Supabase project in this repo yet, and steps 07 and 09 need signup to work in CI. The API issues the access token itself: HS256, `sub`, `aud=authenticated`, `exp`, plus a refresh token stored in Postgres. The app calls `/auth/signup`, `/auth/login`, `/auth/refresh`, and `/auth/logout`. Row-level security is unchanged. A later Supabase project can replace these routes with the Supabase client without changing the policies.

## Consequences
- Phone and web sign-in, refresh, and password reset come from Supabase Auth in step 07. Only the anon key belongs in the app.
- RLS is proven on local Postgres and in CI. The same policies can move to Supabase Postgres later; they do not depend on PostgREST.
- If a Supabase project uses asymmetric signing keys instead of the legacy JWT secret, token verification has to switch to that project's JWKS. Until then, HS256 with `JWT_SECRET` is the check.
