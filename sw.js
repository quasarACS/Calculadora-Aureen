// Define un nombre para el caché
const CACHE_NAME = 'aureen-calc-v1';
// Lista los archivos base de tu app
const urlsToCache = [
    'calculadora.html',
    'style.css',
    'script.js',
    'icon-192.png',
    'icon-512.png'
];

// Evento 'install': se dispara cuando el Service Worker se instala
self.addEventListener('install', (event) => {
    // Espera a que el caché se abra y se guarden los archivos base
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache abierto');
                return cache.addAll(urlsToCache);
            })
    );
});

// Evento 'fetch': se dispara cada vez que la app pide un recurso (CSS, JS, imagen)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        // Intenta encontrar el recurso en el caché
        caches.match(event.request)
            .then((response) => {
                // Si lo encuentra en caché, lo devuelve.
                // Si no, va a internet a buscarlo.
                return response || fetch(event.request);
            })
    );
});
