# Quality Runbook — LLM Chat Anonymization Middleware

This runbook covers local development setup, CI pipeline stages, the Definition of Done (DoD) checklist, and the security guardrails every contributor must follow.

---

## 1. Local Development Setup

### 1.1 Prerequisites

- **Node.js** v22 (matches the CI runner; use `nvm` or `volta` to pin the version)
- **npm** v10+ (bundled with Node 22)

### 1.2 Install Dependencies

```bash
npm ci
```

`npm ci` performs a clean install from the lock-file and is the preferred command in both CI and local development to guarantee reproducible installs.

### 1.3 Prepare Nuxt (Required Before Lint)

Nuxt generates a dynamic ESLint config during the postinstall step. If you skip this step, `npm run lint` will fail because `.nuxt/eslint.config.mjs` does not yet exist.

```bash
npm run postinstall
```

This is run automatically after `npm ci`, but re-run it manually after adding a new Nuxt module.

---

## 2. Running Quality Checks Locally

All four commands below must pass before opening a PR.

### 2.1 Lint

```bash
npm run lint
```

Runs ESLint across the entire monorepo. See `docs/LINT_POLICY.md` for enforced rules (complexity, max function length, max file length, TypeScript safety, and the `no-console` gate in `amplify/`).

A lint failure blocks CI. Fix the violation; do **not** disable the rule.

### 2.2 Type Check

```bash
npm run typecheck
```

Runs `nuxt typecheck` for the frontend and `tsc --noEmit` for the Amplify backend. Both must be error-free.

### 2.3 Unit Tests

```bash
npm run test
```

Runs the Vitest suite (all files matching `**/*.{test,spec}.{ts,mts}` inside `app/` and `amplify/`). A JUnit XML report is written to `test-results/junit.xml`.

### 2.4 Tests with Coverage

```bash
npm run test:coverage
```

Same as above, but also generates an HTML/LCOV/JSON coverage report under `coverage/`. Coverage thresholds are enforced (see `vitest.config.ts`). A build that falls below the thresholds fails.

### 2.5 Watch Mode (during development)

```bash
npm run test:watch
```

Runs Vitest in interactive watch mode. Useful during active development; not used in CI.

---

## 3. CI Pipeline

The CI pipeline runs automatically on every push to `main` and on every pull request. It is defined in `.github/workflows/ci.yml`.

### 3.1 Stages

| Step | Command | Failure action |
|------|---------|---------------|
| Install | `npm ci` | Fix lock-file / dependency conflict |
| Prepare Nuxt | `npm run postinstall` | Check Nuxt config for missing modules |
| Lint | `npm run lint` | Fix ESLint violations (`docs/LINT_POLICY.md`) |
| Type check | `npm run typecheck` | Fix TypeScript errors |
| Tests + coverage | `npm run test:coverage` | Fix failing tests or raise coverage |
| Sandbox API tests | `npm run test -- --project sandbox` | Optional; triggered by the `sandbox-tests` PR label or via **Actions → Run workflow** (`run_sandbox_tests: true`) |
| Deploy | `npx ampx pipeline-deploy` | Only runs on `main` after all prior steps pass |

### 3.2 Configuring GitHub Secrets & Variables

Before CI can run sandbox tests or deploy, you must configure the following in your GitHub repository:

**GitHub Secrets** (Settings → Secrets and variables → Actions → New repository secret):

- `AWS_ACCESS_KEY_ID` — AWS IAM access key with permissions for Amplify and CloudFormation
- `AWS_SECRET_ACCESS_KEY` — corresponding secret key
- `AMPLIFY_APP_ID` — the Amplify app ID (visible in the Amplify Console URL, e.g., `d2abc123xyz`)

**GitHub Variables** (Settings → Secrets and variables → Actions → Variables tab):

- `AWS_REGION` — AWS region for deployment (e.g., `us-east-1` or `eu-central-1`)

### 3.3 Running Sandbox API Tests in CI

Sandbox API tests are **optional** and run only when explicitly triggered to avoid provisioning costs on every PR.

**Trigger methods:**

1. **PR Label**: Add the `sandbox-tests` label to a pull request
2. **Manual Dispatch**: Go to **Actions → CI → Run workflow**, check `run_sandbox_tests`, and click **Run workflow**

When triggered, the CI job will:

1. Provision an Amplify sandbox backend (`npx ampx sandbox --once`)
2. Extract the API endpoint from `amplify_outputs.json`
3. Run sandbox API tests against that endpoint
4. **Keep the sandbox running** (it is not torn down automatically to save provisioning time on subsequent runs)

**To tear down the sandbox manually:**

```bash
npx ampx sandbox delete
```

Or add a manual workflow job to automate teardown when desired.

### 3.4 Deployment to Production

Deployment happens automatically when:

- A push is made to the `main` branch
- All prior checks (lint, typecheck, tests) pass
- Sandbox API tests either pass or are skipped
- The `AMPLIFY_APP_ID` secret is configured

The deploy step runs:

```bash
npx ampx pipeline-deploy --branch main --app-id "$AMPLIFY_APP_ID"
```

If `AMPLIFY_APP_ID` is not set, deployment is skipped with a warning.

### 3.5 Artifacts

After every run the pipeline uploads two artifacts:

- **`test-results/`** — JUnit XML for test reporting and PR annotations.
- **`coverage/`** — LCOV + JSON summary for coverage tracking.

Artifacts are retained for the default GitHub Actions retention period (90 days).

### 3.6 Debugging CI Failures

