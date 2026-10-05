# Development Steps

Do the steps **in order**. Each file is one unit of work with a goal, what you will learn, tasks, a "done when" check, and tests. They follow the phases in `../PLAN.md` and the teaching rules in `../../CLAUDE.md`: you write the code, Claude teaches and reviews.

## Labels

| Label | Meaning |
|-------|---------|
| `SETUP` | Decisions, repo, tooling |
| `BE` | Backend (API, database, auth, RLS) |
| `FE` | Frontend (Expo app for phone and web) |
| `FEATURE` | End-to-end slice touching backend and frontend |
| `AI` | LLM, LangGraph graphs, agents, RAG |
| `TEST` | Test and evaluation infrastructure |
| `OPS` | Tracing, deployment, release |
| `DOCS` | Documentation and portfolio material |

## Sequence

| # | Label | Step | Phase |
|---|-------|------|-------|
| 00 | AI | [Eval dataset and baseline](00-AI-eval-dataset-and-baseline.md) — **deferred: do before step 10** | 0 |
| 01 | SETUP | [Stack decisions and repo structure](01-SETUP-stack-decisions-and-repo.md) — **skipped; Python decided (ADR-001); remaining decisions moved to steps 02/04, 10, 15** | 0 |
| 02 | BE | [API skeleton, database and migrations](02-BE-api-skeleton-database-migrations.md) | 1 |
| 03 | TEST | [Backend test foundation](03-TEST-backend-test-foundation.md) | 1 |
| 04 | BE | [Auth and Row Level Security](04-BE-auth-and-rls.md) | 1 |
| 05 | BE | [Transactions API](05-BE-transactions-api.md) | 1 |
| 06 | FE | [Expo setup, navigation and design tokens](06-FE-expo-setup-and-design-tokens.md) | 1 |
| 07 | FE | [Auth screens and API client](07-FE-auth-and-api-client.md) | 1 |
| 08 | FEATURE | [Manual entry and transaction list](08-FEATURE-manual-entry-and-transaction-list.md) | 1 |
| 09 | TEST | [Frontend and end-to-end basics](09-TEST-frontend-and-e2e-basics.md) | 1 |
| 10 | AI | [LLM access and structured extraction](10-AI-llm-access-and-structured-extraction.md) | 2 |
| 11 | AI | [Receipt validator (plain code)](11-AI-receipt-validator.md) | 2 |
| 12 | AI | [Receipt graph with LangGraph](12-AI-receipt-graph-langgraph.md) | 2 |
| 13 | BE | [Receipt endpoints, storage and SSE](13-BE-receipt-endpoints-storage-sse.md) | 2 |
| 14 | FE | [Capture and review screens](14-FE-capture-and-review-screens.md) | 2 |
| 15 | TEST | [Eval harness and CI](15-TEST-eval-harness-and-ci.md) | 2 |
| 16 | FEATURE | [Recap, budget and projection](16-FEATURE-recap-budget-projection.md) | 3 |
| 17 | AI | [Spending memory (RAG)](17-AI-spending-memory-rag.md) | 3 |
| 18 | AI | [Chat tools and the insights agent](18-AI-chat-tools-and-insights-agent.md) | 4 |
| 19 | AI | [Supervisor, capture and budget agents](19-AI-supervisor-capture-budget-agents.md) | 4 |
| 20 | BE | [Chat endpoint, checkpointer and rate limits](20-BE-chat-endpoint-checkpointer-rate-limits.md) | 4 |
| 21 | FE | [Chat UI and confirm cards](21-FE-chat-ui-and-confirm-cards.md) | 4 |
| 22 | TEST | [Routing, behaviour and safety evals](22-TEST-routing-behaviour-safety-evals.md) | 4 |
| 23 | OPS | [Tracing, deployment and release](23-OPS-tracing-deploy-release.md) | 5 |
| 24 | DOCS | [README, demo and v1 data migration](24-DOCS-readme-demo-migration.md) | 5 |

**Start at step 02.** Steps 00 and 01 are skipped for now (see their files).

**Shippable app after step 16. Portfolio centerpiece after step 22.**

## Conventions

- **Backend language:** Python, FastAPI and LangGraph (decided, `../adr/001-backend-language-python.md`).
- **Library names and APIs** are from memory. Read the current docs before coding each step, and write down any difference you find.
- **Time estimates** assume a learning pace and are rough. Treat them as relative sizes, not promises.
- Tick the task boxes in your own copy, or note progress in `docs/learning-log.md`.
- Every step ends with a "Done when" check. Don't start the next step until it passes.
- Decisions go into short ADRs in `docs/adr/` (numbered, one per decision).
