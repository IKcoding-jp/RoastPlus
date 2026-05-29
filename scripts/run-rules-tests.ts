import { spawnSync } from 'node:child_process';

import { buildJavaEnv, findJavaCandidate, type JavaCandidate } from './lib/java';

const PROJECT_ID = 'demo-roastplus-rules';
const TEST_COMMAND = 'vitest run --config vitest.rules.config.ts';

function runRulesTests(java: JavaCandidate) {
  const env = buildJavaEnv(java);

  const command = `firebase emulators:exec --project ${PROJECT_ID} --only firestore,storage "${TEST_COMMAND}"`;
  const result = spawnSync(command, {
    env,
    shell: true,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

const java = findJavaCandidate();

if (!java) {
  console.error('Firebase Emulator requires Java 21 or newer. Install JDK 21+ or set JAVA_HOME.');
  process.exit(1);
}

runRulesTests(java);