1. **Open the failing workflow run** on GitHub → Actions tab.
2. **Expand the failed step** to read the inline log.
3. **Reproduce locally**: run the exact command shown in the step (see §2 above).
4. For coverage failures, open `coverage/index.html` locally after `npm run test:coverage`.
5. For sandbox API test failures, check that `SANDBOX_API_URL` resolves correctly and that the Amplify sandbox deployed without errors.

---

## 4. Definition of Done (DoD)

Every PR must satisfy **all** of the following before merge.

### 4.1 Quality Gates

- [ ] `npm run lint` passes with zero errors.
- [ ] `npm run typecheck` passes with zero errors.
- [ ] `npm run test:coverage` passes, including coverage thresholds.
- [ ] CI is green on the PR (all required jobs pass).
- [ ] No new `// eslint-disable` comments without an inline justification comment. The required format is `// eslint-disable-next-line <rule> -- <reason>` (see `docs/LINT_POLICY.md` §Exception Process).

### 4.2 Privacy & Security Gates

- [ ] No raw text, entity spans, partial previews, LLM prompts, or LLM responses are written to any log.
  - Allowed log fields: `requestId`, `route`, `status`, `durationMs`, `entityStats` (counts only), `reliabilityScore`, `errorCode`.
- [ ] All new REST endpoints validate both request and response payloads against their TypeScript schema.
- [ ] No new `console.*` calls in `amplify/` — all output is routed through the safe logger abstraction (`adapters/aws/logger.ts`).
- [ ] Secrets and credentials are not hard-coded or committed.

### 4.3 Test Requirements

- [ ] New domain logic has unit tests covering:
  - Happy path
  - Edge cases (empty input, boundary offsets, unknown types)
- [ ] Test fixtures do **not** print or expose real PII data.
- [ ] Tests use UTF-16 offsets when exercising span-based logic.

### 4.4 Documentation

- [ ] Public interfaces and non-obvious design decisions are documented (inline or in `docs/`).
- [ ] If a new EPIC introduces a new security control, this runbook is updated accordingly.

---

## 5. Logging Policy

> **Never log raw text, entity spans, prompts, or LLM output.**

This is a hard privacy rule, not a style preference. Violations can cause PII leakage into log infrastructure that retains data far beyond request scope.

### 5.1 What May Be Logged

| Field | Example value |
|-------|--------------|
| `requestId` | `"req_abc123"` |
| `route` | `"POST /v1/pii/detect"` |
| `status` | `200` |
| `durationMs` | `42` |
| `entityStats` | `{ "CONTACT.EMAIL": 2, "PERSON.NAME": 1 }` |
| `reliabilityScore` | `0.84` |
| `errorCode` | `"INVALID_INPUT"` |

### 5.2 What Must Never Be Logged

- The `text` field from any request.
- Entity `start`/`end` offsets paired with any text substring.
- Any `textPreview` value.
- The raw prompt sent to the LLM.
- The raw response received from the LLM.
- The `anonymizedText` from any response.

### 5.3 Debug Mode

Even in local development:

- Raw text must not be logged.
- If content inspection is required for debugging, do it with a local breakpoint, not a `console.log`. Never commit debug logging of user content.

See `docs/SECURITY.md` §5 for the full logging policy.

---

## 6. Security Guardrails for Future EPICs

All future EPICs must respect these non-negotiable guardrails.

### 6.1 Safe Logger Abstraction (EPIC 1+)

- All Lambda handler output **must** go through `adapters/aws/logger.ts`.
- Direct `console.*` calls in `amplify/` are blocked by ESLint (`no-console` rule).
- The logger interface must only accept the allow-listed fields (§5.1).

### 6.2 Schema Validation (EPIC 2+)

- Every REST endpoint must validate both the incoming request and the outgoing response.
- LLM output is treated as untrusted and validated against the entity schema before use.
- Malformed LLM responses must result in `LLM_ERROR` or safe fallback behavior — never silent acceptance.

### 6.3 Offset Integrity (EPIC 3+)

- All span offsets are **UTF-16** code-unit indices (not byte offsets, not Unicode code-point indices).
- Spans must be validated: `0 ≤ start < end ≤ text.length` (UTF-16 length).
- Invalid or inverted spans are rejected, not silently truncated.

### 6.4 LLM Interaction Rules (EPIC 4+)

- The LLM is used solely to propose candidate entity spans.
- The LLM must never rewrite, summarize, or paraphrase the input text.
- Prompts are constructed server-side; user text is passed as data, not as instruction.
- Both the prompt and the LLM response are discarded after the request completes — they are never persisted or logged.

### 6.5 Overlap Resolution (EPIC 5+)

- When two detected spans overlap, **longest match wins**.
- Equal-length overlapping spans prefer higher confidence; ties are broken in favor of REGEX over LLM.
- Overlap resolution must be deterministic: identical inputs always produce identical outputs.

### 6.6 Test Hygiene

- Unit tests must not print fixture text that contains realistic PII.
- Tests for UTF-16 offset handling must include multilingual strings and emoji (which consume two UTF-16 code units).
- Coverage for overlap resolution must include nested, adjacent, and equal-span cases.
- Anonymization tests must verify determinism: running the same input twice must produce identical output.

---

## 7. Related Documents

| Document | Purpose |
|----------|---------|
| `docs/SECURITY.md` | Full security policy, threat model, incident response |
| `docs/LINT_POLICY.md` | ESLint rule set and exception process |
| `docs/TECHNICAL_SPECIFICATIONS.md` | Architecture, API design, domain models |
| `docs/EPIC_DESCRIPTION.md` | EPIC roadmap and acceptance criteria |
| `.github/workflows/ci.yml` | CI pipeline definition |
