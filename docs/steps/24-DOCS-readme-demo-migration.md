# 24 — README, demo and v1 data migration

**Label:** DOCS · **Phase:** 5 · **Depends on:** 23 · **Size:** ~8–12 h

## Goal
Make the project understandable in three minutes and carry your old data over.

## You will learn
- Writing for a reviewer: lead with evidence, not features
- Recording a demo
- Safe one-off data migrations

## Build
- [ ] README: one-paragraph pitch, 30-second demo GIF, architecture diagram of both graphs, the eval results table (baseline vs graph, per model, with cost), how to run it, and a "decisions and trade-offs" section.
- [ ] A "what failed / limits" section with real numbers, for example the failure types that remain.
- [ ] Link or screenshot traces. Link the ADRs.
- [ ] Demo video (2–3 minutes): scan a receipt with the repair loop visible, ask a question in chat, approve an action.
- [ ] Migration script: read the old prototype's `transactions` table and insert into the new schema under your user ID, splitting items into `transaction_items`. Dry-run mode, idempotent, with a count check at the end.
- [ ] Final cleanup: remove dead code, unused dependencies, TODOs; run the security checklist; confirm no secrets or personal receipts are in git history.
- [ ] Decide public vs private; if public, review all docs once for anything personal.

## Done when
- A stranger can understand what it does, how well it works and how it's built from the README alone.
- Your old data is in the new app and the counts match.

## Tests
- Migration: dry-run output matches the real run; running twice creates no duplicates.
- Fresh-clone test: follow the README on a clean machine or container.

## Pitfalls
- A README that lists features but no evidence.
- Claiming results you can't reproduce with a command.
- Leaking personal receipts in screenshots or the eval dataset.

## Read
- Examples of strong open-source READMEs; GitHub guidance on removing sensitive data
