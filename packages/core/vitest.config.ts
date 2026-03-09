import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/__tests__/**',
        '**/fixtures/**',
        '**/*.d.ts',
        // Type-only files (no runtime code to test)
        'src/types/**',
        'src/interfaces/**',
        'src/wrap/WrapOptions.ts', // Type definitions only
        '**/index.ts', // Barrel re-exports

        // PostgreSQL-dependent modules (require real DB connection)
        'src/gene-bank/adapters/PostgresGeneStorage.ts',
        'src/gene-bank/PostgresIntegration.ts',

        // Modules without tests yet — remove as tests are added
        'src/plugins/**',
        'src/realtime/**',
        'src/resilience/**',
        'src/enterprise/**',
        'src/core/DNAProfile.ts',
        'src/core/FitnessTracker.ts',
        'src/core/PromptAssembler.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      all: true,
      clean: true,
    },
  },
});
