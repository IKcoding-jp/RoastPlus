import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    env: {
      FIREBASE_CONFIG: JSON.stringify({
        projectId: 'roastplus-test',
        storageBucket: 'roastplus-test.appspot.com',
      }),
      GCLOUD_PROJECT: 'roastplus-test',
    },
  },
});
