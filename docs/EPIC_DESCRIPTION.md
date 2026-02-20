Below is an initial EPIC list to implement the MVP end-to-end, **ordered to start with CI/testing + code quality + observability first** (as you requested). Each EPIC includes **Goal**, **Key features**, and **Acceptance criteria**.

---

## EPIC 0 — Quality Gate Foundation (CI/CD, Linting, Test Harness)

### Goal

Create a non-negotiable quality baseline so every change is type-safe, linted, tested, and deployment-ready.

### Key features

- GitHub Actions workflow: install → lint → typecheck → unit tests → (optional) sandbox API tests → deploy gate.
- Strict ESLint setup for **complexity**, **max function length**, and **max file length** (plus standard TS rules).
- Vitest configured at repo root (and/or per-package) with coverage thresholds.
- Repository scripts standardized: `lint`, `typecheck`, `test`, `test:watch`, `test:coverage`.

### Acceptance criteria

- A PR cannot be merged unless GitHub Actions passes.
- ESLint fails on:
  - cyclomatic complexity above threshold (configurable)
  - functions longer than threshold (configurable)
  - files exceeding size threshold (configurable)

- `npm run lint`, `npm run typecheck`, `npm run test` all succeed locally and in CI.
- Coverage thresholds enforced (even modest initially, e.g. 60–70%, but explicit and rising).
- CI artifacts include test + coverage reports.

---

## EPIC 1 — Observability-First Backend Skeleton (No-PII Logging)

### Goal

Establish a backend skeleton that is observable (metrics/timing/error visibility) while guaranteeing no PII exposure.

### Key features

- Amplify Gen 2 REST API routes scaffolding (3 endpoints planned).
- Shared request wrapper:
  - payload size validation (default 256KB)
  - request id generation
  - safe structured logging (no request body)
  - duration timing

- Telemetry model:
  - counts by entity type
  - confidence distribution summary
  - duration
  - error codes

### Acceptance criteria

- All API handlers emit structured logs containing:
  - requestId, route, status, durationMs, entityStats (if applicable)

- Logs never contain:
  - raw `text`
  - extracted spans
  - any substring previews

- Payload > configured max returns `PAYLOAD_TOO_LARGE`.
- A basic health endpoint (or simple ping) exists for sandbox testing.

---

## EPIC 2 — Core Domain Models & Contracts (Schema-First)

### Goal

Define stable, versioned domain models and API contracts to ensure deterministic behavior and safe evolution.

### Key features

- TypeScript domain types for:
  - `PiiEntity`, `PiiType` taxonomy, `Severity`, `DetectionSource`
  - `DetectRequest/Response`, `AnonymizeRequest/Response`, `DetectAndAnonymizeRequest/Response`
  - `Options` with defaults + validation

- JSON schema validation at runtime (e.g. zod or similar) for all requests and responses.
- Versioned routes `/v1/...`

### Acceptance criteria

- Every endpoint validates input and returns typed, schema-validated output.
- Invalid requests return `INVALID_INPUT` with details (no PII).
- Offsets are explicitly documented and tested as **UTF-16 indices**.
- Contracts are referenced in docs (`docs/TECHNICAL_SPECIFICATIONS.md`) and kept in sync.

---

## EPIC 3 — Regex Detection Engine v1 (Deterministic)

### Goal

Provide a deterministic baseline detection engine using curated regex rules.

### Key features

- Regex rule set for initial entity types (MVP set defined in spec):
  - EMAIL, PHONE, IP, CREDIT_CARD, (optional SSN if included)

- Rule metadata:
  - `ruleId`, `type`, baseline confidence

- Detector returns candidate entities with UTF-16 offsets.

### Acceptance criteria

- Unit tests cover each rule with positives + negatives.
- Regex detector returns correct offsets on:
  - ASCII text
  - multilingual text containing accents / emojis (offset tests!)

- Confidence baseline applied consistently and documented.
- No overlaps resolution done here yet (that’s EPIC 5), but detector must return raw candidates.

---

## EPIC 4 — LLM Candidate Detector v1 (Bedrock Nova Lite)

### Goal

Add optional LLM-assisted candidate detection that proposes entities (validated + normalized by code).

### Key features

- Bedrock adapter behind interface (future portability):
  - `LlmPiiCandidateProvider`

- Strict JSON-only prompting & parsing.
- Candidate validation:
  - bounds checks
  - type mapping
  - confidence clamp
  - severity enum check

- Option toggle: `options.llm.enabled`.

### Acceptance criteria

- When `llm.enabled=false`, LLM is never called (verified by tests).
- When enabled, LLM candidates are returned only if they pass validation.
- Any LLM failure returns `LLM_ERROR` (or gracefully degrades to regex-only if you choose that as fallback—documented either way).
- Prompt and response are **never logged**.

