# 19 — Supervisor, capture and budget agents

**Label:** AI · **Phase:** 4 · **Depends on:** 12, 18 · **Size:** ~12–16 h

## Goal
Split the single agent into a supervisor with specialist agents, add write-proposing agents behind a confirm gate, and justify the split with routing evidence.

## You will learn
- The supervisor pattern and handoffs in LangGraph, with subgraphs
- Routing as a classification problem you can evaluate
- Human-in-the-loop confirmation for writes
- Persisting conversation state

## Build
- [ ] Write the routing eval cases first (see step 22 and `PLAN.md` Part 2b) and measure the single agent.
- [ ] Add `supervisor` (structured-output router, cheap model, no tools) and the `ChatState` from the plan.
- [x] `capture` agent: text → `ExpenseDraft`; photo attachment → invoke the receipt graph as a subgraph. It only creates a `PendingAction`.
- [x] `budget` agent: read tools plus `propose_budget_change` (proposal only).
- [x] `confirm` interrupt node and `commit` node. Only `commit` writes, through the normal API layer.
- [x] Handle follow-ups ("and last month?") so context routes to the same specialist.
- [x] Decide the policy for messages that need two routes (for example log an expense and ask if it was too much). Document it as an ADR.
- [ ] Compare single-agent vs supervisor on routing accuracy, answer quality, cost and latency. Keep the supervisor only if it earns it.

## Done when
- Messages route correctly on the routing eval, and no write happens without confirmation.
- You can state, with numbers, why the split is better or worse.

## Tests
- Routing eval (step 22) passes the agreed threshold.
- Confirm gate tests: approve writes once, reject writes nothing, edit writes the edited version.
- A test that agents without write tools cannot write, whatever the prompt says.

## Pitfalls
- Splitting into agents because it sounds impressive. Measure first.
- Routing on keywords instead of intent.
- Supervisor with tools. Keep it a pure router.
- State bloat from keeping the full history. Trim or summarize.

## Read
- LangGraph docs: multi-agent / supervisor, subgraphs, persistence, interrupts
