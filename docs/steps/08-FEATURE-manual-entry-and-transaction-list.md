# 08 — Manual entry and transaction list

**Label:** FEATURE (backend + frontend) · **Phase:** 1 · **Depends on:** 05, 07 · **Size:** ~8–12 h

## Goal
The first complete vertical slice: add an expense by hand with line items, see it in a list, open it, edit it and delete it, on phone and web.

## You will learn
- Building a form with validation, line items and live totals
- Optimistic updates and cache invalidation
- Infinite lists with cursor pagination
- Money entry UX (typing "25000", "25rb", paste)

## Build
- [x] Add screen: merchant, date picker, category picker (six categories, colors from the tokens), total, optional line items (add/remove rows).
- [x] Decide and document the rule: is `total` typed by the user or computed from items? Show a warning if they differ.
- [x] Transactions list: grouped by day, newest first, infinite scroll, pull to refresh, month filter.
- [x] Detail screen with items; edit and delete (with confirmation; allow removing a single line item as v1 did).
- [x] Error handling: server validation errors shown next to the right field.

## Done when
- You can create, view, edit and delete an expense end to end on phone and in the browser.
- A second account sees none of your data (manually verify).

## Tests
- Unit tests for amount parsing ("25rb", "1,5jt", "25.000") and for the totals logic.
- API-level test for the full create-with-items flow.
- Manual script: create, edit, delete, refresh the list, kill the network mid-save.

## Pitfalls
- Floating-point arithmetic on money. Use integers throughout.
- Losing form input on a failed save.
- List flicker caused by unstable keys or refetching everything after a single change.

## Read
- React Native `FlatList`; TanStack Query mutations and optimistic updates
