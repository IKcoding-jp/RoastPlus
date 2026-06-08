import { mkdirSync, writeFileSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { DEFAULT_STALE_TERMS, analyzeDocsConsistency, discoverDocFiles, formatIssues } from './check-docs-consistency';

async function createTempRepo() {
  const root = await mkdtemp(path.join(tmpdir(), 'roastplus-docs-check-'));
  mkdirSync(path.join(root, 'docs', 'steering'), { recursive: true });
  mkdirSync(path.join(root, 'docs', 'superpowers', 'specs'), { recursive: true });
  writeFileSync(path.join(root, 'README.md'), '# README\n', 'utf8');
  writeFileSync(path.join(root, 'CLAUDE.md'), '# CLAUDE\n', 'utf8');
  writeFileSync(path.join(root, 'docs', 'steering', 'FEATURES.md'), '# FEATURES\n', 'utf8');
  writeFileSync(path.join(root, 'docs', 'steering', 'PRODUCT.md'), '# PRODUCT\n', 'utf8');
  return root;
}

describe('discoverDocFiles', () => {
  test('現在の正本ドキュメントだけを検査対象にする', async () => {
    const root = await createTempRepo();
    writeFileSync(path.join(root, 'docs', 'superpowers', 'specs', 'old.md'), 'ローストタイマー\n', 'utf8');

    const files = discoverDocFiles(root).map((file) => path.relative(root, file).replace(/\\/g, '/'));

    expect(files).toContain('CLAUDE.md');
    expect(files).toContain('docs/steering/FEATURES.md');
    expect(files).not.toContain('docs/superpowers/specs/old.md');
  });
});

describe('analyzeDocsConsistency', () => {
  test('削除済み機能名と古い端末表現を検出する', async () => {
    const root = await createTempRepo();
    writeFileSync(
      path.join(root, 'docs', 'steering', 'FEATURES.md'),
      '現場ではスマホでローストタイマーを使う。\n',
      'utf8'
    );

    const issues = analyzeDocsConsistency({ rootDir: root, staleTerms: DEFAULT_STALE_TERMS });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'stale-term', term: 'スマホ' }),
        expect.objectContaining({ kind: 'stale-term', term: 'ローストタイマー' }),
      ])
    );
  });

  test('存在しないリポジトリ内パス参照を検出する', async () => {
    const root = await createTempRepo();
    writeFileSync(
      path.join(root, 'docs', 'steering', 'PRODUCT.md'),
      '詳細は `docs/steering/MISSING.md` を参照。\n',
      'utf8'
    );

    const issues = analyzeDocsConsistency({ rootDir: root, staleTerms: [] });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'missing-path-reference',
          reference: 'docs/steering/MISSING.md',
        }),
      ])
    );
  });

  test('存在するファイルとディレクトリへの参照は問題にしない', async () => {
    const root = await createTempRepo();
    writeFileSync(
      path.join(root, 'docs', 'steering', 'PRODUCT.md'),
      ['詳細は `docs/steering/FEATURES.md` を参照。', '仕様判断は `docs/steering/` を優先。', ''].join('\n'),
      'utf8'
    );

    const issues = analyzeDocsConsistency({ rootDir: root, staleTerms: [] });

    expect(issues).toHaveLength(0);
  });
});

describe('formatIssues', () => {
  test('Claude Codeに修正依頼しやすい形式で出力する', async () => {
    const root = await createTempRepo();
    writeFileSync(path.join(root, 'CLAUDE.md'), 'スマートフォン中心\n', 'utf8');

    const issues = analyzeDocsConsistency({ rootDir: root, staleTerms: DEFAULT_STALE_TERMS });
    const output = formatIssues(issues);

    expect(output).toContain('docs:check');
    expect(output).toContain('CLAUDE.md:1');
    expect(output).toContain('スマートフォン');
    expect(output).toContain('Claude Code');
  });
});
