## Product description: LLM Chat Anonymization Middleware

### What it is

An API-first anonymization service that detects and removes personally identifiable information (PII) from LLM chat logs so AI/ML data teams can safely reuse conversations for analytics and internal insight—without exposing sensitive customer data.

It is designed as a middleware component that can sit between chat data sources (applications, platforms, support tools) and downstream analytics pipelines. A lightweight demo/test UI is included to validate behavior, showcase results, and support internal QA.

### Who it’s for

- **Primary users:** AI/ML data teams who need a reliable, repeatable anonymization step before using chat logs for analysis.
- **Buyers / stakeholders:** **CTOs and compliance officers** who need assurance that data used for analytics is properly anonymized and compliant.

### Why it exists

Organizations increasingly want to analyze LLM chat interactions to improve product experiences, identify user issues, and measure adoption. But those chat logs frequently contain PII (emails, phone numbers, names, addresses, identifiers). Without strong anonymization guarantees, chat analytics becomes a compliance risk and a blocker for customer trust.

This middleware provides a mandatory “PII safety gate” that makes chat data usable while reducing regulatory exposure (GDPR / HIPAA / CCPA).

---

## Core capabilities

### 1) PII Detection API

The service accepts a text document (including chat transcripts converted to plain text) and returns a structured list of detected PII entities, including:

- **Type/category** (with a hierarchical taxonomy)
- **Character offsets** (start/end position for each occurrence)
- **Confidence score**
- **Severity level** (risk-based rating)

Detection is **hybrid** from the start:

- pattern-based (regex/rules) for deterministic matches
- **LLM-assisted** detection for higher recall and language flexibility
  The system supports **multilingual detection** from day one.

### 2) PII Removal API

A second endpoint takes the original text plus detection results and produces an anonymized version. The caller can choose:

- **Redaction:** replace with `****`
- **Placeholders:** replace with standardized tokens like `[EMAIL]`, `[NAME]`, `[PHONE]`

The anonymization preserves formatting as much as possible and aims to avoid breaking semantic structure so the resulting text remains useful for analysis.

### 3) One-call Detect + Remove API

A convenience endpoint performs detection and anonymization in one call and returns:

- anonymized text
- extracted entity list
- aggregate stats (counts by type, confidence distribution, severity breakdown)

### 4) Ingestion and delivery workflows

Beyond direct API usage, the service can be configured to:

- **ingest documents via webhook**
- process asynchronously (batch-friendly)
- optionally **send anonymized results to a downstream API/webhook**
  This supports pipeline integration without storing customer data.

### 5) Zero data retention posture

The service is designed for privacy-first operation:

- **No PII logging**
- **No persistent storage of documents**
- **No mapping storage** (no reversible pseudonymization in v1)
- Operates in a **zero data retention mode** by default

### 6) Reliability estimation

Because perfect detection is not guaranteed, the system provides a **reliability estimate** for each processed document. This includes signals like:

- confidence-weighted coverage of detected entities
- presence of low-confidence candidates
- severity-weighted risk summary
  This allows teams and compliance stakeholders to understand how safe the output is for downstream analytics.

---

## Demo & internal testing UI

A simple web UI is included for internal testing and demos. It enables a user to:

- paste text
- run **Detect PII**
- see results in a **side panel**:
  - list of detected entities (type, offsets, confidence, severity)
  - stats (counts by type, totals, confidence breakdown)

- run **Remove PII** with a toggle (redaction vs placeholders)
- view before/after output clearly

---

## What’s in scope now vs later

### In scope for the first version

- Explicit PII detection (including names)
- Multilingual support
- Hybrid detection (regex + LLM-assisted)
- REST APIs (detect, remove, detect+remove)
- Async processing + webhook integration
- Zero data retention mode
- Reliability estimation
- Simple demo UI

### Future extensions (not required for v1)

- Indirect/contextual PII detection
- Industry-specific PII packs (finance/health/etc.)
- Explainability (“why flagged”)
- False-positive tuning controls
- Confidence threshold configuration
- Multi-tenant + admin UI for integrations
- Alternative deployment models (e.g., on-prem)
