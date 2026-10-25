# 13 — Receipt endpoints, storage and SSE

**Label:** BE · **Phase:** 2 · **Depends on:** 05, 12 · **Size:** ~8–12 h

## Goal
Expose the receipt graph through the API: upload an image, watch progress live, review and confirm.

## You will learn
- File upload handling and object storage with signed URLs
- Long-running work and streaming progress with Server-Sent Events
- Running a graph per request, per user, safely

## Build
- [x] `POST /receipts`: validate type and size, store the file in object storage under a user-scoped path, create an `extraction_runs` row, start the graph, return a `run_id`.
- [x] `GET /receipts/{run_id}/events`: SSE stream of graph step events; ends on interrupt or finish.
- [x] `GET /receipts/{run_id}`: current draft, issues and status.
- [x] `POST /receipts/{run_id}/confirm`: resume the graph with the user's edits; create the transaction; record `user_edited_fields`.
- [x] Storage policy so users can read only their own receipt images.
- [x] Limits: max file size, allowed MIME types, max pages, per-user concurrent runs.
- [x] Persist run metadata: model, graph version, latency, cost, validator result.

## Done when
- From a script you can upload a receipt, stream events, confirm and see the transaction.
- Another user cannot read your run, events or image.

## Tests
- Integration test with a fake model: upload → events → confirm → transaction exists with items.
- Oversized and wrong-type uploads are rejected.
- Cross-user access to runs and images returns 404.
- Disconnecting mid-stream does not leave the run stuck.

## Pitfalls
- Trusting the file extension instead of the content type.
- Running the graph inside the request handler without a time limit.
- Public storage buckets.
- Forgetting to cap cost per user.

## Read
- FastAPI streaming responses / SSE; your storage provider's signed URL and policy docs
