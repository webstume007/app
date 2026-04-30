// public/sw.js

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// What happens when the user taps the notification on their phone
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Close the notification

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // If the app is already open in the background, focus it
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes('/') && 'focus' in client) {
                    return client.focus();
                }
            }
            // If the app is completely closed, open a new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
