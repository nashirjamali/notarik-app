# 20 — Chat endpoint, checkpointer and rate limits

**Label:** BE · **Phase:** 4 · **Depends on:** 19 · **Size:** ~8–12 h

## Goal
Serve the chat graph over a streaming API with persisted, user-isolated conversations and hard limits on cost.

## You will learn
- Streaming tokens and structured events to a client
- LangGraph's Postgres checkpointer and thread management
- RLS for checkpoint and message tables
- Rate limiting and budgets for paid APIs

## Build
- [x] `POST /chat` with `thread_id`, message and optional attachments; streams tokens, tool-call events and a final `pending_action` if any.
- [x] `POST /chat/{thread_id}/confirm` with approve / edit / reject.
- [ ] Configure the Postgres checkpointer. Make sure its tables carry the `user_id` (or thread metadata) and have RLS, and that loading a thread verifies ownership.
- [x] Per-user rate limit (requests per minute) and a daily token/cost budget; clear error codes for each.
- [x] Input limits: message length, attachment size, history length.
- [ ] Log every tool call with user, latency and cost for tracing.

## Done when
- A conversation survives a server restart and can be resumed.
- Hitting the rate limit returns a clear error, not a hang or a bill.

## Tests
- Integration tests with a fake model: send, stream, confirm, reject.
- User B cannot load or confirm user A's thread.
- Rate limit and budget enforcement under repeated requests.
- Tool calls never use a `user_id` other than the authenticated one.

## Pitfalls
- Checkpointer tables outside RLS: the most likely leak in the whole system.
- Streaming errors after headers are sent; design a final error event.
- Unlimited history growing cost on every turn.

## Read
- LangGraph persistence docs; FastAPI streaming; your rate-limiting library of choice
