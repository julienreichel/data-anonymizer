# Copilot Instructions — LLM Chat Anonymization Middleware

**Project:** LLM Chat Anonymization Middleware  
**Status:** EPIC 0 Complete (Quality Gate Foundation)  
**Scope:** API-first PII detection and deterministic anonymization for LLM chat logs  
**Target:** AWS Amplify Gen 2 + Lambda, Nuxt 4 frontend

---

## Code Style

### ESLint Hard Gates (Non-Negotiable)

See [eslint.config.mjs](../eslint.config.mjs) for full config. Key enforcement in CI:

| Rule | Threshold | Scope | Reasoning |
|------|-----------|-------|-----------|
| `complexity` | ≤ 10 | all `.ts` | Prevents hidden complexity in security-sensitive code |
| `max-lines-per-function` | 50 lines | all `.ts` | Encourages single-responsibility functions |
| `max-lines` | 300 lines (`amplify/`), 600 lines (`app/`) | by folder | Keeps modules focused and navigable |
| `@typescript-eslint/no-explicit-any` | error | all `.ts` | Forbids untyped escapes |
| `@typescript-eslint/no-unsafe-*` | error | `amplify/` only | Type-aware safety rules for backend (projectService: true) |
| `no-console` | error | `amplify/` only | Route all output through `adapters/aws/logger.ts` to prevent PII leakage |

**Exception Process:** Use inline comments only:
```typescript
// eslint-disable-next-line <rule> -- <reason>
const value = externalSdk.getValue(); // @typescript-eslint/no-explicit-any -- SDK returns untyped
```

**DO NOT:**
- Add file-level `/* eslint-disable */` comments
- Bump thresholds instead of refactoring
- Disable `no-console` in `amplify/` (use logger instead)

### Prettier Formatting

Auto-formatted by `.prettierrc`. Defaults: **semi: true**, **singleQuote: true**, **printWidth: 100**, **trailingComma: es5**.

Run `npm run format` before committing.

---

## Architecture

### Monorepo Structure

```
amplify/                 # AWS Amplify Gen 2 backend (Lambda handlers, cloud resources)
├── backend.ts           # Resource aggregation (defineBackend)
├── auth/                # Auth resource definition
├── data/                # Data schema (defineData)
├── __tests__/           # Backend unit tests (Vitest)
└── tsconfig.json        # Strict TypeScript

app/                     # Nuxt 4 frontend
├── app.vue             # Root component
└── __tests__/          # Frontend unit tests (Vitest)

docs/                    # Documentation (SECURITY.md, RUNBOOK.md, etc.)

.github/workflows/       # GitHub Actions CI/CD
├── ci.yml              # Full pipeline (lint → typecheck → test → deploy)

Config files:
eslint.config.mjs       # Strict linting + security rules
vitest.config.ts        # Test runner + coverage thresholds
nuxt.config.ts          # Nuxt modules (@nuxt/eslint, @nuxt/ui, @nuxtjs/i18n)
tsconfig.json           # Root TypeScript config
package.json            # Scripts and dependencies
```

### Separation of Concerns

**AWS-specific logic is isolated.** Core domain logic remains cloud-agnostic.

**Current state (EPIC 0):** Backend structure is minimal; `amplify/backend.ts` aggregates resources.  
**Future (EPIC 1+):** Core logic will be in:
- `amplify/core/` — domain models, detection engines (regex, LLM), anonymization, validation
- `amplify/adapters/` — AWS integrations (Bedrock, logging, config)
- `amplify/handlers/` — REST API route handlers

---

## Build & Test Commands

All commands are in [package.json](../package.json). Essential for local development and CI:

```bash
# Quality checks (all must pass before PR)
npm run lint              # ESLint (enforces complexity, function length, TS safety, no-console)
npm run typecheck         # Nuxt typecheck + tsc for amplify/
npm run test              # Vitest (run once)
npm run test:watch        # Vitest (interactive mode)
npm run test:coverage     # Vitest with coverage report (coverage/ + test-results/)

# Development
npm run dev               # Nuxt dev server (frontend)
npm run build            # Nuxt build
npm run format           # Prettier format (--write)
npm run postinstall      # Nuxt prepare (generates .nuxt/eslint.config.mjs)

# Local sandbox
npx ampx sandbox         # Start Amplify sandbox (Lambda + auth)
```

