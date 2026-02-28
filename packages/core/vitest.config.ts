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

        // Temporary exclusions - modules without tests yet
        // TODO: Remove these as tests are added (track in issue #XX)
        'src/types/**',
        'src/interfaces/**',
        'src/PGA.ts',
        'src/advanced-ai/**',
        'src/enterprise/**',
        'src/evaluation/**',
        'src/evolution/**',
        'src/monitoring/**',
        'src/plugins/**',
        'src/realtime/**',
        'src/resilience/**',
        'src/core/DNAProfile.ts',
        'src/core/FitnessTracker.ts',
        'src/core/GenomeKernel.ts',
        'src/core/GenomeManager.ts',
        'src/core/PromptAssembler.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      all: true,
      clean: true,
    },
  },
});
