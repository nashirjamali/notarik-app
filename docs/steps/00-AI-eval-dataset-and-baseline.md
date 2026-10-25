# 00 — Eval dataset and baseline

**Status:** DEFERRED. Not needed for steps 02–09. **Must be done before step 10**, because steps 10, 12, 15 and 17 score results against this dataset. You can label receipts in the background while building steps 02–09.

**Label:** AI · **Phase:** 0 · **Depends on:** none · **Size:** ~6–10 h (mostly labelling)

## Goal
A labelled set of real receipts and a script that scores the old v1 extraction prompt on it. This gives you a baseline number that every later improvement is measured against.

## You will learn
- What an evaluation dataset is and why it comes before the model
- Choosing metrics that match the task (exact match for totals, precision/recall for items)
- Why you keep evaluation data out of prompts you tune

## Build
- [ ] Collect 40–60 receipts (photos and a few PDFs). Mix: supermarkets, restaurants, thermal-faded, crumpled, long, short, multi-page.
- [ ] Redact personal data (names, card digits, phone numbers) before saving.
- [x] Define a label format in JSON per receipt: `merchant`, `date`, `subtotal`, `total`, `items[{name, qty, line_total}]`, `category`. Write a short `labeling-guide.md` with your rules (for example: what counts as the total on a receipt with rounding or service charge).
- [ ] Label every receipt by hand. Split ~30% as a held-out **test split** and don't tune prompts on it.
- [ ] Write a script that sends each receipt to the model with the old v1 prompt (`../notarik/lib/extraction.ts`) and saves raw outputs.
- [x] Write a scorer: total exact match, date match, item precision/recall (match items by normalized name plus line total), category accuracy, parse failures.
- [ ] Record the baseline results in `docs/eval-results.md`.

## Done when
- There are at least 40 labelled receipts and a held-out split.
- One command prints the baseline score table.
- You can say what the biggest failure type is (for example: unit price instead of line total).

## Tests
- Unit tests for the scorer itself (known inputs → known scores), including edge cases like a missing total.

## Pitfalls
- Labelling inconsistently. Write the rule down the first time you hesitate.
- Raw images are personal data. They are already ignored by `.gitignore`; keep it that way.
- Tuning on the test split makes your numbers meaningless.

## Read
- Hamel Husain's writing on evals for LLM apps; LangSmith evaluation docs
