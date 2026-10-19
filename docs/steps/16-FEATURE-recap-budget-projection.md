# 16 — Recap, budget and projection

**Label:** FEATURE (backend + frontend) · **Phase:** 3 · **Depends on:** 08 · **Size:** ~12–16 h

## Goal
A Home screen with the monthly recap by category, a monthly budget with spent-vs-limit, and a projection clearly labelled as an estimate. Once this works, you have a shippable app.

## You will learn
- SQL aggregation (`GROUP BY`, date truncation, windowing) instead of client-side loops
- Time zones and month boundaries (Asia/Jakarta)
- Data visualization that is honest and accessible
- Designing a projection that doesn't pretend to be a promise

## Build
- [x] `GET /recap?month=YYYY-MM`: totals per category, total spent, count; computed in SQL.
- [x] `GET/PUT /budget?month=`: total monthly budget per user and month.
- [x] `GET /projection?month=`: straight-line run-rate estimate, with the method explained in the response.
- [x] Re-implement the recap and projection logic from the old prototype (`../notarik/lib/recap.ts`) by understanding it, not copying it. Decide edge cases: partial first week, month with no data, budget not set.
- [ ] Frontend: donut or bar chart with the category colors, accessible labels, a month selector, budget progress with status colors (on track, near limit, over), and the projection with "estimate" wording.
- [ ] Empty and first-use states.

## Done when
- Numbers on screen match a hand-computed example.
- Changing the month updates everything; deleting a transaction updates the recap.

## Tests
- SQL-level tests with fixed data for each aggregation, including month-boundary and timezone cases.
- Projection tests: day 1, mid-month, last day, no data.
- RLS: another user's data never appears in your recap.
- Component tests for budget status thresholds.

## Pitfalls
- UTC versus local time putting a late-night expense in the wrong month.
- Color-only status indication (add icons or text).
- A projection shown with false precision.

## Read
- Postgres `date_trunc` and `AT TIME ZONE`; WCAG on non-color cues; your chart library's accessibility notes
