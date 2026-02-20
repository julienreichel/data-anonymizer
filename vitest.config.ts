import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'app/**/*.{test,spec}.{ts,mts}',
      'amplify/**/*.{test,spec}.{ts,mts}',
    ],
    reporters: ['default', ['junit', { outputFile: 'test-results/junit.xml' }]],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['app/**/*.ts', 'amplify/**/*.ts'],
      exclude: ['amplify/**/__tests__/**', 'app/**/__tests__/**', '**/*.{test,spec}.ts'],
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
})
