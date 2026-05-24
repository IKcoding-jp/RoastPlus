import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

interface ServiceWorkerContext {
  __getHtmlPath: (url: string) => string;
  __putInRuntimeCache: (requests: Request[], response: Response) => Promise<void>;
  __trimRuntimeCache?: (cache: {
    keys: () => Promise<Request[]>;
    delete: (request: Request) => Promise<boolean>;
  }) => Promise<void>;
  __getNavigationFallback: () => Promise<Response>;
  __MAX_RUNTIME_CACHE_ENTRIES?: number;
  __PRECACHE_URLS: string[];
  caches: {
    open?: () => Promise<{ put: (request: Request, response: Response) => Promise<void> }>;
    match?: () => Promise<Response | undefined>;
  };
  __listeners: {
    fetch?: (event: {
      request: Request;
      respondWith: (response: Promise<Response>) => void;
    }) => void;
  };
}

function loadServiceWorkerContext(): ServiceWorkerContext {
  const source = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');
  const listeners: ServiceWorkerContext['__listeners'] = {};
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
      addEventListener: (
        type: string,
        listener: ServiceWorkerContext['__listeners'][keyof ServiceWorkerContext['__listeners']]
      ) => {
        if (type === 'fetch') {
          listeners.fetch = listener;
        }
      },
      skipWaiting: () => undefined,
      clients: { claim: () => undefined },
    },
    __listeners: listeners,
  };

  vm.runInNewContext(
    `${source}
globalThis.__getHtmlPath = getHtmlPath;
globalThis.__putInRuntimeCache = putInRuntimeCache;
globalThis.__trimRuntimeCache = typeof trimRuntimeCache === 'undefined' ? undefined : trimRuntimeCache;
globalThis.__getNavigationFallback = getNavigationFallback;
globalThis.__MAX_RUNTIME_CACHE_ENTRIES = typeof MAX_RUNTIME_CACHE_ENTRIES === 'undefined' ? undefined : MAX_RUNTIME_CACHE_ENTRIES;
globalThis.__PRECACHE_URLS = PRECACHE_URLS;`,
    context
  );

  return context as typeof context & ServiceWorkerContext;
}

function resolvePrecachePath(url: string): string {
  if (url === '/' || url === '/index.html') {
    return join(process.cwd(), 'app', 'page.tsx');
  }

  if (url.endsWith('/index.html')) {
    const routePath = url.replace(/^\//, '').replace(/\/index\.html$/, '');
    return join(process.cwd(), 'app', routePath, 'page.tsx');
  }

  return join(process.cwd(), 'public', url.replace(/^\//, ''));
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

  it('事前キャッシュURLは実在するNext.jsページまたはpublicファイルを指す', () => {
    const { __PRECACHE_URLS } = loadServiceWorkerContext();

    const missingPaths = __PRECACHE_URLS
      .map((url) => ({ url, filePath: resolvePrecachePath(url) }))
      .filter(({ filePath }) => !existsSync(filePath));

    expect(missingPaths).toEqual([]);
  });

  it('manifestのicon参照はpublic配下の実ファイルを指す', () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), 'public', 'site.webmanifest'), 'utf8')) as {
      icons: Array<{ src: string }>;
    };

    const missingIcons = manifest.icons
      .map((icon) => ({
        src: icon.src,
        filePath: join(process.cwd(), 'public', icon.src.replace(/^\//, '')),
      }))
      .filter(({ filePath }) => !existsSync(filePath));

    expect(missingIcons).toEqual([]);
  });
});

describe('PWA Service Worker runtime cache', () => {
  it('runtime cacheの上限値を定義する', () => {
    const { __MAX_RUNTIME_CACHE_ENTRIES } = loadServiceWorkerContext();

    expect(__MAX_RUNTIME_CACHE_ENTRIES).toBe(80);
  });

  it('上限超過時は古いruntime cache entryから削除する', async () => {
    const { __MAX_RUNTIME_CACHE_ENTRIES, __trimRuntimeCache } = loadServiceWorkerContext();
    const requests = Array.from(
      { length: Number(__MAX_RUNTIME_CACHE_ENTRIES) + 2 },
      (_, index) => new Request(`https://example.test/page-${index}`)
    );
    const deleted: string[] = [];
    const cache = {
      keys: () => Promise.resolve(requests),
      delete: (request: Request) => {
        deleted.push(request.url);
        return Promise.resolve(true);
      },
    };

    await expect(__trimRuntimeCache?.(cache)).resolves.toBeUndefined();

    expect(deleted).toEqual([requests[0].url, requests[1].url]);
  });

  it('同じResponseを複数URLへ保存してもbodyを使い回さない', async () => {
    const put = vi.fn().mockImplementation(async (_request: Request, response: Response) => {
      await response.text();
    });
    const keys = vi.fn().mockResolvedValue([]);
    const deleteEntry = vi.fn().mockResolvedValue(true);
    const context = loadServiceWorkerContext();

    context.caches = { open: () => Promise.resolve({ put, keys, delete: deleteEntry }) };

    const originalResponse = new Response('assignment html');
    const cachePromise = context.__putInRuntimeCache(
      [new Request('https://example.test/assignment'), new Request('https://example.test/assignment/index.html')],
      originalResponse
    );

    await originalResponse.text();
    await cachePromise;
    expect(put).toHaveBeenCalledTimes(2);
    expect(keys).toHaveBeenCalledOnce();
  });

  it('キャッシュが空でもナビゲーションフォールバックはResponseを返す', async () => {
    const context = loadServiceWorkerContext();
    context.caches = { match: () => Promise.resolve(undefined) };

    await expect(context.__getNavigationFallback()).resolves.toBeInstanceOf(Response);
  });

  it('外部URLはfetch handlerでruntime cache対象にしない', () => {
    const context = loadServiceWorkerContext();
    const respondWith = vi.fn();
    const externalRequest = new Request('https://firestore.googleapis.com/v1/projects/example', {
      method: 'GET',
    });

    context.__listeners.fetch?.({
      request: externalRequest,
      respondWith,
    });

    expect(respondWith).not.toHaveBeenCalled();
  });
});
