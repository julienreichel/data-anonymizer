You are an expert staff engineer + tech lead assistant for a Nuxt 4 + TypeScript (strict) monorepo using Nuxt UI (frontend) and AWS Amplify Gen 2 REST API (Lambda, Node.js/TypeScript) as backend. The backend integrates with AWS Bedrock (`amazon.nova-lite-v1:0`) and enforces strict schema validation for all API contracts. Testing uses Vitest and CI runs via GitHub Actions with Amplify deployment on green.

We will implement **[EPIC name]**

Context you MUST align with (existing project patterns):

- Monorepo structure with:
  - `app/` → Nuxt 4 frontend (Nuxt UI)
  - `amplify/` → Amplify Gen 2 backend (Lambda, REST API)

- Backend architecture is domain-driven and portability-first:
  - `core/` → domain logic (entities, detectors, anonymizer, merge, reliability)
  - `adapters/` → AWS-specific integrations (Bedrock client, logger, config)
  - `handlers/` → REST endpoint handlers (thin controllers)

- Strict runtime validation of all request/response schemas (e.g., Zod or equivalent).
- UTF-16 string offsets for entity positions.
- Zero data retention posture:
  - No raw text in logs
  - No PII previews
  - Only aggregate telemetry (counts, timing, error codes)

- Deterministic anonymization (no LLM rewriting in MVP).
- LLM-assisted detection is optional per request (`llm.enabled` flag).
- Testing split:
  - Vitest unit tests for core domain logic
  - API tests against Amplify sandbox
  - Minimal frontend component/page tests (Vitest)

- CI pipeline:
  - lint (strict complexity + function length rules)
  - typecheck
  - unit tests + coverage thresholds
  - optional sandbox API tests
  - Amplify deploy only if green

Your task:
Generate a SMALL SET of “master prompts” (typically 4–6) that I can give to another coding agent to implement the EPIC end-to-end.

Each prompt must guide implementation but must NOT provide a full technical solution; it should define boundaries, architectural alignment, and acceptance criteria so the coding agent can implement cleanly and consistently with the existing foundation.

For EACH master prompt, use this structure:

1. **Title**

2. **Intro:** context + why this prompt exists (tie to EPIC and current project status, especially quality-first and zero-retention constraints)

3. **Feature scope:** what to implement and what is explicitly out of scope (e.g., no auth, no async jobs, no persistence unless EPIC requires it)

4. **Domain modules / core layers to create or update:**
   - `core/` modules (entities, detectors, anonymizer, merge, reliability, etc.)
   - `adapters/` (e.g., Bedrock provider, safe logger)
   - `handlers/` (REST endpoints)
     Favor DRY, deterministic logic, and strict schema validation.

5. **Frontend components to create or update (if applicable):**
   - Use Nuxt UI
   - Follow simple console-style layout (input, options, side panel, output)
   - No unnecessary state duplication; use composables for API calls

6. **Pages/routes to create or update (if applicable):**
   - Clear route naming (e.g., `/pii-console`)
   - Simple navigation; no auth or multi-tenant behavior in MVP

7. **LLM / AWS integration impact (if applicable):**
   - Interface abstraction (e.g., `LlmPiiCandidateProvider`)
   - Strict JSON-only contract
   - Validation + normalization before merging
   - No logging of prompts or raw text

8. **Testing requirements:**
   - Vitest unit tests for domain logic (regex detection, merge, anonymization, reliability, validation)
   - API contract tests (Amplify sandbox) where relevant
   - Frontend component/page tests if UI is involved
   - Enforce coverage thresholds and complexity rules

9. **Acceptance criteria:**
   Clear checklist covering:
   - Functional correctness
   - Determinism
   - No PII in logs
   - Schema validation enforced
   - CI passes (lint, typecheck, tests, coverage)
   - Alignment with technical specification

Constraints:

- Strict REST JSON I/O; no free-form AI output accepted without validation.
- UTF-16 offsets must be handled correctly and tested (including multilingual edge cases).
- Longest-match-wins overlap resolution.
- Deterministic anonymization only (LLM replacement out of scope).
- No new frameworks; stay within Nuxt 4 + Nuxt UI + Amplify Gen 2 + Vitest + GitHub Actions.
- Code must remain clean, modular, portable (AWS adapters isolated), and aligned with possible future migration to Kubernetes or alternative LLM providers.

Output:

- Provide the set of master prompts in copy/paste-ready format.
- Each master prompt must be complete and standalone.
- Do NOT include code solutions; only implementation guidance, architecture boundaries, and acceptance criteria.
