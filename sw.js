// StompBox Remote — cache offline.
// Ao publicar uma versão nova, mude o número do CACHE para forçar a atualização.
//
// v7.0 — só o número (o arquivo com todas as configurações e o Restaurar do arquivo).
// v6.3 — só o número (o gabinete preso embaixo da tela e as categorias prontas).
// v6.2 — só o número (o botão de ligar no gabinete e o splash da StompBox simulada).
// v6.1 — só o número (o modo offline simples: a página faz o papel da StompBox, sem arquivo extra).
// v6.0 — o número e o stompbox.wasm (o firmware do modo offline). Saiu na v6.1.
// v5.1 — só o número (visor que amplia, LED azul, ícone novo). Os PNGs do ícone
//         (icon-192, icon-512, icon-maskable-512) ficam fora da lista de propósito:
//         quem os busca é o Android, ao instalar ou atualizar o app — a página não usa.
// v5.0 — só o número (balão novo: Simulação do Pedal, com o visor desenhado como o firmware).
// v4.3 — só o número (seleção dos slots no modo escuro corrigida, cores sóbrias).
// v4.2 — só o número (modo claro e modo escuro).
// v4.1 — só o número (fundo preto pro OLED, apagar volumes gravados).
// v4.0 — só o número (categorias, números no catálogo, taps do pedal no Andamento).
// v3.21 — só o número (gravar os volumes no pedal).
// v3.20.2 — só o número (FR e MN trocados: MN = 01, FR = 11).
// v3.20.1 — só o número (chaves do modo corrigidas: AT | SB | FR·MN + FR/MN).
// v3.20 — só o número (▶ do sampler toca o último sample).
// v3.19.1 — só o número (chaves do modo como as do pedal: 3 posições + 2).
// v3.19 — só o número (modo pelo celular, barra de status, disparos nos slots).
//         A partir daqui o arquivo sai como StompBox_Remote_vX.YY_sw.js; no site
//         ele continua se chamando sw.js.
// v3.18 — só o número (segurar um timbre abre o fader dele).
// v3.17.1 — só o número (o 00 MUTE de enfeite no sampler).
// v3.17 — só o número (modo sampler).
// v3.16 — só o número (Meus presets, faders pela alça, balões recolhíveis).
// v3.15 — só o número (página com MUTE, cena e volume absoluto).
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
const CACHE = 'stompbox-v7.0';
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
