# ADR-005: One route per message

**Status:** accepted
**Date:** 2026-10-18

## Decision

The chat supervisor is a small classifier in `app/ai/router.py`. It has no tools. A message is exactly one of `capture`, `insights`, `budget`, `smalltalk`, or `refuse`.

If the text contains an amount to log and also a question ("kopi 18rb, was that too much?"), the route is `capture`. The expense is only a `pending_action`. The question waits for a later turn. A follow-up such as "and last month?" stays on `insights` when that was the previous route.

Writes happen only in `POST /chat/{thread_id}/confirm`. `insights` and `refuse` never set `pending_action`.

## Consequences

Routing can be scored without a model call. An LLM router can replace `route_message` later if a labelled set shows it is more accurate. Until then the split into specialist agents is this classifier plus the capture, insights, and budget handlers.
