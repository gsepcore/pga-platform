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
        'src/index.ts', // Re-exports only

        // Type-only files (no runtime code to test)
        'src/types/**',
        'src/interfaces/**',

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
        lines: 40,
        functions: 40,
        branches: 50,
        statements: 40,
      },
      all: true,
      clean: true,
    },
  },
});
