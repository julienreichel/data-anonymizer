// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
  { ignores: ['coverage/**'] },

  // ── Hard gates: apply to all TypeScript/JavaScript sources ──────────────
  {
    name: 'project/hard-gates',
    rules: {
      // Cyclomatic complexity threshold (EPIC-0 gate)
      complexity: ['error', { max: 10 }],
      // Maximum source lines per function (EPIC-0 gate)
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      // Maximum source lines per file (EPIC-0 gate)
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },

  // ── Strict TypeScript rules: all TS/TSX sources ──────────────────────────
  // Note: @typescript-eslint/no-explicit-any is already enforced by @nuxt/eslint.
  // The rule below adds extra safety for a security-sensitive codebase.
  {
    name: 'project/strict-ts',
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    rules: {
      // Disallow casting to `any` via object literal type assertions (catches unsafe patterns)
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
    },
  },

  // ── Typed rules for backend / Lambda handlers ────────────────────────────
  // Type-aware rules that detect unsafe operations in Lambda source files.
  // parserOptions.projectService uses the nearest tsconfig.json automatically.
  {
    name: 'project/typed-amplify',
    files: ['amplify/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // Disallow type assertions that widen to a less specific type (e.g. `as any`)
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      // Disallow assigning an `any`-typed value to a typed variable
      '@typescript-eslint/no-unsafe-assignment': 'error',
      // Disallow calling an `any`-typed value as a function
      '@typescript-eslint/no-unsafe-call': 'error',
      // Disallow member access on `any`-typed values
      '@typescript-eslint/no-unsafe-member-access': 'error',
      // Disallow returning an `any`-typed value from a typed function
      '@typescript-eslint/no-unsafe-return': 'error',
      // Direct console.* calls are forbidden in amplify/ code; route all logging
      // through the safe logger abstraction (adapters/aws/logger.ts) instead.
      'no-console': 'error',
    },
  }
);