---

## EPIC 5 — Candidate Merge + Overlap Resolution (Longest Match Wins)

### Goal

Combine regex + LLM candidates into a single consistent entity list.

### Key features

- Merge strategy:
  - concatenate candidates
  - resolve overlaps: **longest span wins**
  - tie-breakers (documented): higher confidence, then REGEX > LLM (recommended)

- Optional `confidenceThreshold` filtering.
- Entity IDs stable within a response.

### Acceptance criteria

- Unit tests cover:
  - nested overlaps (John inside John Doe)
  - same-span conflicts
  - partial overlaps

- The final output is deterministic for the same inputs.
- Filter threshold works and is reflected in stats.

---

## EPIC 6 — Deterministic Anonymization Engine v1

### Goal

Implement deterministic replacement using detected entities without LLM rewriting.

### Key features

- Two modes:
  - redact: `****`
  - placeholder: `[EMAIL]`, `[NAME]`, ...

- Replacement algorithm:
  - sort entities
  - re-apply overlap resolution defensively
  - build output without corrupting text formatting

- Placeholder mapping table (type → token)

### Acceptance criteria

- Unit tests verify:
  - correct replacements
  - formatting preserved
  - correct behavior with multilingual characters (UTF-16 indices)

- If invalid entities are provided, the endpoint rejects with `INVALID_INPUT` or safely skips (choose one, document it).
- No output includes any accidental previews beyond final anonymized text.

---

## EPIC 7 — Reliability Estimation + Response Stats

### Goal

Provide a risk/reliability score and useful aggregate stats without storing or exposing PII.

### Key features

- Stats:
  - total entities
  - by type
  - confidence min/max/avg (or histogram buckets)
  - severity counts

- Reliability:
  - weighted score from confidence + severity + LLM on/off signal
  - signals object for explainability (non-PII)

### Acceptance criteria

- All detect responses include `stats` and `reliability`.
- Reliability is deterministic and tested.
- Telemetry emitted contains only aggregates, no raw text.

---

## EPIC 8 — REST API Endpoints v1 (Detect / Anonymize / Detect+Anonymize)

### Goal

Deliver the MVP API surface with consistent contracts and shared behavior.

### Key features

- Implement:
  - `POST /v1/pii/detect`
  - `POST /v1/pii/anonymize`
  - `POST /v1/pii/detect-and-anonymize`

- Shared middleware: validation, requestId, payload size, error shaping.
- Consistent error model.

### Acceptance criteria

- All 3 endpoints available in Amplify sandbox and locally.
- Contract tests validate response schema.
- Payload limit enforced consistently across endpoints.
- LLM toggle works in endpoints that detect.

---

## EPIC 9 — API Tests on Amplify Sandbox (Integration/Contract)

### Goal

Add confidence that deployed endpoints behave as expected, not just unit-level correctness.

### Key features

- Automated integration tests:
  - deploy/boot sandbox environment
  - call endpoints
  - assert response shape + key behaviors

- Smoke suite runs in CI (may be optional on forks / local).

### Acceptance criteria

- CI runs sandbox API tests on main branch PRs (or nightly if cost/time is an issue, but then still required before release).
- Tests confirm:
  - detect returns entities for known fixtures
  - anonymize replaces correctly from provided entities
  - detect-and-anonymize returns both
  - size limit error works

---

## EPIC 10 — Demo UI Console (Nuxt 4 + Nuxt UI)

### Goal

Provide an internal demo/test interface to exercise endpoints and visualize results.

### Key features

- Single page console:
  - textarea input
  - options: mode (redact/placeholder), llm enabled, confidence threshold
  - buttons: Detect / Anonymize / Detect+Anonymize

- Side panel:
  - entity list with type, offsets, confidence, severity, source
  - stats summary

- Output panel:
  - anonymized text

- (Optional) highlight matches later.

### Acceptance criteria

- UI can run locally against sandbox API.
- UI never stores entered text beyond the browser session.
- UI clearly shows errors (payload too large, invalid input, LLM error).
- UI renders stats + reliability score.

---

## EPIC 11 — Documentation & Runbooks (Dev + Ops)

### Goal

Make the project runnable, testable, and operable by someone new without tribal knowledge.

### Key features

- Update docs:
  - local dev setup
  - how to run tests
  - how to run sandbox + API tests
  - API contract examples
  - logging/privacy rules (no PII)

- “Definition of Done” checklist aligned with EPIC 0.

### Acceptance criteria

- README includes one command path to:
  - run UI
  - run backend
  - run full test suite

- Docs explicitly state:
  - no retention
  - allowed telemetry
  - UTF-16 offsets
  - overlap resolution rule
