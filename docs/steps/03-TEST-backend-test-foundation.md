# 03 — Backend test foundation

**Label:** TEST · **Phase:** 1 · **Depends on:** 02 · **Size:** ~4–6 h

## Goal
A reliable test setup against a real Postgres, so RLS and queries can be tested properly before you write much code.

## You will learn
- Why test against a real database instead of mocks (especially for RLS)
- Fixtures, test isolation and transaction rollback per test
- Test pyramid: unit, integration, end-to-end

## Build
- [ ] Set up the test runner (pytest, if Python) and a test database created and migrated automatically.
- [ ] Fixtures: a database connection as `app_user`, an admin connection for setup, a `make_user()` helper that creates two distinct users.
- [ ] Isolation: each test runs in a transaction that rolls back, or the database is truncated between tests.
- [ ] API test client fixture that can send requests with a given user's token (a fake token for now).
- [ ] A command to run tests and one to run only fast unit tests. Add both to `CLAUDE.md`.
- [ ] Set up CI (GitHub Actions) running the tests with a Postgres service.

## Done when
- `make test` passes locally and in CI on a clean checkout.
- A deliberately failing test is reported clearly, then removed.

## Tests
- Write one test that proves the isolation works: data created in one test is not visible in the next.

## Pitfalls
- Tests passing because they connect as the owner or superuser, which bypasses RLS. The fixture must use `app_user`.
- Slow tests from recreating the schema each time. Create once per session, clean per test.

## Read
- pytest fixtures docs; FastAPI testing docs; GitHub Actions Postgres service containers
