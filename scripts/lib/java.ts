import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

// Firebase Emulator は Java 21 以上を要求する（rules テスト / E2E で共通）
export const MIN_JAVA_MAJOR = 21;

export interface JavaCandidate {
  executable: string;
  home: string;
  major: number;
}

function javaExecutableName() {
  return process.platform === 'win32' ? 'java.exe' : 'java';
}

export function getPathEnvKey() {
  return Object.keys(process.env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
}

function parseJavaMajor(output: string) {
  const match = output.match(/version "(\d+)(?:\.(\d+))?/);
  if (!match) return null;

  const first = Number(match[1]);
  const second = match[2] ? Number(match[2]) : null;
  return first === 1 && second ? second : first;
}

function inspectJava(executable: string): JavaCandidate | null {
  if (!existsSync(executable)) return null;

  const result = spawnSync(executable, ['-version'], {
    encoding: 'utf8',
  });
  if (result.error) return null;

  const major = parseJavaMajor(`${result.stderr}\n${result.stdout}`);
  if (!major) return null;

  return {
    executable,
    home: path.dirname(path.dirname(executable)),
    major,
  };
}

function addPathJavaCandidates(candidates: Set<string>) {
  const pathEnv = process.env[getPathEnvKey()] ?? '';
  const executableName = javaExecutableName();

  for (const entry of pathEnv.split(path.delimiter)) {
    if (!entry) continue;
    candidates.add(path.join(entry, executableName));
  }
}

function addJavaHomeCandidate(candidates: Set<string>) {
  if (!process.env.JAVA_HOME) return;
  candidates.add(path.join(process.env.JAVA_HOME, 'bin', javaExecutableName()));
}

function addJvmDirectoryCandidates(candidates: Set<string>, root: string) {
  if (!existsSync(root)) return;

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    candidates.add(path.join(root, entry.name, 'bin', javaExecutableName()));
  }
}

/**
 * Java 21+ の実行可能ファイルを探す。
 * JAVA_HOME → PATH → 既知のJVMインストール先 の順に候補を集め、最も新しいメジャーを返す。
 */
export function findJavaCandidate(): JavaCandidate | null {
  const candidatePaths = new Set<string>();
  addJavaHomeCandidate(candidatePaths);
  addPathJavaCandidates(candidatePaths);

  if (process.platform === 'win32') {
    addJvmDirectoryCandidates(candidatePaths, 'C:\\Program Files\\Eclipse Adoptium');
    addJvmDirectoryCandidates(candidatePaths, 'C:\\Program Files\\Java');
  } else {
    addJvmDirectoryCandidates(candidatePaths, '/usr/lib/jvm');
  }

  const candidates = [...candidatePaths]
    .map((candidatePath) => inspectJava(candidatePath))
    .filter((candidate): candidate is JavaCandidate => candidate !== null)
    .filter((candidate) => candidate.major >= MIN_JAVA_MAJOR)
    .sort((a, b) => b.major - a.major);

  return candidates[0] ?? null;
}

/**
 * 見つけた Java を JAVA_HOME と PATH 先頭へ反映した環境変数を返す。
 * Firebase Emulator はこの env を使って起動する。
 */
export function buildJavaEnv(java: JavaCandidate): NodeJS.ProcessEnv {
  const pathEnvKey = getPathEnvKey();
  return {
    ...process.env,
    JAVA_HOME: java.home,
    [pathEnvKey]: `${path.join(java.home, 'bin')}${path.delimiter}${process.env[pathEnvKey] ?? ''}`,
  };
}
