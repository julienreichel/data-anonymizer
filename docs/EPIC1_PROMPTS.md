## 1) Backend REST Scaffold (Amplify Gen 2) + Route Contract Skeleton

### Intro

Implement the **minimum Amplify Gen 2 REST API skeleton** required to support EPIC 1 observability work. This prompt exists because EPIC 1 requires a consistent backend entrypoint and route structure **before** we can enforce request wrappers, safe logging, and telemetry across handlers. Quality gates are already in place (EPIC 0), so everything must be clean, typed, and testable from day one.

### Feature scope

**In scope**

- Add Amplify Gen 2 REST API route scaffolding for **v1** with:
  - `GET /v1/health` (or `/v1/ping`) for smoke tests
  - Stubs for 3 planned endpoints (do not implement business logic):
    - `POST /v1/pii/detect`
    - `POST /v1/pii/anonymize`
    - `POST /v1/pii/detect-and-anonymize`

- Handlers return **stubbed responses** that are schema-valid but contain no PII and no domain logic yet.
- Ensure routing naming, folder layout, and handler signatures match the monorepo patterns.

**Out of scope**

- No auth (Cognito), no persistence, no async jobs/webhooks, no LLM calls, no real PII detection/anonymization logic.

### Domain modules / core layers to create or update

- `handlers/`
  - Create thin controllers for each route; no domain logic.

- `core/`
  - Only add minimal shared **error code enum** / **API error shape** types if needed for consistent stubs (keep minimal; EPIC 2 will define full contracts).

- `adapters/`
  - None required beyond basic Amplify wiring (safe logger is handled in a dedicated prompt).

### Frontend components to create or update (if applicable)

- None (UI console is later EPIC).

### Pages/routes to create or update (if applicable)

- None.

### LLM / AWS integration impact (if applicable)

- No Bedrock integration in this EPIC prompt.

### Testing requirements

- Add **Amplify sandbox smoke test** coverage only for `GET /v1/health` (or `/v1/ping`) returning a stable, schema-valid JSON payload.
- Keep tests deterministic; no network calls beyond sandbox API invocation.

### Acceptance criteria

- [ ] Amplify Gen 2 REST routes exist under `/v1/...` and deploy in sandbox.
- [ ] `GET /v1/health` returns `200` with a stable JSON shape.
- [ ] Stubbed `POST /v1/pii/*` endpoints return schema-valid JSON (even if “NOT_IMPLEMENTED”).
- [ ] No handler logs request body or any text-like content.
- [ ] CI passes: lint, typecheck, unit tests (and sandbox tests if enabled).

---

## 2) Shared Request Wrapper (Validation, RequestId, Payload Limit, Duration Timing)

### Intro

Create the shared request wrapper used by **all REST handlers** to enforce EPIC 1’s “observable by default” behavior while preserving a **zero data retention posture**. This prompt exists because we must guarantee consistent: **payload size enforcement**, **request id**, **structured safe logging**, **duration measurement**, and **error shaping** across routes.

### Feature scope

**In scope**

- Implement a reusable wrapper (middleware-style helper) for handlers that:
  - Validates **payload byte size** (default 256KB) before any parsing-heavy work
  - Generates **UUID v4 requestId**
  - Measures **total handler duration** (entire handler execution)
  - Produces consistent **JSON error model** with stable error codes:
    - `PAYLOAD_TOO_LARGE`, `INVALID_INPUT`, `INTERNAL_ERROR` (LLM errors are later EPIC)

  - Ensures logs never contain request bodies or derived previews (no text, no spans)

**Out of scope**

- No per-field request validation of detect/anonymize contracts (EPIC 2 will own full schemas).
- No auth, no retries, no async, no persistence.

### Domain modules / core layers to create or update

- `core/`
  - Add minimal shared types for:
    - `ApiErrorCode` (string literal union)
    - `ApiErrorResponse` shape
    - `RequestContext` (requestId, route, startTime, etc.)

- `adapters/`
  - Add any environment/config adapters needed for `maxPayloadBytes` defaulting (hardcoded constant is acceptable for EPIC 1).

- `handlers/`
  - Refactor all handlers to run through the shared wrapper, so behavior is uniform.

### Frontend components to create or update (if applicable)

- None.

### Pages/routes to create or update (if applicable)

- None.

### LLM / AWS integration impact (if applicable)

- None (wrapper must be provider-agnostic).

### Testing requirements

- Unit tests (Vitest) for wrapper behavior:
  - Payload > limit triggers `PAYLOAD_TOO_LARGE` with **no body logging**
  - RequestId is UUID v4 format
  - DurationMs exists and is non-negative
  - `INVALID_INPUT` returned on malformed JSON (if applicable in current handler parsing)

- Ensure tests do not embed real PII fixtures.

### Acceptance criteria

- [ ] Every handler response includes `requestId` in JSON body (per EPIC clarifications).
- [ ] Payload limit enforced consistently across all routes.
- [ ] Wrapper records duration for full handler execution and exposes it to logging/telemetry.
- [ ] Errors follow a stable JSON shape with a stable `code`.
- [ ] No raw text or request body is ever logged.

---

## 3) Safe Structured Logger + Telemetry Model (No-PII Aggregates Only)

### Intro

Implement the **PII-safe observability layer**: structured logs + a telemetry model that captures counts/timing/error codes without storing or emitting any raw text, spans, or previews. This prompt exists because EPIC 1’s primary deliverable is “observable-first backend skeleton” with strict “no PII in logs” guarantees.

### Feature scope

**In scope**

