## 1) Title

**Repo “Quality Gate” Scripts + Tooling Baseline (Monorepo, strict TS)**

### Intro

We’re starting with EPIC 0 to make quality non-negotiable: every PR must be type-safe, linted, and tested before deployment. This project is a privacy-first PII anonymization middleware, so we must treat correctness and safety as the default (especially around logging and schema enforcement).

### Feature scope

**Implement**

- Standard root-level npm scripts to run consistently across `app/` and `amplify/`.
- One-command workflows for: `lint`, `typecheck`, `test`, `test:coverage`, and CI equivalents.
- Monorepo-aware configuration so running from root is reliable.

**Out of scope**

- Adding new frameworks (stick to Nuxt 4, Nuxt UI, Amplify Gen 2, Vitest).
- Auth, persistence, async jobs, or any new runtime features (this EPIC is quality gates only).

### Domain modules / core layers to create or update

- None required for EPIC 0.
- If needed, create **shared “test fixtures”** folder(s) under `amplify/` for later EPICs, but **do not** implement detection/anonymization logic yet. Keep changes focused.

### Frontend components to create or update (if applicable)

- None required for EPIC 0.

### Pages/routes to create or update (if applicable)

- None required for EPIC 0.

### LLM / AWS integration impact (if applicable)

- None required for EPIC 0.
- However, ensure upcoming work is compatible with “no PII in logs” by setting a policy now: **no raw request data ever logged** in backend code.

### Testing requirements

- Ensure Vitest can run from root (either workspace projects or per-package invocation).
- Establish coverage reporting plumbing now (even if initial thresholds are modest).

### Acceptance criteria

