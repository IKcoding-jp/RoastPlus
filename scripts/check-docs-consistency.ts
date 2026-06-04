import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

export interface StaleTerm {
  term: string;
  suggestion: string;
  reason: string;
}

interface BaseIssue {
  file: string;
  line: number;
  context: string;
}

export interface StaleTermIssue extends BaseIssue {
  kind: 'stale-term';
  term: string;
  suggestion: string;
  reason: string;
}

export interface MissingPathReferenceIssue extends BaseIssue {
  kind: 'missing-path-reference';
  reference: string;
}

export type DocsConsistencyIssue = StaleTermIssue | MissingPathReferenceIssue;

export interface AnalyzeOptions {
  rootDir?: string;
  files?: string[];
  staleTerms?: StaleTerm[];
}

export const DEFAULT_STALE_TERMS: StaleTerm[] = [
  {
    term: 'スマホ',
    suggestion: 'iPad または モバイル',
    reason: 'RoastPlusの現場利用はiPad中心に更新済み',
  },
  {
    term: 'スマートフォン',
    suggestion: 'iPad または モバイル',
    reason: 'RoastPlusの現場利用はiPad中心に更新済み',
  },
  {
    term: 'ローストタイマー',
    suggestion: '削除済み機能として扱い、現行機能から外す',
    reason: '削除済み機能を現行仕様に残さない',
  },
  {
    term: '作業進捗',
    suggestion: '削除済み機能として扱い、現行機能から外す',
    reason: '削除済み機能を現行仕様に残さない',
  },
  {
    term: 'コーヒークイズ',
    suggestion: '削除済み機能として扱い、現行機能から外す',
    reason: '削除済み機能を現行仕様に残さない',
  },
  {
    term: '/roast-timer',
    suggestion: '削除済みルートとして扱い、参照を外す',
    reason: '削除済みページへの参照を残さない',
  },
  {
    term: '/work-progress',
    suggestion: '削除済みルートとして扱い、参照を外す',
    reason: '削除済みページへの参照を残さない',
  },
  {
    term: '/coffee-quiz',
    suggestion: '削除済みルートとして扱い、参照を外す',
    reason: '削除済みページへの参照を残さない',
  },
];

const ROOT_DOCS = ['CLAUDE.md', 'AGENTS.md', 'README.md', 'DESIGN.md'];
const DOC_DIRS = ['docs/steering'];
const REPOSITORY_PATH_PREFIXES = [
  '.claude/',
  '.github/',
  'app/',
  'components/',
  'data/',
  'docs/',
  'e2e/',
  'eslint-rules/',
  'functions/',
  'hooks/',
  'lib/',
  'public/',
  'scripts/',
  'tests/',
  'types/',
];
const ROOT_REPOSITORY_FILES = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'DESIGN.md',
  'README.md',
  'firebase.json',
  'firestore.rules',
  'next.config.ts',
  'package.json',
  'storage.rules',
  'tsconfig.json',
]);

function collectMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

export function discoverDocFiles(rootDir = ROOT): string[] {
  const rootDocs = ROOT_DOCS.map((file) => path.join(rootDir, file)).filter((file) => existsSync(file));
  const steeringDocs = DOC_DIRS.flatMap((dir) => collectMarkdownFiles(path.join(rootDir, dir)));

  return [...rootDocs, ...steeringDocs].sort((a, b) => a.localeCompare(b));
}

function toRelativePath(rootDir: string, file: string) {
  return path.relative(rootDir, file).replace(/\\/g, '/');
}

function scanStaleTerms(rootDir: string, file: string, content: string, staleTerms: StaleTerm[]) {
  const issues: StaleTermIssue[] = [];
  const relativeFile = toRelativePath(rootDir, file);
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const staleTerm of staleTerms) {
      if (line.includes(staleTerm.term)) {
        issues.push({
          kind: 'stale-term',
          file: relativeFile,
          line: index + 1,
          context: line.trim(),
          term: staleTerm.term,
          suggestion: staleTerm.suggestion,
          reason: staleTerm.reason,
        });
      }
    }
  });

  return issues;
}

