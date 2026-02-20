## Technical Foundation Specification

**Project:** LLM Chat Anonymization Middleware (Prototype / MVP)
**Scope:** API-first PII detection + deterministic anonymization for raw text documents, with a simple demo UI.
**Non-goals (MVP):** AuthN/AuthZ, async jobs, retries, multi-tenancy, structured chat ingestion, persistence, prompt storage, on-prem packaging.

---

# 1. Goals and Principles

## 1.1 Goals

- Detect explicit PII in **raw text** (unstructured).
- Return a **structured list** of PII entities with:
  - **UTF-16** character offsets
  - entity type (hierarchical category)
  - confidence score
  - severity level (LLM-influenced)

- Provide deterministic anonymization with:
  - **redaction** (`****`) or **placeholders** (e.g. `[EMAIL]`)
  - formatting preserved as much as possible
  - “longest match wins” overlap resolution

- Provide a minimal UI for internal testing & demo:
  - paste text → detect → list entities + stats → anonymize

- Provide an LLM usage mode that is configurable:
  - **LLM-assisted on/off** per request option

## 1.2 Prototype constraints

- **Zero data retention mode**: no storage of user text, no mapping storage, no prompt storage.
- No PII in logs; only aggregated telemetry.
- Initial version is designed to be _throwaway_ but structured for future portability:
  - isolate AWS service access behind adapters
  - keep core detection/anonymization logic cloud-agnostic

---

# 2. High-Level Architecture

## 2.1 Components (Monorepo)

- **Frontend**: Nuxt 4 + Nuxt UI (demo/test console), optionally Nuxt AI for calling backend endpoints.
- **Backend**: AWS Amplify Gen 2 REST API backed by Lambda (Node.js + TypeScript).
- **LLM provider**: AWS Bedrock, model `amazon.nova-lite-v1:0`.
- **Observability**: metrics/logs without PII (counts, timings, error rates).

## 2.2 Data flow (sync-only MVP)

1. Client calls `/detect` with text and options → returns entity list + stats + reliability.
2. Client calls `/anonymize` with text + entity list + options → returns anonymized text + stats.
3. Client calls `/detect-and-anonymize` for one-step flow → returns both.

No async endpoints in MVP.

---

# 3. Technology Choices

## 3.1 Backend

- AWS Amplify Gen 2 REST API
- AWS Lambda (Node.js runtime)
- TypeScript (strict)
- AWS Bedrock SDK integration
- No auth for MVP (Cognito planned later, explicitly out of scope)

## 3.2 Frontend

- Nuxt 4
- Nuxt UI
- Nuxt AI (used as a client-side helper to interact with the REST endpoints; no requirement that it performs model calls itself)

## 3.3 CI/CD

- GitHub Actions:
  - lint + typecheck
  - unit tests (Vitest)
  - API tests (against Amplify sandbox)
  - deploy trigger to Amplify only if green

---

# 4. API Design

## 4.1 Common conventions

- REST, JSON only
- UTF-16 offsets: `start` inclusive, `end` exclusive (recommended)
- All endpoints accept an `options` object with safe defaults.
- Errors returned as structured JSON with stable error codes.

### 4.1.1 Options schema (shared)

```json
{
  "mode": "redact | placeholder",
  "llm": {
    "enabled": true,
    "model": "amazon.nova-lite-v1:0"
  },
  "confidenceThreshold": 0.0,
  "languageHint": "auto | en | fr | de | ...",
  "maxPayloadBytes": 262144
}
```

Notes:

- `confidenceThreshold` filters low-confidence entities from output (still included in internal scoring if desired).
- `maxPayloadBytes` is enforced server-side; configurable in code.

## 4.2 Endpoint: Detect PII

**POST** `/v1/pii/detect`

### Request

```json
{
  "text": "string",
  "options": {}
}
```

### Response

```json
{
  "document": {
    "length": 1234,
    "encoding": "utf16-index"
  },
  "entities": [
    {
      "id": "e_001",
      "type": "CONTACT.EMAIL",
      "label": "EMAIL",
      "start": 120,
      "end": 140,
      "textPreview": null,
      "confidence": 0.98,
      "severity": "MEDIUM",
      "source": "REGEX | LLM",
      "meta": {
        "ruleId": "regex.email.v1",
        "modelVersion": "n/a"
      }
    }
  ],
  "stats": {
    "totalEntities": 3,
    "byType": { "CONTACT.EMAIL": 1, "PERSON.NAME": 2 },
    "confidence": { "min": 0.62, "max": 0.98, "avg": 0.81 },
    "severity": { "LOW": 0, "MEDIUM": 3, "HIGH": 0 }
  },
  "reliability": {
    "score": 0.84,
    "signals": {
      "llmEnabled": true,
      "lowConfidenceCount": 1,
      "highSeverityCount": 0
    }
  }
}
```

