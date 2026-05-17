import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

interface ServiceWorkerContext {
  __getHtmlPath: (url: string) => string;
  __PRECACHE_URLS: string[];
}

function loadServiceWorkerContext(): ServiceWorkerContext {
  const source = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');
  const context = {
    URL,
    Request,
    self: {
      location: { origin: 'https://example.test' },
      addEventListener: () => undefined,
      skipWaiting: () => undefined,
      clients: { claim: () => undefined },
    },
  };

  vm.runInNewContext(
    `${source}
globalThis.__getHtmlPath = getHtmlPath;
globalThis.__PRECACHE_URLS = PRECACHE_URLS;`,
    context
  );

  return context as typeof context & ServiceWorkerContext;
}

describe('PWA Service Worker navigation paths', () => {
  it('静的エクスポートされたページのindex.htmlへ変換する', () => {
    const { __getHtmlPath } = loadServiceWorkerContext();

    expect(__getHtmlPath('https://example.test/settings')).toBe('/settings/index.html');
    expect(__getHtmlPath('https://example.test/settings/')).toBe('/settings/index.html');
    expect(__getHtmlPath('https://example.test/settings/home')).toBe('/settings/home/index.html');
  });

  it('事前キャッシュにその他ページの実ファイルパスを含める', () => {
    const { __PRECACHE_URLS } = loadServiceWorkerContext();

    expect(__PRECACHE_URLS).toContain('/settings/index.html');
    expect(__PRECACHE_URLS).not.toContain('/settings.html');
  });
});