**CI Pipeline:** See [.github/workflows/ci.yml](../.github/workflows/ci.yml)
- Triggers on push to `main` and PRs
- Stages: `checks` (lint + typecheck + test) → `sandbox-api-tests` (optional) → `deploy` (gated)

---

## Project Conventions

### Zero Data Retention + No PII in Logs

**Non-negotiable policy:**

**Never log:**
- Raw input text
- Entity spans or offsets paired with text substrings
- LLM prompts or responses
- Anonymized output

**Only log (aggregate telemetry):**
- `requestId`, `route`, `status`, `durationMs`
- `entityStats` (counts only, e.g., `{ "CONTACT.EMAIL": 2, "PERSON.NAME": 1 }`)
- `reliabilityScore`
- Error codes

**Enforcement:**
- `console.log` forbidden in `amplify/` (ESLint rule: `no-console = error`)
- Route all backend output through `adapters/aws/logger.ts` (safe logger abstraction)
- See [docs/SECURITY.md](../docs/SECURITY.md) for full policy

### Entity Taxonomy (Hierarchical & Deterministic)

Defined in [docs/ENTITY_TAXONOMY.md](../docs/ENTITY_TAXONOMY.md).

Structure: `PARENT.CATEGORY` (e.g., `PERSON.NAME`, `CONTACT.EMAIL`)

Each entity has:
- `type: string` — hierarchical category (e.g., "CONTACT.EMAIL")
- `label: string` — short form (e.g., "EMAIL")
- `start: number` — **UTF-16 character offset** (inclusive)
- `end: number` — **UTF-16 character offset** (exclusive)
- `confidence: 0..1` — detection confidence
- `severity: "LOW" | "MEDIUM" | "HIGH"`
- `source: "REGEX" | "LLM"`

**Key detail: UTF-16 offsets are required.** This matters for multilingual text and emoji. Tests must validate correctness on non-ASCII input.

### Overlap Resolution

Strategy: **Longest match wins.** Implemented in core logic (EPIC 5+).
- Prevents false elimination of overlapping detections
- Prefers more specific match over shorter ones

### Definition of Done (all PRs)

- [ ] `npm run lint` passes with zero errors
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run test:coverage` passes (including thresholds)
- [ ] CI is green on the PR
- [ ] No new `// eslint-disable` without inline justification (see Exception Process above)
- [ ] No raw text, entity spans, or LLM output in logs
- [ ] No secrets or credentials hard-coded
- [ ] New logic has unit tests (happy path + edge cases)
- [ ] Tests use UTF-16 offsets for span-based logic

See [docs/RUNBOOK.md](../docs/RUNBOOK.md) §4 for the full Definition of Done.

---

## Integration Points

### Amplify Gen 2

- Backend defined in [amplify/backend.ts](../amplify/backend.ts) using `defineBackend()`, `defineAuth()`, `defineData()`
- Local development: `npx ampx sandbox` spins up a local Lambda + auth backend
- CI/CD: Sandbox provisioned before optional API tests; deployment uses `npx ampx pipeline-deploy`
- Outputs written to [amplify_outputs.json](../amplify_outputs.json) after sandbox/deploy

### Nuxt 4 Framework

- Root config: [nuxt.config.ts](../nuxt.config.ts)
- Key modules:
  - `@nuxt/eslint` — ESLint integration for Nuxt files (.vue, .ts)
  - `@nuxt/ui` — UI component library (planned for EPIC 10)
  - `@nuxtjs/i18n` — Internationalization (optional, configured but not yet used)
  - `@nuxt/a11y` — Accessibility helpers
- Frontend entry: [app/app.vue](../app/app.vue)

### Vitest Test Framework

- Config: [vitest.config.ts](../vitest.config.ts)
- Discovery: `**/*.{test,spec}.{ts,mts}` in `app/` and `amplify/`
- Coverage provider: v8
- Reporters: default (console), junit (CI artifacts), HTML/LCOV (reports/)
- Current thresholds: 0% (placeholder; will increase in future EPICs)

---

## Security

### Threats & Mitigations

See [docs/SECURITY.md](../docs/SECURITY.md) for full threat model. Key mitigations:

