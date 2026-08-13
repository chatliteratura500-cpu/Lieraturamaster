// ============================================
// SERVICE WORKER PARA CHATLITERATURA
// Permite funcionamiento offline parcial
// ============================================

const CACHE_NAME = 'chatliteratura-v1';
const urlsToCache = [
    '/',
    '/index.html',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Archivos cacheados');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: Instalación completada');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Error en instalación:', error);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker: Activando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Eliminando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('Service Worker: Activación completada');
            return self.clients.claim();
        })
    );
});

// Intercepción de solicitudes fetch
self.addEventListener('fetch', event => {
    console.log('Service Worker: Interceptando fetch para:', event.request.url);
    
    // Solo interceptar solicitudes GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Estrategia: Cache first, then network
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Si está en caché, devolverlo
                if (cachedResponse) {
                    console.log('Service Worker: Sirviendo desde caché:', event.request.url);
                    return cachedResponse;
                }

                // Si no está en caché, ir a la red
                console.log('Service Worker: Solicitando a la red:', event.request.url);
                return fetch(event.request)
                    .then(response => {
                        // Clonar la respuesta para guardarla en caché
                        const responseToCache = response.clone();
                        
                        // Guardar en caché solo si es exitoso
                        if (response.status === 200) {
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                })
                                .catch(error => {
                                    console.error('Service Worker: Error al guardar en caché:', error);
                                });
                        }
                        
                        return response;
                    })
                    .catch(error => {
                        console.error('Service Worker: Error en fetch:', error);
                        // Si falla la red y no hay caché, devolver un error amigable
                        return new Response(
                            JSON.stringify({ 
                                error: 'offline',
                                message: 'Estás sin conexión. El chat no funcionará, pero puedes jugar al quiz.' 
                            }),
                            { 
                                status: 503,
                                headers: { 'Content-Type': 'application/json' }
                            }
                        );
                    });
            })
    );
});

// Manejar mensajes del cliente
self.addEventListener('message', event => {
    console.log('Service Worker: Mensaje recibido:', event.data);
    
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

// Manejar errores del Service Worker
self.addEventListener('error', error => {
    console.error('Service Worker: Error:', error);
});

console.log('Service Worker: Cargado correctamente');
