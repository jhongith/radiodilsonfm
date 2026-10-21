/* ═══════════════════════════════════════════════════════════════════════════
   Radio Dilson 101.9 FM — Service Worker v5

   🚨🚨🚨  OBLIGATORIO EN CADA DESPLIEGUE — LEE ESTO ANTES DE SUBIR A NETLIFY  🚨🚨🚨
   ───────────────────────────────────────────────────────────────────────────
   ▶  SUBE SIEMPRE EL NÚMERO DE `DEPLOY_VERSION` (abajo, línea ~22) EN CADA DEPLOY.
   ▶  Si NO lo subes, los usuarios que ya visitaron la app seguirán viendo la
      versión VIEJA cacheada: el navegador considera este sw.js byte-a-byte
      idéntico y NO instala la versión nueva, así que tus cambios (comunicados,
      programación, diseño) NO llegan a nadie.
   ▶  Regla práctica:  v117 → v118 → v119 → ...  (nunca lo repitas ni lo bajes).
   ▶  Subirlo lanza `install` + `activate`, que crean la caché nueva y BORRAN
      automáticamente todas las cachés antiguas.

   CÓMO SABER QUÉ VERSIÓN TIENEN LOS USUARIOS:
   DevTools → Application → Cache Storage → busca 'dilson-fm-vXXX'
   ───────────────────────────────────────────────────────────────────────────  */

const DEPLOY_VERSION = 'dilson-fm-v122';  /* ← SUBIR ESTE NÚMERO EN CADA DEPLOY */
const CACHE_VERSION  = DEPLOY_VERSION;

/* Assets que se pre-cachean al instalar el SW.
   NOTA: admin-comunicados.html NO se precachea a propósito — el panel de
   administración no debe distribuirse a los dispositivos de los oyentes. */
const ASSETS = [
  './',
  './index.html',
  './offline.html',
  './instalar.html',
  './app.js',
  './style.css',
  './manifest.json',
  './icon-512-v2.png',
  './icon-384-v2.png',
  './icon-192-v2.png',
  './icon-180-v2.png',
  './icon-152-v2.png',
  './icon-192-maskable-v2.png',
  './icon-512-maskable-v2.png',
  './icon-32-v2.png',
  './favicon.ico'
];

/* Assets que cambian con frecuencia — se revalidan en red antes de servir.
   (admin-comunicados.html queda fuera del precache, pero si algún día se
    sirve por la misma caché, la revalidación en red lo mantiene fresco.) */
const REVALIDATE_ASSETS = [
  './app.js',
  './style.css',
  './index.html',
];

/* URLs que NUNCA van al caché (dinámicas / tiempo real) */
const BYPASS_PATTERNS = [
  /* Audio en vivo y endpoints propios: JAMÁS caché */
  '/radio-stream',
  '/api/radio-status',
  '/.netlify/functions/',
  'stream',

  /* Firebase — SOLO lo dinámico/versionado, NUNCA las fuentes.
     'firebaseio' cubre la Realtime Database (dilson...-default-rtdb.firebaseio.com).
     'www.gstatic.com/firebasejs' cubre el SDK, que ya viene versionado en la URL.
     ⚠️ NO usar 'gstatic.com' ni 'googleapis.com' sueltos: eso bloquearía
        fonts.gstatic.com y fonts.googleapis.com, y la app perdería la
        tipografía sin conexión. */
  'firebaseio',
  'www.gstatic.com/firebasejs',

  /* APIs dinámicas: clima, geocodificación, metadatos musicales, imágenes */
  'open-meteo.com',
  'imgbb.com',
  'i.ibb.co',
  'ws.audioscrobbler.com',
  'musicbrainz.org',
  'coverartarchive.org',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'apis.google.com',

  /* Librerías de terceros y mapas */
  'cdnjs.cloudflare.com',
  'tile.openstreetmap.org',
  'openstreetmap.org'
];

/* Deliberadamente FUERA del bypass (por tanto SÍ cacheables en runtime):
   ▸ fonts.googleapis.com  → hoja de estilos CSS de Google Fonts (type 'cors')
   ▸ fonts.gstatic.com     → archivos .woff2 (type 'cors')
   Así la tipografía (Bebas Neue, Space Grotesk, JetBrains Mono…) sigue
   disponible sin conexión. NO se precachean: entran por cache-first en
   tiempo de ejecución porque sus URLs llevan parámetros y cambian. */

/* ════════════════════════════════════════════════════════════════
   INSTALL — pre-cachear assets UNO POR UNO, con tolerancia a fallos

   Antes se usaba `cache.addAll(ASSETS)`, que es ATÓMICO: si un solo
   recurso devolvía 404/red, la promesa se rechazaba y la caché quedaba
   VACÍA — pero el `catch` llamaba igualmente a skipWaiting(), dejando
   la PWA activa sin nada para modo offline.
   Ahora cada recurso se cachea de forma independiente: los que fallan
   solo se registran en consola, y el resto SÍ queda disponible offline.
   ════════════════════════════════════════════════════════════════ */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache =>
        Promise.all(
          ASSETS.map(asset =>
            fetch(asset, { cache: 'no-cache' })
              .then(res => {
                if (!res || !res.ok) {
                  throw new Error('HTTP ' + (res ? res.status : 'sin respuesta'));
                }
                return cache.put(asset, res);
              })
              .catch(err => {
                console.warn('[SW] No se pudo precachear:', asset, '→', err.message);
              })
          )
        )
      )
      .then(() => {
        console.log('[SW] Install OK · caché:', CACHE_VERSION);
        return self.skipWaiting();   /* ✅ único skipWaiting correcto */
      })
      .catch(err => {
        /* Se conserva el SW anterior si falla algo inesperado:
           NO se llama a skipWaiting() aquí. */
        console.error('[SW] Install con errores inesperados (no se activa la versión nueva):', err);
      })
  );
});

