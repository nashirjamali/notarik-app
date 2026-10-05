# Notarik — Product Specification

**Status:** draft. Based on the v1 prototype spec (`../notarik/PRODUCT.md`), revised.
**Author:** Nashir Jamali
**Purpose:** a real expense tracker, a portfolio project showing evaluated, safe AI agents, and a **learning vehicle**: the owner writes the code to build developer and AI-engineering skills, with Claude acting as teacher and reviewer (see `CLAUDE.md`, "Learning mode").

## 1. Problem

Recording expenses from receipts is tedious, so people stop. Notarik removes the data-entry step: photograph a receipt (or type one sentence) and get a correct, categorized expense plus a running recap.

## 2. Goals and non-goals

**Goals**
- Photo → correct, categorized expense with near-zero typing, with accuracy that is measured, not assumed.
- Same layout on phone and web (one Expo codebase).
- A chat assistant that answers questions about spending and captures expenses from text, safely.

**Non-goals (first release):** bank sync, bill splitting, multi-currency, teams, offline sync, Excel import/export (CSV first, in a later release).

## 3. Target user

A working individual in Indonesia who wants to track spending but gives up on manual entry. Primary persona is the builder. Currency is IDR (integers, no decimals).

## 4. Core flows

1. **Scan:** camera / gallery / PDF → receipt graph (extract, validate, repair) → review screen → save.
2. **Quick add:** type "nasi goreng 25rb gojek" in chat → draft → confirm card → save.
3. **Recap:** per-category totals, monthly budget (spent vs limit in IDR and %), projection labelled as an estimate.
4. **Ask:** "why did dining go up in September?" → Insights agent → answer from real data.

**Critical path that must not break:** photo → extraction → reviewable entry.

## 5. Features by phase

| Phase | Features |
|-------|----------|
| 1 | Accounts, manual entry, transaction list, phone and web |
| 2 | Receipt scan graph, review screen, SSE progress, eval harness |
| 3 | Recap, budget, projection, category memory (RAG) |
| 4 | Chat assistant: supervisor, quick-add, insights, budget agents; confirm gates |
| 5 | Polish, tracing, deploy, v1 data migration |

## 6. Principles

- AI proposes, the user commits. Every write from an agent goes through a confirm step.
- If a step can be code, make it code (the validator is not an LLM).
- Receipt and merchant text is untrusted data, never instructions.
- The database enforces isolation (RLS), not the prompt.
- Estimates look like estimates.

## 7. Success criteria

- Eval table in the README: baseline (the old prototype prompt) vs the graph on total-exact-match, item precision/recall, category accuracy, latency, cost per receipt.
- Routing eval and safety eval suites pass in CI.
- Cross-user access tests pass against a real Postgres.
- A stranger understands the project from the README in 3 minutes.

See `docs/PLAN.md` for the review of v1, agent and graph design, RLS, stack and phases.
