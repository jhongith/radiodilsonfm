/* ═══════════════════════════════════════════════════════════════
   Netlify Function: /api/radio-status
   Devuelve cuántos oyentes hay y, si el servidor lo publica, la canción
   actual. Se consulta desde el servidor para evitar problemas de CORS.

   ── IMPORTANTE: QUÉ TIPO DE SERVIDOR TIENES ─────────────────────
   Tu radio está en un servidor SHOUTCAST v2 (listen2myradio), no en
   Icecast. La diferencia importa mucho: en un Shoutcast, CUALQUIER ruta
   que no exista devuelve EL AUDIO en lugar de un error o de un JSON.

   Eso es lo que tenía colgado el "ahora suena": la versión anterior pedía
   `/status-json.xsl` (una ruta de Icecast), recibía un chorro infinito de
   audio y se ponía a leerlo como si fuera un JSON. Nunca terminaba.

   Por eso ahora TODO se hace con dos reglas:
     1. Se mira el content-type ANTES de leer. Si es audio, se corta la
        conexión y no se lee nada.
     2. El temporizador de seguridad cubre también la lectura del cuerpo,
        no solo la llegada de las cabeceras.

   ── DE DÓNDE SALE CADA COSA ────────────────────────────────────
   · Oyentes, emisora y calidad → /stats?sid=1  (XML de Shoutcast v2)
   · Respaldo                   → /7.html       (CSV de Shoutcast v1)
   · Respaldo                   → /status-json.xsl (por si algún día
                                   migras a Icecast; se comprueba el tipo)
   · Último recurso             → cabeceras ICY del propio stream

   ⚠️ Tu servidor NO publica el nombre de la canción: `SONGTITLE` viene
   vacío y `SERVERTITLE` dice "No Name". En ese caso esta función devuelve
   `title: ''` a propósito, y el reproductor NO toca la canción que tenga:
   así el nombre lo sigue poniendo el panel de administración en
   `radio/currentSong`, que es la vía que tú controlas.

   ⚠️ SI CAMBIA EL SERVIDOR hay que tocar DOS sitios: las constantes de
   abajo y el destino de /radio-stream en netlify.toml.
   ═══════════════════════════════════════════════════════════════ */

/* ── Servidor de la emisora ── */
const STREAM_HOST  = 'uk18freenew.listen2myradio.com';
const STREAM_PORT  = 34784;
const STREAM_ID    = 1;
const STREAM_PATH  = '/;stream';   /* la ruta que entrega el audio */

const BASE = `http://${STREAM_HOST}:${STREAM_PORT}`;

/* Tiempos cortos a propósito: Netlify corta las funciones síncronas a los
   10 s. Entre los tres intentos hay que quedarse muy por debajo. */
const T_STATS = 2500;
const T_CSV   = 2000;
const T_JSON  = 2000;
const T_ICY   = 2000;

/* Caché en memoria del contenedor: varios oyentes a la vez no repiten la
   consulta. No es una garantía (Netlify puede arrancar instancias nuevas),
   pero reduce mucho la carga sobre el servidor de radio. */
const MEMO_MS = 12000;
let memo = { at: 0, body: null };

const CABECERAS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
  'Cache-Control':                'public, max-age=10, s-maxage=10',
  'Netlify-CDN-Cache-Control':    'public, max-age=20, stale-while-revalidate=40',
};

const CABECERAS_FALLO = {
  ...CABECERAS,
  'Cache-Control':             'no-cache',
  'Netlify-CDN-Cache-Control': 'no-store',
};

function respuesta(statusCode, payload, headers = CABECERAS) {
  return { statusCode, headers, body: JSON.stringify(payload) };
}

/* Nombres que no aportan nada. Tu servidor anuncia "No Name" y hay otros
   que envían "Unspecified name" o "unknown": mostrarlos tal cual dejaría
   el reproductor diciendo "No Name", que es peor que no decir nada. */
function nombreUtil(valor) {
  const v = String(valor || '').trim();
  if (!v) return '';
  if (/^(no name|unnamed|unspecified( name)?|unknown|n\/a|ninguno|misc)$/i.test(v)) return '';
  return v;
}

/* Petición de texto con el temporizador cubriendo TODA la operación.
   Si el tipo de respuesta es audio, se corta sin leer: es la trampa en la
   que caía la versión anterior. */
async function traerTexto(url, ms, tipoEsperado, extraHeaders = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'DilsonFM-Proxy/4.0', ...extraHeaders },
    });
    const tipo = r.headers.get('content-type') || '';
    const cortar = async () => { try { await r.body?.cancel(); } catch (_) {} };
    if (/audio|octet/i.test(tipo)) { await cortar(); throw new Error('el servidor devolvió audio, no estado'); }
    if (!r.ok) { await cortar(); throw new Error('HTTP ' + r.status); }
    if (tipoEsperado && !tipoEsperado.test(tipo)) { await cortar(); throw new Error('tipo inesperado: ' + tipo); }
    /* El temporizador sigue activo: si el cuerpo no termina, aborta. */
    return await r.text();
  } finally { clearTimeout(timer); }
}

function campoXML(xml, nombre) {
  const m = xml.match(new RegExp('<' + nombre + '>([\\s\\S]*?)</' + nombre + '>', 'i'));
  return m ? m[1].trim() : '';
}

/* ── Fuente 1: XML de Shoutcast v2 ── */
function leerStatsXML(xml) {
  const oyentes = parseInt(campoXML(xml, 'CURRENTLISTENERS'), 10);
  if (!Number.isFinite(oyentes)) throw new Error('XML sin CURRENTLISTENERS');
  return {
    listeners: oyentes,
    bitrate:   parseInt(campoXML(xml, 'BITRATE'), 10) || 128,
    genre:     nombreUtil(campoXML(xml, 'SERVERGENRE')) || 'Variado',
    title:     nombreUtil(campoXML(xml, 'SONGTITLE')) || nombreUtil(campoXML(xml, 'SERVERTITLE')),
    encendido: campoXML(xml, 'STREAMSTATUS') === '1',
  };
}

