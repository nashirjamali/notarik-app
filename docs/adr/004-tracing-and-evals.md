# ADR-004: Tracing and evals

**Status:** accepted
**Date:** 2026-10-18

## Decision

Evals stay in the repo and in pytest. There is no LangSmith or Langfuse project yet. Each receipt run already stores `model`, `graph_version`, `latency_ms`, `cost_usd`, `validator_result`, and `user_edited_fields` on `extraction_runs`. The scorer in `app/ai/score.py` is the metric definition (total exact match, date match, item precision/recall, category accuracy, parse failures).

Real receipt photos are personal data and stay gitignored under `apps/api/evals/data/`. The baseline number is not measured until those labelled images exist. CI runs the scorer, the receipt graph, and the router on fixtures, which costs nothing.

## Consequences

`docs/eval-results.md` must not invent an accuracy percentage. A later ADR can point the same scorer at LangSmith once a dataset of real receipts exists.