- Root commands exist and run locally:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run test:coverage`

- Commands cover both `app/` and `amplify/` (no “forgotten package”).
- Running from a clean clone works without manual steps beyond install.
- No scripts print or dump request bodies (reinforce the posture early).

---

## 2) Title

**ESLint “Hard Gates”: Complexity, Function Length, File Size + Strict TS Rules**

### Intro

EPIC 0 requires strict linting as a _gate_, not a suggestion. This system processes sensitive inputs, so we need guardrails against sprawling functions, hidden complexity, and “debug logging” accidents. The rule set should push small, testable units—especially important for later overlap resolution, UTF-16 offsets, and schema validation code.

### Feature scope

**Implement**

- ESLint configuration(s) for both `app/` and `amplify/` (shared root config preferred).
- Enforce:
  - Cyclomatic complexity threshold
  - Max function length threshold
  - Max file lines threshold
  - Strict TS lint rules that matter in a safety-sensitive codebase (no `any`, no unsafe casts, etc.)

- Ensure `lint` fails CI when violations occur.

**Out of scope**

- Code refactors unrelated to lint compliance (keep changes minimal; apply autofixes only where safe).

### Domain modules / core layers to create or update

- None required; but enforce a convention in backend:
  - Forbid direct `console.*` usage in Lambda handlers unless routed through a “safe logger” abstraction (policy can be introduced now even before the logger exists).

### Frontend components / Pages/routes

- None required.

### LLM / AWS integration impact

- None required, but lint should proactively block patterns that could cause retention (e.g., logging request payloads).

### Testing requirements

- Add a minimal lint test step (CI-only is fine) to ensure lint configuration works in a clean environment.

### Acceptance criteria

- `npm run lint` fails when:
  - complexity > threshold
  - function length > threshold
  - file length > threshold

- Lint configuration works in both `app/` and `amplify/` without disabling rules broadly.
- CI uses the same lint command as local development.
- A documented rule/exception policy exists (how to justify rare disables; defaults to “don’t”).

---

## 3) Title

**Typecheck Gate: Strict TS Across Nuxt 4 Frontend + Amplify Gen 2 Backend**

### Intro

Type safety is part of the contract of this system: strict request/response validation, UTF-16 offsets, overlap logic, and deterministic anonymization all depend on reliable types. EPIC 0 requires a typecheck stage that is stable locally and identical in CI.

### Feature scope

**Implement**

- Root `typecheck` command that checks:
  - Nuxt 4 app types (Nuxt typecheck)
  - Amplify backend types (tsc with strict settings)

- Ensure monorepo path mappings (if any) resolve in both packages.
- Ensure typecheck is fast enough to be a PR gate (incremental where appropriate).

**Out of scope**

- Implementing runtime schemas (Zod) in this EPIC—only typecheck harness.

### Domain modules / core layers

- None required.

### Frontend components / Pages/routes

- None required.

### LLM / AWS integration impact

- None required.

### Testing requirements

- Typecheck must run in CI exactly as it runs locally.
- Add a “fail-fast” expectation: typecheck errors should stop the pipeline.

### Acceptance criteria

- `npm run typecheck` covers both `app/` and `amplify/` and fails on TS errors.
- No reliance on IDE-only type information; command-line typecheck is authoritative.
- Strictness is not weakened to “make it pass”.
- Typecheck output in CI is readable and points to the right package/paths.

---

## 4) Title

**Vitest Harness: Unit Tests + Coverage Thresholds (Backend Core-Ready + Minimal Frontend)**

### Intro

EPIC 0 must establish a test harness now so later EPICs (regex detection, merge, UTF-16 offsets, anonymization) can ship safely. The harness must support strict coverage thresholds and produce CI artifacts. This is foundational for a system that claims deterministic, privacy-safe behavior.

### Feature scope

**Implement**

- Vitest setup for:
  - backend unit tests (future `core/` modules)
  - minimal frontend tests (Nuxt UI components/pages as needed later)

- Coverage configuration with explicit thresholds (start modest but enforced).
- Standard test scripts:
  - `test`, `test:watch`, `test:coverage`

- Coverage reporting output format suitable for CI artifacts.

**Out of scope**

- Building real feature tests for detection/anonymization (leave fixtures scaffolding only if needed).
- Adding E2E frameworks beyond what’s already chosen.

### Domain modules / core layers to create or update

- Optionally create empty test folders and a convention:
  - `amplify/core/**/__tests__`
  - `app/**/__tests__`

- Add a placeholder “UTF-16 offset” test file template (no real logic yet) only if it helps establish patterns.

### Frontend components / Pages/routes

- None required.

### LLM / AWS integration impact

- None required.

### Testing requirements

- Coverage thresholds enforced in CI.
- Clear separation:
  - backend unit tests are fast and pure
  - integration tests are separate (handled in another prompt)

### Acceptance criteria

- `npm run test` runs successfully from a clean clone.
- `npm run test:coverage` produces a coverage report and enforces thresholds.
- CI stores test + coverage outputs as artifacts.
- Tests do not log raw text fixtures that resemble PII (keep even fixtures cautious).

---

## 5) Title

**GitHub Actions CI: Lint → Typecheck → Unit Tests → Coverage Gate → (Optional) Sandbox API Tests → Deploy on Green**

### Intro

EPIC 0’s core deliverable is a CI pipeline that blocks merges unless quality gates pass. Because this product has strict privacy constraints (zero retention, no PII logs), CI must also enforce “safe defaults” (no debug logging patterns, consistent error shaping checks later). Deployment (Amplify) happens only when the pipeline is green.

### Feature scope

**Implement**

- GitHub Actions workflow(s) that run on PRs:
  1. install + cache
  2. lint
  3. typecheck
  4. unit tests
  5. coverage gate
  6. optional sandbox API tests (flagged/conditional)
  7. deploy trigger only if green (or “deployment job” gated on main branch)

- Clear job separation with artifacts (coverage, test reports).

**Out of scope**

- Implementing actual API endpoints (later EPICs).
- Adding secrets beyond what Amplify deploy requires.

### Domain modules / core layers

- None required.

### Frontend components / Pages/routes

- None required.

### LLM / AWS integration impact

- Ensure CI does **not** require Bedrock access at this stage.
- Sandbox API tests (if enabled) must be conditional (e.g., only on main PRs or with a label) to manage cost and permissions.

### Testing requirements

- CI must run the same scripts as local (`npm run lint`, etc.).
- CI must fail on:
  - lint violations
  - TS errors
  - failing tests
  - coverage below thresholds

### Acceptance criteria

- A PR cannot be merged unless GitHub Actions is green.
- Workflow outputs include accessible artifacts for debugging (coverage + test results).
- Optional sandbox API tests can be toggled without editing workflow code (env var, input, label, or branch rule).
- Amplify deploy is **strictly gated** and never runs if any prior stage fails.

---

## 6) Title

**Quality Runbook + Definition of Done: “No PII in Logs” + Contract Discipline**

### Intro

EPIC 0 must leave behind not only tooling but also shared operating rules. This system’s credibility hinges on privacy posture: no raw text in logs, no entity previews, strict schema validation, and deterministic behavior. A short runbook + DoD checklist ensures future EPICs don’t erode these guarantees.

### Feature scope

**Implement**

- Update/add docs covering:
  - How to run lint/typecheck/tests locally
  - CI pipeline stages and how to debug failures
  - Definition of Done checklist for every PR (quality + privacy)
  - Logging policy reminder: **never log raw text, spans, prompts, or LLM output**

- Add a “security guardrails” section that future EPICs must follow.

**Out of scope**

- Full threat-model expansion beyond MVP scope (keep it practical and short).

### Domain modules / core layers

- None required, but documentation should pre-commit conventions:
  - Backend uses a safe logger abstraction (even if implemented in EPIC 1)
  - Schema validation is mandatory for all REST inputs/outputs (implemented in EPIC 2)

### Frontend components / Pages/routes

- None required.

### LLM / AWS integration impact

- Document policy: prompt/response never logged; LLM output treated as untrusted candidates and validated (future EPIC).

### Testing requirements

- Document minimal expected test types for future EPICs:
  - UTF-16 offset tests (multilingual/emoji)
  - overlap resolution (“longest match wins”)
  - deterministic anonymization

- Note: tests must avoid printing sensitive fixture data.

### Acceptance criteria

- A new contributor can follow docs to:
  - install
  - run `lint`, `typecheck`, `test`, `test:coverage`
  - understand CI stages and artifacts

- Definition of Done explicitly includes:
  - no PII in logs
  - schema validation enforced (where applicable)
  - CI green required

- Docs align with existing security + technical spec docs (no contradictions).
