# 12 — Receipt graph with LangGraph

**Label:** AI · **Phase:** 2 · **Depends on:** 10, 11 · **Size:** ~10–14 h

## Goal
Compose extract, validate, repair, categorize and review into one LangGraph graph with a bounded loop and a human-in-the-loop pause, and show it improves on single-shot extraction.

## You will learn
- LangGraph state, nodes, edges and conditional edges
- Cycles with a hard limit
- Interrupts for human review and resuming with edits
- Checkpointing and what state must be serializable
- Why a workflow graph is the right shape here, not a team of agents

## Build
- [ ] Define `ReceiptState` (per `PLAN.md` Part 2b).
- [ ] Nodes: `preprocess`, `extract`, `validate`, `repair`, `categorize`, `gate`, `review` (interrupt), `persist`.
- [ ] Conditional edges: issues and attempts < 2 → repair; otherwise continue with issues carried forward.
- [ ] The `repair` node re-reads the image with the specific issues and targets only failing fields.
- [ ] Stub `categorize` with a simple LLM call for now; the RAG hook comes in step 17.
- [ ] `review` pauses the graph and resumes with the user's edits.
- [ ] Emit step events (`trace`) for later SSE streaming.
- [ ] Run on the dev split: compare single-shot vs graph, with accuracy, repair rate, latency and cost.

## Done when
- The graph runs end to end from a script, pauses at review and resumes.
- You can show whether the repair loop improved total-exact-match, and by how much. A null result is a valid result; write it down.

## Tests
- Node-level unit tests with fake models.
- Graph-level tests with a scripted fake model: no-issue path, one repair, repair exhausted, resume after interrupt.
- Loop bound test: the graph never exceeds the attempt limit.

## Pitfalls
- Unbounded loops and runaway cost.
- State that can't be serialized, which breaks the checkpointer.
- Letting the repair node rewrite fields that were already correct.
- Adding nodes because they look impressive. Every node must earn its place with a measured effect.

## Read
- LangGraph docs: concepts, persistence, human-in-the-loop (check the current API names)
