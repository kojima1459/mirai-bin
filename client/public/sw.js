// 未来便 Service Worker
const CACHE_NAME = 'mirai-bin-v1';
const STATIC_CACHE_NAME = 'mirai-bin-static-v1';
const DYNAMIC_CACHE_NAME = 'mirai-bin-dynamic-v1';

// 静的アセット（事前キャッシュ）
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json'
];

// キャッシュしないパス
const NO_CACHE_PATHS = [
  '/api/',
  '/share/'
];

// インストール時に静的アセットをキャッシュ
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Failed to cache static assets:', err);
      })
  );
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('mirai-bin-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// フェッチリクエストの処理
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 同一オリジンのみ処理
  if (url.origin !== location.origin) {
    return;
  }

  // キャッシュしないパスはネットワークのみ
  if (NO_CACHE_PATHS.some(path => url.pathname.startsWith(path))) {
    event.respondWith(
      fetch(request).catch(() => {
        // APIエラー時はオフラインページを返さない（JSONエラーを返す）
        if (url.pathname.startsWith('/api/')) {
          return new Response(
            JSON.stringify({ error: 'offline', message: 'ネットワークに接続できません' }),
            { 
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
        return caches.match('/offline.html');
      })
    );
    return;
  }

  // ナビゲーションリクエスト（HTML）
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 成功したらキャッシュに保存
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // オフライン時はキャッシュから、なければオフラインページ
          return caches.match(request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/offline.html');
            });
        })
    );
    return;
  }

  // 静的アセット（CSS, JS, 画像など）- Cache First戦略
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // バックグラウンドで更新
            fetch(request).then((response) => {
              if (response.ok) {
                caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                  cache.put(request, response);
                });
              }
            }).catch(() => {});
            return cachedResponse;
          }
          
          // キャッシュになければネットワークから取得してキャッシュ
          return fetch(request).then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
        })
    );
    return;
  }

  // その他のリクエスト - Network First戦略
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// プッシュ通知の受信
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = { title: '未来便', body: '新しいお知らせがあります' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: '開く' },
      { action: 'close', title: '閉じる' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // 既存のウィンドウがあればフォーカス
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // なければ新しいウィンドウを開く
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// バックグラウンド同期
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
  
  if (event.tag === 'sync-drafts') {
    event.waitUntil(syncDrafts());
  }
});

async function syncDrafts() {
  // 下書きの同期処理（将来の拡張用）
  console.log('[SW] Syncing drafts...');
}
