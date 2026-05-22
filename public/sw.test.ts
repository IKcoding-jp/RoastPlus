import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

interface ServiceWorkerContext {
  __getHtmlPath: (url: string) => string;
  __putInRuntimeCache: (requests: Request[], response: Response) => Promise<void>;
  __getNavigationFallback: () => Promise<Response>;
  __PRECACHE_URLS: string[];
  caches: {
    open?: () => Promise<{ put: (request: Request, response: Response) => Promise<void> }>;
    match?: () => Promise<Response | undefined>;
  };
}

function loadServiceWorkerContext(): ServiceWorkerContext {
  const source = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');
  const context = {
    URL,
    Request,
    Response,
    caches: {
      open: () => Promise.resolve({ put: () => Promise.resolve() }),
      match: () => Promise.resolve(undefined),
    },
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
globalThis.__putInRuntimeCache = putInRuntimeCache;
globalThis.__getNavigationFallback = getNavigationFallback;
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

describe('PWA Service Worker runtime cache', () => {
  it('同じResponseを複数URLへ保存してもbodyを使い回さない', async () => {
    const put = vi.fn().mockImplementation(async (_request: Request, response: Response) => {
      await response.text();
    });
    const context = loadServiceWorkerContext();

    context.caches = { open: () => Promise.resolve({ put }) };

    const originalResponse = new Response('assignment html');
    const cachePromise = context.__putInRuntimeCache(
      [new Request('https://example.test/assignment'), new Request('https://example.test/assignment/index.html')],
      originalResponse
    );

    await originalResponse.text();
    await cachePromise;
    expect(put).toHaveBeenCalledTimes(2);
  });

  it('キャッシュが空でもナビゲーションフォールバックはResponseを返す', async () => {
    const context = loadServiceWorkerContext();
    context.caches = { match: () => Promise.resolve(undefined) };

    await expect(context.__getNavigationFallback()).resolves.toBeInstanceOf(Response);
  });
});
