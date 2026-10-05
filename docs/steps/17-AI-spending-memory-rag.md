# 17 — Spending memory (RAG)

**Label:** AI · **Phase:** 3 · **Depends on:** 12, 16 · **Size:** ~10–14 h

## Goal
One retrieval index over the user's own transactions and corrections that improves categorization now and powers semantic questions in step 18. Measure whether it helps.

## You will learn
- Embeddings and similarity search with pgvector
- Hybrid retrieval: exact/trigram match first, vectors as a fallback
- Chunking small structured records
- Evaluating retrieval, not just generation (ablations)
- RLS and vector search together

## Build
- [ ] Enable pgvector. Add the memory table: `user_id`, `kind` (transaction or correction), `source_id`, `text`, `embedding`. RLS policy on it.
- [ ] Write the indexing step: on confirm, embed `merchant | item names | category`; on user correction, embed the corrected mapping.
- [ ] Implement `search_spending_memory(query, k)`: filter by user, exact/trigram merchant match, then vector search.
- [ ] Wire it into the `categorize` node as few-shot examples; skip the LLM when a high-confidence merchant match exists.
- [ ] Ablation on the dataset (or a simulated history): category accuracy and cost with vs without retrieval.
- [ ] Decide the embedding model and record cost and latency.

## Done when
- Categorizing a merchant you've corrected before gets it right without a model call.
- You have a results table: with vs without retrieval.

## Tests
- Retrieval unit tests with a fixed small corpus: exact hit, near hit, no hit.
- RLS test: user B never retrieves user A's memory, even with an identical query.
- Test that corrections are indexed and the next lookup returns them.

## Pitfalls
- Embedding raw amounts or noisy text.
- Vector index plus RLS returning fewer than k rows; check recall.
- Declaring RAG a success without the ablation. If retrieval doesn't help, say so.

## Read
- pgvector README; embedding model docs on OpenRouter or your provider; hybrid search articles
