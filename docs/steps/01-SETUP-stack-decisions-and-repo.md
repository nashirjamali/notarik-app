# 01 — Stack decisions and repo structure

**Status:** SKIPPED. ADR-001 (Python) is accepted. The remaining decisions are made when needed: ADR-002 (auth and database provider) before step 04, ADR-003 (LLM access) at the start of step 10, ADR-004 (tracing and eval tool) at the start of step 15. The repo layout is created in step 02.

**Label:** SETUP · **Phase:** 0 · **Depends on:** 00 (can overlap) · **Size:** ~3–5 h

## Goal
Make the open decisions explicitly, record them, and lay out the repo so later steps have a place to go.

## You will learn
- Writing an Architecture Decision Record (ADR)
- Evaluating trade-offs instead of following hype

## Build
- [ ] **ADR-001: backend language** — Python (FastAPI + LangGraph) vs TypeScript. Compare: agent/eval ecosystem, hiring relevance, one-language simplicity, your own experience.
- [ ] **ADR-002: auth and database provider** — Supabase vs Clerk + Neon vs self-managed. Check how each handles JWTs, mobile and web sign-in, RLS support and free-tier limits.
- [ ] **ADR-003: LLM access** — OpenRouter via LangChain chat models; which models you'll compare.
- [ ] **ADR-004: tracing/eval tool** — LangSmith vs Langfuse.
- [ ] Create `apps/api/` and `apps/mobile/` folders, root `.env.example`, and a `Makefile` or task runner for common commands.
- [ ] Update `CLAUDE.md` (stack and commands sections) with the decisions.

## Done when
- Four ADRs exist in `docs/adr/`, each with context, options, decision and consequences.
- `CLAUDE.md` no longer says "undecided".

## Tests
- None. Review: could someone else understand why you chose each option?

## Pitfalls
- Choosing by popularity. Write one sentence on what you give up with each choice.
- Picking a provider you can't run RLS on. Verify before deciding.

## Read
- Michael Nygard's ADR format; the docs for each provider's auth and Postgres features
