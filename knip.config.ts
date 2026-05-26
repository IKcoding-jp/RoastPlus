import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'app/**/page.tsx',
    'app/**/layout.tsx',
    'scripts/**/*.ts',
    'vitest.rules.config.ts',
    'e2e/auth.setup.ts',
  ],
  project: ['**/*.{ts,tsx}', 'e2e/**/*.ts'],
  ignore: ['**/*.test.{ts,tsx}', '**/*.d.ts', 'functions/**', '.claude/**'],
  ignoreDependencies: ['tailwindcss', 'lint-staged'],
  ignoreBinaries: ['gitleaks', 'lizard', /^lint-staged\r?$/],
  next: {
    entry: ['app/**/page.tsx', 'app/**/layout.tsx', 'next.config.ts'],
  },
  vitest: {
    entry: ['**/*.test.{ts,tsx}'],
  },
};

export default config;
