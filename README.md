# LLM Chat Anonymization Middleware

API-first PII detection and deterministic anonymization for LLM chat logs.

This project provides a privacy-first middleware layer that detects and removes personally identifiable information (PII) from raw text before it is used for analytics or AI workflows.

It is designed for AI/ML data teams and compliance-sensitive environments.

---

## 🎯 Purpose

Organizations want to analyze LLM chat logs to extract insights.
However, those logs often contain:

- Emails
- Phone numbers
- Names
- Addresses
- Identifiers (IP, credit cards, etc.)

This middleware acts as a **mandatory PII safety gate** before analytics pipelines.

It provides:

- Hybrid detection (Regex + LLM-assisted)
- Deterministic anonymization
- Zero data retention
- Strict schema validation
- Observability without PII exposure

See full product positioning in:
📄 `docs/PRODUCT_DESCRIPTION.md`

---

# 🏗 Architecture Overview

Monorepo structure:

```
app/        → Nuxt 4 frontend (Nuxt UI demo console)
amplify/    → Amplify Gen 2 backend (Lambda, REST API)
docs/       → Product + technical documentation
```

Backend layering:

```
core/       → Domain logic (PII entities, detectors, merge, anonymize, reliability)
adapters/   → AWS-specific integrations (Bedrock, logging, config)
handlers/   → REST API route handlers
```

Full technical details in:
📄 `docs/TECHNICAL_SPECIFICATIONS.md`

---

# 🚀 Features (MVP)

## PII Detection

**POST /v1/pii/detect**

- UTF-16 offsets
- Entity taxonomy (PERSON.NAME, CONTACT.EMAIL, etc.)
- Confidence score (0–1)
- Severity (LOW / MEDIUM / HIGH)
- Source (REGEX | LLM)
- Reliability score

Hybrid engine:

- Deterministic regex rules
- Optional LLM-assisted detection (Bedrock: `amazon.nova-lite-v1:0`)

---

## Deterministic Anonymization

**POST /v1/pii/anonymize**

Modes:

- `redact` → `****`
- `placeholder` → `[EMAIL]`, `[NAME]`, etc.

Rules:

- Longest match wins
- Deterministic replacement
- No LLM rewriting in MVP

---

## Detect + Anonymize

**POST /v1/pii/detect-and-anonymize**

One-step operation returning:

- Entity list
- Stats
- Reliability
- Anonymized text

---

## Zero Data Retention

The system:

- Does NOT store request text
- Does NOT store mapping tables
- Does NOT log prompts
- Does NOT log extracted spans
- Only logs aggregate telemetry:
  - entity counts
  - confidence distribution
  - processing time
  - error codes

---

# 🧪 Quality & Testing

Quality is enforced before features.

See EPIC 0 and EPIC roadmap:
📄 `docs/EPIC_DESCRIPTION.md`

### Tooling

- TypeScript (strict)
- ESLint (complexity + max function length enforced)
- Vitest (unit + API tests)
- GitHub Actions CI
- Amplify deploy only if green

### Required scripts

```
npm run lint
npm run typecheck
npm run test
npm run test:coverage
```

PRs must pass:

- Lint
- Typecheck
- Coverage thresholds
- API contract tests (sandbox)

---

# 🖥 Frontend Demo Console

Located in `/app`

Purpose:

- Internal testing
- Demo for compliance / stakeholders

Features:

- Paste raw text
- Toggle LLM on/off
- Choose redaction vs placeholder
- View:
  - entity list
  - confidence + severity
  - stats
  - reliability score
  - anonymized output

No user text is stored beyond session memory.

---

# 🔐 Security Model (MVP)

- No authentication (Cognito planned later)
- HTTPS only
- Payload size limit: 256KB (configurable)
- Strict schema validation on all endpoints
- No free-form LLM output accepted

---

# 📦 Local Development

## 1. Install dependencies

```bash
npm ci
```

## 2. Start Amplify sandbox

```bash
npx ampx sandbox
```

## 3. Run frontend

```bash
npm run dev
```

## 4. Run quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
```

For full setup instructions, CI pipeline details, Definition of Done, logging policy, and security guardrails see:
📄 `docs/RUNBOOK.md`

---

# 🚢 CI/CD & Deployment

The project uses GitHub Actions for continuous integration and deployment.

**CI runs automatically** on every push to `main` and on every pull request. It verifies:

- Lint
- Type check
- Unit tests with coverage
- Optional sandbox API tests (triggered by PR label or manual dispatch)

**Deployment to production** happens automatically on `main` after all checks pass.

## Setting up CI

To enable the full CI pipeline (including sandbox tests and deployment):

1. **Configure GitHub Secrets** (Settings → Secrets and variables → Actions):
   - `AWS_ACCESS_KEY_ID` — AWS IAM access key
   - `AWS_SECRET_ACCESS_KEY` — corresponding secret key
   - `AMPLIFY_APP_ID` — your Amplify app ID (e.g., `d2abc123xyz`)

2. **Configure GitHub Variables**:
   - `AWS_REGION` — AWS region (e.g., `us-east-1` or `eu-central-1`)

3. **Enable sandbox tests** (optional, to avoid provisioning costs on every PR):
   - Add the `sandbox-tests` label to a PR, or
   - Go to **Actions → CI → Run workflow** and check `run_sandbox_tests`

4. **Teardown sandbox** when no longer needed:
   ```bash
   npx ampx sandbox delete
   ```

For detailed CI configuration, job stages, artifact uploads, and troubleshooting see:
📄 `docs/RUNBOOK.md` §3

---

# 🧠 Design Principles

1. Deterministic first, LLM second
2. No PII in logs
3. Strict schema validation everywhere
4. UTF-16 offsets only
5. Longest-match-wins overlap resolution
6. AWS adapters isolated for portability
7. Clean, modular, throwaway-friendly core

---

# 📊 Current Implementation Roadmap

Ordered by foundation-first development:

1. EPIC 0 — CI / Lint / Test Harness
2. EPIC 1 — Observability-first backend skeleton
3. EPIC 2 — Core domain models & contracts
4. EPIC 3 — Regex detection engine
5. EPIC 4 — LLM candidate detector
6. EPIC 5 — Merge + overlap resolution
7. EPIC 6 — Deterministic anonymization
8. EPIC 7 — Reliability scoring
9. EPIC 8 — REST API endpoints
10. EPIC 9 — Sandbox API tests
11. EPIC 10 — Demo UI console
12. EPIC 11 — Documentation & runbooks

Full details in:
📄 `docs/EPIC_DESCRIPTION.md`

---

# ⚠️ Known Limitations (MVP)

- No contextual/indirect PII detection
- No async batch processing
- No auth
- No industry-specific identifier packs
- Reliability score is informational only

---

# 🧩 Future Directions

- Cognito authentication
- Async job model + webhooks
- Industry packs (HIPAA, finance)
- Explainability
- False-positive tuning
- Multi-tenant mode
- Container/Kubernetes deployment
- On-prem edition

---

# 📜 License

See `LICENSE`
