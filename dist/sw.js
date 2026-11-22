const cacheName = 'chessgo-pokemon-v3';
const art = ['pikachu','ponyta','squirtle','alakazam','gardevoir','snorlax','eevee','charizard','bulbasaur','gengar'];
const files = ['./','./index.html','./app.js','./motion.js','./profile.js','./style.css','./icon.svg','./manifest.json','./vendor/chess.js',...art.map(name => './art/' + name + '.png')];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(files)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all(['chessgo-v1','chessgo-pokemon-v2'].map(key => caches.delete(key))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method === 'GET' && new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(fetch(event.request).catch(() => caches.open(cacheName).then(cache => cache.match(event.request))));
  }
});