1. **PII Leakage via Logging** → Strict logging policy enforced; direct console.log forbidden in Lambda
2. **Schema Bypass** → Runtime validation on all requests/responses (planned EPIC 2+)
3. **LLM Prompt Injection** → Prompts constructed server-side; user text passed as data only
4. **Data Persistence** → Zero data retention; no storage of enriched text or mappings
5. **Determinism Violation** → Core logic is deterministic by design; LLM output is validated/normalized

### Validation Strategy

- All REST endpoints validate **both request and response** against TypeScript schemas (planned EPIC 2+)
- LLM output is treated as **untrusted** and validated before use
- Invalid/malformed input returns `INVALID_INPUT` error (no PII in message)
- Severely malformed LLM responses return `LLM_ERROR` or degrade to regex-only mode

### Storage & Retention

- **Request payload:** Validated for size (default 256KB max), then discarded
- **Prompts & LLM responses:** Never persisted; discarded after request
- **Anonymized output:** Returned to caller only; not stored on backend
- **Telemetry:** Only aggregates (counts, timings, error codes); no text or spans

---

## Development Workflow

### Before Opening a PR

1. **Install dependencies:** `npm ci`
2. **Prepare Nuxt:** `npm run postinstall` (generates `.nuxt/eslint.config.mjs`)
3. **Run all checks (locally):**
   ```bash
   npm run lint
   npm run typecheck
   npm run test:coverage
   ```
4. **Start sandbox (optional, for manual testing):**
   ```bash
   npx ampx sandbox
   # In another terminal:
   npm run dev  # frontend at http://localhost:3000
   ```
5. **Commit with clear message** (conventional format recommended)
6. **Push and open PR** — CI will run automatically

### Debugging CI Failures

1. Check the failing step in GitHub Actions logs
2. Reproduce locally with the exact command shown
3. For coverage failures, open `coverage/index.html` after `npm run test:coverage`
4. For sandbox API test failures, ensure `SANDBOX_API_URL` resolves and sandbox deployed cleanly
5. See [docs/RUNBOOK.md](../docs/RUNBOOK.md) §3.6 for full troubleshooting

---

## Key Files for Quick Reference

| File | Purpose |
|------|---------|
| [eslint.config.mjs](../eslint.config.mjs) | Linting rules (complexity, function/file size, TS, no-console) |
| [vitest.config.ts](../vitest.config.ts) | Test discovery, coverage thresholds, CI reporters |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | CI/CD pipeline (lint → typecheck → test → deploy) |
| [docs/LINT_POLICY.md](../docs/LINT_POLICY.md) | ESLint rules + exception process |
| [docs/SECURITY.md](../docs/SECURITY.md) | Threat model, logging policy, validation strategy |
| [docs/RUNBOOK.md](../docs/RUNBOOK.md) | Local setup, CI config, Definition of Done |
| [docs/TECHNICAL_SPECIFICATIONS.md](../docs/TECHNICAL_SPECIFICATIONS.md) | API design, entity taxonomy, detection strategy |
| [docs/ENTITY_TAXONOMY.md](../docs/ENTITY_TAXONOMY.md) | Hierarchical PII categories |
| [PROJECT_STATUS.md](../PROJECT_STATUS.md) | Progress tracking (EPIC status, metrics) |

---

## Agent Onboarding Checklist

When working on this codebase:

- [ ] Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) to understand current EPIC progress
- [ ] Review [docs/LINT_POLICY.md](../docs/LINT_POLICY.md) for hard gates before writing code
- [ ] Check [docs/SECURITY.md](../docs/SECURITY.md) for PII/logging constraints
- [ ] Run `npm run lint`, `npm run typecheck`, `npm run test` locally before opening a PR
- [ ] Use `// eslint-disable-next-line <rule> -- <reason>` for justified exceptions only
- [ ] Reference [docs/ENTITY_TAXONOMY.md](../docs/ENTITY_TAXONOMY.md) when working with entity types
- [ ] Validate all offset-based logic using UTF-16 test cases (multilingual, emoji)
- [ ] Ensure no raw text, prompts, or LLM responses appear in logs
- [ ] Write unit tests for new domain logic (happy path + edge cases)
- [ ] Follow Prettier formatting (`npm run format`) before committing
