// Service Worker for PWA
//
// キャッシュバージョン運用ルール（docs/steering/TECH_SPEC.md「PWA」参照）:
// - このファイルを変更したら SW_VERSION を必ず +1 する（上げ忘れると古い画面が配信され続ける）
// - CACHE_NAME / RUNTIME_CACHE は SW_VERSION から導出し、番号は常に一致させる（lib/pwa/sw.test.ts で検証）
// - バージョンを上げると activate 時に旧キャッシュが全削除される（実行時キャッシュもリセット）
const SW_VERSION = 8;
const CACHE_NAME = `roast-plus-v${SW_VERSION}`;
const RUNTIME_CACHE = `roast-plus-runtime-v${SW_VERSION}`;
const MAX_RUNTIME_CACHE_ENTRIES = 80;

// プリキャッシュ対象（最小アプリシェルのみ）
// 方針: 現場iPadは常時WiFi接続でオフライン利用はほぼ発生しないため、
// 未訪問ページのオフライン表示は保証しない（docs/steering/TECH_SPEC.md「プリキャッシュ方針」参照）。
// 一度訪問したページは実行時キャッシュ（Network First）でオフラインでも表示できる。
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/assignment/index.html',
  '/settings/index.html',
  '/login/index.html',
  '/notifications/index.html',
  '/android-chrome-192x192.png',
];

// Next.jsの静的エクスポートでは、ルートパス（/assignment）は実際には/assignment/index.htmlとして生成される
// この関数は、ルートパスをHTMLファイルパスに変換する
function getHtmlPath(url) {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname.replace(/\/+$/, '') || '/';

  // 既に.htmlで終わっているか、拡張子がある場合はそのまま返す
  if (pathname.endsWith('.html') || pathname.match(/\.[a-zA-Z0-9]+$/)) {
    return pathname;
  }

  // ルートパスの場合はindex.html
  if (pathname === '/') {
    return '/index.html';
  }

  // その他のルートパスはindex.htmlを追加
  return `${pathname}/index.html`;
}

function putInRuntimeCache(requests, response) {
  if (!response || response.status !== 200) {
    return Promise.resolve();
  }

  const cacheEntries = requests.map((request) => ({
    request,
    response: response.clone(),
  }));

  return caches
    .open(RUNTIME_CACHE)
    .then((cache) =>
      Promise.all(cacheEntries.map(({ request, response }) => cache.put(request, response))).then(() =>
        trimRuntimeCache(cache)
      )
    )
    .catch((error) => {
      console.error('Service Worker cache put failed:', error);
    });
}

function trimRuntimeCache(cache) {
  return cache
    .keys()
    .then((requests) => {
      const deleteCount = requests.length - MAX_RUNTIME_CACHE_ENTRIES;

      if (deleteCount <= 0) {
        return undefined;
      }

      const requestsToDelete = requests.slice(0, deleteCount);

      return Promise.all(
        requestsToDelete.map((request) =>
          cache.delete(request).catch((error) => {
            console.error('Service Worker runtime cache delete failed:', error);
            return false;
          })
        )
      ).then(() => undefined);
    })
    .catch((error) => {
      console.error('Service Worker runtime cache trim failed:', error);
    });
}

function getNavigationFallback() {
  return caches
    .match('/index.html')
    .then((cachedResponse) => cachedResponse || caches.match('/'))
    .then((cachedResponse) => cachedResponse || Response.error());
}

// インストール時の処理
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// アクティベート時の処理
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// メッセージリスナー（SKIP_WAITINGメッセージを処理）
// 注: install イベント内で既に self.skipWaiting() を無条件に呼んでいるため、
// このリスナーは実装受け取りがない冗長なコード。
// 将来「更新通知UI」を実装する場合はここで SKIP_WAITING メッセージを処理する。
// self.addEventListener('message', (event) => {
//   if (event.data && event.data.type === 'SKIP_WAITING') {
//     self.skipWaiting();
//   }
// });

// フェッチ時の処理（Network First戦略）
self.addEventListener('fetch', (event) => {
  // GETリクエストのみ処理
  if (event.request.method !== 'GET') {
    return;
  }

  // 外部リソース（Firebase等）はキャッシュしない
  if (event.request.url.startsWith('http') && !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isDocumentRequest = event.request.destination === 'document' || event.request.mode === 'navigate';

  // ドキュメントリクエストの場合、ルートパスをHTMLファイルパスに変換
  if (isDocumentRequest) {
    const htmlPath = getHtmlPath(event.request.url);

    // HTMLファイルパスが元のパスと異なる場合、新しいリクエストを作成
    if (htmlPath !== requestUrl.pathname) {
      const htmlUrl = new URL(htmlPath, event.request.url);
      const htmlRequest = new Request(htmlUrl.toString(), {
        method: event.request.method,
        headers: event.request.headers,
        mode: 'same-origin',
        credentials: event.request.credentials,
        redirect: event.request.redirect,
      });

      event.respondWith(
        // まず、HTMLファイルパスを試す
        fetch(htmlRequest)
          .then((response) => {
            // レスポンスが有効な場合、元のリクエストとHTMLファイルパスの両方をキャッシュに保存
            if (response && response.status === 200) {
              putInRuntimeCache([event.request, htmlRequest], response);
              return response;
            }
            // 404の場合は、元のリクエストを試す（Firebase Hostingのrewritesが適用される可能性がある）
            return fetch(event.request).then((originalResponse) => {
              if (originalResponse && originalResponse.status === 200) {
                putInRuntimeCache([event.request, htmlRequest], originalResponse);
              }
              return originalResponse;
            });
          })
          .catch(() => {
            // ネットワークエラー時はキャッシュから取得
            return caches.match(htmlRequest).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // 元のリクエストも試す
              return caches.match(event.request).then((originalCached) => {
                if (originalCached) {
                  return originalCached;
                }
                // それでも見つからない場合は、index.htmlを返す（SPAフォールバック）
                return getNavigationFallback();
              });
            });
          })
      );
      return;
    }
  }

  // 通常のリクエスト処理
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // レスポンスが有効な場合、キャッシュに保存
        if (response && response.status === 200) {
          putInRuntimeCache([event.request], response);
        }
        return response;
      })
      .catch(() => {
        // ネットワークエラー時はキャッシュから取得
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // ドキュメントリクエストの場合、HTMLファイルパスに変換して再試行
          if (isDocumentRequest) {
            const htmlPath = getHtmlPath(event.request.url);
            if (htmlPath !== requestUrl.pathname) {
              return caches.match(htmlPath).then((htmlCachedResponse) => {
                if (htmlCachedResponse) {
                  return htmlCachedResponse;
                }
                // それでも見つからない場合は、index.htmlを返す（SPAフォールバック）
                return getNavigationFallback();
              });
            }
            // HTMLファイルパスが同じ場合は、index.htmlを返す（SPAフォールバック）
            return getNavigationFallback();
          }

          return Response.error();
        });
      })
  );
});
