/**
 * Mise Service Worker
 * Cache-first for app shell, network-first for Netlify functions
 */

const CACHE_NAME = 'mise-v12';

const CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/themes.css',
  '/css/app.css',
  '/css/desktop.css',
  '/css/family.css',
  '/js/data.js',
  '/js/library.js',
  '/js/detail.js',
  '/js/form.js',
  '/js/parser.js',
  '/js/nutrition.js',
  '/js/planner.js',
  '/js/shopping.js',
  '/js/settings.js',
  '/js/install.js',
  '/js/app.js',
  '/js/family.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/.netlify/functions/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;

        return fetch(event.request).then(res => {
          if (res.ok && event.request.method === 'GET') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        });
      })
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});
