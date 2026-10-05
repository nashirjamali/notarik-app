# 07 — Auth screens and API client

**Label:** FE · **Phase:** 1 · **Depends on:** 04, 05, 06 · **Size:** ~8–10 h

## Goal
Users can sign up, log in and log out; the app stores the session securely and calls the API with a typed client.

## You will learn
- Mobile auth flows, token storage and refresh
- Why secure storage differs from web storage
- Typed API clients from an OpenAPI spec
- Server state with TanStack Query (caching, loading and error states)

## Build
- [ ] Sign up, log in and log out screens using the auth provider's client library.
- [ ] Store the session in secure storage on native and the provider's recommended storage on web. Restore it on app start.
- [ ] Route guard: unauthenticated users see only auth screens.
- [ ] Generate the typed client from the OpenAPI spec (step 05) and wrap it so every request carries the access token and refreshes when expired.
- [ ] Set up TanStack Query with sensible defaults (retry, stale time) and a shared error handler that signs out on 401.
- [ ] Loading, empty and error states for every query-backed screen.

## Done when
- You can sign up, close the app, reopen it and still be signed in.
- An expired token refreshes automatically; a revoked session returns to login.

## Tests
- Unit tests for the auth guard logic and token-refresh wrapper (mock the network).
- Manual check on phone and web: wrong password, no network, expired token.

## Pitfalls
- Storing tokens in plain async storage on native.
- Racing refreshes: several requests triggering several refreshes at once.
- Putting the service role key or any secret into the app. Only the public anon key belongs there.

## Read
- Your auth provider's React Native guide; TanStack Query docs; `expo-secure-store`
