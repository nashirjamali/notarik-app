# 04 — Auth and Row Level Security

**Label:** BE · **Phase:** 1 · **Depends on:** 02, 03 · **Size:** ~8–12 h

## Goal
Requests are authenticated with a token, the user's identity reaches Postgres per transaction, and RLS makes cross-user access impossible, proven by tests.

## You will learn
- JWT verification (signature, expiry, audience) and the difference between authentication and authorization
- Postgres RLS: policies, `USING` vs `WITH CHECK`, `FORCE ROW LEVEL SECURITY`
- Transaction-local settings and why session-level settings leak under connection pooling

## Before you start
- [ ] Write **ADR-002: auth and database provider** (Supabase vs Clerk + Neon vs self-managed). Check JWT handling, mobile and web sign-in, RLS support and free-tier limits. Verify you can run RLS on the option you pick.

## Build
- [ ] Verify the provider's JWT in a request dependency; reject missing, expired or malformed tokens with 401.
- [ ] Create a database session helper that opens a transaction and sets the user identity transaction-locally (see `PLAN.md` Part 2c).
- [ ] Migration: enable and force RLS on every table; add policies for select/insert/update/delete. Child tables get their own policy.
- [ ] Add `(select auth.uid())`-style claim lookup as a SQL function so policies stay short.
- [ ] Verify the service role / owner role is never used by the API.

## Done when
- A valid token can read and write only its own rows.
- A request with no claim set sees zero rows.
- Another user's ID in a request body or path cannot reach their rows.

## Tests (write these first, then the policies)
- User A cannot SELECT, UPDATE, DELETE or INSERT as user B in any table.
- Inserting a row with another user's `user_id` fails (`WITH CHECK`).
- Missing/invalid/expired token → 401.
- Pooling simulation: two sequential requests as different users on the same connection don't leak identity.

## Pitfalls
- Policies that read fine but are never enforced because RLS was not enabled or forced.
- Forgetting `WITH CHECK` on insert/update.
- Slow policies from an unindexed `user_id`.
- Trusting a `user_id` from the request body. It always comes from the verified token.

## Read
- Postgres docs: Row Security Policies; Supabase RLS guide; OWASP on broken access control
