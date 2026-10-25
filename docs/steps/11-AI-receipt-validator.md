# 11 — Receipt validator (plain code)

**Label:** AI · **Phase:** 2 · **Depends on:** 10 · **Size:** ~5–7 h

## Goal
A deterministic validator that checks an `ExpenseDraft` and returns specific, machine-readable issues. It is the safety net and the input for the repair loop.

## You will learn
- Why verification should be code, not another LLM call
- Designing issue codes that make good repair prompts
- Property-style thinking: invariants of a valid receipt

## Build
- [x] Implement checks from `PLAN.md` Part 2b: items sum vs subtotal (small tolerance), total >= subtotal, date not in the future or too old, missing total, schema invalid, "item price looks like a unit price" heuristic (for example price x qty equals a plausible subtotal).
- [x] Each issue has a code, the field, and a detail string that is safe to feed back to the model.
- [x] Decide the rules for rounding, service charge and tax lines. Write them down.
- [ ] Run the validator over the labelled dataset: how often does it flag correct labels (false positives) and how often does it catch real extraction errors?

## Done when
- The validator flags a known-bad extraction and passes a known-good one.
- You can report false positive and catch rates on the dataset.

## Tests
- Table-driven unit tests: one case per issue code, plus tolerant-boundary cases.
- No network or model needed. These tests are fast and run on every change.

## Pitfalls
- Too-strict rules that reject real receipts with rounding.
- Letting the validator call the model. It must stay deterministic.
- Over-fitting rules to your dataset. Keep them explainable.

## Read
- Your labelling guide from step 00; Indonesian receipt conventions (PPN, service charge, rounding)
