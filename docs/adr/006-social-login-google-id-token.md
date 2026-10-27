# ADR-006: Google sign-in by verifying Google ID tokens in our API

**Status:** accepted · **Date:** 2026-10-27 · **Amends:** ADR-002

## Context
Login and Sign up already show "Continue with Google" and "Continue with Apple", but nothing is behind them. ADR-002's amendment (2026-10-17) made the API issue its own tokens (HS256 access token, refresh token in Postgres) because no Supabase project exists. Every data route and every RLS policy trusts only that token.

The first idea was Supabase Auth as an identity broker (option A). With Google as the only provider, Supabase would add a project that pauses when idle, a dashboard to configure and a second token system, for one JWKS we can read ourselves. Options considered (details in `docs/plans/social-login.md`):

- **A. Supabase as identity broker.** App signs in through Supabase, API exchanges the Supabase token.
- **B. Full move to Supabase Auth.** Rewrites login, signup, refresh, logout, tests and session storage.
- **C. Verify the provider's ID token in our API.** App gets a Google ID token, API checks it against Google's public keys.

## Decision
Option C. First cut: **Google, on iOS and web**. Apple and Android come later and fit the same route.

- The app obtains a Google ID token with `expo-auth-session` on both platforms: the iOS client with authorization code + PKCE (no secret in the app; redirect is the reversed client ID scheme), and the web client with the `id_token` response type. The first plan used `@react-native-google-signin/google-signin`, but its free API cannot send a nonce, so it was dropped. Both client IDs are in the accepted `aud` list.
- A new `POST /auth/social` takes `{provider, id_token, nonce}`. Only `google` exists at first; the `provider` field keeps the route stable when Apple is added.
- The API verifies the token with Google's JWKS (`https://www.googleapis.com/oauth2/v3/certs`): `RS256` only, key chosen by `kid` and cached; `exp`; `iss` is `https://accounts.google.com` or `accounts.google.com`; `aud` is in the configured list of our client IDs; `nonce` matches; `email` present.
- The API then finds or creates the user and returns the normal `TokenPair`. Refresh, logout, RLS and the data routes do not change.
- Identities are stored in a new `user_identities` table, unique on `(provider, provider_subject)`. `users.password_hash` becomes nullable for social-only accounts.
- **Linking rule:** an identity is linked to an existing account by email only when `email_verified` is true. Otherwise the request is rejected. A password is never overwritten or removed by a social login.
- Password login on a social-only account fails with the same "Wrong email or password" as any other bad login.
- Google client IDs are public, not secrets. No client secret is needed for the ID-token flow and none is stored. No Supabase project or key is used by the app or the API.

## Consequences
- No external service to keep alive; `make test` needs no network: tests sign RS256 tokens with a test key and serve a fake JWKS.
- We own nonce handling, key caching and account linking. The tests for those are the security work of this feature.
- The web flow (redirect, PKCE, returning the ID token) is ours to wire; Supabase would have done it.
- The iOS redirect scheme (`com.googleusercontent.apps.…`) is registered in `app.json`, so iOS needs a development build (`npx expo run:ios`), not Expo Go. Sign-in opens Google in the system web sheet rather than the native account picker.
- App Store guideline 4.8 asks for an equivalent privacy-preserving login option when a third-party login is offered, and Sign in with Apple is the usual answer. This only matters when shipping to the App Store; check the current text then. Apple needs the Developer Program ($99/year).
- If we later want more providers or hosted account management, option A or B can be revisited without changing RLS.
