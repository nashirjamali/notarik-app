# 09 — Frontend and end-to-end basics

**Label:** TEST · **Phase:** 1 · **Depends on:** 08 · **Size:** ~5–8 h

## Goal
Automated checks for the app's critical paths, wired into CI, so later changes don't silently break Phase 1.

## You will learn
- What to unit test, what to component test, what to leave to end-to-end tests
- Testing React Native components
- Browser end-to-end tests against the web build

## Build
- [x] Set up the unit/component test runner (Jest with the React Native testing library, per Expo docs).
- [x] Cover pure logic first: money formatting, amount parsing, totals, date grouping.
- [x] Component tests for the add-expense form (validation errors, adding/removing items).
- [x] End-to-end test of the web build with Playwright: sign up, add an expense, see it in the list, delete it. Use a dedicated test database and a seeded test user.
- [x] Run lint, type check and tests in CI for the mobile app.

## Done when
- CI runs lint, types, unit and the end-to-end test on every pull request.
- You can break something on purpose and see CI fail.

## Tests
- This step is the tests. Review them: does each test fail when the feature breaks?

## Pitfalls
- Snapshot tests that nobody reviews.
- End-to-end tests that depend on timing. Wait on conditions, not on sleeps.
- Testing the library instead of your logic.

## Read
- Expo docs on unit testing; Playwright docs; Testing Library guiding principles