/* ── Fuente 2: CSV de Shoutcast v1 ──
   Formato: oyentes,estado,pico,max,unicos,kbps,canción */
function leerStatsCSV(html) {
  const campos = html.replace(/<[^>]+>/g, '').split(',');
  const oyentes = parseInt(campos[0], 10);
  if (!Number.isFinite(oyentes)) throw new Error('CSV sin oyentes');
  return {
    listeners: oyentes,
    bitrate:   parseInt(campos[5], 10) || 128,
    genre:     'Variado',
    title:     nombreUtil((campos[6] || '').trim()),
    encendido: (campos[1] || '').trim() === '1',
  };
}

/* ── Fuente 3: JSON de Icecast (por si algún día migras) ── */
function leerIcecastJSON(txt) {
  const d = JSON.parse(txt);
  let src = d && d.icestats && d.icestats.source;
  if (Array.isArray(src)) src = src.filter(Boolean).sort((a, b) => (Number(b.listeners) || 0) - (Number(a.listeners) || 0))[0];
  if (!src) throw new Error('sin fuentes activas');
  return {
    listeners: parseInt(src.listeners, 10) || 0,
    bitrate:   parseInt(src.bitrate, 10) || 128,
    genre:     nombreUtil(src.genre) || 'Variado',
    title:     nombreUtil(src.title || src.server_name),
    encendido: true,
  };
}

function aRespuesta(datos, fuente) {
  return {
    ok: true,
    title:  datos.title || '',            /* '' = no lo sabemos: no toques la canción */
    artist: 'Dilson 101.9 FM',
    song:   datos.title || '',
    listeners: Number.isFinite(datos.listeners) ? datos.listeners : null,
    bitrate: datos.bitrate || 128,
    genre:   datos.genre || 'Variado',
    encendido: datos.encendido !== false,
    timestamp: Date.now(),
    source: fuente,
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CABECERAS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return respuesta(405, { ok: false, error: 'method-not-allowed' }, CABECERAS_FALLO);
  }

  if (memo.body && Date.now() - memo.at < MEMO_MS) {
    return respuesta(200, memo.body);
  }

  let ultimoError = null;

  /* 1) XML de Shoutcast v2 — la fuente buena en tu servidor */
  try {
    const xml = await traerTexto(`${BASE}/stats?sid=${STREAM_ID}`, T_STATS, /xml|text/i);
    const datos = leerStatsXML(xml);
    const payload = aRespuesta(datos, 'shoutcast-stats');
    memo = { at: Date.now(), body: payload };
    return respuesta(200, payload);
  } catch (e) { ultimoError = e; }

  /* 2) CSV de Shoutcast v1 */
  try {
    const html = await traerTexto(`${BASE}/7.html`, T_CSV, /html|text/i);
    const datos = leerStatsCSV(html);
    const payload = aRespuesta(datos, 'shoutcast-7html');
    memo = { at: Date.now(), body: payload };
    return respuesta(200, payload);
  } catch (e) { ultimoError = e; }

  /* 3) JSON de Icecast (solo si de verdad devuelve JSON) */
  try {
    const txt = await traerTexto(`${BASE}/status-json.xsl`, T_JSON, /json/i);
    const datos = leerIcecastJSON(txt);
    const payload = aRespuesta(datos, 'icecast-status-json');
    memo = { at: Date.now(), body: payload };
    return respuesta(200, payload);
  } catch (e) { ultimoError = e; }

  /* 4) Cabeceras ICY del propio stream.
        Se piden sin 'Range' (con Range no llega el bloque de metadatos) y
        en cuanto llegan las cabeceras se corta la conexión. */
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), T_ICY);
    let r;
    try {
      r = await fetch(`${BASE}${STREAM_PATH}`, {
        signal: ctrl.signal,
        headers: { 'Icy-MetaData': '1', 'User-Agent': 'DilsonFM-Proxy/4.0' },
      });
    } finally { clearTimeout(timer); }

    const tipo = r.headers.get('content-type') || '';
    const icyName  = nombreUtil(r.headers.get('icy-name'));
    const icyGenre = nombreUtil(r.headers.get('icy-genre')) || 'Variado';
    const icyBr    = parseInt(r.headers.get('icy-br'), 10) || 128;
    try { await r.body?.cancel(); } catch (_) {}

    if (!r.ok) throw new Error('HTTP ' + r.status);
    if (!/audio|octet/i.test(tipo)) throw new Error('el stream no devolvió audio');

    const payload = {
      ok: true,
      title:  icyName || '',
      artist: 'Dilson 101.9 FM',
      song:   icyName || '',
      listeners: null,          /* las cabeceras ICY no dicen cuántos oyentes hay */
      bitrate: icyBr,
      genre:   icyGenre,
      encendido: true,
      timestamp: Date.now(),
      source: 'icy-headers',
    };
    return respuesta(200, payload);
  } catch (e) { ultimoError = e; }

  /* 5) Nada funcionó. Se responde con honestidad y el detalle va solo al
        registro del servidor (antes se enviaba al navegador). */
  console.error('[radio-status] todas las fuentes fallaron. Último error:', ultimoError && ultimoError.message);
  return respuesta(200, {
    ok: false,
    title: '', artist: 'Dilson 101.9 FM', song: '',
    listeners: null, bitrate: 128, genre: 'Variado',
    timestamp: Date.now(),
    source: 'fallback',
    error: 'upstream-unavailable',
  }, CABECERAS_FALLO);
};
