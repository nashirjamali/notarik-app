# 23 — Tracing, deployment and release

**Label:** OPS · **Phase:** 5 · **Depends on:** 22 · **Size:** ~10–16 h

## Goal
Observe the agents in production, deploy the API and the web app, and produce installable mobile builds.

## You will learn
- Tracing LLM apps: spans, token cost, latency, failures
- Containerizing and deploying an API; secrets management
- Expo build and release flow (EAS)
- Basic production hardening and monitoring

## Build
- [ ] Turn on tracing for the receipt and chat graphs. Tag traces with graph version, model and user ID (hashed or pseudonymous). Decide what content you will and won't store.
- [ ] Dashboard or saved views: cost per receipt, p95 latency, validator failure rate, review rate, tool errors.
- [ ] Dockerfile and deploy the API (Fly.io, Railway or Render) with environment-based secrets and a health check.
- [ ] Deploy the web build as a static site; set CORS correctly.
- [ ] Build an Android installable (APK or internal track). Do iOS only if you decide to pay for the developer account; otherwise demo through a dev build.
- [ ] Add error reporting (for example Sentry) to the API and the app.
- [ ] Production checklist: RLS tests green against the production database, backups on, migrations applied, API runs as `app_user`, rate limits on, secrets rotated.
- [ ] Set provider spend alerts on OpenRouter and the cloud services.

## Done when
- A friend can install the Android build or open the web app, sign up, scan a receipt and chat.
- You can answer "what did that request cost, and why was it slow?" from the traces.

## Tests
- Post-deploy smoke test: health, login, create transaction, one chat turn with a fake or cheap model.
- Run the cross-user RLS tests against staging.

## Pitfalls
- Logging receipt images or personal data into traces.
- Deploying with the owner database role.
- CORS opened to `*`.
- No spend alerts on a pay-per-token API.

## Read
- LangSmith or Langfuse production docs; EAS Build docs; your host's deployment guide
