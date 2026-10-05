# 22 — Routing, behaviour and safety evals

**Label:** TEST · **Phase:** 4 · **Depends on:** 19, 20 · **Size:** ~10–14 h

## Goal
Three eval suites for the chat system, running in CI, so prompt, tool and graph changes can't silently break routing, correctness or safety.

## You will learn
- Building labelled datasets for classification and agent behaviour
- LLM-as-judge versus programmatic checks, and when each is trustworthy
- Red-teaming your own system
- Gating releases on eval results

## Build
- [ ] **Routing:** 60–80 labelled messages (see `PLAN.md` Part 2b) incl. mixed Indonesian/English, amounts like `25rb`, follow-ups, edit/delete intents, out-of-scope. Report per-class accuracy, a confusion matrix, and wrong-route-write rate (must be 0).
- [ ] **Behaviour:** fixture database plus cases where the answer is checkable programmatically (numbers match SQL ground truth; correct tool called; no write before confirm).
- [ ] **Safety:** prompt-injection in item and merchant names; requests for another user's data or a forged `user_id`; asking a read-only agent to write; 50 rapid requests; oversized inputs.
- [ ] Decide thresholds (for example: routing >= X%, safety 100%) and record them in an ADR.
- [ ] CI runs routing and safety on every change to prompts, tools or graphs. Behaviour runs before releases.
- [ ] Reports include model, graph version and cost so runs are comparable.
- [ ] If you use an LLM judge for free-text quality, validate the judge against ~20 hand-graded examples first.

## Done when
- A deliberately weakened prompt fails CI.
- Safety suite passes at 100% and you can explain each case.

## Tests
- Unit tests for the evaluators and report code.
- Manually try five attacks of your own that aren't in the suite, then add them.

## Pitfalls
- Eval cases written after seeing failures only. Include cases you expect to pass.
- Judge models grading their own family's output leniently.
- Treating a passing eval as proof of safety. It's a regression net, not a guarantee. The real protection is RLS and confirm gates.

## Read
- OWASP Top 10 for LLM applications; Promptfoo or similar red-teaming tool docs; LangSmith eval docs