**Important:** `textPreview` should remain `null` to avoid PII exposure (even partial). If you want UI preview later, make it an explicit opt-in and sanitize.

## 4.3 Endpoint: Anonymize (Deterministic)

**POST** `/v1/pii/anonymize`

### Request

```json
{
  "text": "string",
  "entities": [
    /* output from detect */
  ],
  "options": { "mode": "placeholder" }
}
```

### Response

```json
{
  "anonymizedText": "string",
  "applied": {
    "totalApplied": 3,
    "skipped": 0,
    "overlapsResolved": 1
  },
  "stats": {
    "byType": { "CONTACT.EMAIL": 1, "PERSON.NAME": 2 }
  }
}
```

## 4.4 Endpoint: Detect + Anonymize

**POST** `/v1/pii/detect-and-anonymize`

### Request

```json
{
  "text": "string",
  "options": { "mode": "redact", "llm": { "enabled": false } }
}
```

### Response

Same as detect response, plus:

```json
{
  "anonymizedText": "string",
  "applied": {}
}
```

## 4.5 Error model

All endpoints return:

```json
{
  "error": {
    "code": "PAYLOAD_TOO_LARGE | INVALID_INPUT | INTERNAL_ERROR | LLM_ERROR",
    "message": "human-readable",
    "details": {}
  }
}
```

---

# 5. Entity Taxonomy (Initial Set)

The MVP spec defines a minimal-but-useful hierarchy:

## 5.1 Categories

- `PERSON.NAME`
- `CONTACT.EMAIL`
- `CONTACT.PHONE`
- `CONTACT.ADDRESS` (coarse, optional in v1 if reliable)
- `IDENTIFIER.IP_ADDRESS`
- `IDENTIFIER.USERNAME` (optional; risk of false positives)
- `IDENTIFIER.CREDIT_CARD` (explicit numeric patterns)
- `IDENTIFIER.SSN` (US) _(mark as high severity if included)_
- `IDENTIFIER.HEALTH_ID` _(optional for v1; likely later as “industry pack”)_

Each entity includes:

- `type` (hierarchical)
- `label` (short form for UI and placeholder)
- `confidence` (0..1)
- `severity` (`LOW|MEDIUM|HIGH`), influenced by LLM when enabled

**Placeholder mapping** (initial):

- `CONTACT.EMAIL` → `[EMAIL]`
- `PERSON.NAME` → `[NAME]`
- `CONTACT.PHONE` → `[PHONE]`
- etc.

---

# 6. Detection Engine Design

## 6.1 Pipeline overview

Detection is performed by combining:

1. **Regex/rule-based detector** (deterministic, fast)
2. **LLM-assisted candidate detector** (optional; higher recall, multilingual)

Then: 3. **Normalization + validation** into final entity schema 4. **Overlap resolution** (“longest match wins”) 5. **Scoring**: confidence + LLM-influenced severity + reliability estimate

## 6.2 Regex detector

- Implement a curated set of regex rules for:
  - emails, phone numbers, IPs, credit cards, SSN patterns, etc.

- Each rule returns:
  - start/end, type, confidence baseline, ruleId

- Confidence baseline rules:
  - deterministic formats (EMAIL, IP) can start high (e.g. 0.95)
  - ambiguous formats start lower

## 6.3 LLM-assisted detector (Bedrock)

### Role

- Proposes _candidate entities_ with spans and categories, multilingual.
- Must return **structured JSON only** (no free-form).
- Output is treated as _untrusted_: validated and normalized by code.

### Output contract (example)

```json
{
  "entities": [
    { "type": "PERSON.NAME", "start": 10, "end": 18, "confidence": 0.72, "severity": "MEDIUM" }
  ]
}
```

### Validation rules

- Must fit within text bounds
- Must be non-empty span
- Must be a known type (or mapped to `UNKNOWN` and discarded in MVP)
- Confidence must be 0..1 (clamp if needed)
- Severity must be in enum (fallback mapping if missing)

## 6.4 Merge strategy

- Combine regex + LLM lists
- Apply overlap handling:
  - If two entities overlap: **keep the longest span**
  - If same span, prefer higher confidence; tie-breaker: REGEX over LLM (optional)

- Optional `confidenceThreshold` filters the final list for output/anonymization.

---

# 7. Deterministic Anonymization Engine

## 7.1 Requirements

- Deterministic replacement (no LLM rewriting in MVP)
- Preserve formatting and avoid semantic breakage where possible
- Support two modes:
  - `redact`: replace span with `****`
  - `placeholder`: replace span with `[LABEL]` (e.g. `[EMAIL]`)

- Per-document scope; no cross-document consistency needed.

## 7.2 Algorithm

- Sort entities by `start` asc, then `end` desc (so longer spans first)
- Apply overlap resolution again defensively (in case caller sends untrusted entity list)
- Build output by concatenating:
  - text segments between entities
  - replacement tokens

