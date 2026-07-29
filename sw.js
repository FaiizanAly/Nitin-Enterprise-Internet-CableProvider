/**
 * ================================================================
 * NITIN ENTERPRISE — SERVICE WORKER
 * sw.js  |  v2.0.0
 *
 * Strategy:
 *   • Static assets (CSS, JS, fonts, images) → Cache-First
 *   • HTML pages                              → Network-First with
 *                                               cache fallback
 *   • External CDN resources (fonts, icons)   → Stale-While-Revalidate
 *
 * Offline: If network and cache both fail,
 *   HTML requests fall back to /pay.html from cache.
 * ================================================================
 */

'use strict';

/* ── Cache Names ── */
const CACHE_STATIC  = 'ne-static-v2';   // App shell + assets
const CACHE_DYNAMIC = 'ne-dynamic-v2';  // CDN / runtime responses

/* ── Files to pre-cache on install ── */
const PRECACHE_URLS = [
  '/index.html',
  '/pay.html',
  '/style.css',
  '/pay.css',
  '/script.js',
  '/pay.js',
  '/manifest.json',
  '/assets/favicon.svg',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
];

/* ── CDN hosts to cache dynamically ── */
const CDN_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'unpkg.com',
];

/* ================================================================
   INSTALL — Pre-cache app shell
================================================================ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      /* Silently skip files that fail (e.g. qr.png if not yet added) */
      return Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(() => {
            console.warn('[SW] Could not pre-cache:', url);
          })
        )
      );
    })
  );

  /* Activate immediately without waiting for old SW to be idle */
  self.skipWaiting();
});

/* ================================================================
   ACTIVATE — Clean up stale caches
================================================================ */
self.addEventListener('activate', event => {
  const VALID_CACHES = [CACHE_STATIC, CACHE_DYNAMIC];

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => !VALID_CACHES.includes(key))
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );

  /* Take control of all open pages immediately */
  self.clients.claim();
});

/* ================================================================
   FETCH — Routing Strategy
================================================================ */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* ── Skip non-GET requests (POST, etc.) ── */
  if (request.method !== 'GET') return;

  /* ── Skip UPI deep links ── */
  if (url.protocol === 'upi:') return;

  /* ── CDN resources → Stale-While-Revalidate ── */
  if (CDN_HOSTS.some(host => url.hostname.includes(host))) {
    event.respondWith(staleWhileRevalidate(request, CACHE_DYNAMIC));
    return;
  }

  /* ── HTML pages → Network-First (with cache fallback) ── */
  if (request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  /* ── Static assets (CSS, JS, images, fonts) → Cache-First ── */
  event.respondWith(cacheFirst(request));
});

/* ================================================================
   CACHE STRATEGIES
================================================================ */

/**
 * Cache-First: serve from cache if available, else fetch + cache.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] Fetch failed (cache-first):', request.url);
    return new Response('Offline — resource not available.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * Network-First: fetch from network, fall back to cache, then offline page.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    /* Final fallback: serve /pay.html if anything fails offline */
    const fallback = await caches.match('/pay.html');
    return fallback ?? new Response('You are offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * Stale-While-Revalidate: serve cache immediately, update in background.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached ?? await fetchPromise;
}
