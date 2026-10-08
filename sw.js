// ============================================
//  Service Worker для Eye Care & Dev Zone
//  Версия: 1.1.0
// ============================================
const CACHE_NAME = 'eyecare-v1.1.0';
const RUNTIME_CACHE = 'eyecare-runtime-v1.1.0';

// ============================================
//  Файлы для кэширования
// ============================================
const PRECACHE_URLS = [
    './',
    './index.html',
    './app.html',
    './manifest.json',
    './icons/icon-512x512.png',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap'
];

// ============================================
//  УСТАНОВКА
// ============================================
self.addEventListener('install', (event) => {
    console.log('🔧 SW: Установка v1.1.0...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Кэшируем файлы...');
                return cache.addAll(PRECACHE_URLS.map(url => {
                    if (url.startsWith('http')) {
                        return new Request(url, { mode: 'no-cors' });
                    }
                    return url;
                }));
            })
            .then(() => {
                console.log('✅ SW: Установлен!');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Ошибка кэша:', error);
            })
    );
});

// ============================================
//  АКТИВАЦИЯ
// ============================================
self.addEventListener('activate', (event) => {
    console.log('🚀 SW: Активация...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
                        })
                        .map((cacheName) => {
                            console.log('🗑️ Удаляем старый кэш:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('✅ SW: Активирован!');
                return self.clients.claim();
            })
    );
});

// ============================================
//  FETCH
// ============================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Пропускаем Яндекс.Рекламу
    if (url.hostname.includes('yandex.ru') || 
        url.hostname.includes('yandex.net') ||
        url.hostname.includes('ads')) {
        return;
    }

    // Только GET
    if (request.method !== 'GET') {
        return;
    }

    // Network First для HTML
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const responseClone = response.clone();
                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then((cachedResponse) => {
                        return cachedResponse || caches.match('./index.html');
                    });
                })
        );
        return;
    }

    // Cache First для остального
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    fetch(request)
                        .then((response) => {
                            if (response && response.status === 200) {
                                const responseClone = response.clone();
                                caches.open(RUNTIME_CACHE).then((cache) => {
                                    cache.put(request, responseClone);
                                });
                            }
                        })
                        .catch(() => {});
                    
                    return cachedResponse;
                }

                return fetch(request)
                    .then((response) => {
                        if (!response || response.status !== 200 || response.type === 'opaque') {
                            return response;
                        }

                        const responseClone = response.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });

                        return response;
                    })
                    .catch(() => {
                        if (request.destination === 'image') {
                            return caches.match('./icons/icon-512x512.png');
                        }
                    });
            })
    );
});

// ============================================
//  СООБЩЕНИЯ
// ============================================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
                caches.delete(cacheName);
            });
        });
    }
});

// ============================================
//  PUSH-УВЕДОМЛЕНИЯ
// ============================================
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    
    const title = data.title || 'Eye Care & Dev Zone';
    const options = {
        body: data.body || 'Пора сделать перерыв для глаз! 👀',
        icon: './icons/icon-512x512.png',
        badge: './icons/icon-512x512.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || './app.html'
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ============================================
//  КЛИК ПО УВЕДОМЛЕНИЮ
// ============================================
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data.url || './app.html')
    );
});

console.log('🎉 Service Worker v1.1.0 загружен!');
