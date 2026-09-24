// StompBox Remote — cache offline.
// Ao publicar uma versão nova, mude o número do CACHE para forçar a atualização.
const CACHE = 'stompbox-v3.7';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(
    caches.match(ev.request).then(hit => {
      if (hit) {
        // devolve o cache na hora e atualiza em segundo plano
        fetch(ev.request).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(ev.request, res.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(ev.request);
    })
  );
});
