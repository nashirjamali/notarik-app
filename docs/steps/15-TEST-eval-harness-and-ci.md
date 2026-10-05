# 15 — Eval harness and CI

**Label:** TEST · **Phase:** 2 · **Depends on:** 00, 12 · **Size:** ~8–12 h

## Goal
A repeatable evaluation harness that runs the receipt pipeline over the dataset, produces comparable reports, and guards against regressions in CI.

## You will learn
- Offline evals versus online signals
- Experiment tracking: comparing runs by model, prompt and graph version
- Cost and flakiness control for LLM tests
- Statistical caution with small datasets

## Before you start
- [ ] Write **ADR-004: tracing and eval tool** (LangSmith vs Langfuse).

## Build
- [ ] A single command `eval receipts --split dev|test --model X --graph Y` that runs the dataset and writes a JSON report plus a Markdown table.
- [ ] Metrics: total exact match, date match, item precision/recall, category accuracy, % flagged for review, latency p50/p95, cost per receipt, failure count.
- [ ] Log runs to your tracing tool (LangSmith or Langfuse) as a dataset with experiments.
- [ ] Compare at least two models and two graph variants (single-shot vs with repair). Put the results in `docs/eval-results.md`.
- [ ] A small CI subset (5–10 receipts, cheap model, cached where possible) that fails if total-exact-match drops below a threshold.
- [ ] Capture the live correction signal: aggregate `user_edited_fields` from `extraction_runs` into a report of which fields users fix most.

## Done when
- One command reproduces the results table in the docs.
- CI fails if you deliberately break the prompt.

## Tests
- Unit tests for the report generator and metric functions.
- A "canary" test with a scripted fake model so CI can check harness plumbing without calling an API.

## Pitfalls
- Reporting differences that are noise: with 40 receipts, a 2-point change is not a result. State confidence honestly.
- CI that burns money. Cap the subset and cache.
- Comparing runs with different dataset versions. Version the dataset.

## Read
- LangSmith / Langfuse evaluation docs; articles on LLM evaluation pitfalls
