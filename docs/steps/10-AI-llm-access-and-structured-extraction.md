# 10 — LLM access and structured extraction

**Label:** AI · **Phase:** 2 · **Depends on:** 00 (dataset, now required), 02 · **Size:** ~8–12 h

## Goal
A single extraction function that turns a receipt image into a schema-validated `ExpenseDraft` through OpenRouter, and beats the baseline from step 00 or tells you why not.

## You will learn
- Calling models through LangChain chat models pointed at OpenRouter
- Structured output with a Pydantic schema versus parsing free text
- Prompt design for vision tasks and domain rules
- Cost, latency and token accounting per call

## Before you start
- [ ] Step 00 (dataset and baseline) is done.
- [x] Write **ADR-003: LLM access** (OpenRouter via LangChain chat models; which models you will compare).

## Build
- [x] Configure the chat model through OpenRouter (key from env, model name configurable).
- [x] Define `ExpenseDraft` and `Item` per `PLAN.md` Part 2b.
- [x] Write the extraction prompt, reusing the v1 receipt rules (rightmost amount is the line total, final payable total not subtotal, integers, null when unsure).
- [x] Use the model's structured-output mode with the schema. Handle schema-invalid output as a typed failure, not a crash.
- [x] Record per call: model, latency, input/output tokens, cost estimate.
- [ ] Run it on the dev split from step 00 and compare to the baseline.

## Done when
- One function `extract(image) -> ExpenseDraft | ExtractionFailure`.
- You have a table: baseline vs structured extraction, by metric, on the dev split.

## Tests
- Unit tests with a fake model: valid output, invalid output, timeout, rate limit.
- Eval run on the dev split (not the test split) with the scorer from step 00.

## Pitfalls
- Tuning the prompt until it fits the dev split perfectly. Keep the test split untouched.
- Images too large or too many tokens; resize first.
- Assuming a model supports structured output or vision. Check the model's capabilities on OpenRouter.

## Read
- LangChain docs on structured output and chat models; OpenRouter model pages
