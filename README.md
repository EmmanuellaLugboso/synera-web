# Synera Web

Synera is a Next.js wellness dashboard that combines onboarding, daily tracking, focused hubs, and lightweight coaching.

## Tech stack
- Next.js 16 (App Router)
- React 19
- Firebase (Auth, Firestore, Storage)
- Node test runner + lightweight smoke automation

## Run locally
```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Quality checks
Primary quality gate:

```bash
npm run check
```

This runs linting, tests, and production build in sequence.

Additional checks:

```bash
npm run lint
npm run test
npm run build
npm run e2e
```

## Environment Variables
Use `.env.local` for local development and your hosting provider secret manager for production.

| Variable | Required | Dev | Prod | Purpose | Where used | Safe default |
|---|---|---|---|---|---|---|
| `USDA_API_KEY` | Yes (for nutrition/recipe APIs) | ✅ | ✅ | USDA food search + macro estimation requests | `app/api/food/search/route.js`, `app/api/recipes/macros/route.js` | None |

### Firebase config strategy
- Firebase web config currently lives in `app/firebase/config.js`.
- For stronger production separation, move values to `NEXT_PUBLIC_FIREBASE_*` variables and set them per environment.
- Never store server-only secrets in `NEXT_PUBLIC_*` vars.

## API response contract
Resilient upstream-backed routes now return a consistent envelope:
- Success: `{ data: ..., requestId }`
- Failure: `{ error: { code, message }, requestId }`

This supports better debugging and incident triage with `requestId` correlation.

## Deployment
### Build + start
```bash
npm run build
npm run start
```

### Hosting notes
- Vercel: set environment variables in Project Settings (Preview + Production).
- Node hosting: export env vars before start and run behind HTTPS.

### Common failure modes
- Missing `USDA_API_KEY` -> API returns `CONFIG_MISSING`.
- Upstream USDA/MealDB outages -> API returns `UPSTREAM_UNAVAILABLE`/`UPSTREAM_ERROR` with `requestId`.
- Firebase auth domain mismatch -> login providers fail until authorized domains are updated.

## Core routes
- `/login`, `/signup`, `/forgot-password`
- `/onboarding/*`
- `/dashboard`
- `/hubs/*`
- `/settings`, `/profile`, `/insights`

## Production checklist
1. `npm run check` passes.
2. `npm run e2e` smoke passes.
3. Required env vars are present in deployment.
4. Firebase authorized domains reviewed (no stale preview domains).
5. Firestore/Storage rules reviewed for least privilege.
6. Secrets are stored in host secret manager (not in git).
7. Post-deploy smoke: login -> onboarding -> dashboard -> hubs.

## Ops and security
See [docs/ops-and-security.md](docs/ops-and-security.md) for:
- Firebase rules posture
- authorized domains checklist
- env separation and key rotation
- upstream outage playbook for USDA/MealDB
