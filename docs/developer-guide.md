# Developer Documentation

## 1) Project architecture overview

Synera Web is a **Next.js App Router** application with a thin server/API layer and client-heavy feature hubs.

### High-level layers
- **UI layer (`app/**/page.js`, `app/components/**`)**
  - Renders pages, forms, charts, and flows.
  - Reads/writes normalized onboarding state through `OnboardingContext`.
- **State & sync layer (`app/context`, `app/services`)**
  - `OnboardingContext` is the main client-side state store.
  - Syncs local state to Firebase profile docs with debounced writes.
  - Service modules encapsulate external concerns (Firebase profile, API calls, daily sync payload builders).
- **Integration/API layer (`app/api/**`)**
  - Server routes for food search, recipes, supplements, insights, and Syra coach.
  - External API calls are normalized to stable response contracts.
- **Infra layer (Firebase)**
  - Firebase Auth for identity.
  - Firestore as primary user + daily log datastore.
  - Storage for avatar uploads.

### Architectural intent
- Keep pages focused on **presentation + orchestration**.
- Keep reusable logic in **`services/`** and **`utils/`**.
- Keep error handling explicit and user-facing in UI paths.

---

## 2) Folder structure explanation

```txt
app/
  api/                    # Next.js route handlers (server-side integrations)
  components/             # Shared UI and feature components
    hub/                  # Hub shell/tabs and hub visual primitives
    ui/                   # Generic UI states/inputs/buttons/skeletons
  context/                # App-wide state providers (OnboardingContext)
  firebase/               # Firebase app/auth/db/storage initialization
  hubs/                   # Feature hubs (fitness, nutrition, mind-sleep, lifestyle)
  insights/               # Insights page + analytics helpers
  services/               # Side-effect/business/integration helpers
  utils/                  # Small shared pure helpers (date, number, ids)
  ...pages

docs/
  ops-and-security.md
  developer-guide.md      # (this file)

tests/
  *.test.mjs              # Node test runner suites
```

---

## 3) Main components and responsibilities

## Root
- `app/layout.js`
  - Global app shell.
  - Provides `ThemeProvider` and `OnboardingProvider`.
  - Loads `LazySyraAssistant` to keep initial bundle lean.

## Global state
- `app/context/OnboardingContext.js`
  - Single source of truth for client onboarding/profile-like state.
  - Boot sequence:
    1. Load local storage snapshot.
    2. Listen for Firebase auth.
    3. Merge remote profile data if authenticated.
    4. Expose stable update helpers (`updateField`, `updateAll`, `updateMany`, `resetAll`).
  - Debounced remote save ensures writes are batched and fire only after initial remote load.

## Hub shell
- `app/components/hub/HubShell.jsx`
  - Standardized top bar, title, subtitle, and content frame for hubs.
- `app/components/hub/HubTabs.jsx`
  - Shared tab row wrapper.

## Assistant
- `app/components/SyraAssistant.jsx`
  - Floating assistant panel.
  - Uses `requestSyra` service for API calls.
  - Maintains local message thread and quick actions.

## UI primitives
- `app/components/ui/PageState.jsx`
  - Standard loading/empty/error state component used across pages.

---

## 4) API integrations

Most client API calls should go through `app/services/apiClient.js`:
- `requestJson(url, options)`
  - Timeout support via `AbortController`.
  - Retry/backoff for transient failures.
  - Safe JSON parse fallback.
  - Consistent error message behavior.

Feature service wrappers:
- `app/services/syraService.js`
  - `requestSyra(...)` and `rewriteTaskWithSyra(...)`.

Server route handlers live in `app/api/**`:
- `app/api/food/search/route.js`
- `app/api/recipes/search/route.js`
- `app/api/recipes/[id]/route.js`
- `app/api/recipes/macros/route.js`
- `app/api/supplements/route.js`
- `app/api/insights/route.js`
- `app/api/syra/route.js`
- `app/api/coach/route.js`

### Integration pattern
1. UI calls service wrapper (or `requestJson` directly for non-shared cases).
2. Route handler validates input and upstream responses.
3. UI receives either data or user-friendly error message + retry affordance.

---

## 5) Firebase usage

Firebase initialization:
- `app/firebase/config.js`

Primary Firestore model:
- `users/{uid}`
  - Profile-ish data and onboarding state (often under `data` object in migrated docs).
- `users/{uid}/daily/{YYYY-MM-DD}`
  - Daily rollups used by dashboard/insights/hubs.

Storage usage:
- Avatar upload path: `users/{uid}/avatars/...`

Service modules:
- `app/services/userService.js`
  - Profile read/write helpers.
  - Avatar upload and URL retrieval.

Daily sync helpers:
- `app/services/dailySync.js`
  - Builds normalized payloads from hub-local logs into daily doc shape.

---

## 6) Authentication flow

Login/signup pages:
- `app/login/page.js`
- `app/signup/page.js`
- `app/forgot-password/page.js`

Auth behavior:
- Firebase Auth emits user through `onAuthStateChanged`.
- Protected pages check `ready && !user` and redirect to `/login`.
- Post-auth route choice is handled by `app/lib/authRouting.js`:
  - Onboarding incomplete → onboarding route.
  - Onboarding complete → dashboard.

Context behavior:
- In E2E mode (`NEXT_PUBLIC_E2E_TEST_MODE=1`), context injects fake user defaults so test runs can avoid live auth dependencies.

---

## 7) AI coach (Syra)

Client entry points:
- `app/components/SyraAssistant.jsx`
- Dashboard coach card in `app/dashboard/page.js`
- Lifestyle task rewrite action

Service + API:
- `app/services/syraService.js` → `/api/syra`
- `app/api/syra/logic.js` contains response-shaping logic by mode.

Common modes:
- `general`
- `task_rewrite`
- `meal`
- `reflect`
- `reset_day` / `reset_week`

Resilience behavior:
- All Syra calls now go through `requestJson` timeout/retry/error pipeline.
- UI always catches and displays failures with fallback text.

---

## 8) Naming conventions and patterns

- Components: `PascalCase` files in `components/`.
- Hooks/state helpers: `camelCase`.
- Utilities: grouped by domain (`date.js`, `number.js`, `id.js`).
- Service functions: imperative verb naming (`requestSyra`, `mergeUserProfile`, `uploadUserAvatar`).
- Prefer `useMemo` for derived arrays/expensive projections and `useCallback` for handlers passed deeply.

---

## 9) Developer workflow

Install and run:
```bash
npm install
npm run dev
```

Quality checks:
```bash
npm run lint
npm run build
npm run test
```

Full gate:
```bash
npm run check
```

---

## 10) Suggested future refactors

- Move remaining page-local helpers (large pure functions in hubs) into scoped feature modules.
- Add lightweight client telemetry for API error classes (timeout vs upstream vs validation).
- Add integration tests around retry UI paths in Nutrition and Dashboard.