/* ════════════════════════════════════════════════════════════════
   ACTIVATE — limpiar cachés viejos y tomar el control
   ════════════════════════════════════════════════════════════════ */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => {
            console.log('[SW] Eliminando caché viejo:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())
  );
});

/* ════════════════════════════════════════════════════════════════
   MESSAGES — comunicación con la app en primer/segundo plano
   ════════════════════════════════════════════════════════════════ */
self.addEventListener('message', e => {
  if (!e.data) return;

  switch (e.data.type) {

    case 'SKIP_WAITING':
    case 'CHECK_UPDATE':
      self.skipWaiting();
      break;

    case 'SHOW_PLAYBACK_NOTIF':
      _showPlaybackNotification({
        title:  e.data.title  || 'Radio Dilson 101.9 FM',
        artist: e.data.artist || 'En Vivo · Cuevo, Bolivia',
        icon:   e.data.icon   || './icon-192-v2.png',
        badge:  e.data.badge  || './icon-192-v2.png',
      });
      break;

    case 'HIDE_PLAYBACK_NOTIF':
      _hidePlaybackNotification();
      break;

    /* NOTA: los mensajes 'KEEPALIVE' / 'AUDIO_PLAYING' / 'AUDIO_PAUSED' que
       aún envía app.js se ignoran a propósito. Un service worker NO puede
       auto-mantenerse vivo con setInterval: el navegador lo suspende igual y
       el "guard" solo añadía trabajo inútil. El keepalive real del audio lo
       hacen Media Session API + WakeLock + AudioContext silencioso en app.js. */
  }
});

/* ════════════════════════════════════════════════════════════════
   NOTIFICACIÓN PERSISTENTE DE REPRODUCCIÓN
   ════════════════════════════════════════════════════════════════ */
const PLAYBACK_NOTIF_TAG = 'dilson-playback';

async function _showPlaybackNotification({ title, artist, icon, badge }) {
  try {
    await self.registration.showNotification('📻 ' + title, {
      body:               artist,
      icon:               icon  || './icon-192-v2.png',
      badge:              badge || './icon-192-v2.png',
      tag:                PLAYBACK_NOTIF_TAG,
      renotify:           false,
      requireInteraction: true,
      silent:             true,
      actions: [
        { action: 'pause', title: '⏸ Pausar' },
        { action: 'open',  title: '🎙️ Abrir' },
      ],
      data: { type: 'playback', ts: Date.now() }
    });
  } catch(err) {
    console.warn('[SW] Notificación de reproducción no disponible:', err.message);
  }
}

async function _hidePlaybackNotification() {
  try {
    const notifs = await self.registration.getNotifications({ tag: PLAYBACK_NOTIF_TAG });
    notifs.forEach(n => n.close());
  } catch(_) {}
}

/* ════════════════════════════════════════════════════════════════
   FETCH — Estrategia híbrida optimizada para móvil

   • No-GET:            se ignora por completo (sin respondWith)
   • Bypass total:      /radio-stream, /api/radio-status, Firebase (SDK y
                        Realtime Database), clima/geocodificación, mapas y
                        metadatos musicales → SIEMPRE red, nunca caché
   • Assets críticos:   Network-first con fallback a caché
                        (app.js, style.css, index.html)
   • Navegación HTML:   Network-first con fallback a caché
                        → el usuario ve los comunicados/programación
                          nuevos en cuanto hay red; offline usa la copia
                          cacheada y, si no existe, offline.html
   • Assets estáticos:  Cache-First (imágenes, iconos y Google Fonts:
                        el CSS de fonts.googleapis.com y los .woff2 de
                        fonts.gstatic.com, ambos type 'cors')
   ════════════════════════════════════════════════════════════════ */
