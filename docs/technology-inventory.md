# Technology Inventory (Synera Web)

## 1) Next.js
- **Purpose in project:** Core web framework for routing, rendering, and server API endpoints.
- **Reference (APA):** Vercel. (n.d.). *Next.js documentation*. https://nextjs.org/docs
- **Link to documentation:** https://nextjs.org/docs
- **Example sentence for thesis:** Synera is implemented on Next.js using the App Router to deliver both UI pages and backend route handlers in one framework.

## 2) React
- **Purpose in project:** Component model and client-side state management for interactive pages and widgets.
- **Reference (APA):** Meta Open Source. (n.d.). *React documentation*. https://react.dev/
- **Link to documentation:** https://react.dev/
- **Example sentence for thesis:** The user interface is built with React components to support reusable wellness dashboards and onboarding flows.

## 3) Firebase (Web SDK)
- **Purpose in project:** Backend-as-a-service integration used by the app for authentication, database access, and storage.
- **Reference (APA):** Google. (n.d.). *Firebase documentation*. https://firebase.google.com/docs
- **Link to documentation:** https://firebase.google.com/docs
- **Example sentence for thesis:** The system uses Firebase as a managed backend layer to simplify user identity, data persistence, and media storage.

## 4) Firebase Authentication
- **Purpose in project:** Email/password and Google sign-in, auth state tracking, and password reset.
- **Reference (APA):** Google. (n.d.). *Authenticate with Firebase*. https://firebase.google.com/docs/auth
- **Link to documentation:** https://firebase.google.com/docs/auth
- **Example sentence for thesis:** Authentication workflows (login, signup, and reset) are implemented with Firebase Authentication providers.

## 5) Cloud Firestore
- **Purpose in project:** Document database for profile data, onboarding state, and wellness records.
- **Reference (APA):** Google. (n.d.). *Cloud Firestore documentation*. https://firebase.google.com/docs/firestore
- **Link to documentation:** https://firebase.google.com/docs/firestore
- **Example sentence for thesis:** User progress and profile records are stored in Cloud Firestore as document collections.

## 6) Cloud Storage for Firebase
- **Purpose in project:** File upload and retrieval for user media (e.g., profile image URLs).
- **Reference (APA):** Google. (n.d.). *Cloud Storage for Firebase documentation*. https://firebase.google.com/docs/storage
- **Link to documentation:** https://firebase.google.com/docs/storage
- **Example sentence for thesis:** The application stores user-uploaded assets in Cloud Storage and resolves downloadable URLs in the profile service.

## 7) USDA FoodData Central API
- **Purpose in project:** Food search and macro-nutrient estimation for nutrition workflows.
- **Reference (APA):** U.S. Department of Agriculture. (n.d.). *FoodData Central API guide*. https://fdc.nal.usda.gov/api-guide.html
- **Link to documentation:** https://fdc.nal.usda.gov/api-guide.html
- **Example sentence for thesis:** Nutrition search and macro estimation functions query the USDA FoodData Central API when an API key is configured.

## 8) Open Food Facts API
- **Purpose in project:** Public nutrition fallback source when USDA results are unavailable.
- **Reference (APA):** Open Food Facts. (n.d.). *Open Food Facts API documentation*. https://wiki.openfoodfacts.org/API
- **Link to documentation:** https://wiki.openfoodfacts.org/API
- **Example sentence for thesis:** The system falls back to Open Food Facts to maintain food search availability if the primary nutrition provider fails.

## 9) TheMealDB API
- **Purpose in project:** Recipe search and recipe detail retrieval.
- **Reference (APA):** TheMealDB. (n.d.). *TheMealDB API documentation*. https://www.themealdb.com/api.php
- **Link to documentation:** https://www.themealdb.com/api.php
- **Example sentence for thesis:** Recipe discovery features rely on TheMealDB API for meal lookup, metadata, and ingredient lists.

## 10) Node.js Test Runner (`node:test`)
- **Purpose in project:** Unit and smoke test execution via built-in Node test APIs.
- **Reference (APA):** OpenJS Foundation. (n.d.). *Node.js test runner*. https://nodejs.org/api/test.html
- **Link to documentation:** https://nodejs.org/api/test.html
- **Example sentence for thesis:** Automated quality checks are executed with Node’s built-in test runner to validate key user journeys and business logic.

## 11) ESLint + eslint-config-next
- **Purpose in project:** Static code analysis and framework-specific linting rules.
- **Reference (APA):** OpenJS Foundation. (n.d.). *ESLint documentation*. https://eslint.org/docs/latest/
- **Link to documentation:** https://eslint.org/docs/latest/
- **Example sentence for thesis:** Code quality is enforced through ESLint with Next.js core-web-vitals and TypeScript rule presets.

## 12) TypeScript (tooling layer)
- **Purpose in project:** Type checking configuration and editor/tooling support.
- **Reference (APA):** Microsoft. (n.d.). *TypeScript documentation*. https://www.typescriptlang.org/docs/
- **Link to documentation:** https://www.typescriptlang.org/docs/
- **Example sentence for thesis:** TypeScript compiler settings are included to improve reliability via strict type-aware tooling.

## 13) npm (package ecosystem)
- **Purpose in project:** Dependency management and script orchestration (`dev`, `build`, `test`, `lint`, `check`).
- **Reference (APA):** npm, Inc. (n.d.). *npm documentation*. https://docs.npmjs.com/
- **Link to documentation:** https://docs.npmjs.com/
- **Example sentence for thesis:** Build and validation workflows are standardized using npm scripts for development, testing, and deployment readiness.

## 14) Vercel (deployment target guidance)
- **Purpose in project:** Recommended hosting platform with environment variable management guidance.
- **Reference (APA):** Vercel. (n.d.). *Vercel documentation*. https://vercel.com/docs
- **Link to documentation:** https://vercel.com/docs
- **Example sentence for thesis:** Deployment guidance references Vercel project settings for secure environment variable management in preview and production.

## 15) Framer Motion (installed dependency)
- **Purpose in project:** Animation library installed as a dependency (currently not imported in app code).
- **Reference (APA):** Framer B.V. (n.d.). *Motion for React documentation*. https://www.framer.com/motion/
- **Link to documentation:** https://www.framer.com/motion/
- **Example sentence for thesis:** Framer Motion is present in dependencies, indicating planned or optional animation capabilities in the React UI stack.

## Notes on AI model usage
- No external hosted LLM API (e.g., OpenAI, Anthropic, Gemini) is called in the current code.
- Assistant behavior in `/api/syra` and `/api/coach` is implemented with local deterministic logic rather than remote model inference.