function normalizeRepositoryReference(value: string) {
  let reference = value.trim();

  if (!reference || reference.startsWith('http://') || reference.startsWith('https://') || reference.startsWith('#')) {
    return null;
  }

  reference = reference
    .replace(/^['"]|['"]$/g, '')
    .replace(/^[./\\]+/, '')
    .replace(/\\/g, '/')
    .replace(/[),.、。;；:：]+$/g, '');

  const hashIndex = reference.indexOf('#');
  if (hashIndex !== -1) {
    reference = reference.slice(0, hashIndex);
  }

  if (
    !reference ||
    reference.includes('*') ||
    reference.includes('<') ||
    reference.includes('>') ||
    reference.includes('YYYY') ||
    /\s/.test(reference) ||
    /(^|\/)New[A-Z][\w-]*\.(ts|tsx|md)$/.test(reference)
  ) {
    return null;
  }

  if (ROOT_REPOSITORY_FILES.has(reference)) {
    return reference;
  }

  if (REPOSITORY_PATH_PREFIXES.some((prefix) => reference.startsWith(prefix))) {
    return reference;
  }

  return null;
}

function extractReferences(line: string) {
  if (line.includes('❌')) {
    return [];
  }

  const references = new Set<string>();
  const codeReferencePattern = /`([^`\n]+)`/g;
  const markdownLinkPattern = /\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

  let match: RegExpExecArray | null;
  while ((match = codeReferencePattern.exec(line)) !== null) {
    const reference = normalizeRepositoryReference(match[1]);
    if (reference) references.add(reference);
  }

  while ((match = markdownLinkPattern.exec(line)) !== null) {
    const reference = normalizeRepositoryReference(match[1]);
    if (reference) references.add(reference);
  }

  return Array.from(references);
}

function scanMissingPathReferences(rootDir: string, file: string, content: string) {
  const issues: MissingPathReferenceIssue[] = [];
  const relativeFile = toRelativePath(rootDir, file);
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const reference of extractReferences(line)) {
      const absoluteReference = path.join(rootDir, reference);
      if (!existsSync(absoluteReference)) {
        issues.push({
          kind: 'missing-path-reference',
          file: relativeFile,
          line: index + 1,
          context: line.trim(),
          reference,
        });
        continue;
      }

      if (!statSync(absoluteReference).isFile() && !statSync(absoluteReference).isDirectory()) {
        issues.push({
          kind: 'missing-path-reference',
          file: relativeFile,
          line: index + 1,
          context: line.trim(),
          reference,
        });
      }
    }
  });

  return issues;
}

export function analyzeDocsConsistency(options: AnalyzeOptions = {}) {
  const rootDir = options.rootDir ?? ROOT;
  const staleTerms = options.staleTerms ?? DEFAULT_STALE_TERMS;
  const files = options.files ?? discoverDocFiles(rootDir);

  return files.flatMap((file) => {
    const content = readFileSync(file, 'utf8');
    return [
      ...scanStaleTerms(rootDir, file, content, staleTerms),
      ...scanMissingPathReferences(rootDir, file, content),
    ];
  });
}

export function formatIssues(issues: DocsConsistencyIssue[]) {
  if (issues.length === 0) {
    return 'docs:check OK: ドキュメントの自動検出項目に不整合はありません。';
  }

  const lines = [
    `docs:check: ${issues.length}件のドキュメント不整合候補を検出しました。`,
    '',
    'Claude Codeへの修正依頼例:',
    'docs:check の結果を見て、現行仕様に合わせて docs/steering と関連ドキュメントを更新してください。',
    '',
  ];

  for (const issue of issues) {
    const location = `${issue.file}:${issue.line}`;
    if (issue.kind === 'stale-term') {
      lines.push(`- ${location} [古い用語] "${issue.term}" -> ${issue.suggestion}`);
      lines.push(`  理由: ${issue.reason}`);
    } else {
      lines.push(`- ${location} [存在しないパス] "${issue.reference}"`);
      lines.push('  理由: リポジトリ内の参照先が見つかりません。削除済みなら参照を外してください。');
    }
    lines.push(`  文脈: ${issue.context}`);
  }

  return lines.join('\n');
}

function main() {
  const issues = analyzeDocsConsistency();
  const output = formatIssues(issues);

  if (issues.length > 0) {
    console.error(output);
    process.exit(1);
  }

  console.log(output);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
