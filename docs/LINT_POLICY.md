# ESLint Rule & Exception Policy

This document describes the project's ESLint rule set and the process for requesting exceptions.

---

## Rationale

This project processes sensitive PII inputs. Sprawling functions, hidden complexity, and accidental debug
logging can all lead to data exposure or difficult-to-audit code. The rules below are therefore treated as
**hard gates**: violations block CI and cannot be silenced without explicit justification.

---

## Enforced Rules

### Complexity & Size (all source files)

| Rule | Threshold | Why |
|---|---|---|
| `complexity` | max 10 | Keeps functions testable and auditable; above ~10 branches a function is hard to reason about. |
| `max-lines-per-function` | max 50 (skipping blank lines & comments) | Encourages single-responsibility functions. |
| `max-lines` | max 300 (skipping blank lines & comments) | Prevents monolithic files; keeps modules focused. |

### TypeScript Safety (all `.ts` / `.tsx` / `.vue` files)

| Rule | Setting | Why |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | `error` | Prevents silent loss of type safety; enforced by `@nuxt/eslint`. |
| `@typescript-eslint/consistent-type-assertions` | `assertionStyle: "as"`, `objectLiteralTypeAssertions: "never"` | Forbids `<T>value` casts and unsafe `{} as T` object literal casts. |
| `@typescript-eslint/no-unsafe-type-assertion` | `error` (amplify/ only, typed) | Disallows assertions that widen to a less-safe type (e.g. `as any`). |
| `@typescript-eslint/no-unsafe-assignment` | `error` (amplify/ only, typed) | Catches assignments that smuggle `any` into typed variables. |
| `@typescript-eslint/no-unsafe-call` | `error` (amplify/ only, typed) | Prevents calling `any`-typed values as functions. |
| `@typescript-eslint/no-unsafe-member-access` | `error` (amplify/ only, typed) | Prevents unguarded member access on `any`-typed values. |
| `@typescript-eslint/no-unsafe-return` | `error` (amplify/ only, typed) | Prevents leaking `any` through function return values. |

### Logging Safety (amplify/ — Lambda handlers)

| Rule | Setting | Why |
|---|---|---|
| `no-console` | `error` | Direct `console.*` calls in Lambda handlers risk logging PII. All output must be routed through the safe logger abstraction (`adapters/aws/logger.ts`). |

---

## Exception Process

1. **Default answer is "no."** Disabling a rule broadly or permanently is not acceptable.
2. If a line-level disable is genuinely needed:
   - Add an inline comment **above** the line: `// eslint-disable-next-line <rule> -- <reason>`
   - The reason must be specific (e.g. "third-party callback signature requires `any`").
   - Prefer narrowing the type instead where possible.
3. File-level disables (`/* eslint-disable */`) are **not permitted**.
4. Size/complexity violations must be resolved by refactoring (extracting functions or modules), not by bumping the threshold.
5. `no-console` in `amplify/` may only be lifted after a safe logger abstraction exists and the call is
   routed through it.

### Approved patterns (line-level only)

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- external SDK returns untyped payload
const raw = event.body as any;
```

```ts
// eslint-disable-next-line no-console -- intentional stderr trace during cold-start (pre-logger)
console.error('Cold-start diagnostic — no user data present');
```

---

## Updating Thresholds

Threshold changes must be made in `eslint.config.mjs` and require:

- A PR description explaining the rationale.
- Approval from at least one maintainer.
- An update to the table above.
