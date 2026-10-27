# Plan: sign in with Google (Apple later)

Status: **decided: option C, Google first, iOS + web ([ADR-006](../adr/006-social-login-google-id-token.md)). Built: steps 2a, 2b, 3 (API, 114 tests green) and the mobile code of steps 4 and 5. Not verified: a real Google sign-in on the simulator and in a browser (needs the owner's accounts); e2e for the Google button.** Screens: `apps/mobile/app/(auth)/login.tsx` and `signup.tsx` (the two buttons exist but only show "not available yet"). API: `apps/api/app/routers/auth.py`, `services/auth.py`, `core/security.py`.

## Goal

A user taps "Continue with Google" on Login or Sign up and lands in the app, on iPhone and web, with the same account rules as email and password. No change to RLS, to the other routes, or to how the app calls the API after sign-in. The route and tables are shaped so Apple (and Android) can be added without redesign.

Non-goals for now: Apple, Android, other providers, magic links, password reset, a Supabase project.

## What exists today

- The API issues its own tokens: HS256 access token (`sub`, `aud=authenticated`, 15 min) plus a refresh token stored in Postgres. Routes: `/auth/signup`, `/login`, `/refresh`, `/logout`. Passwords are hashed in `core/passwords.py`.
- The mobile app stores `{accessToken, refreshToken, userId}` in `src/lib/session.ts`.
- Every data route trusts only the API's own token, and RLS reads `sub` from it. That chain stays untouched.
- `pyjwt` is installed without the `crypto` extra, which RS256 verification needs.

## Flow

```
App                                Google              API                         Postgres
 | native sheet / web redirect (nonce) |                  |                             |
 |<-------- ID token ------------------|                  |                             |
 |-- POST /auth/social {provider:"google", id_token, nonce} ->| verify (Google JWKS)   |
 |                                                         |-- find/create user ------->|
 |<-- our TokenPair {access, refresh, user_id} ------------|                            |
 | saveSession(pair)  (same as email login)
```

The Google token is used once and thrown away. The app keeps only our pair, so refresh, logout, the API client and e2e stay unchanged.

## Backend

1. **Settings (2a):** `google_client_ids` (list of our Google client IDs: web, iOS). Empty means every social token is rejected, never accepted. PyJWT with the crypto extra. `.env.example` entries without secrets.
2. **Verifier (2b)** in `core/security.py`: `verify_google_token(token, nonce, settings)` using PyJWT's `PyJWKClient` (cached) against `https://www.googleapis.com/oauth2/v3/certs`. Algorithms `["RS256"]` only. Checks `exp`, `iss`, `aud` in the list, `nonce`, `sub`, `email`. Returns a small claims object (`sub`, `email`, `email_verified`, `name`).
3. **Migration `0009_identities`:** make `users.password_hash` nullable (check `0003_users_and_sessions.py` first) and add `user_identities(provider, provider_subject, user_id, email, created_at, unique(provider, provider_subject))`, with RLS or access rules in the same style as `users`.
4. **Service `auth.social_login`:**
   - Identity `(provider, sub)` exists: log that user in.
   - Else, if the email belongs to an existing account **and `email_verified` is true**: link the identity to it.
   - Else create the user (name from the token, no password) plus the identity.
   - Never link on an unverified email: that is the classic account-takeover hole.
5. **Route `POST /auth/social`** returns `TokenPair`; unknown `provider` is a 422/400, a bad token is the same 401 shape as the other routes. Add to the OpenAPI export and regenerate `schema.ts`.
6. **Password login on a social-only account** returns the generic "Wrong email or password".
7. **Abuse:** reuse whatever rate limiting the other auth routes have; note if there is none.

## Mobile

1. **Dependencies:** `expo-auth-session`, `expo-crypto` (nonce), `expo-web-browser`. The free native Google Sign-In library has no nonce option, so both platforms use `expo-auth-session`. iOS needs a **development build** (`npx expo run:ios`) because the Google redirect scheme is registered in `app.json`.
2. **`src/lib/google.ts`:** `signInWithGoogle()` returns `{idToken, nonce}` (iOS: code + PKCE then token exchange; web: `id_token` response). Cancelling returns `null`, not an error. Pure helpers are in `googleConfig.ts` with jest tests.
3. **`useAuth`:** add `socialLogin("google")`: helper, then `POST /auth/social`, then `storePair`, like `login`.
4. **Screens:** replace `comingSoon("Google sign-in")` on Login and Signup, with a busy state. The Apple button was removed from both screens; it comes back with the Apple work. "Continue with Google" keeps the outlined button, with the four-colour Google G (`login-google-color.svg`).
5. **`app.json`:** plugin for Google Sign-In, the iOS URL scheme, and `ios.bundleIdentifier` (not set today; the owner chooses it before the iOS client ID is created).
6. **Env:** `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.

## What the owner prepares (Google Cloud, free)

1. Project `Notarik` in Google Cloud.
2. OAuth consent screen: External, app name, support email, own Gmail as test user (status Testing is enough for development).
3. **Web client ID**: authorized JS origin `http://localhost:8081`, and **authorized redirect URI `http://localhost:8081`** (the web flow returns there; add it in Google Cloud before trying web).
4. **iOS client ID**: needs the bundle identifier (reverse-domain the owner controls, hard to change after release).
5. Android client ID (package name + SHA-1) and production domains come later.

Client IDs are public and can be pasted in chat. A client secret is not needed for this flow and must never be pasted or committed.

## Tests

- **API (no network):** sign RS256 tokens with a test key and serve a fake JWKS. Cases: new user created; same identity logs in again; existing email + verified links; existing email + **unverified does not link**; wrong `aud`, wrong `iss`, expired, wrong `nonce`, `alg=none`, HS256-signed token, unknown `kid`, empty client ID list: all rejected. Password login on a social-only account fails generically. RLS: a social user sees only their rows.
- **Mobile jest:** nonce helper, cancel handling, error mapping.
- **e2e (web):** mock `/auth/social`; assert busy state, error text and landing on the home tab. Real Google sign-in is a manual checklist on the simulator and in a browser.

## Steps

| # | Step | Done when |
|---|------|-----------|
| 0 | ADR-006 | Merged |
| 1 | Owner: Google Cloud project, consent screen, web client ID; choose bundle identifier and create the iOS client ID | IDs recorded in `.env` / `.env.example` (no secrets) |
| 2a | Settings (`google_client_ids`), PyJWT crypto extra, `.env.example` | `import cryptography` works, `make test-unit` green |
| 2b | Google verifier with fake-JWKS tests | All rejection cases above pass |
| 3 | Migration 0009, `social_login`, `POST /auth/social`, OpenAPI + `schema.ts` | `make test` green, `make migrate` and `make migrate-down` work |
| 4 | Mobile: Google on an iOS development build | Real Google account lands on home, session survives restart |
| 5 | Web flow | Works in a browser, URL is cleaned after the callback |
| 6 | e2e with mocked exchange, `docs/api-for-frontend.md`, remove `comingSoon` for Google | Whole suite green, docs updated |
| 7 | Later: Apple (needs the Developer Program, $99/year), Android | Same route, new verifier branch |

Steps 1 and 2a to 3 do not depend on each other and can go in parallel; 4 and 5 need step 1.

## Risks

- **Email linking is the main security risk.** Link only on a provider-verified email, and never overwrite an existing password; test both hardest.
- **Algorithm confusion:** the verifier must accept RS256 only. Accepting HS256 lets someone sign a token using Google's public key as the secret.
- **Audience:** a token Google issued for some other app must not be accepted; `aud` has to be one of our IDs.
- **Nonce:** without it a stolen ID token can be replayed; keep it on and test it.
- **Dev build needed:** native Google sign-in cannot be tried in Expo Go.
- **App Store guideline 4.8:** shipping to iOS with Google likely requires Sign in with Apple too (see ADR-006); not a blocker for development.
- **Web flow:** redirect, PKCE and returning the ID token are ours to wire; budget time for step 5.

## Decisions still open

1. Bundle identifier for the iOS app (needed for step 1).
2. Whether the API route stays `/auth/social` with a `provider` field (recommended, decided in ADR-006) or `/auth/google`.
