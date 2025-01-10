self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('flashcard-cache-v2').then((cache) => {
            return cache.addAll([
                'index.html',
                'app.css',
                'app.js',
                'manifest.webmanifest',
                'icon128.png',
                'icon192.png',
                'icon512.png',
                'screenshot1.png',
                'screenshot2.png',
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = ['flashcard-cache-v2'];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});