self.addEventListener('fetch', e => {
  const req = e.request;

  /* ── Solo GET: un POST/PUT/DELETE en cache.put() lanzaría
        TypeError: Request method 'POST' is unsupported ── */
  if (req.method !== 'GET') return;

  if (!req.url.startsWith('http')) return;

  const url = req.url;

  /* ── Network-Only: APIs, streams y recursos dinámicos ──
     Se sale sin respondWith() → el navegador va directo a la red
     y nada de esto se guarda en caché. */
  if (BYPASS_PATTERNS.some(p => url.includes(p))) return;

  /* ── Network-first para assets críticos (app.js, style.css, index.html) ──
     Comparación anclada al origen vía pathname (no endsWith sobre la URL
     completa, que podía confundir orígenes externos). */
  const reqPath = new URL(req.url).pathname;
  const isRevalidate = REVALIDATE_ASSETS.some(a => reqPath.endsWith(a.replace('./', '/')));
  if (isRevalidate) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(res => {
          if (res && res.status === 200) {
            /* CRÍTICO: clonar ANTES de retornar — no después */
            const resClone = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(req, resClone)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          /* Siempre devolvemos algo válido: caché o un 503 controlado
             (nunca undefined, que provocaría "Failed to fetch"). */
          caches.match(req).then(cached =>
            cached || new Response('Recurso no disponible sin conexión', {
              status: 503,
              statusText: 'Offline',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            })
          )
        )
    );
    return;
  }

  /* ── NETWORK-FIRST para navegación (páginas HTML) ──
     Antes era cache-first de facto: devolvía el index.html cacheado sin
     consultar la red, así que los comunicados nuevos no se veían nunca. */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(res => {
          if (res && res.status === 200) {
            /* CRÍTICO: clonar antes de guardar */
            const resClone = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(req, resClone)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          /* Sin red: copia cacheada de la propia URL, luego el index, y
             como respaldo REAL de navegación, offline.html. */
          const cache = await caches.open(CACHE_VERSION);
          return (await cache.match(req))
              || (await cache.match('./index.html'))
              || (await cache.match('./offline.html'))
              || new Response('<h1>Sin conexión</h1>', {
                   status: 503,
                   headers: { 'Content-Type': 'text/html; charset=utf-8' }
                 });
        })
    );
    return;
  }

  /* ── Cache-First para assets estáticos (imágenes, iconos, fuentes) ── */
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(res => {
          /* 'cors' incluido: las Google Fonts (font-face cross-origin)
             llegan con type 'cors' y antes se descartaban, perdiendo la
             tipografía al quedar sin conexión. */
          const cacheable = res && res.status === 200 &&
                            (res.type === 'basic' || res.type === 'cors');
          if (cacheable) {
            /* CRÍTICO: clonar antes de retornar */
            const resClone = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(req, resClone)).catch(() => {});
          }
          return res;
        })
        .catch(() => {
          if (req.destination === 'image') {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#030d0d"/><text x="50" y="62" text-anchor="middle" font-size="40" fill="#f5c842" font-family="Arial Black">D</text></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
          /* Respaldo válido para el resto (fuentes, css secundario, etc.):
             nunca se resuelve undefined. */
          return new Response('', {
            status: 504,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
    })
  );
});

/* ════════════════════════════════════════════════════════════════
   PUSH — Notificaciones push desde el servidor

   Tolera las DOS formas de payload:
   ▸ Estándar FCM: { notification: { title, body, icon }, data: {...} }
   ▸ Plana:        { title, body, icon, data: {...} }
   Así nunca sale una notificación con título/cuerpo vacíos.
   ════════════════════════════════════════════════════════════════ */
self.addEventListener('push', e => {
  if (!e.data) return;

  let payload;
  try {
    payload = e.data.json();
  } catch {
    payload = {
      title: 'Radio Dilson 101.9 FM',
      body:  e.data.text() || 'Nueva notificación',
    };
  }

  /* El formato FCM anida los datos de presentación en `notification`;
     algunos servidores los mandan en la raíz del payload. */
  const notif = payload.notification || payload;

  e.waitUntil(
    self.registration.showNotification(notif.title || payload.title || 'Radio Dilson 101.9 FM', {
      body:     notif.body    || payload.body    || '',
      icon:     notif.icon    || payload.icon    || './icon-192-v2.png',
      badge:    notif.badge   || payload.badge   || './icon-192-v2.png',
      image:    notif.image   || payload.image   || undefined,
      tag:      notif.tag     || payload.tag     || 'dilson-notif',
      renotify: true,
      vibrate:  [200, 100, 200],
      data:     payload.data  || { url: '/' },
      actions: [
        { action: 'open',    title: '📻 Escuchar' },
        { action: 'dismiss', title: 'Cerrar' }
      ],
      silent: false,
    })
  );
});

/* ── Clic en notificación ── */
self.addEventListener('notificationclick', e => {
  const data = e.notification.data || {};

  if (e.action === 'dismiss') {
    e.notification.close();
    return;
  }

  /* ── Acción "Pausar" de la notificación de reproducción ──
     Coherente con el resto de manejadores: siempre se cierra la
     notificación y se avisa a las ventanas controladas (la app vive
     en una pestaña controlada por el SW). */
  if (e.action === 'pause' && data.type === 'playback') {
    e.notification.close();
    e.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: false })
        .then(clients => clients.forEach(c => c.postMessage({ type: 'NOTIF_ACTION_PAUSE' })))
    );
    return;
  }

  /* ── Clic normal: enfocar la pestaña existente o abrir la URL destino ── */
  e.notification.close();

  const targetUrl = data.url || '/';
  e.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const existing = clients.find(c => c.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
          existing.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return;
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});

/* ── Cierre de notificación ── */
self.addEventListener('notificationclose', () => {
  /* Reservado para analítica futura */
});
