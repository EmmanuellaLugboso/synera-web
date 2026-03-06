# Ops and Security Guide

## Firebase rules posture
- Keep Firestore and Storage rules on **deny-by-default** and grant only authenticated users scoped access to their own user documents.
- Validate ownership checks for paths like `users/{uid}` and nested subcollections.
- Require explicit review of rules before production release (staging -> production promotion).

## Authorized domains checklist
- In Firebase Authentication, allow only expected production/staging domains.
- Remove temporary preview domains when no longer needed.
- Keep localhost entries only for development machines.

## Environment separation
- `.env.local`: developer-only secrets and toggles.
- Production secrets: managed in your host secret manager (e.g., Vercel project env vars), never committed.
- Use distinct Firebase projects for dev/staging/prod when possible.

## Key rotation guidance
- Rotate external API keys (USDA and other upstreams) on a schedule.
- Rotate immediately if exposed in logs or incident response.
- After rotation, redeploy and run `npm run check` + `npm run e2e` smoke.

## API upstream incident playbook (USDA / MealDB)
1. Confirm failures in logs by checking error `code` and `requestId` from API responses.
2. Validate required env vars (`USDA_API_KEY`) are present and non-empty in deployment.
3. Retry requests manually using route endpoints to isolate provider outage vs app bug.
4. If provider outage is confirmed, keep app online and show fallback UX message.
5. Post-incident: capture timeline, rotate keys if needed, and add regression tests.

## Firebase rules files
- This repository currently does not include committed Firebase rules files.
- Recommended location if added: `/firebase/firestore.rules` and `/firebase/storage.rules` with deployment scripts.
