const CACHE_NAME = 'portugues-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/storage.js',
  '/js/srs.js',
  '/js/audio.js',
  '/js/claude-api.js',
  '/js/views/home.js',
  '/js/views/pronunciation.js',
  '/js/views/vocabulary.js',
  '/js/views/grammar.js',
  '/js/views/conversation.js',
  '/js/views/progress.js',
  '/js/views/settings.js',
  '/js/data/pronunciation-data.js',
  '/js/data/vocabulary-data.js',
  '/js/data/grammar-data.js',
  '/js/data/lesson-plan.js',
  '/js/components/card.js',
  '/js/components/modal.js',
  '/js/components/toast.js',
  '/js/components/progress-bar.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json',
];

// Install — cache all app assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for app assets, network-first for API calls
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Always go to network for API calls
  if (url.hostname === 'api.anthropic.com') {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        // Cache successful same-origin responses
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
