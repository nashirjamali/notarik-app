# ADR-003: LLM access

**Status:** accepted
**Date:** 2026-10-18

## Decision

Model calls go to OpenRouter's OpenAI-compatible chat completions API (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, default `google/gemini-2.5-flash`). Receipt extraction asks for a JSON object and validates it with `ExpenseDraft`. Invalid JSON or a failed schema check is `ExtractionFailure`, which the receipt graph turns into a `SCHEMA_INVALID` issue.

Tests and local runs without a key use `ScriptedModel`. The receipt and chat flows are explicit Python graphs with the nodes from `docs/PLAN.md` (preprocess, extract, validate, repair, categorize, gate, review). They are not a LangGraph process yet. The HTTP API does not change when that swap happens.

## Consequences

A missing key means receipt upload cannot read an image. Chat answers for amounts, budgets, and totals are computed in SQL and Python, so those screens work without a model. Cost is estimated from token counts, not from an OpenRouter invoice.
