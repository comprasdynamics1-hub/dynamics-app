/* ============================================================================
 *  SERVICE WORKER — Aprovação de Compras · Dynamics
 *
 *  POR QUE ELE EXISTE
 *  O Chrome só oferece "Instalar aplicativo" para páginas que tenham um
 *  service worker com tratamento de rede. Sem ele, no Android o menu nem
 *  mostra a opção — e sem instalar, não há número no ícone.
 *
 *  O QUE ELE NÃO FAZ
 *  Não guarda dado nenhum do sistema em cache. Pedidos, preços e decisões
 *  vêm sempre do servidor, ao vivo. Aqui só ficam a casca da página e o
 *  ícone, para a abertura ser instantânea.
 * ========================================================================== */

/* O OneSignal precisa rodar dentro de um service worker. Em vez de registrar
   um segundo worker no mesmo escopo — o que faria os dois brigarem —
   carregamos o dele aqui dentro. */
try { importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js'); }
catch (e) { /* sem rede na instalacao: o resto do worker continua valendo */ }

var VERSAO = 'compras-dynamics-v2';
var CASCA = ['./', './index.html', './manifest.json', './icone_dynamics_512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(CASCA); })
                    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (nomes) {
    return Promise.all(nomes.map(function (n) {
      if (n !== VERSAO) { return caches.delete(n); }
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var url = e.request.url;

  /* Tudo que fala com o Google passa direto, sem cache. Guardar resposta de
     API seria mostrar pedido aprovado como pendente. */
  if (url.indexOf('script.google.com') >= 0 ||
      url.indexOf('googleusercontent.com') >= 0 ||
      e.request.method !== 'GET') {
    return;
  }

  /* Rede primeiro; o cache é só a rede de segurança para abrir sem sinal. */
  e.respondWith(
    fetch(e.request).then(function (r) {
      var copia = r.clone();
      caches.open(VERSAO).then(function (c) { c.put(e.request, copia); });
      return r;
    }).catch(function () { return caches.match(e.request); })
  );
});

/* A página de fora manda o número da fila; ele vai para o ícone. */
self.addEventListener('message', function (e) {
  if (e.data && e.data.tipo === 'badge' && self.registration) {
    try {
      if (e.data.n > 0) { navigator.setAppBadge(e.data.n); }
      else { navigator.clearAppBadge(); }
    } catch (err) { /* navegador sem suporte */ }
  }
});
