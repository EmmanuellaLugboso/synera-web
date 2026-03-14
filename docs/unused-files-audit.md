# Unused Files Audit

Date: 2026-03-14

## Method

- Enumerated repository files with `rg --files`.
- Checked import usage across application and tests with targeted `rg -n` queries.
- Treated Next.js convention files (`app/**/page.js`, `app/**/route.js`, `layout.js`, `loading.js`) as framework entry points.
- Marked files as safe-to-delete only when no runtime/app imports or route usage were found.

## Safe-to-delete candidates

### Components
- None found.

### Pages
- None found.

### Utilities
- None found.

### Images / assets
- `app/pink-shape.svg` (no references found)
- `public/file.svg` (no references found)
- `public/globe.svg` (no references found)
- `public/next.svg` (no references found)
- `public/vercel.svg` (no references found)
- `public/window.svg` (no references found)

### Configuration files
- None found.

### Old test files
- None found (all `tests/*.test.mjs` are picked up by `node --test`).

### Unused API routes
- `app/api/coach/route.js`
  - Not referenced by app-side fetch/request calls.
  - Only appears in docs and test contexts.

## Notes

- `public/google.svg` is **in use** by login/signup pages and should not be deleted.
- `app/onboarding/nutrition/eating-challenges/page.css` and `app/onboarding/nutrition/restriction-level/page.css` are currently unreferenced, but these are outside the requested categories.
