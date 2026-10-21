/* ═══════════════════════════════════════════════════════════════
   Netlify Function: imgbb-upload  (ahora sube a CLOUDINARY)
   ═══════════════════════════════════════════════════════════════
   Se conserva el NOMBRE del archivo y la RUTA a propósito: el panel de
   administración y la web ya llaman a /.netlify/functions/imgbb-upload
   en tres sitios, y así no hay que tocar ninguno.

   POR QUÉ SE CAMBIÓ DE PROVEEDOR
   ImgBB bloqueó la cuenta (devolvía "You have been forbidden to use this
   website" incluso con una clave nueva), así que las subidas dejaron de
   funcionar. Cloudinary es el reemplazo: 25 GB gratis y sin tarjeta.

   CONFIGURACIÓN EN NETLIFY (Site configuration → Environment variables)
   Opción A — recomendada, sin secretos:
       CLOUDINARY_CLOUD_NAME = pe2opm27
       CLOUDINARY_PRESET     = <nombre de un upload preset "Unsigned">

   Opción B — firmada, más estricta:
       CLOUDINARY_CLOUD_NAME = pe2opm27
       CLOUDINARY_API_KEY    = <número de 15 dígitos del panel>
       CLOUDINARY_API_SECRET = <el secreto de 25 caracteres>

   Después hay que REDESPLEGAR para que las variables lleguen a la función.

   El cliente espera la misma forma de respuesta que daba imgBB:
       { success: true, data: { url, thumb: { url } } }
   ═══════════════════════════════════════════════════════════════ */

const crypto = require('crypto');

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(payload),
  };
}

/* Extrae el binario del único archivo que manda el formulario.
   Netlify entrega el cuerpo en bruto (multipart), así que se localiza el
   separador entre cabeceras y contenido y el cierre del boundary. */
function extraerArchivo(body, contentType) {
  const coincidencia = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!coincidencia) return null;
  const boundary = coincidencia[1] || coincidencia[2];
  if (!boundary) return null;

  const marca = Buffer.from('--' + boundary);
  const arranque = body.indexOf(marca);
  if (arranque < 0) return null;

  const cabecerasFin = body.indexOf(Buffer.from('\r\n\r\n'), arranque);
  if (cabecerasFin < 0) return null;

  const cabeceras = body.slice(arranque, cabecerasFin).toString('utf8');
  const tipo = /content-type:\s*([^\r\n]+)/i.exec(cabeceras);
  const mime = tipo ? tipo[1].trim() : 'image/jpeg';

  const datosInicio = cabecerasFin + 4;
  const cierre = body.indexOf(marca, datosInicio);
  if (cierre < 0) return null;

  /* Se descarta el \r\n que precede al separador de cierre */
  let fin = cierre;
  if (body[fin - 1] === 0x0a && body[fin - 2] === 0x0d) fin -= 2;

  const datos = body.slice(datosInicio, fin);
  if (!datos.length) return null;
  return { datos, mime };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Cache-Control': 'no-store' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { success: false, error: { message: 'method-not-allowed' } });
  }

  const cloud  = process.env.CLOUDINARY_CLOUD_NAME;
  const preset = process.env.CLOUDINARY_PRESET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secreto = process.env.CLOUDINARY_API_SECRET;

  if (!cloud) {
    console.error('[subir-imagen] Falta CLOUDINARY_CLOUD_NAME');
    return json(500, { success: false, error: { message: 'servidor-sin-configurar' } });
  }
  if (!preset && !(apiKey && secreto)) {
    console.error('[subir-imagen] Falta CLOUDINARY_PRESET o el par API_KEY/SECRET');
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
  if (!body.length)                 return json(400, { success: false, error: { message: 'sin-imagen' } });
  if (body.length > MAX_BYTES)      return json(413, { success: false, error: { message: 'imagen-demasiado-grande' } });

  const archivo = extraerArchivo(body, contentType);
  if (!archivo) {
    return json(400, { success: false, error: { message: 'no-se-encontro-la-imagen' } });
  }

  const dataUri = 'data:' + archivo.mime + ';base64,' + archivo.datos.toString('base64');
  const campos = { file: dataUri };

  if (preset) {
    campos.upload_preset = preset;
  } else {
    /* Firma: los parámetros ordenados alfabéticamente + el secreto */
    const sello = String(Math.floor(Date.now() / 1000));
    const aFirmar = 'timestamp=' + sello + secreto;
    campos.timestamp = sello;
    campos.api_key   = apiKey;
    campos.signature = crypto.createHash('sha1').update(aFirmar).digest('hex');
  }

  try {
    const formulario = new FormData();
    for (const [k, v] of Object.entries(campos)) formulario.append(k, v);

    const subida = await fetch('https://api.cloudinary.com/v1_1/' + cloud + '/image/upload', {
      method: 'POST',
      body: formulario,
    });

    const data = await subida.json().catch(() => ({}));

    if (!subida.ok) {
      const motivo = (data.error && (data.error.message || data.error.http_code)) || 'error-del-proveedor';
      console.error('[subir-imagen] Cloudinary respondió', subida.status, motivo);
      return json(subida.status, {
        success: false,
        error: { message: motivo },
      });
    }

    /* Se devuelve la misma forma que daba imgBB para no tocar el cliente */
    const url = data.secure_url || data.url;
    const miniatura = url
      ? url.replace('/upload/', '/upload/w_400,c_limit,q_auto/')
      : url;
    return json(200, {
      success: true,
      data: { url, display_url: miniatura, thumb: { url: miniatura }, id: data.public_id },
    });

  } catch (e) {
    console.error('[subir-imagen] error de red:', e && e.message);
    return json(502, { success: false, error: { message: 'upstream-unavailable' } });
  }
};
