// public/sw.js

const CACHE_NAME = 'iub-assistant-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

const DEFAULT_ICON = '/icon-192x192.png';

const parseMaybeJson = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return null;
    try { return JSON.parse(value); } catch { return null; }
};

const buildNotification = (payload) => {
    const safePayload = payload && typeof payload === 'object' ? payload : {};
    const notif = (safePayload.notification && typeof safePayload.notification === 'object') ? safePayload.notification : {};
    const data = (safePayload.data && typeof safePayload.data === 'object') ? safePayload.data : {};

    const title =
        safePayload.title ||
        notif.title ||
        data.title ||
        'IUB Assistant';

    const body =
        safePayload.body ||
        notif.body ||
        data.body ||
        safePayload.message ||
        '';

    const url =
        safePayload.url ||
        data.url ||
        '/';

    const icon =
        safePayload.icon ||
        notif.icon ||
        data.icon ||
        DEFAULT_ICON;

    const tag =
        safePayload.tag ||
        data.tag ||
        undefined;

    return {
        title,
        options: {
            body,
            icon,
            badge: DEFAULT_ICON,
            tag,
            renotify: Boolean(tag),
            data: { url, ...data }
        }
    };
};

// Install Event: Warm up the cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// FETCH EVENT: Required for the "Download App" button to show
// This logic tries the network first, but allows the app to be "installable"
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});

// Push notification handler (works when server sends Web Push payloads)
self.addEventListener('push', (event) => {
    let payload = {};
    if (event?.data) {
        try {
            payload = event.data.json();
        } catch {
            payload = parseMaybeJson(event.data.text()) || {};
        }
    }
    const { title, options } = buildNotification(payload);
    event.waitUntil(self.registration.showNotification(title, options));
});

// Allow pages to ask the SW to show a notification (useful for installed PWAs)
self.addEventListener('message', (event) => {
    const msg = event?.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'SKIP_WAITING') {
        self.skipWaiting();
        return;
    }

    if (msg.type === 'SHOW_NOTIFICATION') {
        const { title, options } = buildNotification(msg.payload);
        event.waitUntil(self.registration.showNotification(title, options));
    }
});

// Notification Click Logic
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event?.notification?.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
