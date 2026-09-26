// StompBox Remote — cache offline.
// Ao publicar uma versão nova, mude o número do CACHE para forçar a atualização.
//
// v3.14 — além do número, cinco ajustes:
//  1) A instalação busca os arquivos PULANDO o cache HTTP do navegador
//     (cache: 'reload'). O GitHub Pages manda o navegador guardar os
//     arquivos por 10 minutos: publicando e abrindo o app logo em seguida,
//     o cache novo podia nascer com a página VELHA dentro.
//  2) A atualização em segundo plano passou a ser esperada (waitUntil).
//     Antes ela era solta, e o navegador podia encerrar o service worker
//     no meio dela — a cópia nova não chegava a ser guardada.
//  3) Essa atualização pergunta ao servidor (cache: 'no-cache') em vez de
//     aceitar a cópia guardada pelo navegador. Com o GitHub Pages, a
//     pergunta é leve: se nada mudou, volta só um "não mudou".
//  4) Só mexe em pedidos do próprio site.
//  5) Offline, uma navegação que não bate exatamente com o que está
//     guardado (ex.: endereço com ?parâmetro) recebe o index.html do
//     cache, em vez da página de erro do navegador.
const CACHE = 'stompbox-v3.14';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARQUIVOS.map(u => new Request(u, { cache: 'reload' }))))   // (1)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;   // (4)
  const navegacao = req.mode === 'navigate';

  // cópia fresca do servidor (3), guardada no cache se vier boa
  const atualizar = fetch(req.url, { cache: 'no-cache' }).then(res => {
    if (res && res.ok) {
      const copia = res.clone();
      return caches.open(CACHE).then(c => c.put(req, copia)).then(() => res);
    }
    return res;
  });
  ev.waitUntil(atualizar.catch(() => {}));   // (2)

  ev.respondWith(
    caches.match(req, { ignoreSearch: navegacao }).then(hit => {
      // tem no cache: devolve na hora; a atualização acima termina sozinha
      if (hit) return hit;
      // não tem: vai à rede; offline, navegação cai no index.html (5)
      return atualizar.catch(() => navegacao ? caches.match('./index.html') : Response.error());
    })
  );
});
