/* ═══════════════════════════════════════════════════════════════
   Netlify Function: imgbb-upload
   Recibe la imagen que sube un oyente, le añade la clave secreta y la
   reenvía a imgBB. Así la clave NUNCA viaja al navegador.

   Antes la clave estaba escrita en app.js y en admin-comunicados.html,
   a la vista de cualquiera: bastaba abrir el código fuente para copiarla
   y gastar la cuota de subidas.

   CONFIGURACIÓN NECESARIA (una sola vez):
     Netlify → Site configuration → Environment variables
       IMGBB_KEY = tu clave de API de imgbb.com

   ⚠️ ROTA LA CLAVE ANTIGUA en imgbb.com: la que estaba publicada hay
   que considerarla comprometida para siempre.

   El cliente espera la misma forma de respuesta que daba imgBB:
     { success: true, data: { url, thumb: { url } } }
   ═══════════════════════════════════════════════════════════════ */

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(payload),
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Cache-Control': 'no-store' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { success: false, error: { message: 'method-not-allowed' } });
  }

  const key = process.env.IMGBB_KEY;
  if (!key) {
    console.error('[imgbb-upload] Falta la variable de entorno IMGBB_KEY');
    return json(500, { success: false, error: { message: 'servidor-sin-configurar' } });
  }

  const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return json(400, { success: false, error: { message: 'se-esperaba-multipart' } });
  }

  let body;
  try {
    body = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8');
  } catch (e) {
    return json(400, { success: false, error: { message: 'cuerpo-ilegible' } });
  }

  if (!body.length) {
    return json(400, { success: false, error: { message: 'sin-imagen' } });
  }
  if (body.length > MAX_BYTES) {
    return json(413, { success: false, error: { message: 'imagen-demasiado-grande' } });
  }

  try {
    /* Se reenvía el cuerpo tal cual, respetando el boundary del formulario */
    const upstream = await fetch(
      'https://api.imgbb.com/1/upload?key=' + encodeURIComponent(key),
      {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body,
      }
    );

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error('[imgbb-upload] imgBB respondió', upstream.status);
    }
    return json(upstream.status, data);

  } catch (e) {
    console.error('[imgbb-upload] error de red:', e && e.message);
    return json(502, { success: false, error: { message: 'upstream-unavailable' } });
  }
};
