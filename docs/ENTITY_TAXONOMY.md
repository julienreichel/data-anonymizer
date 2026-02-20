# Entity Taxonomy – v1.0

This document defines the official PII entity taxonomy for the LLM Chat Anonymization Middleware.

Changes to this taxonomy must be versioned.

---

# 1. Design Principles

- Hierarchical categories
- Deterministic placeholder mapping
- Severity classification included
- Compatible with multilingual detection
- Extendable for industry-specific packs

---

# 2. Entity Structure

Each detected entity contains:

```
{
  type: string,
  label: string,
  start: number,      // UTF-16 index
  end: number,        // UTF-16 index (exclusive)
  confidence: number, // 0..1
  severity: LOW | MEDIUM | HIGH,
  source: REGEX | LLM
}
```

---

# 3. Category Hierarchy (v1.0)

## PERSON

| Type        | Description                   | Default Severity |
| ----------- | ----------------------------- | ---------------- |
| PERSON.NAME | Full or partial personal name | MEDIUM           |

---

## CONTACT

| Type            | Description      | Default Severity |
| --------------- | ---------------- | ---------------- |
| CONTACT.EMAIL   | Email address    | MEDIUM           |
| CONTACT.PHONE   | Phone number     | MEDIUM           |
| CONTACT.ADDRESS | Physical address | MEDIUM           |

---

## IDENTIFIER

| Type                   | Description                    | Default Severity |
| ---------------------- | ------------------------------ | ---------------- |
| IDENTIFIER.IP_ADDRESS  | IPv4/IPv6 address              | LOW              |
| IDENTIFIER.USERNAME    | Explicit account username      | LOW              |
| IDENTIFIER.CREDIT_CARD | Credit card number             | HIGH             |
| IDENTIFIER.SSN         | US Social Security Number      | HIGH             |
| IDENTIFIER.HEALTH_ID   | Healthcare-specific identifier | HIGH             |

---

# 4. Placeholder Mapping (v1)

| Entity Type            | Placeholder     |
| ---------------------- | --------------- |
| PERSON.NAME            | `[NAME]`        |
| CONTACT.EMAIL          | `[EMAIL]`       |
| CONTACT.PHONE          | `[PHONE]`       |
| CONTACT.ADDRESS        | `[ADDRESS]`     |
| IDENTIFIER.IP_ADDRESS  | `[IP]`          |
| IDENTIFIER.USERNAME    | `[USERNAME]`    |
| IDENTIFIER.CREDIT_CARD | `[CREDIT_CARD]` |
| IDENTIFIER.SSN         | `[SSN]`         |
| IDENTIFIER.HEALTH_ID   | `[HEALTH_ID]`   |

---

# 5. Confidence Policy

- Regex deterministic patterns may start at high baseline (e.g., 0.95).
- LLM candidates may vary.
- Confidence is clamped between 0 and 1.
- `confidenceThreshold` may filter entities.

---

# 6. Severity Policy

Severity may be influenced by LLM.

Default rules:

- HIGH → financial, government, medical identifiers
- MEDIUM → direct contact information
- LOW → indirect identifiers (IP, username)

Severity affects:

- Reliability scoring
- Risk reporting
- Stats output

---

# 7. Overlap Policy

When entities overlap:

1. Longest span wins.
2. If equal length → higher confidence wins.
3. If equal confidence → REGEX preferred over LLM.

---

# 8. Versioning

Current version: **1.0**

Any addition of:

- New entity type
- Severity change
- Placeholder mapping change

Must increment taxonomy version and update changelog.