- Ensure offsets remain correct in UTF-16 terms (we only rely on original offsets; output offsets are not required in MVP)

---

# 8. Reliability Estimation

Provide a coarse “how confident are we that PII is removed” score.

## 8.1 Inputs

- entity count by severity
- confidence distribution
- LLM enabled/disabled
- presence of very low-confidence candidates (even if filtered)
- presence of “high risk types” (e.g., SSN/Credit card)

## 8.2 Output

```json
{
  "score": 0.0,
  "signals": {
    "llmEnabled": true,
    "lowConfidenceCount": 0,
    "highSeverityCount": 0
  }
}
```

The score is informational (not a guarantee). Make that explicit in system docs and UI copy.

---

# 9. Security, Privacy, and Logging

## 9.1 Zero retention stance

- Do not persist request bodies
- No entity text previews stored
- No mapping storage
- No prompt storage

## 9.2 Logging policy

- Logs must never include:
  - raw user text
  - extracted spans
  - derived previews

- Allowed telemetry only:
  - counts by entity type
  - confidence distributions (aggregates)
  - processing time metrics
  - error codes and stack traces _without request payload_

## 9.3 Network/security basics (MVP)

- HTTPS only
- No authentication (MVP), but code structured to add Cognito later
- Payload size enforcement (256KB default)

---

# 10. Frontend Demo Console

## 10.1 UX scope

- Single page “PII Console”
- Input: textarea for raw text
- Buttons:
  - Detect
  - Anonymize (requires detection results)
  - Detect + Anonymize

- Options:
  - mode: redact vs placeholder
  - LLM enabled toggle
  - confidence threshold slider (optional)

## 10.2 Display

- Side panel entity list:
  - type, start/end, confidence, severity, source

- Stats:
  - counts by type
  - confidence summary

- Output panel with anonymized text

No requirement for rich inline highlighting in MVP (can be added later).

---

# 11. Testing Strategy

## 11.1 Unit tests (Vitest) — backend core

- Regex rules:
  - positive and negative cases
  - multilingual samples where applicable

- Overlap resolution:
  - nested entities
  - equal spans

- Deterministic anonymization:
  - correctness of replacements
  - formatting preserved

- Validation:
  - invalid spans rejected
  - unknown types handled

## 11.2 API tests (Amplify sandbox)

- Smoke tests for each endpoint:
  - valid input returns schema-compliant output
  - LLM on/off toggles behavior (mock or real depending on env)
  - payload too large returns `PAYLOAD_TOO_LARGE`

- Contract tests:
  - response JSON shape (stable keys)
  - types/enums

## 11.3 Frontend tests (optional in MVP)

- Minimal component tests for request/response rendering (Vitest)
- E2E can be postponed; prioritize backend correctness first.

---

# 12. CI/CD (GitHub Actions → Amplify)

## 12.1 Pipeline stages

1. Install + cache
2. Lint + typecheck
3. Unit tests (Vitest)
4. API tests against Amplify sandbox (ephemeral environment)
5. On success: trigger Amplify deployment

## 12.2 Environment separation

- Local: mocks for Bedrock allowed
- CI: sandbox env with controlled Bedrock access (or mocked if cost/permission constraints)
- Prod: no debug logs; strict telemetry only

---

# 13. Backend Code Organization (Portability-first)

## 13.1 Suggested layering

- `core/`
  - `entities/` (types, enums, schema)
  - `detectors/regex/`
  - `detectors/llm/` (provider-agnostic interface)
  - `merge/` (overlap resolution)
  - `anonymize/` (deterministic replacer)
  - `reliability/` (scoring)

- `adapters/`
  - `aws/bedrockClient.ts`
  - `aws/logger.ts` (PII-safe)
  - `aws/config.ts`

- `handlers/`
  - `detect.ts`
  - `anonymize.ts`
  - `detectAndAnonymize.ts`

## 13.2 Provider abstraction

- Define an interface like:
  - `LlmPiiCandidateProvider.detectCandidates(text, options): Candidate[]`

- AWS Bedrock adapter implements it.
- Future providers (OpenAI, local models) can be swapped without changing `core/`.

---

# 14. Known Limitations (Explicit MVP Statements)

- No guarantee of complete PII removal; provides estimates only.
- Explicit PII focus; contextual/indirect PII deferred.
- Sync-only; large batch pipelines need future async model.
- No auth; must not be exposed publicly without perimeter controls.

---

# 15. Roadmap Hooks (for future EPICs)

- Auth (Cognito)
- Async jobs + callbacks + retries
- Structured chat input endpoint
- Explainability and tuning (thresholds, allow/deny lists)
- Industry packs (HIPAA identifiers)
- Multi-tenant + admin UI for integration config
- Deployment portability (container/Kubernetes)