- Define a strict telemetry shape that handlers can emit:
  - `requestId`, `route`, `status`, `durationMs`
  - `entityStats` (optional): counts by type + confidence distribution summary (even if stubbed)
  - `errorCode` when applicable

- Implement a **safe logger adapter** that:
  - Accepts only allow-listed fields (structured logging)
  - Prevents logging of any forbidden keys (e.g., `text`, `prompt`, `raw`, `body`, `span`, `preview`)
  - Works without `console.*` usage in `amplify/` (respect existing lint policy)

**Out of scope**

- Metrics backends (CloudWatch metrics, OpenTelemetry exporters) unless already standard in your foundation. Start with structured logs only.
- Any logging of prompts, model outputs, or request bodies (explicitly forbidden).

### Domain modules / core layers to create or update

- `core/`
  - Telemetry types (pure, provider-agnostic):
    - `TelemetryEvent`
    - `EntityStats` (counts by entity type, confidence buckets)

- `adapters/`
  - `SafeLogger` implementation (AWS-friendly)
  - Optional: config helper for environment (log level), but default to safe “info/error” only

- `handlers/`
  - Ensure every handler emits exactly one structured “request completed” event (success or failure), using telemetry types.

### Frontend components to create or update (if applicable)

- None.

### Pages/routes to create or update (if applicable)

- None.

### LLM / AWS integration impact (if applicable)

- Add placeholders only:
  - telemetry field(s) that could later include `llmEnabled` boolean, but do not implement Bedrock calls in EPIC 1.

### Testing requirements

- Unit tests validating logger safety rules:
  - Attempting to log forbidden keys throws or strips them deterministically (choose one behavior and document)
  - Logged event schema is stable and typed

- Unit tests validating telemetry summaries contain only aggregates (no previews).

### Acceptance criteria

- [ ] Every API handler emits a structured log including: `requestId`, `route`, `status`, `durationMs`, and optional `entityStats`.
- [ ] Logs never contain raw `text`, any substring/span, prompt, model output, or body payload.
- [ ] Telemetry is strictly typed, schema-validated (if you already use Zod) or runtime-checked minimally (no free-form objects).
- [ ] CI passes all quality gates.

---

## 4) Health/Ping Endpoint + Sandbox Smoke/Contract Tests

### Intro

Deliver the **operability baseline** for EPIC 1: a health endpoint that can be hit in sandbox and CI to confirm deployments are functional, plus a minimal contract test suite that validates the observability wrapper behavior without introducing business logic.

### Feature scope

**In scope**

- `GET /v1/health` (or `/v1/ping`) returns:
  - `status: "ok"` (or similar)
  - `serviceVersion` (optional)
  - `timestamp` (optional)
  - `requestId` (from wrapper)

- Add sandbox test(s) that:
  - Call the health endpoint
  - Assert response shape (no brittle timestamp equality checks)
  - Assert presence of requestId and that it looks like UUID v4

- Add at least one test validating payload-size error on a POST stub endpoint (optional but valuable for EPIC 1).

**Out of scope**

- Full endpoint contract tests for detect/anonymize (EPIC 9).
- Any real PII fixtures.

### Domain modules / core layers to create or update

- `handlers/`
  - Implement health handler through the shared wrapper

- `core/`
  - Only minimal shared response schema type if needed

### Frontend components to create or update (if applicable)

- None.

### Pages/routes to create or update (if applicable)

- None.

### LLM / AWS integration impact (if applicable)

- None.

### Testing requirements

- Vitest tests that can run in:
  - local mode (if sandbox isn’t available)
  - sandbox mode (when CI label/flag enables it)

- Ensure tests are deterministic and do not rely on external services besides the sandbox endpoint.

### Acceptance criteria

- [ ] `GET /v1/health` is reachable in sandbox and returns schema-valid JSON.
- [ ] Tests validate `requestId` presence and format.
- [ ] Tests validate payload-too-large behavior at least once.
- [ ] CI remains green under existing workflow rules.

---

## 5) Observability & No-PII Runbook Updates (Developer-Facing)

### Intro

EPIC 1 changes how every endpoint behaves and what’s allowed in logs. This prompt exists to ensure the team can **operate and extend** the backend without accidentally violating the zero-retention posture, and to keep docs aligned with the current backend skeleton.

### Feature scope

**In scope**

- Update or add docs sections covering:
  - What fields are allowed in logs/telemetry
  - Explicit forbidden list (text, spans, previews, prompts, model outputs, request bodies)
  - How requestId is generated and propagated
  - Error code catalog for EPIC 1 (`PAYLOAD_TOO_LARGE`, `INVALID_INPUT`, `INTERNAL_ERROR`)
  - How to run health check and sandbox smoke tests locally/CI

- Keep docs concise and actionable.

**Out of scope**

- Threat model expansion beyond what exists (unless missing critical items).
- Any customer-facing policies.

### Domain modules / core layers to create or update

- None (docs-only), except small clarifications in shared types if needed.

### Frontend components to create or update (if applicable)

- None.

### Pages/routes to create or update (if applicable)

- None.

### LLM / AWS integration impact (if applicable)

- Document that Bedrock is **not** used in EPIC 1 and prompts/outputs must never be logged when introduced later.

### Testing requirements

- No new tests required, but docs must reflect how to run the existing EPIC 1 tests and interpret failures.

### Acceptance criteria

- [ ] Docs clearly state logging do’s/don’ts and provide examples of allowed telemetry fields (aggregate-only).
- [ ] Docs explain the shared request wrapper behavior and error codes.
- [ ] Docs explain how to run sandbox smoke tests and what “healthy” output looks like.
- [ ] No documentation encourages storing raw text or previews anywhere.
