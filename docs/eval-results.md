# Eval results

No baseline number yet. Step 00 needs 40 or more real receipts, labelled by hand, with the images kept out of git. The scorer and the receipt graph are in place and covered by tests. Those tests use scripted model output, so they do not measure a vision model.

| Run | Split | Total exact match | Notes |
|-----|-------|-------------------|-------|
| — | dev | — | Waiting on labelled receipt photos |

When the photos exist, run extraction with `OPENROUTER_API_KEY` set and score the dev split with `app.ai.score`. Leave the held-out test split untouched until that comparison is written down.
