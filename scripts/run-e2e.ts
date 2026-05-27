import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const DEFAULT_E2E_PORT = '3100';
const SERVER_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 1_000;

function parseEnvFile(filePath: string) {
  const values: Record<string, string> = {};
  if (!existsSync(filePath)) return values;

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function getE2EPort() {
  const port = process.env.E2E_PORT ?? DEFAULT_E2E_PORT;
  if (!/^\d+$/.test(port)) {
    throw new Error(`E2E_PORT must be a numeric port, received: ${port}`);
  }

  return port;
}

function isServerReady(url: string) {
  return new Promise<boolean>((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode !== undefined && response.statusCode < 500);
    });

    request.setTimeout(2_000, () => {
      request.destroy();
      resolve(false);
    });

    request.on('error', () => resolve(false));
  });
}

async function waitForServer(url: string, timeoutMs: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return false;
}

function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv, shell = false) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    shell,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

function runNpmScript(scriptName: string, env: NodeJS.ProcessEnv) {
  if (process.platform === 'win32') {
    return runCommand('cmd.exe', ['/d', '/s', '/c', `npm run ${scriptName}`], env);
  }

  return runCommand('npm', ['run', scriptName], env);
}

function startServer(port: string, env: NodeJS.ProcessEnv) {
  const server = spawn(process.execPath, ['./node_modules/next/dist/bin/next', 'dev', '--port', port], {
    cwd: process.cwd(),
    detached: process.platform !== 'win32',
    env,
    stdio: 'ignore',
  });

  server.unref();
  return server;
}

function stopServer(server: ChildProcess) {
  if (!server.pid || server.exitCode !== null) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }

  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    return;
  }
}

async function main() {
  const rootDir = process.cwd();
  const e2eEnvPath = path.join(rootDir, 'e2e', 'e2e.env');
  const e2eEnv = parseEnvFile(e2eEnvPath);
  const port = getE2EPort();
  const serverURL = `http://localhost:${port}/login`;
  const env = {
    ...process.env,
    ...e2eEnv,
    E2E_PORT: port,
    E2E_SKIP_WEB_SERVER: '1',
  };

  let server: ChildProcess | null = null;
  const existingServerReady = await isServerReady(serverURL);

  if (existingServerReady) {
    if (process.env.CI) {
      throw new Error(`E2E server port ${port} is already in use in CI`);
    }

    console.log(`[e2e] Reusing existing E2E server at http://localhost:${port}`);
  } else {
    const generateExitCode = runNpmScript('generate:sound-list', env);
    if (generateExitCode !== 0) {
      process.exit(generateExitCode);
    }

    console.log(`[e2e] Starting E2E server at http://localhost:${port}`);
    server = startServer(port, env);

    const serverReady = await waitForServer(serverURL, SERVER_TIMEOUT_MS);
    if (!serverReady) {
      stopServer(server);
      throw new Error(`E2E server did not become ready within ${SERVER_TIMEOUT_MS / 1000}s`);
    }
  }

  try {
    const playwrightCli = path.join(rootDir, 'node_modules', '@playwright', 'test', 'cli.js');
    const exitCode = runCommand(process.execPath, [playwrightCli, 'test', ...process.argv.slice(2)], env);
    process.exitCode = exitCode;
  } finally {
    if (server) {
      stopServer(server);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
