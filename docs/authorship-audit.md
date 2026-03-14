# Code Authorship Audit (Human vs AI-generated)

## Scope and method
I reviewed the repository structure and sampled high-impact files across UI pages, API logic, shared services/utils, context/state management, tests, and docs. I looked specifically for repetitive comment patterns, over-explanation of simple logic, formatting uniformity, generic helper reuse, unused/over-abstracted architecture, and naming/style oddities.

## Verdict
**Most likely human-written with AI assistance in selected modules/docs, rather than fully AI-generated end-to-end.**

The codebase has strong signs of iterative human development (large uneven files, legacy aliases, inconsistent spacing/casing/style, and domain-specific product choices), but also includes some sections that look "LLM-polished" or generated/refactored by AI.

## Suspicious sections (AI-likely or AI-assisted)

### 1) Repeated comment banner style and "explanatory scaffolding" in long files
- `app/hubs/nutrition/page.js` uses frequent banner comments and section delimiters (`/* ------------------------ */`, `/* ========================= */`) and explanatory comments around straightforward state/flow code, which can indicate AI-assisted structuring in monolithic files.
- Similar patterns appear in other large hub files (fitness/mind-sleep/lifestyle), suggesting bulk style application rather than organic per-file evolution.

Why suspicious:
- The pattern is semantically helpful but highly templated.
- Comment style appears more uniform than surrounding naming/logic quality.

### 2) Duplicate generic helper logic across modules (possible generated copy/porting)
- `sleep(ms)` appears in both `app/services/apiClient.js` and `app/api/_utils.js`.
- `clamp`/`progress`/`clampNumber` appear with near-identical semantics in:
  - `app/api/syra/logic.js`
  - `app/api/coach/logic.js`
  - `app/utils/number.js`
  - `app/insights/analytics.js`
- `safeObject` + onboarding normalization logic is duplicated between:
  - `app/context/OnboardingContext.js`
  - `app/context/onboardingData.js`

Why suspicious:
- AI-assisted workflows often produce near-duplicate helper islands during localized edits instead of consolidating abstractions.
- Humans do this too under time pressure, but the breadth of duplication suggests copy-adapt cycles.

### 3) Documentation tone is unusually polished relative to code roughness
- `docs/developer-guide.md` is highly structured, architecture-forward, and consistently formatted with enterprise-style sectioning.
- That style contrasts with some rough/inconsistent implementation details in runtime files.

Why suspicious:
- This mismatch can signal AI-generated documentation layered onto an organically grown codebase.

### 4) "Overly clean" API contract wrappers versus mixed app-level consistency
- `app/api/_utils.js` introduces solid envelope and upstream error mapping patterns.
- But similar resilience/retry mechanics are independently reimplemented in `app/services/apiClient.js` rather than fully unified.

Why suspicious:
- Looks like generated best-practice inserts applied in patches, not a single cohesive design pass.

## Indicators that support human-written origin

### 1) Real-world inconsistency and legacy carryover
- `app/globals.css` contains many legacy/back-compat aliases and layered token migrations, which is typical of evolving human projects.
- Mixed comment conventions and occasional stylistic irregularities suggest multiple editing sessions/authors over time.

### 2) Very large, uneven feature files with pragmatic shortcuts
- Hub pages are very large and contain dense state/UI orchestration in one place (rather than perfectly decomposed architecture).
- This is common in student/hobby projects and less typical of fully AI-generated clean-slate projects.

### 3) Domain-specific, non-generic product choices
- `app/data/supplements.js` includes a highly specific, opinionated dataset and nuanced caution text.
- This reads like product-driven manual curation rather than generic generated filler.

### 4) Test coverage is practical, not theatrical
- Tests focus on realistic route logic and smoke paths (`tests/syra-logic.test.mjs`, `tests/e2e-smoke.test.mjs`) without over-engineered abstraction.
- Assertions and fixtures are straightforward and "good enough," which aligns with human student teams.

## Final assessment
If this were submitted as a student project, I would classify it as:

- **Primary authorship: human**
- **Likely tooling pattern: human developers using AI for selective refactors, documentation drafting, and helper generation**

I would **not** flag it as fully AI-generated. I would flag **specific files/sections** as potentially AI-assisted and ask the student to explain design decisions around duplicated helpers and monolithic hub files.
