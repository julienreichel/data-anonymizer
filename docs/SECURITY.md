# Security Policy – LLM Chat Anonymization Middleware

## 1. Overview

This project provides a privacy-first middleware for detecting and anonymizing PII from raw text before downstream analytics or AI processing.

Security is foundational to the system. Even though the service operates in **zero data retention mode**, it processes potentially sensitive user input and must therefore be designed defensively.

This document defines:

- Security principles
- Data handling guarantees
- Threat model (MVP scope)
- Logging policy
- Operational controls
- Vulnerability reporting process

---

# 2. Security Principles

1. **Zero Data Retention by Default**
   - No raw input text is stored.
   - No entity spans are persisted.
   - No mapping tables are stored.
   - No prompts or LLM outputs are persisted.

2. **No PII in Logs**
   - Logs must never contain:
     - Raw `text`
     - Extracted spans
     - Partial previews
     - Prompt content
     - LLM responses

   - Only aggregate telemetry is allowed.

3. **Deterministic Core**
   - Anonymization logic is deterministic.
   - LLM output is treated as untrusted candidate input.
   - LLM is never allowed to rewrite the document in MVP.

4. **Strict Schema Validation**
   - All incoming and outgoing API payloads are validated.
   - All LLM responses are validated and normalized before use.

5. **Isolation of Cloud Providers**
   - AWS-specific logic is isolated in adapters.
   - Core anonymization logic remains provider-agnostic.

---

# 3. Data Handling Model

## 3.1 What the System Processes

- Raw unstructured text (up to 256KB by default)
- Optional configuration flags (LLM enabled, threshold, mode)

## 3.2 What the System Does NOT Store

- Request bodies
- Entity spans
- Prompt content
- LLM responses
- Anonymized output
- Mapping tables
- Any reversible transformation artifacts

## 3.3 Allowed Telemetry

The following aggregate information may be logged:

- Request ID
- Endpoint name
- Processing time
- Entity counts by type
- Confidence distribution (aggregate only)
- Severity counts
- Reliability score
- Error codes (without request content)

---

# 4. Threat Model (MVP Scope)

## 4.1 Attack Surfaces

1. Raw text input
2. LLM prompt interaction
3. Offset manipulation attacks
4. Oversized payloads
5. JSON injection
6. LLM hallucinated or malformed spans
7. Overlapping span manipulation

---

## 4.2 Key Risks & Mitigations

### 1. PII Leakage via Logs

**Risk:** Developer logs raw text or spans.
**Mitigation:**

- Centralized safe logger.
- No direct `console.log` allowed in handlers.
- Code review requirement for logging.

---

### 2. Prompt Injection / Malicious Text

**Risk:** Input attempts to manipulate LLM behavior.
**Mitigation:**

- LLM output must be structured JSON only.
- Strict schema validation.
- Ignore all non-conforming output.
- Core anonymization does not rely on LLM rewriting.

---

### 3. Span Corruption (Offset Attack)

**Risk:** Malicious or malformed spans cause corruption.
**Mitigation:**

- Bounds checking (start/end inside string length).
- Reject empty or inverted spans.
- Defensive overlap resolution.

---

### 4. Oversized Payload

**Risk:** Memory or compute exhaustion.
**Mitigation:**

- Payload size enforced (default 256KB).
- Immediate `PAYLOAD_TOO_LARGE` error.

---

### 5. Partial Anonymization Risk

**Risk:** False negatives.
**Mitigation:**

- Reliability score included in response.
- LLM optional augmentation.
- Explicit disclaimer: not guaranteed complete anonymization.

---

# 5. Logging Policy

### 5.1 Explicitly Forbidden

- Logging request bodies
- Logging entity spans
- Logging LLM prompts
- Logging LLM outputs
- Logging anonymized output

### 5.2 Allowed Fields

- requestId
- route
- status
- durationMs
- entityStats (counts only)
- reliability score
- errorCode

### 5.3 Debug Mode

Even in development:

- Raw text must not be logged.
- If debugging requires content inspection, it must be done locally and never committed.

---

# 6. LLM Security Rules

- Model: `amazon.nova-lite-v1:0`
- LLM is used only to propose candidate spans.
- LLM output must:
  - Be JSON only
  - Contain structured spans
  - Pass validation

- Any malformed response results in:
  - `LLM_ERROR` or fallback behavior (if enabled)

Prompts and responses are never persisted.

---

# 7. Infrastructure Security

- HTTPS only
- No authentication in MVP (must not be publicly exposed without perimeter protection)
- AWS region restrictions recommended (EU if required by compliance)
- IAM roles must follow least-privilege principle
- Bedrock access restricted to required model only

---

# 8. Known Security Limitations

- No contextual/indirect PII detection in MVP
- No async job isolation
- No multi-tenant boundary enforcement yet
- No rate limiting (planned future enhancement)

---

# 9. Incident Response (MVP)

If a PII leak is suspected:

1. Immediately disable endpoint (Amplify).
2. Audit logs for unexpected payload exposure.
3. Rotate credentials.
4. Review recent commits for logging violations.
5. Patch and redeploy.

---

# 10. Vulnerability Reporting

If you discover a security issue:

- Do NOT open a public issue.
- Contact project maintainers directly.
- Provide:
  - Description
  - Steps to reproduce
  - Impact assessment
  - Suggested mitigation (if known)

We aim to acknowledge reports within 72 hours.
