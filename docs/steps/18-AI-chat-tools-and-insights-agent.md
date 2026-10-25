# 18 — Chat tools and the insights agent

**Label:** AI · **Phase:** 4 · **Depends on:** 16, 17 · **Size:** ~10–14 h

## Goal
A single tool-calling agent that answers questions about spending using safe, read-only, user-scoped tools. Start with one agent, as the plan says, and split later only if it needs it.

## You will learn
- Tool design: names, schemas, descriptions, return shapes the model can use
- The tool-calling loop in LangGraph / LangChain (check the current agent API)
- Why `user_id` never comes from the model
- Grounding answers in tool results and detecting made-up numbers

## Build
- [x] Implement tools from `PLAN.md` Part 2b: `spend_by_category`, `top_merchants`, `compare_periods`, `list_transactions`, `get_budget`, `search_spending_memory`.
- [x] Tools take `user_id` from server-side state only and run through the RLS-enforced session.
- [x] Return compact, structured results with currency and the exact period used.
- [ ] Build the agent with a system prompt that says: answer from tool results only, state the period, say when data is missing, ask a clarifying question when the request is ambiguous.
- [ ] A fixture database of known transactions for repeatable tests.
- [ ] A script that asks 15 sample questions and prints answers and the tool calls used.

## Done when
- "How much did I spend on dining in August?" matches the SQL ground truth exactly.
- "How much on coffee this year?" finds items via memory search and the total matches ground truth.

## Tests
- Tool unit tests against the fixture database, including empty periods and bad date ranges.
- Behaviour tests: the answer's numbers equal the ground truth; the agent calls the expected tool.
- Test that tool arguments can't contain a `user_id` and that a forged one is ignored.

## Pitfalls
- Too many overlapping tools, so the model picks wrongly.
- Returning raw rows that blow up the context.
- Letting the model do arithmetic on large lists. Aggregate in SQL.
- No test for "no data" and "ambiguous" requests.

## Read
- LangGraph / LangChain docs on tool calling and agents; Anthropic's guidance on writing tools for agents
