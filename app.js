/* ═══════════════════════════════════════════
   Radio Dilson 101.9 FM — app.js
   v2.0 — Mejoras aplicadas:
   ✅ Modo nocturno automático (20:00–07:00)
   ✅ Contador de oyentes en tiempo real
   ✅ Arte de álbum vía Last.fm API
   ✅ Compartir canción como imagen (Canvas)
   ✅ Dead code eliminado
   ═══════════════════════════════════════════ */

/* ── SPLASH ── */
window.addEventListener('load', () => {
  setTimeout(() => {
    const sp = document.getElementById('splash');
    sp.classList.add('hide');
    setTimeout(() => sp.remove(), 700);
  }, 2200); // MEJORA: reducido de 2700 → 2200ms
});

/* ── TEMA ──────────────────────────────────────────────────────────
   Se retiró el antiguo conmutador de tema (claro/oscuro).

   Motivo: el diseño de esta versión es oscuro y style.css no define
   ni una sola regla [data-theme], así que cambiar el tema no producía
   ningún efecto visual. Como además el botón del HTML llamaba a una
   función que ya no existía, lo único que hacía era lanzar un error
   en consola al pulsarlo. Un control que no hace nada es peor que no
   tenerlo.

   Si algún día quieres recuperar el tema claro, la hoja de estilos
   completa que sí lo implementaba sigue guardada en la carpeta
   "VERSION 23" (archivo style.css, 4429 líneas: ahí están las reglas
   [data-theme="light"] y el modo nocturno automático).
   ───────────────────────────────────────────────────────────────── */

/* ── PWA ── */
/* ── PWA INSTALLATION MEJORADA ── */
let deferredPrompt;
let installBannerShown = false;

/* Cierra el banner de instalación y, salvo que se pida lo contrario,
   recuerda la decisión para no volver a molestarlo.

   Se manipula style.display directamente a propósito: el banner trae
   display:none escrito en línea en el HTML, y el estilo en línea gana
   a cualquier clase CSS, así que `classList.remove('show')` no bastaba
   para ocultarlo (y el banner tampoco aparecía nunca por el mismo
   motivo). Controlando display desde aquí, el comportamiento deja de
   depender del CSS. */
function closeInstallBanner(recordar) {
  const banner = document.getElementById('installBanner');
  if (!banner) return;
  if (recordar !== false) localStorage.setItem('dilson_install_closed', 'true');
  banner.style.opacity = '0';
  banner.style.transform = 'translateY(20px)';
  setTimeout(() => {
    banner.classList.remove('show');
    banner.style.display = 'none';
    banner.style.opacity = '';
    banner.style.transform = '';
  }, 400);
}

/* Muestra el banner de instalación (quitando el display:none en línea).
   Devuelve el elemento o null si no existe. */
function mostrarInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (!banner) return null;
  banner.style.display = 'flex';
  banner.classList.add('show');
  installBannerShown = true;
  return banner;
}

/* Alias con los nombres que invoca index.html */
window.cerrarInstallBanner  = () => closeInstallBanner(true);
window.mostrarInstallBanner = mostrarInstallBanner;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  
  if (!installBannerShown && !localStorage.getItem('dilson_install_closed')) {
    setTimeout(() => {
      const banner = mostrarInstallBanner();
      if (banner) {
        
        // Mostrar progreso de instalación
        const progress = document.getElementById('installProgress');
        let width = 0;
        const interval = setInterval(() => {
          width += 1;
          if (width <= 100) {
            progress.style.width = width + '%';
          } else {
            clearInterval(interval);
          }
        }, 50);
      }
    }, 3000);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('installBtn');
  if (!installBtn) return; // Guard por si el elemento no existe

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      showManualInstallInstructions();
      return;
    }

    installBtn.disabled = true;
    installBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Instalando...</span>';

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast('🎉 ¡App instalada correctamente!');
      localStorage.setItem('dilson_install_closed', 'true');
      closeInstallBanner();
    } else {
      toast('❌ Instalación cancelada');
      installBtn.disabled = false;
      installBtn.innerHTML = '<span class="btn-icon">📲</span><span class="btn-text">Instalar App</span>';
    }

    deferredPrompt = null;
  });
});

function showManualInstallInstructions() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  
  let message = '';
  if (isIOS) {
    message = '📱 En Safari, toca "Compartir" → "Agregar a pantalla de inicio"';
  } else if (isAndroid) {
    message = '📱 En Chrome, toca el menú (⋮) → "Instalar aplicación"';
  } else {
    message = '📱 Abre este sitio en Chrome o Safari para instalar la app';
  }
  
  toast(message, 'i');
}

// Auto-cerrar banner si el usuario ya instaló
window.addEventListener('appinstalled', () => {
  localStorage.setItem('dilson_install_closed', 'true');
  closeInstallBanner();
  toast('✅ ¡Gracias por instalar Dilson FM!');
});

// Fallback para mostrar instrucciones en iOS/Android
setTimeout(() => {
  if (!installBannerShown && 
      !localStorage.getItem('dilson_install_closed') && 
      !window.matchMedia('(display-mode: standalone)').matches) {
    
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
    if (isMobile) {
      const banner = mostrarInstallBanner();
      if (banner) {
        
        // Cambiar texto para instrucciones manuales
        const elTitulo = document.querySelector('.install-title');
        const elDesc   = document.querySelector('.install-description');
        if (elTitulo) elTitulo.textContent = '¿Quieres la app?';
        if (elDesc)   elDesc.textContent   = 'Instala Radio Dilson en tu dispositivo';
        
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
          installBtn.innerHTML = '<span class="btn-icon">📱</span><span class="btn-text">Ver instrucciones</span>';
          /* No se le añade aquí otro manejador: el listener registrado más
             arriba ya llama a showManualInstallInstructions() cuando no hay
             prompt nativo. Asignar además onclick hacía que el aviso
             apareciera dos veces. */
        }
      }
    }
  }
}, 5000);
/* ── SERVICE WORKER + ACTUALIZACIÓN DE LA PWA ──
   Cuando hay un despliegue nuevo, el service worker queda "esperando"
   a que se cierren todas las pestañas.

   Regla de oro de esta app: NUNCA recargar mientras el oyente está
   escuchando. Una recarga corta el audio, y los navegadores no dejan
   reanudarlo sin un toque del usuario, así que cada despliegue dejaba
   a todo el mundo sin radio hasta que volviera a pulsar ▶.

   Comportamiento nuevo:
     · Si no se está escuchando → se aplica la actualización en 2 s.
     · Si se está escuchando    → se avisa y se aplica en cuanto el
       oyente pulse pausa (que es el momento perfecto).
   ─────────────────────────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  let _updatePendiente = null;

  function _radioSonando() {
    const el = document.getElementById('stream');
    return !!(el && !el.paused && !el.ended);
  }

  function _aplicarActualizacion() {
    if (!_updatePendiente) return;
    _updatePendiente.postMessage({ type: 'SKIP_WAITING' });
    _updatePendiente = null;
  }

  function _aplicarCuandoSePueda() {
    if (!_updatePendiente) return;
    if (_radioSonando()) {
      const el = document.getElementById('stream');
      if (el) el.addEventListener('pause', _aplicarActualizacion, { once: true });
      toast('🔄 Versión nueva lista — se aplicará al pausar la radio');
    } else {
      toast('🔄 Nueva versión disponible — actualizando...');
      setTimeout(_aplicarActualizacion, 2000);
    }
  }

  navigator.serviceWorker.register('./sw.js').then(reg => {
    // Detectar cuando hay una nueva versión esperando activarse
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          _updatePendiente = newWorker;
          _aplicarCuandoSePueda();
        }
      });
    });
  }).catch(() => {});

  // Cuando el SW nuevo toma el control, recargar una sola vez
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

/* ── ELEMENTS ── */
const audio    = document.getElementById('stream');
const playBtn  = document.getElementById('playBtn');
const liveDot  = document.getElementById('liveDot');
const liveLbl  = document.getElementById('liveLabel');
const livePill = document.getElementById('livePill');
const logoRing = document.getElementById('logoRing');
const tickerEl = document.getElementById('ticker');
const muteBtn  = document.getElementById('muteBtn');
const statSt   = document.getElementById('statSt');
const sigs     = [document.getElementById('s1'), document.getElementById('s2'),
                  document.getElementById('s3'), document.getElementById('s4')];
let playing = false, muted = false, barTimer, circTimer;

// ── Canciones placeholder mientras llega el StreamTitle real ──
const SONGS = [{ title: 'Dilson 101.9 FM', artist: 'En Vivo · Cuevo, Bolivia', icon: '🎙️' }];
let songIdx = 0;

/* MEJORA: persistir volumen */
const savedVol = parseInt(localStorage.getItem('dilson_vol') || '85', 10);
audio.volume = savedVol / 100;
document.getElementById('volSlider').value = savedVol;
document.getElementById('volPct').textContent = savedVol + '%';
document.getElementById('volSlider').style.setProperty('--p', savedVol + '%');

/* ═══════════════════════════════════════════════════════════════
   VISUALIZADOR ULTRA PREMIUM — Web Audio API AnalyserNode
   ▸ Doble anillo (exterior + interior invertido)
   ▸ Ciclos de paleta de color automáticos cada 8s
   ▸ Destellos en picos de frecuencia
   ▸ Partículas que explotan en los beats
   ▸ Halo/glow central que pulsa con el bass
   ▸ Barras horizontales con gradiente dinámico
   ═══════════════════════════════════════════════════════════════ */
/* ─ Detección rápida de dispositivo (necesaria antes del canvas) ─ */
const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
              || window.innerWidth <= 480;

const canvas = document.getElementById('vizCanvas');
// desynchronized:true en móvil → dibuja sin esperar al compositor del DOM (más fluido)
const ctx    = canvas.getContext('2d', { desynchronized: isMobile });

/* ═══════════════════════════════════════════════════════════════
   SISTEMA DE RENDIMIENTO ADAPTATIVO
   ▸ Detecta móvil, mide FPS real y ajusta calidad automáticamente
   ▸ Nivel ALTO   → desktop / gama alta  (efectos completos)
   ▸ Nivel MEDIO  → móvil normal         (sin partículas, menos shadowBlur)
   ▸ Nivel BAJO   → gama baja / lento    (mínimo, solo barras básicas)
   ═══════════════════════════════════════════════════════════════ */
const isLowEnd = isMobile && (navigator.hardwareConcurrency <= 4
              || navigator.deviceMemory <= 2);

/* Calidad inicial: móvil arranca en MEDIO, desktop en ALTO */
let QUALITY = isLowEnd ? 'LOW' : isMobile ? 'MED' : 'HIGH';

/* Config por nivel de calidad */
const Q = {
  HIGH: { nbars: 80, maxOut: 42, maxIn: 10, shadowBlur: true,  shadowMax: 16, particles: true,  particleProb: 0.04, innerRing: true,  barCount: 36, barShadow: true  },
  MED:  { nbars: 52, maxOut: 40, maxIn: 6,  shadowBlur: true,  shadowMax: 8,  particles: false, particleProb: 0,    innerRing: true,  barCount: 28, barShadow: false },
  LOW:  { nbars: 32, maxOut: 36, maxIn: 0,  shadowBlur: false, shadowMax: 0,  particles: false, particleProb: 0,    innerRing: false, barCount: 20, barShadow: false },
};

/* ── Medición de FPS para ajustar la calidad ─────────────────────────
   Antes se medía UNA sola vez, en los primeros 2 segundos: justo cuando la
   página y el audio están arrancando, así que salía un valor malo y la
   calidad se quedaba reducida PARA SIEMPRE (menos barras y más cortas: es
   el "casi no se mueve" del móvil).

   Ahora se ignora el arranque, se mide en ventanas de 3 s y la calidad
   puede VOLVER a subir cuando el teléfono va bien. */
let fpsFrames = 0, fpsArranque = 0, fpsVentana = 0;

function measureFPS(now) {
  if (!fpsArranque) { fpsArranque = now; return; }
  if (now - fpsArranque < 5000) return;          /* se ignora el arranque */
  if (!fpsVentana) { fpsVentana = now; fpsFrames = 0; return; }

  fpsFrames++;
  const transcurrido = now - fpsVentana;
  if (transcurrido < 3000) return;               /* ventana de 3 segundos */

  const fps = (fpsFrames / transcurrido) * 1000;
  fpsVentana = now;
  fpsFrames = 0;

  const antes = QUALITY;
  if (fps < 26)      QUALITY = 'LOW';
  else if (fps < 42) QUALITY = (QUALITY === 'HIGH') ? 'MED' : QUALITY;
  else               QUALITY = 'HIGH';

  if (QUALITY !== antes) {
    console.info('[Dilson FM] ' + fps.toFixed(0) + ' fps → calidad ' + QUALITY);
    syncBarCount();
  }
}

/* Ajustar la cantidad de barras al nivel de calidad.
   Ahora también puede AÑADIR: antes solo quitaba, así que al recuperar
   calidad las barras perdidas no volvían nunca. */
function syncBarCount() {
  const objetivo = Q[QUALITY].barCount;
  while (barD.length > objetivo) {
    const quitada = barD.pop();
    if (quitada.el.parentNode) quitada.el.parentNode.removeChild(quitada.el);
  }
  while (barD.length < objetivo && barD.length < 36) agregarBarra();
}

const NBARS_FULL = 80; // referencia, el valor real lo da Q[QUALITY].nbars

/* ── Paletas de color que ciclan automáticamente ── */
const PALETTES = [
  // [color1_pico, color2_base, color3_interior, nombre]
  { a:'#f5c842', b:'#ff9500', c:'#ff4060', name:'Fuego Dorado'   },
  { a:'#00ffcc', b:'#0088ff', c:'#aa00ff', name:'Aurora Eléctrica'},
  { a:'#ff4dff', b:'#ff0088', c:'#ffaa00', name:'Plasma Rosa'    },
  { a:'#44ff88', b:'#00ffcc', c:'#0066ff', name:'Nebulosa Verde' },
  { a:'#ff6644', b:'#ffaa00', c:'#ff0055', name:'Lava'           },
  { a:'#aaffee', b:'#ffffff', c:'#88aaff', name:'Cristal Blanco' },
];
let paletteIdx  = 0;
let paletteNext = 0;
let paletteLerp  = 0; // 0→1 transición entre paletas
const PALETTE_DUR = 8000; // ms entre cambios

function lerpColor(c1, c2, t) {
  const h = s => parseInt(s.slice(1), 16);
  const r1=h(c1)>>16, g1=(h(c1)>>8)&255, b1=h(c1)&255;
  const r2=h(c2)>>16, g2=(h(c2)>>8)&255, b2=h(c2)&255;
  const r=Math.round(r1+(r2-r1)*t), g=Math.round(g1+(g2-g1)*t), bb=Math.round(b1+(b2-b1)*t);
  return `rgb(${r},${g},${bb})`;
}
function hexToRgba(hex, a) {
  const h = parseInt(hex.slice(1), 16);
  return `rgba(${h>>16},${(h>>8)&255},${h&255},${a})`;
}

/* Avanza paleta cada PALETTE_DUR ms */
let lastPaletteTime = performance.now();
function tickPalette(now) {
  const elapsed = now - lastPaletteTime;
  paletteLerp = Math.min(1, elapsed / 1200); // 1.2s de transición
  if (elapsed > PALETTE_DUR) {
    paletteIdx  = paletteNext;
    paletteNext = (paletteIdx + 1) % PALETTES.length;
    lastPaletteTime = now;
    paletteLerp = 0;
  }
}
function getCurPalette() {
  const p1 = PALETTES[paletteIdx];
  const p2 = PALETTES[paletteNext];
  const t  = paletteLerp;
  return {
    a: lerpColor(p1.a, p2.a, t),
    b: lerpColor(p1.b, p2.b, t),
    c: lerpColor(p1.c, p2.c, t),
  };
}

/* ── Buffers suavizados — tamaño máximo, se usa Q[QUALITY].nbars en runtime ── */
const circSmooth  = new Float32Array(NBARS_FULL).fill(0);
const circPeak    = new Float32Array(NBARS_FULL).fill(0);
const barSmooth   = new Float32Array(36).fill(0);
const barPeak     = new Float32Array(36).fill(0);

/* ── Partículas de destello ── */
const particles = [];
function spawnParticle(x, y, color) {
  for (let i = 0; i < 3; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 0.8 + Math.random() * 2.2;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 1,
      decay: 0.04 + Math.random() * 0.06,
      size: 1.5 + Math.random() * 2.5,
      color
    });
  }
}
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.04; // gravedad ligera
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life * 0.9;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ── Web Audio API ── */
let vizAudioCtx  = null;
let vizAnalyser  = null;
let vizSource    = null;
let vizFreqData  = null;
let vizConnected = false;

/* ── Ajustes del visualizador (barras y ondas) ──────────────────────
   Rango de frecuencias que se reparte entre las barras. Se reparte de
   forma LOGARÍTMICA, que es como oye el oído, en lugar de por una curva
   que amontonaba casi todas las barras en la zona aguda (casi vacía) y
   dejaba los graves aplastados en las primeras.
   Con 36 barras: 45 Hz, 53, 62, 72... hasta 14 kHz. */
const FREC_MIN = 45;      // Hz — primera frecuencia que se muestra
const FREC_MAX = 14000;   // Hz — última

/* Sensibilidad del dibujo. Por debajo de 1 realza los valores medios, así
   las barras y las ondas se ven más altas y con más movimiento; con 1.0 se
   ven más discretas y por encima de 1.3 casi todo se queda abajo.
   (Con 0.75 las barras de nivel medio suben alrededor de un 60 %). */
const VIZ_CONTRASTE       = 0.75;
const VIZ_PUERTA_SILENCIO = 0.35;  // por debajo de esto se considera silencio

/* ── MODO LIGERO (opcional) ──────────────────────────────────────────
   Abriendo la web con ?visualizador=0, la radio suena SIN pasar por el
   procesado de audio del navegador y sin dibujar barras ni ondas.

   Sirve para dos cosas:
     · para teléfonos que no dan abasto (el procesado de audio del
       visualizador compite con el dibujo en el mismo hilo y puede
       provocar cortes y chasquidos);
     · para averiguar de dónde viene un corte: si con ?visualizador=0
       desaparece, el problema era la carga gráfica; si sigue igual,
       viene de la propia emisión. */
const VIZ_ACTIVO = !/[?&]visualizador=0/.test(location.search);

function connectAudioAnalyser() {
  if (!VIZ_ACTIVO) {
    /* Sin visualizador: se ocultan los elementos y el audio suena
       directamente, sin AnalyserNode de por medio. */
    const barras = document.getElementById('bars');
    const ondas  = document.getElementById('vizCanvas');
    if (barras) barras.style.display = 'none';
    if (ondas)  ondas.style.display  = 'none';
    return;
  }
  if (vizConnected) {
    // ✅ FIX: Si ya está conectado pero el contexto está suspendido, reanudarlo
    if (vizAudioCtx && vizAudioCtx.state === 'suspended') {
      vizAudioCtx.resume().catch(() => {});
    }
    return;
  }
  try {
    // ✅ FIX: Reusar el audioCtx de notificaciones si ya existe, para evitar
    // conflictos — el navegador solo permite UNO por elemento <audio>
    if (audioCtx && audioCtx.state !== 'closed') {
      vizAudioCtx = audioCtx;
    } else {
      vizAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // ✅ FIX: Reanudar el contexto si está suspendido (lo suspende el navegador
    // hasta que hay interacción del usuario)
    if (vizAudioCtx.state === 'suspended') {
      vizAudioCtx.resume().catch(() => {});
    }
    vizAnalyser = vizAudioCtx.createAnalyser();
    vizAnalyser.fftSize = 1024;
    /* ── Rango de decibelios: LA CAUSA REAL DE QUE NO SE MOVIERAN ────────
       Por defecto el analizador mide de -100 a -30 dB. La música tiene casi
       toda su energía POR ENCIMA de -30 dB, así que prácticamente todas las
       bandas devolvían el valor máximo (255) y las barras se quedaban
       clavadas arriba. Al bajar el volumen la señal entraba más floja y de
       ahí que "revivieran".

       Con este rango (-85 a -10 dB) los valores se reparten por todo el
       recorrido y hay movimiento real en todo el espectro. */
    vizAnalyser.minDecibels = -85;
    vizAnalyser.maxDecibels = -10;
    vizAnalyser.smoothingTimeConstant = 0.75;
    vizFreqData = new Uint8Array(vizAnalyser.frequencyBinCount);
    vizSource   = vizAudioCtx.createMediaElementSource(audio);
    vizSource.connect(vizAnalyser);
    vizAnalyser.connect(vizAudioCtx.destination);
    vizConnected = true;
    // ✅ FIX: Sincronizar audioCtx global con el vizAudioCtx
    audioCtx = vizAudioCtx;
  } catch(e) {
    vizConnected = false;
    console.warn('AnalyserNode fallback (simulación activa):', e.message);
  }
}

function getFreqBands(n) {
  // n es dinámico según Q[QUALITY].nbars o Q[QUALITY].barCount
  const result = new Float32Array(n);
  const t = performance.now() / 1000;

  if (vizConnected && vizAnalyser && playing) {
    vizAnalyser.getByteFrequencyData(vizFreqData);
    const bins = vizFreqData.length;

    /* ── REPARTO DE FRECUENCIAS ENTRE LAS BARRAS ─────────────────────
       Antes se repartían con la curva Math.pow(p, 0.45) sobre los primeros
       140 puntos del análisis. A 44,1 kHz eso llega solo hasta ~6 kHz, y
       dejaba 32 de las 36 barras mirando la zona de 2 a 6 kHz, donde la
       música casi no tiene energía: esas barras se quedaban planas y por
       eso parecía que "solo se movía una parte".

       Ahora cada barra cubre una banda repartida de forma LOGARÍTMICA
       entre 45 Hz y 14 kHz (que es como oye el oído) y su valor es el
       PROMEDIO de esa banda, no un punto suelto. Así 24 de las 36 barras
       miran los graves y medios, donde está la música. */
    const hzPorPunto = (vizAudioCtx.sampleRate / 2) / bins;
    const limite     = Math.min(bins - 1, Math.ceil(FREC_MAX / hzPorPunto));

    /* ── Nivel del fotograma ─────────────────────────────────────────
       Se busca el valor más alto y el más bajo AHORA MISMO y se normaliza
       contra ellos. Es lo que hace que el dibujo aproveche todo su
       recorrido con el volumen alto o bajo, en vez de quedarse pegado. */
    let maxBin = 0, minBin = 255;
    for (let k = 0; k <= limite; k++) {
      const v = vizFreqData[k];
      if (v > maxBin) maxBin = v;
      if (v < minBin) minBin = v;
    }
    const rango = Math.max(24, maxBin - minBin); // nunca dividir por casi cero

    /* Puerta de silencio: si no hay señal, las barras bajan solas en lugar
       de amplificar el ruido de fondo. */
    const fuerza  = Math.min(1, (maxBin / 255) / VIZ_PUERTA_SILENCIO);
    const relacion = FREC_MAX / FREC_MIN;

    for (let i = 0; i < n; i++) {
      const p  = i / n;
      const f0 = FREC_MIN * Math.pow(relacion, p);
      const f1 = FREC_MIN * Math.pow(relacion, (i + 1) / n);
      let b0 = Math.floor(f0 / hzPorPunto);
      let b1 = Math.ceil(f1 / hzPorPunto);
      if (b0 < 0) b0 = 0;
      if (b1 <= b0) b1 = b0 + 1;
      if (b1 > limite + 1) b1 = limite + 1;

      /* Promedio de la banda que le toca a esta barra */
      let suma = 0, cuenta = 0;
      for (let k = b0; k < b1 && k <= limite; k++) { suma += vizFreqData[k]; cuenta++; }
      const crudo255 = cuenta ? (suma / cuenta) : 0;

      let real = ((crudo255 - minBin) / rango) * fuerza;
      if (real < 0) real = 0;
      else if (real > 1) real = 1;
      real = Math.pow(real, VIZ_CONTRASTE);

      /* Movimiento de fondo muy suave para que no parezca muerto en los
         pasajes tranquilos; solo se nota cuando la señal es baja. */
      const floor1 = Math.sin(t * 1.8 + p * 5.1) * 0.5 + 0.5;
      const floor2 = Math.sin(t * 3.2 + p * 8.4) * 0.5 + 0.5;
      const idle = (floor1 * 0.6 + floor2 * 0.4) * (0.05 + 0.04 * Math.sin(p * Math.PI));

      result[i] = Math.min(1, real + idle * Math.max(0, 1 - real * 3));
    }
    return result;
  }

  // Simulación fluida si analyser no disponible — ya incluye movimiento rico
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const w1 = Math.sin(t*2.1 + p*6.3) * 0.5 + 0.5;
    const w2 = Math.sin(t*3.7 + p*4.1) * 0.5 + 0.5;
    const w3 = Math.sin(t*5.9 + p*9.7) * 0.3 + 0.3;
    const w4 = Math.sin(t*1.3 + p*2.8) * 0.5 + 0.5; // ola extra más lenta
    const envelope = 0.22 + 0.18 * Math.sin(p * Math.PI);
    result[i] = (w1*0.35 + w2*0.30 + w3*0.20 + w4*0.15) * envelope * (playing ? 1.0 : 0);
  }
  return result;
}

/* ── Canvas resize ── */
const CANVAS_SIZE = 220; // ligeramente más grande para más espacio a los destellos
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width  = CANVAS_SIZE * dpr;
  canvas.height = CANVAS_SIZE * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

/* ── DRAW ULTRA PREMIUM ── */
let bassEnergy = 0; // energía de graves para el halo
let frameCount = 0;

function drawCirc(active) {
  if (!VIZ_ACTIVO) return;
  const W = CANVAS_SIZE, H = CANVAS_SIZE;
  ctx.clearRect(0, 0, W, H);
  if (!active) return;

  const now = performance.now();
  measureFPS(now);       // ← medición de FPS para ajuste dinámico
  tickPalette(now);
  const pal  = getCurPalette();
  const qCfg = Q[QUALITY]; // ← config del nivel actual
  const NBARS = qCfg.nbars;

  const cx = W / 2, cy = H / 2;
  const baseR   = 66;
  const maxOut  = qCfg.maxOut;
  const maxIn   = qCfg.maxIn;
  const clipR   = W / 2 - 2;

  const freqs = getFreqBands(NBARS);

  /* ── Bass energy para el halo ── */
  let bass = 0;
  for (let i = 0; i < 8; i++) bass += freqs[i];
  bass /= 8;
  bassEnergy += (bass - bassEnergy) * 0.15;

  /* ── Halo de glow central — solo en HIGH y MED ── */
  if (qCfg.shadowBlur) {
    const haloR = baseR - 4 + bassEnergy * 18;
    const haloGrad = ctx.createRadialGradient(cx, cy, haloR * 0.4, cx, cy, haloR);
    haloGrad.addColorStop(0, hexToRgba(PALETTES[paletteIdx].a, 0));
    haloGrad.addColorStop(0.6, hexToRgba(PALETTES[paletteIdx].a, bassEnergy * 0.12));
    haloGrad.addColorStop(1, hexToRgba(PALETTES[paletteIdx].a, 0));
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();
    ctx.restore();
  }

  /* ── Clip circular ── */
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, clipR, 0, Math.PI * 2);
  ctx.clip();

  /* ── Anillo EXTERIOR ── */
  for (let i = 0; i < NBARS; i++) {
    const target = freqs[i];
    if (target > circSmooth[i]) circSmooth[i] += (target - circSmooth[i]) * 0.45;
    else                        circSmooth[i] += (target - circSmooth[i]) * 0.10;

    if (circSmooth[i] > circPeak[i]) circPeak[i] = circSmooth[i];
    else circPeak[i] = Math.max(0, circPeak[i] - 0.008);

    const bh  = circSmooth[i] * maxOut;
    const ang = (i / NBARS) * Math.PI * 2 - Math.PI / 2;
    const cos = Math.cos(ang), sin = Math.sin(ang);

    if (bh < 1) continue;

    const x1 = cx + cos * baseR, y1 = cy + sin * baseR;
    const x2 = cx + cos * (baseR + bh), y2 = cy + sin * (baseR + bh);
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, hexToRgba(PALETTES[paletteIdx].b, 0.7));
    grad.addColorStop(1, pal.a);

    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = bh > 10 ? 2.8 : 2;
    ctx.lineCap     = 'round';
    ctx.globalAlpha = 0.55 + circSmooth[i] * 0.45;
    if (qCfg.shadowBlur) {
      ctx.shadowColor = pal.a;
      ctx.shadowBlur  = 6 + circSmooth[i] * qCfg.shadowMax;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.stroke();

    /* Destello en el pico — solo HIGH */
    if (qCfg.particles) {
      const peakH = circPeak[i] * maxOut;
      if (peakH > 4) {
        const px = cx + cos * (baseR + peakH);
        const py = cy + sin * (baseR + peakH);
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = circPeak[i] * 0.95;
        ctx.shadowColor = pal.a;
        ctx.shadowBlur  = 12;
        ctx.fill();
        if (circPeak[i] > 0.75 && Math.random() < qCfg.particleProb) {
          spawnParticle(px, py, pal.a);
        }
      }
    }

    /* ── Destellos simulados en todos los niveles de calidad ──
       Incluso en MED/LOW y cuando la señal real es débil, lanzar
       pequeños puntos brillantes periódicos en posiciones aleatorias
       del anillo para dar sensación de "radio viva" siempre.        */
    if (playing) {
      const simPeak = circSmooth[i]; // usa el valor suavizado como base
      const simH = Math.max(bh, 4 + Math.sin(now * 0.003 + i * 0.8) * 3 + 3);
      const sparkProb = QUALITY === 'HIGH' ? 0.006 : QUALITY === 'MED' ? 0.009 : 0.013;
      if (simPeak > 0.08 && Math.random() < sparkProb) {
        const sx = cx + cos * (baseR + simH);
        const sy = cy + sin * (baseR + simH);
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, QUALITY === 'LOW' ? 1 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.55 + Math.random() * 0.4;
        ctx.shadowColor = pal.a;
        ctx.shadowBlur  = QUALITY === 'HIGH' ? 14 : 7;
        ctx.fill();
        ctx.restore();
        // En HIGH y MED lanzar partícula pequeña
        if (QUALITY !== 'LOW' && Math.random() < 0.35) {
          spawnParticle(sx, sy, pal.a);
        }
      }
    }
  }

  /* ── Anillo INTERIOR — solo HIGH y MED ── */
  if (qCfg.innerRing) {
    for (let i = 0; i < NBARS; i++) {
      const bh  = circSmooth[i] * maxIn;
      if (bh < 0.5) continue;
      const ang  = (i / NBARS) * Math.PI * 2 - Math.PI / 2;
      const cos  = Math.cos(ang), sin = Math.sin(ang);
      const x1   = cx + cos * (baseR - 1), y1 = cy + sin * (baseR - 1);
      const x2   = cx + cos * (baseR - 1 - bh), y2 = cy + sin * (baseR - 1 - bh);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = pal.c;
      ctx.lineWidth   = 1.5;
      ctx.lineCap     = 'round';
      ctx.globalAlpha = 0.3 + circSmooth[i] * 0.5;
      ctx.shadowColor = pal.c;
      ctx.shadowBlur  = 4 + circSmooth[i] * 10;
      ctx.stroke();
    }
  }

  /* ── Partículas — solo HIGH ── */
  if (qCfg.particles) {
    updateParticles();
    drawParticles();
  }

  ctx.restore();

  /* ── Destellos globales en picos extremos — solo HIGH ── */
  if (qCfg.particles && bassEnergy > 0.6 && Math.random() < 0.12) {
    const ang  = Math.random() * Math.PI * 2;
    const dist = baseR + 20 + Math.random() * 12;
    spawnParticle(cx + Math.cos(ang)*dist, cy + Math.sin(ang)*dist, pal.a);
  }

  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  frameCount++;
}

function animCirc() {
  if (!playing) {
    cancelAnimationFrame(circTimer);
    circTimer = null;
    drawCirc(false);
    return;
  }
  drawCirc(true);
  circTimer = requestAnimationFrame(animCirc);
}

/* ── Barras horizontales PREMIUM ── */
const barsEl = document.getElementById('bars'), barD = [];

/* Se crean de una en una para poder quitarlas y volver a ponerlas cuando
   cambia la calidad (antes se creaban 36 fijas y solo se podían quitar). */
function agregarBarra() {
  if (!barsEl || barD.length >= 36) return;
  const i = barD.length;
  const b = document.createElement('div');
  b.className = 'bar' + (i >= 15 && i <= 20 ? ' center' : '');
  b.style.transform = 'scaleY(0.07)';
  barsEl.appendChild(b);
  barD.push({ el: b, smooth: 0, peak: 0 });
}
for (let i = 0; i < 36; i++) agregarBarra();

/* ── BARRAS: animación barata para no cortar el audio ────────────────
   Antes, en CADA fotograma, se reescribían la altura, el fondo (con un
   degradado nuevo) y la sombra de hasta 36 elementos. Eso obliga al
   navegador a recalcular estilos y a repintar 36 nodos 60 veces por
   segundo; y como el audio se procesa en el mismo hilo, esa carga puede
   producir cortes y chasquidos (el "rayado" que se oye en algunos
   teléfonos).

   Ahora:
     · la altura se aplica con transform (no dispara recálculo de diseño),
     · el degradado solo se reescribe cuando CAMBIA la paleta,
     · el brillo se actualiza cada 5 fotogramas en vez de en todos. */
let _palBarrasAplicada = -1;
let _frameBarras = 0;
let _ultimoFrameBarras = 0;

function animBars() {
  if (!VIZ_ACTIVO) { barTimer = null; return; }
  if (!playing) {
    cancelAnimationFrame(barTimer);
    barTimer = null;
    return;
  }
  const qCfg   = Q[QUALITY];
  const count  = Math.min(barD.length, qCfg.barCount);
  const freqs  = getFreqBands(count);

  _frameBarras++;
  const paletaCambiada = (paletteIdx !== _palBarrasAplicada);
  if (paletaCambiada) _palBarrasAplicada = paletteIdx;
  const refrescarBrillo = paletaCambiada || (_frameBarras % 5 === 0);

  /* Suavizado por TIEMPO, no por fotograma: así se mueve igual de rápido a
     30 fps que a 60. Antes se sumaba 0.55 (subida) y 0.10 (bajada) en cada
     fotograma, de modo que en un móvil lento las barras subían y bajaban
     con pereza: eso también era parte del "se mueve lento". */
  const _ahora = performance.now();
  const _dt = Math.min(0.12, (_ahora - (_ultimoFrameBarras || _ahora)) / 1000) || 0.016;
  _ultimoFrameBarras = _ahora;
  const factorSubida = 1 - Math.exp(-_dt * 45);
  const factorBajada = 1 - Math.exp(-_dt * 6);

  for (let i = 0; i < count; i++) {
    const b      = barD[i];
    const target = freqs[i];
    if (target > b.smooth) b.smooth += (target - b.smooth) * factorSubida;
    else                   b.smooth += (target - b.smooth) * factorBajada;

    /* Altura por transform: mismo aspecto, sin recálculo de diseño */
    b.el.style.transform = 'scaleY(' + Math.max(0.07, b.smooth).toFixed(3) + ')';

    if (paletaCambiada) {
      if (qCfg.barShadow) {
        if (i >= 15 && i <= 20) {
          b.el.style.background = `linear-gradient(to top, ${PALETTES[paletteIdx].b}, ${PALETTES[paletteIdx].a})`;
        } else {
          b.el.style.background = `linear-gradient(to top, ${PALETTES[paletteIdx].c}, ${PALETTES[paletteIdx].b})`;
        }
      }
    }
    if (refrescarBrillo && qCfg.barShadow) {
      const intensity = b.smooth;
      b.el.style.boxShadow = (i >= 15 && i <= 20)
        ? `0 0 ${4 + intensity * 10}px ${hexToRgba(PALETTES[paletteIdx].a, 0.7)}`
        : `0 0 ${2 + intensity * 6}px ${hexToRgba(PALETTES[paletteIdx].b, 0.5)}`;
    } else if (paletaCambiada && !qCfg.barShadow) {
      b.el.style.boxShadow = 'none';
    }
  }
  barTimer = requestAnimationFrame(animBars);
}

/* ── SCHEDULE / CLOCK ── */
/* ── PROGRAMACIÓN ────────────────────────────────────────────────────
   ESTA es la única lista de programas de la aplicación. De aquí salen el
   rótulo "🎶 AHORA: …", la tarjeta del locutor y la lista de programación.

   Los nombres son los REALES de la emisora; antes esta lista tenía
   nombres de relleno ("Tarde Juvenil", "Buenos Días Cuevo"...) que solo
   aparecían aquí, y por eso el rótulo no coincidía con la lista.

   El panel de administración (pestaña Programación) guarda su propia
   versión en config/schedule y, si existe, sustituye a esta. Comprobado
   que ahora mismo config/schedule está VACÍO, así que se usa esta. */
const SCHED = [
  { h: 6,  name: 'De Mañanita PST',      icon: '🌅' },
  { h: 9,  name: 'La Cafeteria',          icon: '☕' },
  { h: 12, name: 'Noticiero SPLENDID',    icon: '📰' },
  { h: 15, name: 'Cafe con Microfono',    icon: '🎙️' },
  { h: 18, name: 'Noticiero SPLENDID',    icon: '📻' },
  { h: 20, name: 'Ritmo y Melodia',       icon: '🎶' },
  { h: 22, name: 'Transmisión Continua',  icon: '🔄' },
];
function clock() {
  const n = new Date();
  const hh = String(n.getHours()).padStart(2, '0'), mm = String(n.getMinutes()).padStart(2, '0');
  document.getElementById('statTime').textContent = hh + ':' + mm;
  document.getElementById('nowStripTime').textContent = hh + ':' + mm;
  const h = n.getHours();
  let cur = SCHED.length - 1;
  SCHED.forEach((s, i) => { if (s.h === 0) { if (h < 6) cur = i; } else if (h >= s.h) cur = i; });
  document.querySelectorAll('.prog').forEach((el, i) => {
    const badge = el.querySelector('.pbadge');
    el.classList.toggle('now', i === cur);
    badge.classList.toggle('now', i === cur);
    if (i === cur) badge.textContent = '● AHORA';
  });
  const prog = SCHED[cur];
  document.getElementById('nowStripText').textContent = `${prog.icon} AHORA: ${prog.name}`;
}
clock();
setInterval(clock, 30000);

/* ═══════════════════════════════════════════════════════════════════
   LA PROGRAMACIÓN SE DIBUJA DESDE UNA SOLA LISTA
   ═══════════════════════════════════════════════════════════════════
   Antes había TRES listas de programas que no se hablaban entre sí:
     1. SCHED (esta, que Firebase puede sobrescribir con config/schedule)
     2. DJ_SCHEDULE, otra lista escrita a mano para la tarjeta del locutor
     3. La lista escrita directamente en el HTML
   Resultado: el rótulo de arriba decía "Tarde Juvenil", la tarjeta del
   locutor decía "DJ Tarde / Tarde Juvenil" y la lista marcaba
   "Cafe con Micrófono" como programa en curso. Tres nombres distintos
   para el mismo momento del día.

   Ahora la lista visible se dibuja desde SCHED, así que el rótulo, la
   tarjeta del locutor y la lista salen siempre del MISMO dato. */
const _descSchedPorDefecto = [...document.querySelectorAll('.sched .pdesc')]
  .map(el => el.textContent.trim());

function _franjaEtiqueta(h) {
  if (h < 6)  return 'Madrugada';
  if (h < 12) return 'Mañana';
  if (h < 18) return 'Tarde';
  if (h < 22) return 'Noche';
  return 'Madrugada';
}

function renderSched() {
  const cont = document.querySelector('.sched');
  if (!cont) return;
  cont.innerHTML = SCHED.map((p, i) => {
    const hora = String(p.h).padStart(2, '0') + ':00';
    /* Se conserva la descripción que ya estaba escrita en el HTML (por
       posición) para no perder ese texto; si algún día llega desde
       Firebase, esa manda. */
    const desc = p.desc || _descSchedPorDefecto[i] || '';
    return '<div class="prog" data-h="' + p.h + '" role="listitem">' +
             '<div class="ptime">' + hora + '</div>' +
             '<div class="pinfo">' +
               '<div class="pname">' + escHtml(p.name) + '</div>' +
               (desc ? '<div class="pdesc">' + escHtml(desc) + '</div>' : '') +
             '</div>' +
             '<div class="pbadge">' + _franjaEtiqueta(p.h) + '</div>' +
           '</div>';
  }).join('');
  clock(); // volver a marcar cuál está en curso
}
renderSched();

/* ── SIGNAL ── */
function updateSig(on) {
  if (on) { sigs.forEach((b, i) => setTimeout(() => b.classList.add('on'), i * 90)); }
  else { sigs.forEach(b => b.classList.remove('on')); sigs[0].classList.add('on'); }
}
sigs[0].classList.add('on');

/* ══════════════════════════════════════════════════════════════
   SISTEMA DE CANCIONES REAL — StreamTitle desde Icecast
   ▸ Polling a /api/radio-status (Netlify Function proxy)
   ▸ Historial de las últimas 20 canciones
   ▸ Sincronización a Firebase para todos los oyentes
   ▸ Metadata real: artista, canción, bitrate, género
   ══════════════════════════════════════════════════════════════ */

/* Estado actual de la canción */
let currentSongTitle  = '';
let currentSongArtist = '';
let songHistory       = []; // array de {title, artist, icon, time, timestamp}
const MAX_HISTORY     = 20;
let historyOpen       = false;
let streamPollTimer   = null;

/* Iconos automáticos por género/palabras clave */
function guessIcon(title, genre) {
  const t = (title + ' ' + (genre||'')).toLowerCase();
  if (/cumbia|tropical|saya|morenada/.test(t))  return '🎺';
  if (/balada|amor|coraz|roman/.test(t))         return '💛';
  if (/rock|guitar|metal/.test(t))               return '🎸';
  if (/notic|inform|noticias|news/.test(t))       return '📰';
  if (/clásic|orquesta|sinfonía/.test(t))        return '🎼';
  if (/reggaeton|urban|trap/.test(t))             return '🔥';
  if (/folk|andino|bolivian|huayno/.test(t))      return '🪗';
  if (/salsa|merengue|bachata/.test(t))           return '🎵';
  if (/navidad|christmas/.test(t))                return '🎄';
  return '🎶';
}

/* ── Actualizar song-card en pantalla ── */
function setSong(songTitle, artistName, icon, live, meta) {
  const titleEl  = document.getElementById('songTitle');
  const artistEl = document.getElementById('songArtist');
  const badgeEl  = document.getElementById('songBadge');
  const emjEl    = document.getElementById('songEmoji');
  const metaEl   = document.getElementById('songMeta');
  const songArt  = document.querySelector('.song-art');

  if (titleEl)  titleEl.textContent  = songTitle;
  if (artistEl) artistEl.textContent = artistName;
  if (emjEl)    emjEl.textContent    = icon;

  if (live) {
    if (badgeEl) { badgeEl.textContent = '● EN VIVO'; badgeEl.classList.add('live'); }
    if (titleEl) titleEl.classList.add('scroll');
    if (songArt) songArt.classList.add('spinning');
  } else {
    if (badgeEl) { badgeEl.textContent = 'FM'; badgeEl.classList.remove('live'); }
    if (titleEl) titleEl.classList.remove('scroll');
    if (songArt) songArt.classList.remove('spinning');
  }

  // Mostrar bitrate y género si hay metadata real
  if (meta && metaEl) {
    const brEl = document.getElementById('songBitrate');
    const gnEl = document.getElementById('songGenre');
    if (brEl && meta.bitrate) brEl.textContent = meta.bitrate + ' kbps';
    if (gnEl && meta.genre)   gnEl.textContent = meta.genre;
    metaEl.style.display = 'flex';
  }

  // Actualizar ticker con la canción actual
  const tickerEl = document.getElementById('ticker');
  if (tickerEl && live && songTitle !== 'Dilson 101.9 FM') {
    tickerEl.textContent = `▶ AHORA: ${icon} ${songTitle} — ${artistName} ▶ DILSON 101.9 FM ▶ CUEVO, BOLIVIA ▶ EN VIVO ▶ AHORA: ${icon} ${songTitle} — ${artistName} ▶ DILSON 101.9 FM ▶ CUEVO, BOLIVIA ▶`;
  }

  // ── Arte de álbum vía Last.fm ──
  if (live && artistName && artistName !== 'Dilson 101.9 FM' && songTitle !== 'En Vivo') {
    fetchAlbumArt(artistName, songTitle);
  } else {
    clearAlbumArt();
  }

  // ── Botón Compartir Canción ──
  const shareSongBtn = document.getElementById('shareSongBtn');
  if (shareSongBtn) {
    shareSongBtn.style.display = (live && songTitle !== 'En Vivo') ? 'inline-flex' : 'none';
  }
}

/* ── Polling a /api/radio-status (Netlify Function) ── */
async function fetchRadioStatus() {
  try {
    const r = await fetch('/api/radio-status', {
      signal: AbortSignal.timeout(6000),
      cache: 'no-store'
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();

    // ── Actualizar contador de oyentes SIEMPRE (independiente de ok/canción) ──
    const listenersEl = document.getElementById('statListeners');
    if (listenersEl) {
      if (data.listeners != null && data.listeners >= 0) {
        listenersEl.textContent = data.listeners;
        // Sincronizar a Firebase para que panel lateral también lo vea
        if (fbDB) {
          fbDB.ref('radio/listeners').set(data.listeners).catch(() => {});
        }
      } else if (!data.ok) {
        // Icecast caído — mantener último valor o mostrar '--'
        if (listenersEl.textContent === '--') listenersEl.textContent = '--';
      }
    }

    if (!data.ok) return; // servidor respondió pero Icecast no disponible

    const rawTitle = data.title || '';
    const artist   = data.artist || 'Dilson 101.9 FM';
    const song     = data.song   || rawTitle || 'En Vivo';

    // Solo actualizar canción si cambió
    if (rawTitle && rawTitle !== currentSongTitle) {
      const icon = guessIcon(rawTitle, data.genre);
      currentSongTitle  = rawTitle;
      currentSongArtist = artist;

      // Actualizar UI
      setSong(song, artist, icon, true, { bitrate: data.bitrate, genre: data.genre });
      updateMediaSession(song, artist);

      // Agregar al historial
      addToHistory({ title: song, artist, icon, genre: data.genre });

      // Guardar en Firebase para que todos los oyentes vean lo mismo
      syncSongToFirebase({ title: song, artist, icon, rawTitle, bitrate: data.bitrate });

      // Notificación visual de nueva canción
      showNewSongToast(icon, song, artist);

      // Mostrar tarjeta de votación después de 4s (cuando la canción ya está sonando)
      if (typeof showVoteCard === 'function') {
        setTimeout(() => showVoteCard(song), 4000);
      }
    }

  } catch(e) {
    // El proxy falló — no actualizar, mantener último valor visible
  }
}

/* ── Sincronizar canción actual a Firebase ── */
function syncSongToFirebase(data) {
  if (!fbDB) return;
  fbDB.ref('radio/currentSong').set({
    ...data,
    ts: firebase.database.ServerValue.TIMESTAMP
  }).catch(() => {});
}

/* Escuchar cambios de canción en Firebase (todos los oyentes se sincronizan) */
function listenCurrentSong() {
  if (!fbDB) return;
  fbDB.ref('radio/currentSong').on('value', snap => {
    const d = snap.val();
    if (!d || !d.title) return;
    // Si YA tenemos el StreamTitle actualizado por polling propio, no sobreescribir
    if (d.rawTitle === currentSongTitle) return;
    currentSongTitle  = d.rawTitle || d.title;
    currentSongArtist = d.artist || 'Dilson 101.9 FM';
    setSong(d.title, d.artist || 'Dilson 101.9 FM', d.icon || '🎶', playing, { bitrate: d.bitrate });
    addToHistory({ title: d.title, artist: d.artist || 'Dilson 101.9 FM', icon: d.icon || '🎶' });
  });

  // Historial desde Firebase (últimas 20)
  fbDB.ref('radio/songHistory').orderByChild('ts').limitToLast(MAX_HISTORY).once('value', snap => {
    const items = [];
    snap.forEach(child => items.unshift(child.val()));
    if (items.length > 0) {
      songHistory = items;
      renderHistory();
    }
  });
}

/* Guardar cada canción al historial en Firebase — limpieza cada 10 canciones, máx 50 */
let _songsSavedCount = 0;
function saveSongHistoryFirebase(item) {
  if (!fbDB) return;
  fbDB.ref('radio/songHistory').push({
    ...item,
    ts: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    _songsSavedCount++;
    if (_songsSavedCount % 10 === 0) {
      /* Mantener solo las últimas 50 canciones */
      fbDB.ref('radio/songHistory').orderByChild('ts').once('value', snap => {
        const keys = [];
        snap.forEach(c => keys.push(c.key));
        if (keys.length > 50) {
          keys.slice(0, keys.length - 50).forEach(k => {
            fbDB.ref('radio/songHistory').child(k).remove();
          });
        }
      });
    }
  }).catch(() => {});
}

/* ── Agregar al historial local ── */
function addToHistory(item) {
  const now   = new Date();
  const hh    = String(now.getHours()).padStart(2,'0');
  const mm    = String(now.getMinutes()).padStart(2,'0');
  const entry = { ...item, time: hh + ':' + mm, timestamp: Date.now() };

  // No duplicar si es la misma canción seguida
  if (songHistory.length > 0 && songHistory[0].title === item.title) return;

  songHistory.unshift(entry);
  if (songHistory.length > MAX_HISTORY) songHistory.pop();

  renderHistory();
  saveSongHistoryFirebase(entry);
  // Mostrar votación de canción (Nivel 2)
  if (typeof showVoteCard === 'function') {
    setTimeout(() => showVoteCard(item.title), 3000);
  }
}

/* ── Renderizar historial en pantalla ── */
function renderHistory() {
  const list = document.getElementById('histList');
  if (!list) return;
  if (songHistory.length === 0) {
    list.innerHTML = '<div class="hist-empty">Aún no hay canciones registradas.</div>';
    return;
  }
  list.innerHTML = songHistory.map((s, i) => `
    <div class="hist-item ${i === 0 ? 'current' : ''}">
      <span class="hist-num">${i === 0 ? '▶' : i + 1}</span>
      <span class="hist-icon">${s.icon || '🎶'}</span>
      <div class="hist-info">
        <div class="hist-song">${escHtml(s.title || 'Desconocido')}</div>
        <div class="hist-artist">${escHtml(s.artist || 'Dilson 101.9 FM')}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
        ${i === 0 ? '<span class="hist-live-tag">EN VIVO</span>' : ''}
        <span class="hist-time">${s.time || '--:--'}</span>
      </div>
    </div>`).join('');
}

/* Escapa texto para insertarlo en HTML. Cubre los cinco caracteres
   peligrosos, incluida la comilla simple, porque varias plantillas
   construyen atributos y manejadores onclick con comillas simples
   dentro de comillas dobles. */
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Toggle historial visible/oculto ── */
function toggleHistory() {
  historyOpen = !historyOpen;
  const panel = document.getElementById('historyPanel');
  const btn   = document.getElementById('histToggleBtn');
  if (panel) {
    panel.classList.toggle('open', historyOpen);
    panel.setAttribute('aria-hidden', String(!historyOpen));
  }
  if (btn) btn.classList.toggle('active', historyOpen);
  if (historyOpen) renderHistory();
}

/* ── Toast de nueva canción ── */
let newSongToastTimer = null;
function showNewSongToast(icon, song, artist) {
  clearTimeout(newSongToastTimer);
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = `${icon} <strong>${song}</strong><br><small style="opacity:0.7">${artist}</small>`;
  t.classList.add('show');
  newSongToastTimer = setTimeout(() => {
    t.classList.remove('show');
    t.textContent = '📡';
  }, 4500);
  /* Actualizar también la notificación persistente con la nueva canción */
  if (playing && _playbackNotifActive) {
    showPlaybackNotification(song, artist);
  }
}

/* ── Iniciar polling del stream ── */
function startStreamPolling() {
  fetchRadioStatus(); // inmediato al dar play
  clearInterval(streamPollTimer);
  streamPollTimer = setInterval(fetchRadioStatus, 15000); // cada 15 segundos (era 20s)
}

function stopStreamPolling() {
  clearInterval(streamPollTimer);
  streamPollTimer = null;
}

/* ── Polling pasivo de oyentes (sin play) — actualiza el contador aunque no se esté reproduciendo ── */
let _passivePollTimer = null;
function startPassivePoll() {
  // Solo actualizar el contador de oyentes, sin afectar canción
  async function pollListenersOnly() {
    try {
      const r = await fetch('/api/radio-status', { signal: AbortSignal.timeout(6000), cache: 'no-store' });
      const data = await r.json();
      const el = document.getElementById('statListeners');
      if (el && data.listeners != null && data.listeners >= 0) {
        el.textContent = data.listeners;
        if (fbDB) fbDB.ref('radio/listeners').set(data.listeners).catch(() => {});
      }
    } catch(e) {}
  }
  pollListenersOnly(); // inmediato al cargar
  _passivePollTimer = setInterval(pollListenersOnly, 30000); // cada 30s en modo pasivo
}
startPassivePoll(); // arrancar siempre, independiente del play

/* ═══════════════════════════════════════════════════════════════
   SISTEMA DE PERMISOS PROFESIONAL
   ▸ Geolocalización para clima preciso
   ▸ Almacenamiento para descarga de comunicados
   ▸ Notificaciones push (opcional)
   ▸ Modal elegante con explicación clara
   ═══════════════════════════════════════════════════════════════ */

/* Coordenadas de respaldo — Cuevo, Bolivia */
let _geoLat = -20.46;
let _geoLng = -63.66;
let _geoAccurate = false; // true si viene del GPS
let _geoPermissionAsked = false;

/* ── Solicitar permisos con modal profesional ── */
async function requestAppPermissions() {
  /* ─────────────────────────────────────────────────────────────────
     LÓGICA DE CUÁNDO MOSTRAR EL MODAL:
     ▸ Solo se muestra la PRIMERA VEZ que el usuario abre la app.
     ▸ Si el usuario ya respondió (granted/denied), modo silencioso.
     ▸ Se guarda en localStorage (persiste entre sesiones, no como
       sessionStorage que se borra al cerrar la app).
     ▸ Si el usuario revoca permisos desde ajustes del dispositivo,
       el flag se resetea la próxima vez que abre la app.
     ───────────────────────────────────────────────────────────────── */
  const alreadyHandled = localStorage.getItem('dilson_perms_done');

  /* Consultar estado real actual de los permisos del navegador */
  let geoState   = 'prompt';
  let notifState = ('Notification' in window) ? Notification.permission : 'denied';
  try {
    if (navigator.permissions) {
      const q = await navigator.permissions.query({ name: 'geolocation' }).catch(() => ({ state: 'prompt' }));
      geoState = q.state;
    }
  } catch(e) {}

  /* Si los permisos ya están resueltos Y el flag existe → silencioso */
  if (alreadyHandled && geoState !== 'prompt' && notifState !== 'prompt') {
    _initSilentPermissions();
    return;
  }

  /* Todos concedidos sin modal previo (ej: instalación fresca con permisos del SO) */
  if (geoState === 'granted' && notifState === 'granted') {
    localStorage.setItem('dilson_perms_done', '1');
    _initSilentPermissions();
    return;
  }

  /* Ya respondió antes aunque sea a uno → no molestar de nuevo */
  if (alreadyHandled) {
    _initSilentPermissions();
    return;
  }

  /* ── Primera vez: construir y mostrar el modal ── */
  const modal = document.createElement('div');
  modal.id = 'permissionsModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Permisos de la aplicación');
  modal.innerHTML = `
    <div class="perm-backdrop"></div>
    <div class="perm-card">
      <div class="perm-header">
        <div class="perm-logo-ring" aria-hidden="true">
          <img src="logodilson2.png" alt="Dilson FM" onerror="this.style.display='none'">
        </div>
        <div class="perm-title">Radio Dilson 101.9 FM</div>
        <div class="perm-subtitle">Necesitamos tu autorización para brindarte<br>la mejor experiencia posible</div>
      </div>

      <div class="perm-items">
        <div class="perm-item" id="permGeoItem">
          <div class="perm-item-icon" aria-hidden="true">📍</div>
          <div class="perm-item-body">
            <div class="perm-item-title">Ubicación <span class="perm-badge-recomendado">Recomendado</span></div>
            <div class="perm-item-desc">Muestra el clima exacto de <strong>tu ciudad</strong> en tiempo real, en lugar de Cuevo por defecto.</div>
          </div>
          <div class="perm-item-status" id="geoStatus" aria-live="polite">
            <span class="perm-dot perm-dot-idle"></span>
          </div>
        </div>

        <div class="perm-item" id="permStorItem">
          <div class="perm-item-icon" aria-hidden="true">💾</div>
          <div class="perm-item-body">
            <div class="perm-item-title">Almacenamiento <span class="perm-badge-opcional">Opcional</span></div>
            <div class="perm-item-desc">Permite descargar <strong>comunicados</strong> de la radio para leerlos sin conexión.</div>
          </div>
          <div class="perm-item-status" id="storStatus" aria-live="polite">
            <span class="perm-dot perm-dot-idle"></span>
          </div>
        </div>

        <div class="perm-item" id="permNotifItem">
          <div class="perm-item-icon" aria-hidden="true">🔔</div>
          <div class="perm-item-body">
            <div class="perm-item-title">Notificaciones <span class="perm-badge-opcional">Opcional</span></div>
            <div class="perm-item-desc">Recibe alertas de <strong>comunicados urgentes</strong> y cambios en la programación.</div>
          </div>
          <div class="perm-item-status" id="notifStatus" aria-live="polite">
            <span class="perm-dot perm-dot-idle"></span>
          </div>
        </div>
      </div>

      <div class="perm-note">
        <span aria-hidden="true">🔒</span>
        Tus datos nunca se comparten con terceros. Puedes revocar estos permisos en cualquier momento desde la configuración de tu dispositivo.
      </div>

      <div class="perm-actions">
        <button class="perm-btn-allow" id="permAllowBtn" onclick="grantAllPermissions()">
          <span class="perm-btn-icon" aria-hidden="true">✓</span> Permitir todo
        </button>
        <button class="perm-btn-skip" onclick="closePermissionsModal(true)">
          Solo lo esencial
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('perm-visible'));
}

/* ── Otorgar todos los permisos ── */
async function grantAllPermissions() {
  const btn = document.getElementById('permAllowBtn');
  if (btn) { btn.textContent = '⏳ Solicitando...'; btn.disabled = true; }

  // 1. Geolocalización
  await _requestGeoPermission();

  // 2. Notificaciones (si el navegador lo soporta)
  await _requestNotifPermission();

  // 3. Almacenamiento (Storage API — moderno) o indicar que se usará caché
  _initStoragePermission();

  // Cerrar modal con pequeño delay para que el usuario vea los checkmarks
  setTimeout(() => closePermissionsModal(false), 1200);
}

function closePermissionsModal(silent) {
  const modal = document.getElementById('permissionsModal');
  if (!modal) return;
  /* Marcar como ya respondido en localStorage (persiste entre sesiones) */
  localStorage.setItem('dilson_perms_done', '1');
  modal.classList.remove('perm-visible');
  modal.classList.add('perm-hiding');
  setTimeout(() => { modal.remove(); }, 500);
  if (!silent) toast('✅ Permisos configurados correctamente');
}

/* ── Solicitar geolocalización ── */
async function _requestGeoPermission() {
  const statusEl = document.getElementById('geoStatus');
  const itemEl   = document.getElementById('permGeoItem');
  if (statusEl) statusEl.innerHTML = '<span class="perm-dot perm-dot-loading"></span>';

  return new Promise(resolve => {
    if (!('geolocation' in navigator)) {
      if (statusEl) statusEl.innerHTML = '<span class="perm-dot perm-dot-denied" title="No disponible">✗</span>';
      if (itemEl) itemEl.classList.add('perm-item-denied');
      resolve(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        _geoLat = pos.coords.latitude;
        _geoLng = pos.coords.longitude;
        _geoAccurate = true;
        _geoPermissionAsked = true;
        localStorage.setItem('dilson_geo_lat', _geoLat);
        localStorage.setItem('dilson_geo_lng', _geoLng);
        if (statusEl) statusEl.innerHTML = '<span class="perm-dot perm-dot-granted" title="Concedido">✓</span>';
        if (itemEl) itemEl.classList.add('perm-item-granted');
        // Refrescar clima inmediatamente con coordenadas reales
        fetchWeather();
        resolve(true);
      },
      err => {
        _geoPermissionAsked = true;
        const denied = err.code === 1; // PERMISSION_DENIED
        if (statusEl) statusEl.innerHTML = `<span class="perm-dot ${denied ? 'perm-dot-denied' : 'perm-dot-warn'}" title="${denied ? 'Denegado' : 'No disponible'}">${denied ? '✗' : '!'}</span>`;
        if (itemEl) itemEl.classList.add(denied ? 'perm-item-denied' : 'perm-item-warn');
        resolve(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  });
}

/* ── Solicitar notificaciones ── */
async function _requestNotifPermission() {
  const statusEl = document.getElementById('notifStatus');
  const itemEl   = document.getElementById('permNotifItem');
  if (!('Notification' in window)) {
    if (statusEl) statusEl.innerHTML = '<span class="perm-dot perm-dot-denied">✗</span>';
    return false;
  }
  if (Notification.permission === 'granted') {
    if (statusEl) statusEl.innerHTML = '<span class="perm-dot perm-dot-granted">✓</span>';
    if (itemEl) itemEl.classList.add('perm-item-granted');
    return true;
  }
  if (statusEl) statusEl.innerHTML = '<span class="perm-dot perm-dot-loading"></span>';
  const result = await Notification.requestPermission().catch(() => 'denied');
  const granted = result === 'granted';
  if (statusEl) statusEl.innerHTML = `<span class="perm-dot ${granted ? 'perm-dot-granted' : 'perm-dot-denied'}">${granted ? '✓' : '✗'}</span>`;
  if (itemEl) itemEl.classList.add(granted ? 'perm-item-granted' : 'perm-item-denied');
  return granted;
}

/* ── Indicador de almacenamiento ── */
function _initStoragePermission() {
  const statusEl = document.getElementById('storStatus');
  const itemEl   = document.getElementById('permStorItem');
  // La Storage API no requiere permiso explícito en navegadores modernos
  // pero verificamos el espacio disponible
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    navigator.storage.estimate().then(({ quota, usage }) => {
      const mbFree = Math.round((quota - usage) / 1048576);
      if (statusEl) statusEl.innerHTML = `<span class="perm-dot perm-dot-granted" title="${mbFree} MB libres">✓</span>`;
      if (itemEl) itemEl.classList.add('perm-item-granted');
      // Solicitar persistencia del caché
      if ('persist' in navigator.storage) {
        navigator.storage.persist().catch(() => {});
      }
    }).catch(() => {
      if (statusEl) statusEl.innerHTML = '<span class="perm-dot perm-dot-warn">!</span>';
    });
  } else {
    if (statusEl) statusEl.innerHTML = '<span class="perm-dot perm-dot-warn" title="Limitado">!</span>';
  }
}

/* ── Permisos silenciosos al cargar (si ya fueron concedidos) ── */
function _initSilentPermissions() {
  // Recuperar coordenadas guardadas si existen
  const savedLat = parseFloat(localStorage.getItem('dilson_geo_lat'));
  const savedLng = parseFloat(localStorage.getItem('dilson_geo_lng'));
  if (savedLat && savedLng) {
    _geoLat = savedLat;
    _geoLng = savedLng;
    _geoAccurate = true;
  }
  // Intentar actualizar ubicación silenciosamente si ya tiene permiso
  if ('geolocation' in navigator) {
    navigator.permissions?.query({ name: 'geolocation' }).then(perm => {
      if (perm.state === 'granted') {
        navigator.geolocation.getCurrentPosition(
          pos => {
            _geoLat = pos.coords.latitude;
            _geoLng = pos.coords.longitude;
            _geoAccurate = true;
            localStorage.setItem('dilson_geo_lat', _geoLat);
            localStorage.setItem('dilson_geo_lng', _geoLng);
            fetchWeather(); // actualizar clima con posición nueva
          },
          () => {},
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
        );
      }
    }).catch(() => {});
  }
}

/* ── WEATHER (con geolocalización) ── */
async function fetchWeather() {
  try {
    const lat = _geoLat;
    const lng = _geoLng;
    const tz  = _geoAccurate ? 'auto' : 'America%2FLa_Paz';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature&timezone=${tz}&wind_speed_unit=kmh`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json(); const c = d.current;
    const codes = { 0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',61:'🌧️',71:'❄️',80:'🌧️',95:'⛈️' };
    const descs = { 0:'Despejado',1:'Mayormente despejado',2:'Parcialmente nublado',3:'Nublado',45:'Niebla',51:'Llovizna',61:'Lluvia',71:'Nieve',80:'Chubascos',95:'Tormenta' };
    const code = c.weather_code;
    const icon = Object.entries(codes).reverse().find(([k]) => code >= +k)?.[1] ?? '🌡️';
    const desc = Object.entries(descs).reverse().find(([k]) => code >= +k)?.[1] ?? 'Variable';
    document.getElementById('wIcon').textContent = icon;
    document.getElementById('wTemp').textContent = Math.round(c.temperature_2m);
    document.getElementById('wDesc').textContent = desc;
    document.getElementById('wHum').textContent  = c.relative_humidity_2m + '%';
    document.getElementById('wWind').textContent = Math.round(c.wind_speed_10m) + ' km/h';
    document.getElementById('wFeel').textContent = Math.round(c.apparent_temperature) + '°C';
    // Mostrar indicador de precisión
    const wCard = document.querySelector('.weather-card, .w-card, #weatherWidget');
    if (wCard) wCard.title = _geoAccurate ? '📍 Clima de tu ubicación exacta' : '📍 Clima de Cuevo, Bolivia';
  } catch(e) {
    const wDescEl = document.getElementById('wDesc');
    if (wDescEl) wDescEl.textContent = 'Sin datos de clima';
  }
}
fetchWeather();
setInterval(fetchWeather, 600000);

/* ── Lanzar solicitud de permisos después del splash ── */
window.addEventListener('load', () => {
  setTimeout(requestAppPermissions, 3500); // Dar tiempo al splash de terminar
});

/* ── TOAST ── */
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

/* ── INDICADOR DE RECONEXIÓN ── */
function showReconnectBar(msg) {
  const bar = document.getElementById('reconnectBar');
  if (!bar) return;
  bar.querySelector('.reconnect-msg').textContent = msg;
  bar.classList.add('show');
}
function hideReconnectBar() {
  const bar = document.getElementById('reconnectBar');
  if (bar) bar.classList.remove('show');
}

/* ── Bandera de pausa VOLUNTARIA del usuario ── */
let _userPaused = false;
let HARD_PAUSE  = false;
let reconnectTimer = null;

/* ═══════════════════════════════════════════════════════════════
   PLAY / PAUSE
   
   ESTRATEGIA DE PAUSA: reload limpio
   ▸ PLAY  → conecta al stream normalmente
   ▸ PAUSE → recarga la página en silencio
             (igual que cuando la app inicia por primera vez,
              mostrando el tapOverlay hasta que el usuario
              presione play de nuevo)
   ▸ SEGUNDO PLANO → NO toca el botón, NO recarga,
             el audio sigue sonando sin interrupción
   ═══════════════════════════════════════════════════════════════ */
function togglePlay() {

  /* ── Si hay overlay de pausa visible, reanudar desde ahí ── */
  if (!playing && _userPaused && document.getElementById('pauseOverlay')) {
    resumeFromPause();
    return;
  }

  /* ================= PLAY ================= */
  if (!playing) {

    _userPaused = false;
    HARD_PAUSE  = false;

    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    reconnectCount = 0;

    toast('📡 Conectando a la señal...');

    /* Siempre reasignar src — es radio en vivo, el buffer previo no sirve */
    //audio.src = 'radio-stream';
    audio.src = _activeStreamUrl;
    audio.load();

    audio.play()
      .then(() => {

        /* ── Guarda race condition ──────────────────────────────────
           audio.play() tarda 200-500ms en resolver (conecta al stream).
           Si el usuario presionó PAUSA antes de que resolviera → recargar. */
        if (_userPaused) {
          _pauseAndReload();
          return;
        }

        playing = true;

        connectAudioAnalyser();

        if (vizAudioCtx && vizAudioCtx.state === 'suspended') {
          vizAudioCtx.resume().catch(() => {});
        }

        goLive(true);
        requestWakeLock();
        startHeartbeat();
        startBgKeepalive();
        showPlaybackNotification(); // notificación en barra

      })
      .catch(() => {
        _userPaused = true;
        playing = false;
        toast('⚠️ No se pudo conectar a la radio. Verifica tu internet.');
      });

  }

  /* ================= PAUSE ================= */
  else {

    _pauseAndReload();

  }
}

/* ── Pausa mediante recarga limpia de la página ──────────────────
   1. Borra la sesión de "ya reprodujo" → setupAutoplay mostrará
      el tapOverlay en silencio, exactamente como al primer acceso.
   2. Detiene el audio inmediatamente (antes del reload) para que
      no haya ni un milisegundo de audio extra.
   3. Recarga la página — estado completamente limpio.
   ──────────────────────────────────────────────────────────────── */
function _pauseAndReload() {
  /* Detener audio inmediatamente */
  try { audio.pause(); } catch(e) {}
  try { audio.src = ''; audio.load(); } catch(e) {}

  /* Liberar WakeLock y recursos */
  try { releaseWakeLock(); } catch(e) {}
  try { stopHeartbeat();   } catch(e) {}
  try { stopBgKeepalive(); } catch(e) {}
  try { hidePlaybackNotification(); } catch(e) {}

  _userPaused = true;
  playing     = false;

  goLive(false);
  showPauseOverlay();
}

/* ── Overlay de pausa elegante ─────────────────────────────────── */
function showPauseOverlay() {
  const existing = document.getElementById('pauseOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pauseOverlay';
  overlay.innerHTML = `
    <div class="po-backdrop"></div>
    <div class="po-card">
      <div class="po-waves" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <div class="po-logo-ring">
        <img src="logodilson2.png" alt="Dilson FM" onerror="this.style.display='none'">
      </div>
      <div class="po-title">Radio en pausa</div>
      <div class="po-sub">DILSON 101.9 FM · Cuevo, Bolivia</div>
      <button class="po-play-btn" id="poPlayBtn" onclick="resumeFromPause()" aria-label="Reanudar radio">
        <span class="po-play-icon">▶</span>
      </button>
      <div class="po-hint">Toca para volver a escuchar</div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('po-visible'));
}

function hidePauseOverlay() {
  const overlay = document.getElementById('pauseOverlay');
  if (!overlay) return;
  overlay.classList.remove('po-visible');
  overlay.classList.add('po-hiding');
  setTimeout(() => overlay.remove(), 400);
}

/* ── Reanudar desde pausa ──────────────────────────────────────── */
function resumeFromPause() {
  hidePauseOverlay();
  _userPaused = false;
  HARD_PAUSE  = false;

  if (playBtn) {
    playBtn.classList.add('btn-pulse');
    setTimeout(() => playBtn.classList.remove('btn-pulse'), 600);
  }

  toast('📡 Conectando a la señal...');

  //audio.src = 'radio-stream';
  audio.src = _activeStreamUrl;
  audio.load();
  audio.play()
    .then(() => {
      if (_userPaused) { _pauseAndReload(); return; }
      playing = true;
      connectAudioAnalyser();
      if (vizAudioCtx && vizAudioCtx.state === 'suspended') vizAudioCtx.resume().catch(() => {});
      goLive(true);
      requestWakeLock();
      startHeartbeat();
      startBgKeepalive();
      showPlaybackNotification();
    })
    .catch(() => {
      _userPaused = true;
      playing = false;
      toast('⚠️ No se pudo conectar. Verifica tu internet.');
    });
}

/* ═══════════════════════════════════════════════════════════════
   NOTIFICACIÓN PERSISTENTE DE REPRODUCCIÓN
   ▸ Muestra una notificación en la barra de Android/iOS mientras
     la radio está reproduciéndose en segundo plano.
   ▸ La notificación tiene botón de pausa y se actualiza con la
     canción actual.
   ▸ Se oculta automáticamente al pausar o cerrar la app.
   ▸ Usa el Service Worker para mostrarla (única forma estable).
   ═══════════════════════════════════════════════════════════════ */

let _playbackNotifActive = false;

async function showPlaybackNotification(title, artist) {
  /* Solo funciona si el SW está activo y hay permiso de notificaciones */
  if (!navigator.serviceWorker?.controller) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const songTitle  = title  || document.getElementById('songTitle')?.textContent  || 'Radio Dilson 101.9 FM';
  const songArtist = artist || document.getElementById('songArtist')?.textContent || 'En Vivo · Cuevo, Bolivia';

  navigator.serviceWorker.controller.postMessage({
    type:   'SHOW_PLAYBACK_NOTIF',
    title:  songTitle,
    artist: songArtist,
    icon:   'icon-192.png',
    badge:  'icon-192.png',
  });
  _playbackNotifActive = true;
}

function hidePlaybackNotification() {
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({ type: 'HIDE_PLAYBACK_NOTIF' });
  _playbackNotifActive = false;
}

/* Escuchar mensajes del SW (ej: usuario presionó pausa en la notificación) */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (!e.data) return;
    switch (e.data.type) {
      case 'NOTIF_ACTION_PAUSE':
        if (playing) togglePlay();
        break;
      case 'NOTIF_ACTION_STOP':
        if (playing) togglePlay();
        break;
      case 'NOTIF_ACTION_PLAY':
        if (!playing) togglePlay();
        break;
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   REPRODUCCIÓN EN SEGUNDO PLANO — Radio Dilson 101.9 FM
   Soluciona:
   ▸ Audio que se corta al minimizar la app
   ▸ Sin controles en pantalla de bloqueo
   ▸ Sin reconexión automática al volver
   ▸ Android matando el stream en background
   ══════════════════════════════════════════════════════════════ */

/* ── 1. MEDIA SESSION API ──────────────────────────────────────
   Le dice al sistema operativo que esta app es un reproductor
   de medios. Activa controles en:
   ▸ Pantalla de bloqueo (Android e iOS)
   ▸ Notificación de reproducción
   ▸ Auriculares / botones de volumen
   ▸ Android Auto / CarPlay
──────────────────────────────────────────────────────────────── */
function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;

  // Metadatos que aparecen en la pantalla de bloqueo
  navigator.mediaSession.metadata = new MediaMetadata({
    title:  'Radio Dilson 101.9 FM',
    artist: 'En Vivo · Cuevo, Bolivia',
    album:  'Sistema de Comunicación Dilson',
    artwork: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  });

  // Acciones desde la pantalla de bloqueo / auriculares
  const actions = {
    play:          () => { if (!playing) togglePlay(); },
    pause:         () => { if (playing)  togglePlay(); }, /* → _pauseAndReload() */
    stop:          () => { if (playing)  togglePlay(); }, /* → _pauseAndReload() */
    nexttrack:     () => reconnectStream(),
    previoustrack: () => reconnectStream(),
  };

  Object.entries(actions).forEach(([action, handler]) => {
    try { navigator.mediaSession.setActionHandler(action, handler); } catch (e) {}
  });
}

/* Actualizar estado de MediaSession cuando cambia play/pause */
function updateMediaSessionState(isPlaying) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

  // Actualizar metadatos con la canción actual si está disponible
  const currentTitle  = document.getElementById('songTitle')?.textContent  || 'Radio Dilson 101.9 FM';
  const currentArtist = document.getElementById('songArtist')?.textContent || 'En Vivo · Cuevo, Bolivia';

  navigator.mediaSession.metadata = new MediaMetadata({
    title:  currentTitle  || 'Radio Dilson 101.9 FM',
    artist: currentArtist || 'En Vivo · Cuevo, Bolivia',
    album:  'Dilson 101.9 FM — En Vivo',
    artwork: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  });
}

/* ── 2. WAKE LOCK API ──────────────────────────────────────────
   Evita que la pantalla / CPU se apague mientras hay audio.
   Solo disponible en Chrome Android 84+.
   No fuerza la pantalla encendida — solo pide al sistema
   que no suspenda el proceso de audio.
──────────────────────────────────────────────────────────────── */
let wakeLock = null;

/* ── Silent Audio Loop — fallback para Huawei EMUI, iOS Safari y Android sin WakeLock ──
   Crea un buffer de silencio que se repite en loop.
   Esto mantiene el AudioContext activo y evita que el sistema
   mate el proceso de audio cuando la app va a segundo plano.
   Es la técnica usada por Spotify y YouTube Music en PWA. */
let _silentCtx = null;
let _silentSrc = null;

function startSilentLoop() {
  if (_silentCtx && _silentCtx.state !== 'closed') {
    // Si ya existe pero está suspendido, reanudarlo
    if (_silentCtx.state === 'suspended') {
      _silentCtx.resume().catch(() => {});
    }
    return;
  }
  try {
    _silentCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Buffer de silencio de 1 segundo que se repite en loop
    const buf = _silentCtx.createBuffer(1, _silentCtx.sampleRate, _silentCtx.sampleRate);
    _silentSrc = _silentCtx.createBufferSource();
    _silentSrc.buffer = buf;
    _silentSrc.loop = true;
    _silentSrc.connect(_silentCtx.destination);
    _silentSrc.start(0);
    // Detectar si el sistema suspende el contexto y reanudarlo
    _silentCtx.addEventListener('statechange', () => {
      if (_silentCtx && _silentCtx.state === 'suspended' && playing) {
        _silentCtx.resume().catch(() => {});
      }
    });
    console.info('[Dilson FM] Silent loop activo');
  } catch(e) {
    console.warn('[Dilson FM] Silent loop no disponible:', e.message);
  }
}

function stopSilentLoop() {
  if (_silentSrc)  { try { _silentSrc.stop(); } catch(e) {} _silentSrc = null; }
  if (_silentCtx)  { try { _silentCtx.close(); } catch(e) {} _silentCtx = null; }
}

async function requestWakeLock() {
  // Intentar WakeLock API primero (Chrome Android 84+)
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
      console.info('[Dilson FM] WakeLock activo');
    } catch (e) {}
  }
  // Siempre arrancar el silent loop — funciona en Huawei EMUI, iOS, todos
  startSilentLoop();
}

async function releaseWakeLock() {
  if (wakeLock) {
    try { await wakeLock.release(); } catch (e) {}
    wakeLock = null;
  }
  stopSilentLoop();
}

/* Detectar marca agresiva con gestión de batería y avisar al usuario */
(function detectAggressiveBrand() {
  const ua = navigator.userAgent;
  const isAggressive = /huawei|honor|emui|miui|xiaomi|oppo|vivo|coloros/i.test(ua);
  if (isAggressive) {
    // Esperar a que el usuario haga play antes de mostrar el aviso
    audio.addEventListener('play', function onFirstPlay() {
      audio.removeEventListener('play', onFirstPlay);
      setTimeout(() => {
        toast('💡 Para escuchar en 2do plano: Ajustes → Batería → Sin restricciones');
      }, 4000);
    }, { once: true });
  }
})();

/* Re-adquirir WakeLock cuando la página vuelve a ser visible */
/* visibilitychange: fusionado — canvas + audio background
   REGLA DE ORO: NUNCA tocar el audio aquí — solo animaciones. */
document.addEventListener('visibilitychange', async () => {
  if (document.hidden) {
    /* ── APP VA A SEGUNDO PLANO ──
       1. Pausar animaciones (ahorra CPU/batería)
       2. NO tocar el audio bajo ningún concepto
       3. El keepalive se encarga de mantener el proceso vivo */
    if (playing) {
      cancelAnimationFrame(barTimer);
      cancelAnimationFrame(circTimer);
      barTimer = null; circTimer = null;
    }
    stopEmojiAnim();
  } else {
    /* ── APP VUELVE AL PRIMER PLANO ──
       1. Re-adquirir WakeLock (puede haberse perdido)
       2. Reanudar AudioContext si el SO lo suspendió
       3. Solo reconectar stream si se cortó involuntariamente
       4. Reanudar animaciones */
    if (playing) {
      startSilentLoop();
      await requestWakeLock();

      // Reanudar AudioContexts suspendidos por el SO
      if (_silentCtx && _silentCtx.state === 'suspended') {
        _silentCtx.resume().catch(() => {});
      }
      if (vizAudioCtx && vizAudioCtx.state === 'suspended') {
        vizAudioCtx.resume().catch(() => {});
      }

      // Solo reconectar si el stream se cortó involuntariamente
      // _userPaused=true significa el USUARIO pausó → NO reconectar jamás
      if (!_userPaused && playing && (audio.paused || audio.ended)) {
        console.info('[Dilson FM] Stream cortado en background — reconectando...');
        //audio.src = 'radio-stream';
        audio.src = _activeStreamUrl;
        audio.load();
        audio.play().catch(() => scheduleReconnect());
      }

      // Reanudar animaciones visuales
      if (vizAudioCtx && vizAudioCtx.state === 'suspended') {
        vizAudioCtx.resume().then(() => {
          if (!barTimer)  animBars();
          if (!circTimer) animCirc();
        }).catch(() => {
          if (!barTimer)  animBars();
          if (!circTimer) animCirc();
        });
      } else {
        if (!barTimer)  animBars();
        if (!circTimer) animCirc();
      }
    }
    startEmojiAnim();
  }
});

/* ── 3. RECONEXIÓN — alias para hookAudioEvents ──
   scheduleReconnect() está definida más abajo con delays progresivos.
   reconnectStream() es un alias para compatibilidad. */
function reconnectStream() { scheduleReconnect(); }

/* ── VIGILANCIA DE LOS CONTEXTOS DE AUDIO EN SEGUNDO PLANO ──────
   Algunos fabricantes (Xiaomi MIUI, Huawei EMUI, Samsung One UI)
   suspenden el AudioContext cuando la PWA pasa a segundo plano:
   la radio sigue sonando pero el visualizador se queda congelado.
   Cada 15 s se reanudan los contextos que estén suspendidos.

   NOTA: antes esta función también enviaba un mensaje 'KEEPALIVE' al
   service worker "para mantenerlo vivo". Se eliminó porque no puede
   funcionar: un service worker no se auto-mantiene a base de mensajes.
──────────────────────────────────────────────────────────────── */
let _bgKeepaliveTimer = null;

function startBgKeepalive() {
  stopBgKeepalive();
  _bgKeepaliveTimer = setInterval(() => {
    if (!playing) { stopBgKeepalive(); return; }
    if (_silentCtx && _silentCtx.state === 'suspended') {
      _silentCtx.resume().catch(() => {});
    }
    if (vizAudioCtx && vizAudioCtx.state === 'suspended') {
      vizAudioCtx.resume().catch(() => {});
    }
  }, 15000);
}

function stopBgKeepalive() {
  if (_bgKeepaliveTimer) { clearInterval(_bgKeepaliveTimer); _bgKeepaliveTimer = null; }
}

/* ── 4. DETECTAR PÉRDIDA DE AUDIO EN BACKGROUND ───────────────
   Algunos Android suspenden el AudioContext pero no el elemento
   <audio>. Este heartbeat detecta si el stream sigue vivo
   aunque el elemento no haya lanzado un evento 'error'.
──────────────────────────────────────────────────────────────── */
let lastCurrentTime   = 0;
let stalledCount      = 0;
let heartbeatInterval = null;

function startHeartbeat() {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (!playing || document.visibilityState !== 'hidden') {
      stalledCount = 0;
      return; // Solo verificar cuando está en segundo plano
    }
    if (audio.currentTime === lastCurrentTime && !audio.paused && !_userPaused) {
      stalledCount++;
      if (stalledCount >= 3) { // 3 checks fallidos = stream muerto
        stalledCount = 0;
        console.warn('[Dilson FM] Heartbeat: stream detenido en background');
        reconnectStream();
      }
    } else {
      stalledCount = 0;
    }
    lastCurrentTime = audio.currentTime;
  }, 5000); // Verificar cada 5 segundos
}

function stopHeartbeat() {
  if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
}

/* ── 5. EVENTOS DEL ELEMENTO <audio> ──────────────────────────
   Escuchar eventos nativos de error y stall para reconectar.
   IMPORTANTE: llama a hookAudioEvents() DESPUÉS de que
   el elemento #stream exista en el DOM.
──────────────────────────────────────────────────────────────── */
function hookAudioEvents() {
  // WakeLock + MediaSession + Silent loop al reproducir
  audio.addEventListener('play', () => {
    // Ignorar si fue disparado por el proceso de pausa (src=''+load())
    if (_userPaused) return;
    setupMediaSession();
    updateMediaSessionState(true);
    requestWakeLock();
    startHeartbeat();
    startBgKeepalive();
  });

  /* PAUSA — distinguir si fue el USUARIO o el SISTEMA (Huawei/Android)
     FIX CRÍTICO: ya no intentamos reconectar desde el evento 'pause'.
     La razón: cuando el usuario pausa, el orden es:
       1. _userPaused = true
       2. playing = false       ← nuevo
       3. goLive(false)
       4. audio.pause()         ← dispara este evento
       5. audio.src = ''        ← dispara 'error'
     Si reconectamos aquí con un setTimeout, hay riesgo de que el
     audio vuelva a sonar aunque el usuario haya pulsado pausa.
     La reconexión por caída del sistema se maneja solo desde
     los eventos 'error', 'stalled' y el heartbeat. */
  audio.addEventListener('pause', () => {
    if (_userPaused) {
      // Pausa VOLUNTARIA del usuario — liberar recursos, no reconectar jamás
      updateMediaSessionState(false);
      releaseWakeLock();
      stopHeartbeat();
      return;
    }
    // Pausa del SISTEMA (sin _userPaused): solo liberar recursos visuales.
    // La reconexión la disparan 'error'/'stalled'/heartbeat — no este listener.
    if (!playing) return; // si playing ya es false, el usuario pausó — no hacer nada
    console.info('[Dilson FM] Pausa del sistema detectada — esperando reconexión por error/stalled');
  });

  // Reset contador al recuperar señal (ignorar si usuario pausó)
  audio.addEventListener('playing', () => {
    if (_userPaused) return;
    reconnectCount = 0;
    updateMediaSessionState(true);
  });

  // Error de red — manejado por el listener global con showReconnectBar (ver abajo)

  // Stream atascado — reconectar tras 6s (ignorar si el usuario pausó)
  audio.addEventListener('stalled', () => {

    if (HARD_PAUSE) return;

    if (!playing || _userPaused) return;
        setTimeout(()=>{
            if(playing && !_userPaused && audio.paused)
                scheduleReconnect();
        },6000);
});
}

/* ── INICIALIZAR ── */
document.addEventListener('DOMContentLoaded', () => {
  hookAudioEvents();
  setupMediaSession();
});

/* ── ACTUALIZAR MEDIAESSION CUANDO CAMBIA LA CANCIÓN ──────────
   Si tu app.js ya actualiza el título de la canción vía
   fetchRadioStatus(), llama a updateMediaSessionState(true)
   cada vez que actualices el texto para que la pantalla de
   bloqueo muestre la canción correcta.

   Busca en app.js donde actualizas songTitle/songArtist y
   agrega esta línea después:
   
     if (playing) updateMediaSessionState(true);
──────────────────────────────────────────────────────────────── */

function goLive(on) {
  playing = on;
  playBtn.textContent = on ? '⏸' : '▶';
  playBtn.setAttribute('aria-label', on ? 'Pausar radio' : 'Reproducir radio');
  playBtn.classList.toggle('reproduciendo', on);
  liveDot.classList.toggle('on', on);
  liveDot.classList.toggle('off', !on);
  liveLbl.textContent = on ? 'EN VIVO' : 'PAUSADO';
  livePill.classList.toggle('standby', !on);
  logoRing.classList.toggle('active', on);
  statSt.textContent = on ? 'AL AIRE' : 'APAGADO';
  statSt.style.color = on ? 'var(--red)' : 'var(--gold)';
  tickerEl.classList.toggle('run', on);
  updateSig(on);
  if (on) {
    hideReconnectBar();
    if (!currentSongTitle) {
      if (playing) updateMediaSessionState(true);
      const s = SONGS[songIdx]; setSong(s.title, s.artist, s.icon, true);
    }    // ✅ FIX: Cancelar loops anteriores antes de iniciar nuevos (evita duplicados)
    cancelAnimationFrame(barTimer);
    cancelAnimationFrame(circTimer);
    barTimer = null; circTimer = null;
    // ✅ FIX: Reanudar AudioContext si está suspendido antes de arrancar animaciones
    if (vizAudioCtx && vizAudioCtx.state === 'suspended') {
      vizAudioCtx.resume().then(() => {
        animBars();
        animCirc();
      }).catch(() => {
        animBars();
        animCirc();
      });
    } else {
      animBars();
      animCirc();
    }
    // Arrancar polling real del stream (StreamTitle + oyentes)
    startStreamPolling();
    // Activar guardia del botón atrás (Android) para no cerrar la app
    activateBackGuard();
    toast('🎙️ ¡Dilson 101.9 FM en vivo!');
  } else {
    setSong('Pausado', 'Presiona ▶ para escuchar', '⏸', false);
    cancelAnimationFrame(barTimer);
    cancelAnimationFrame(circTimer);
    barD.forEach(b => { b.el.style.height = '4px'; b.smooth = 0; });
    circSmooth.fill(0); drawCirc(false);
    stopStreamPolling();
    currentSongTitle = ''; // reset para detectar nueva canción al volver
    // Desactivar guardia del botón atrás
    deactivateBackGuard();
  }
}

function toggleMute() {
  muted = !muted;
  audio.muted = muted;
  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar');
  toast(muted ? '🔇 Silenciado' : '🔊 Sonido activado');
}

/* MEJORA: guardar volumen en localStorage */
function setVol(v) {
  audio.volume = v / 100;
  document.getElementById('volPct').textContent = v + '%';
  document.getElementById('volSlider').style.setProperty('--p', v + '%');
  localStorage.setItem('dilson_vol', v);
}

/* ── Doble tap para apagar, tap central para segundo plano ── */
let _restartTapCount  = 0;
let _restartTapTimer  = null;

function restart() {
  _restartTapCount++;

  if (_restartTapCount === 1) {
    /* Primer tap → mostrar opciones elegantes */
    showRestartOptions();
    _restartTapTimer = setTimeout(() => {
      _restartTapCount = 0;
    }, 3500);
  } else if (_restartTapCount >= 2) {
    /* Segundo tap → apagar la radio */
    clearTimeout(_restartTapTimer);
    _restartTapCount = 0;
    hideRestartToast();
    if (playing || !_userPaused) {
      _pauseAndReload();
      showToastElegante('⏹ Radio apagada', 'Hasta pronto 👋');
    } else {
      showToastElegante('ℹ️ La radio ya está pausada', '');
    }
  }
}

function showRestartOptions() {
  const existing = document.getElementById('restartToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'restartToast';
  toast.innerHTML = `
    <div class="rt-inner">
      <div class="rt-icon">📻</div>
      <div class="rt-content">
        <div class="rt-title">¿Qué deseas hacer?</div>
        <div class="rt-options">
          <div class="rt-option">
            <span class="rt-key">×2</span>
            <span class="rt-desc">Presiona de nuevo para <strong>apagar</strong> la radio</span>
          </div>
          <div class="rt-option" onclick="listenInBackground()" style="cursor:pointer;">
            <span class="rt-key rt-key-center">▶</span>
            <span class="rt-desc">Toca aquí para escuchar <strong>en segundo plano</strong></span>
          </div>
        </div>
      </div>
      <button class="rt-close" onclick="hideRestartToast()" aria-label="Cerrar">✕</button>
    </div>
    <div class="rt-progress"></div>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('rt-visible'));

  /* Auto-cerrar en 3.5s con barra de progreso */
  const bar = toast.querySelector('.rt-progress');
  bar.style.transition = 'width 3.5s linear';
  requestAnimationFrame(() => { bar.style.width = '0%'; });

  setTimeout(() => {
    hideRestartToast();
    _restartTapCount = 0;
  }, 3500);
}

function hideRestartToast() {
  const t = document.getElementById('restartToast');
  if (!t) return;
  t.classList.remove('rt-visible');
  t.classList.add('rt-hiding');
  setTimeout(() => t.remove(), 350);
}

function listenInBackground() {
  hideRestartToast();
  _restartTapCount = 0;
  if (!playing) {
    showToastElegante('🎵 Reproduce primero la radio', 'Luego minimiza la app');
    return;
  }
  showToastElegante('🎵 Escuchando en segundo plano', 'Minimiza la app o bloquea tu pantalla');
}

function showToastElegante(titulo, sub) {
  const existing = document.getElementById('elegantToast');
  if (existing) existing.remove();

  const t = document.createElement('div');
  t.id = 'elegantToast';
  t.innerHTML = `<div class="et-title">${titulo}</div>${sub ? `<div class="et-sub">${sub}</div>` : ''}`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('et-visible'));
  setTimeout(() => {
    t.classList.remove('et-visible');
    setTimeout(() => t.remove(), 400);
  }, 2800);
}

/* ── DEDICATORIA ── */
function sendDedica(e) {
  e.preventDefault();
  const msg = encodeURIComponent('🎙️ *Hola Dilson 101.9 FM!*\n\nQuiero enviar una dedicatoria:\n\n👤 *Para:* \n💌 *De parte de:* \n🎵 *Canción:* \n💬 *Mensaje:* \n\n📻 Los escucho en el 101.9 FM desde Cuevo, Bolivia 🇧🇴');
  window.open('https://wa.me/59172635314?text=' + msg, '_blank');
}

/* ── COMPARTIR ── */
async function shareRadio(e) {
  e.preventDefault();
  const sd = { title: 'Dilson 101.9 FM — En Vivo', text: '🎙️ ¡Escucha Dilson 101.9 FM en vivo desde Cuevo, Bolivia! La mejor radio de la región.', url: window.location.href };
  if (navigator.share) {
    try { await navigator.share(sd); toast('📤 ¡Gracias por compartir!'); }
    catch(er) { if (er.name !== 'AbortError') copyLink(); }
  } else copyLink();
}
function copyLink() {
  navigator.clipboard.writeText(window.location.href)
    .then(() => toast('🔗 ¡Enlace copiado!'))
    .catch(() => toast('📋 ' + window.location.href));
}

/* ═══════════════════════════════════════════
   MANEJO DE ERRORES DEL STREAM (MEJORADO)
   ═══════════════════════════════════════════ */
let reconnectCount  = 0;
const MAX_RECONNECT = 8;
const RECONNECT_DELAYS = [3000, 5000, 8000, 12000, 20000, 30000, 45000, 60000];

/* MEJORA: errores del stream con indicador visual */
audio.addEventListener('error', (e) => {
  // Ignorar errores cuando el usuario pausó voluntariamente
  // (vaciar audio.src='' genera un error que no debe reconectar)
  if (!playing || _userPaused) return;
  console.warn('Audio error:', e);
  showReconnectBar('⚠️ Error de señal — reconectando...');
  scheduleReconnect();
});

audio.addEventListener('stalled', () => {
  if (!playing || _userPaused) return;
  showReconnectBar('📡 Señal débil — reconectando...');
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(scheduleReconnect, 8000);
});

audio.addEventListener('waiting', () => {
  if (!playing || _userPaused) return;
  showReconnectBar('⏳ Cargando señal...');
});

audio.addEventListener('playing', () => {
  // Ignorar si el usuario pausó voluntariamente
  if (_userPaused) return;
  clearTimeout(reconnectTimer);
  reconnectCount = 0;
  hideReconnectBar();
});

audio.addEventListener('canplay', () => {
  if (_userPaused) return;
  hideReconnectBar();
});

function scheduleReconnect() {
  // No reconectar si el usuario pausó voluntariamente
  if (!playing || _userPaused) return;

  /* ── Cuando se agotan los reintentos rápidos ─────────────────────
     Antes la aplicación se rendía aquí PARA SIEMPRE: mostraba "Sin
     señal. Verifica tu conexión a internet" y no volvía a intentarlo
     hasta que el oyente recargara la página a mano. Dos problemas:

       · El mensaje culpaba a su internet, cuando lo habitual es que el
         que no responde sea el servidor de la radio.
       · La única salida era recargar, así que si el servidor volvía a
         los diez minutos, nadie se enteraba.

     Ahora se distinguen los dos casos y se sigue intentando despacio,
     cada 5 minutos, para que la radio se recupere sola. */
  if (reconnectCount >= MAX_RECONNECT) {
    const sinInternet = (typeof navigator !== 'undefined' && navigator.onLine === false);
    if (sinInternet) {
      showReconnectBar('📵 Sin conexión a internet — se reanudará solo');
      toast('📵 Te quedaste sin conexión. La radio volverá sola.');
    } else {
      showReconnectBar('📡 Señal no disponible — reintentando cada 5 min');
      toast('📡 La señal de la radio no responde. Seguiremos intentándolo.');
    }
    /* Reintento lento y continuo: no se abandona nunca mientras el
       oyente siga con la radio puesta. */
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      if (!playing || _userPaused) return;
      reconnectCount = MAX_RECONNECT - 1; // habilita otro ciclo
      scheduleReconnect();
    }, 5 * 60 * 1000);
    return;
  }

  const delay = RECONNECT_DELAYS[reconnectCount] || 60000;
  reconnectCount++;
  /* La barra de reconexión ya informa del intento: no hace falta además
     un aviso emergente en cada uno de los 8 intentos. */
  showReconnectBar(`🔄 Reconectando... (intento ${reconnectCount} de ${MAX_RECONNECT})`);
  reconnectTimer = setTimeout(() => {
    // Triple verificación al momento de reconectar
    if (!playing || _userPaused) return;
    audio.src = _activeStreamUrl;
    audio.load();
    audio.play().catch(() => scheduleReconnect());
  }, delay);
}

/* Si el dispositivo recupera la conexión, se intenta de inmediato en vez
   de esperar hasta 5 minutos. */
window.addEventListener('online', () => {
  if (!playing || _userPaused) return;
  clearTimeout(reconnectTimer);
  reconnectCount = 0;
  scheduleReconnect();
});

/* ══ RENDIMIENTO: Pausar canvas cuando la pestaña no está visible ══ */
/* ══ AUTO-ARRANQUE + APP SHORTCUTS (IDEA 7) ══ */
(function setupAutoplay() {
  // Manejar parámetros de URL para los shortcuts del manifest
  const params = new URLSearchParams(window.location.search);
  const action   = params.get('action');
  const autoplay = params.get('autoplay');

  // Limpiar URL sin recargar (para que no quede ?autoplay=1 visible)
  if (params.toString()) {
    history.replaceState({}, '', window.location.pathname);
  }

  // Shortcut: abrir chat en la pestaña correcta al cargar
  if (action === 'dedica' || action === 'cancion') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        openChat();
        switchTab(action);
      }, 2800);
    });
  }

  const hadInteraction = sessionStorage.getItem('dilson_played');
  // Autoplay forzado desde shortcut o sesión previa
  if (hadInteraction || autoplay === '1') {
    setTimeout(() => {
      // No autoplay si el usuario pausó manualmente durante la carga
      if (_userPaused || playing) return;
      //audio.src = 'radio-stream'; // FIX iOS
      audio.src = _activeStreamUrl;
      audio.load();
      audio.play().then(() => {
        if (_userPaused) { audio.pause(); audio.src = ''; audio.load(); return; }
        connectAudioAnalyser();
        if (vizAudioCtx && vizAudioCtx.state === 'suspended') {
          vizAudioCtx.resume().catch(() => {});
        }
        goLive(true);
      }).catch(() => showTapToPlay());
    }, 2400);
    return;
  }
  setTimeout(showTapToPlay, 2500);
})();

function showTapToPlay() {
  if (document.getElementById('tapOverlay')) return;
  const ov = document.createElement('div');
  ov.id = 'tapOverlay';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-label', 'Toca para escuchar Radio Dilson');
  ov.style.cssText = 'position:fixed;inset:0;z-index:8500;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:rgba(7,7,15,0.93);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);';
  ov.innerHTML = `
    <img src="logodilson2.png" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:2px solid rgba(168,85,247,0.45);box-shadow:0 0 40px rgba(168,85,247,0.4);" onerror="this.style.display='none'" alt="Radio Dilson">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;letter-spacing:0.15em;color:#A855F7;text-shadow:0 0 24px rgba(168,85,247,0.65);text-align:center;">DILSON 101.9 FM</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:0.58rem;color:rgba(200,160,255,0.55);letter-spacing:0.15em;text-align:center;">CUEVO · BOLIVIA · EN VIVO</div>
    <button id="tapBtn" aria-label="Reproducir Radio Dilson 101.9 FM" style="margin-top:6px;width:84px;height:84px;border-radius:50%;border:none;background:linear-gradient(135deg,#A855F7,#7C3AED);color:#fff;font-size:2.2rem;cursor:pointer;box-shadow:0 8px 34px rgba(168,85,247,0.55),inset 0 2px 0 rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;">▶</button>
    <div style="font-family:'JetBrains Mono',monospace;font-size:0.6rem;color:rgba(235,235,245,0.4);letter-spacing:0.12em;">Toca para escuchar</div>
  `;
  ov.querySelector('#tapBtn').addEventListener('click', () => {
    sessionStorage.setItem('dilson_played', '1');
    //audio.src = 'radio-stream'; // FIX iOS Safari
    audio.src = _activeStreamUrl;
    audio.load();
    audio.play()
      .then(() => {
        if (_userPaused) { audio.pause(); audio.src = ''; audio.load(); ov.remove(); return; }
        connectAudioAnalyser();
        // FIX: El tap del usuario es la interacción necesaria para reanudar AudioContext
        if (vizAudioCtx && vizAudioCtx.state === 'suspended') {
          vizAudioCtx.resume().catch(() => {});
        }
        goLive(true);
        ov.remove();
      })
      .catch(() => { toast('⚠️ Sin conexión de audio'); ov.remove(); });
  });
  document.body.appendChild(ov);
}

/* ══ PANTALLA DE BLOQUEO — MEDIA SESSION ══ */
function updateMediaSession(title, artist) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title:  title  || 'Dilson 101.9 FM — En Vivo',
    artist: artist || 'Cuevo, Bolivia',
    album:  'Sistema de Comunicación Dilson · 101.9 FM',
    artwork: [
      { src: 'logodilson2.png', sizes: '512x512', type: 'image/png' },
      { src: 'icon-512.png',    sizes: '512x512', type: 'image/png' },
      { src: 'icon-192.png',    sizes: '192x192', type: 'image/png' },
      { src: 'icon-180.png',    sizes: '180x180', type: 'image/png' },
      { src: 'icon-152.png',    sizes: '152x152', type: 'image/png' },
    ]
  });
  navigator.mediaSession.playbackState = 'playing';
  navigator.mediaSession.setActionHandler('play',      () => { if (!playing) togglePlay(); });
  navigator.mediaSession.setActionHandler('pause',     () => { if (playing)  _pauseAndReload(); });
  navigator.mediaSession.setActionHandler('stop',      () => { if (playing)  _pauseAndReload(); });
  navigator.mediaSession.setActionHandler('nexttrack', () => reconnectStream());
  try { navigator.mediaSession.setActionHandler('previoustrack', () => reconnectStream()); } catch(e) {}
}

/* ══ BOTÓN ATRÁS DE ANDROID — Evitar que cierre la app mientras la radio está sonando ══
   Inyectamos una entrada en el historial al dar play. Cuando el usuario presiona "atrás",
   el navegador navega a esa entrada fantasma en lugar de cerrar la app, y nosotros
   simplemente empujamos otra nueva entrada para que el ciclo se repita indefinidamente.
   El audio nunca se interrumpe porque la página no se descarga.
   ▸ Funciona aunque se presione "atrás" 2, 5 o 10 veces seguidas.
   ▸ Solo el botón PAUSA o APAGAR detiene la radio.
   ══════════════════════════════════════════════════════════════════════════════════════ */
let _backGuardActive = false;
let _backGuardPushCount = 0; // Cuántas entradas fantasma tenemos en el historial

function activateBackGuard() {
  if (_backGuardActive) return;
  _backGuardActive = true;
  // Empujar TRES estados fantasma al inicio — buffer para múltiples taps de "atrás"
  for (let i = 0; i < 3; i++) {
    history.pushState({ dilsonFMPlaying: true, idx: i }, '', window.location.href);
  }
  _backGuardPushCount = 3;
}

function deactivateBackGuard() {
  if (!_backGuardActive) return;
  _backGuardActive = false;
  _backGuardPushCount = 0;
}

window.addEventListener('popstate', (e) => {
  if (!playing) return;
  // El usuario pulsó "atrás" mientras la radio estaba sonando:
  // Volvemos a empujar estados fantasma para que jamás se salga de la app.
  // Mantenemos siempre al menos 3 entradas de buffer.
  _backGuardPushCount = Math.max(0, _backGuardPushCount - 1);
  const needed = 3 - _backGuardPushCount;
  for (let i = 0; i < needed; i++) {
    history.pushState({ dilsonFMPlaying: true, idx: Date.now() + i }, '', window.location.href);
    _backGuardPushCount++;
  }
  toast('🎙️ Radio en segundo plano — presiona ⏸ para detener');
});

const _origSetSong = setSong;
window.setSong = function(t, a, ic, live) {
  _origSetSong(t, a, ic, live);
  if (live) updateMediaSession(t, 'Radio Dilson · ' + a);
};
audio.addEventListener('play',  () => {
  if (_userPaused) return; // ignorar eventos play durante pausa voluntaria
  updateMediaSession();
  if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
});
audio.addEventListener('pause', () => {
  if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused';
});

/* ══ GALERÍA — DOTS ══ */
(function initGallery() {
  const scroll = document.getElementById('galleryScroll');
  const dotsEl = document.getElementById('galleryDots');
  if (!scroll) return;

  /* ── Scroll → actualizar dots ── */
  function updateDots() {
    const dots = dotsEl ? dotsEl.querySelectorAll('.gdot') : [];
    const itemW = (scroll.querySelector('.gal-item')?.offsetWidth || 160) + 10;
    const idx   = Math.round(scroll.scrollLeft / itemW);
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === idx);
      d.setAttribute('aria-selected', i === idx);
    });
  }
  scroll.addEventListener('scroll', updateDots, { passive: true });

  /* ── Cargar galería desde Firebase cuando esté disponible ── */
  function loadGaleriaFirebase(db) {
    db.ref('galeria').orderByChild('ts').on('value', snap => {
      const items = [];
      snap.forEach(c => { const v = c.val(); if (v && v.url) items.push(v); });
      items.sort((a, b) => b.ts - a.ts);

      if (!items.length) return; /* mantener los placeholders estáticos */

      /* Construir HTML dinámico */
      scroll.innerHTML = items.map(item => `
        <div class="gal-item" role="listitem" onclick="abrirGalFoto('${item.url.replace(/'/g,"\\'")}','${(item.caption||'').replace(/'/g,"\\'")}')">
          <img src="${item.thumb || item.url}" alt="${item.caption || 'Foto Dilson FM'}"
               loading="lazy" decoding="async"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="gal-placeholder" style="display:none">
            <div class="gal-placeholder-icon">📷</div>
          </div>
          <div class="gal-overlay"><div class="gal-label">${item.caption || 'Dilson FM'}</div></div>
        </div>`).join('');

      /* Regenerar dots */
      if (dotsEl) {
        dotsEl.innerHTML = items.map((_, i) =>
          `<div class="gdot ${i===0?'active':''}" role="tab" aria-selected="${i===0}"></div>`
        ).join('');
      }

      /* Ocultar el texto estático "Agrega tus fotos en la carpeta" */
      const hint = scroll.parentElement?.querySelector('p');
      if (hint) hint.style.display = 'none';

      updateDots();
    });
  }

  /* Esperar a que Firebase esté listo */
  let fbWait = 0;
  const fbPoll = setInterval(() => {
    if (typeof fbDB !== 'undefined' && fbDB) {
      clearInterval(fbPoll);
      loadGaleriaFirebase(fbDB);
    } else if (++fbWait > 60) {
      clearInterval(fbPoll); /* timeout 6s — mantener placeholders */
    }
  }, 100);
})();

/* ── Lightbox de galería ── */
function abrirGalFoto(url, caption) {
  const lb = document.createElement('div');
  lb.id = 'galLightbox';
  lb.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.93);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;cursor:zoom-out;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);animation:galLbIn 0.25s ease';
  lb.innerHTML = `
    <img src="${url}" style="max-width:94vw;max-height:80vh;border-radius:14px;object-fit:contain;box-shadow:0 20px 60px rgba(0,0,0,0.6)" alt="${caption}">
    ${caption ? `<div style="font-size:0.75rem;color:rgba(255,255,255,0.6);font-family:'JetBrains Mono',monospace;letter-spacing:0.05em">${caption}</div>` : ''}`;
  lb.onclick = () => { lb.style.opacity = '0'; setTimeout(() => lb.remove(), 200); };
  document.body.appendChild(lb);
}

/* Inyectar keyframe lightbox una sola vez */
if (!document.getElementById('galLbStyle')) {
  const s = document.createElement('style');
  s.id = 'galLbStyle';
  s.textContent = '@keyframes galLbIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:none}}';
  document.head.appendChild(s);
}

/* ══ PUBLICIDAD — FORMULARIO ══ */
function sendAdsContact() {
  const nombre = document.getElementById('adsNombre').value.trim();
  const tel    = document.getElementById('adsTel').value.trim();
  const pkg    = document.getElementById('adsPkg').value;
  if (!nombre || !tel) { toast('✏️ Completa tu nombre y teléfono'); return; }
  if (!pkg) { toast('📦 Selecciona un paquete'); return; }
  const msg = encodeURIComponent(
    `📣 *Solicitud de Publicidad — Radio Dilson 101.9 FM*\n\n` +
    `🏢 *Negocio/Nombre:* ${nombre}\n` +
    `📞 *Teléfono:* ${tel}\n` +
    `📦 *Paquete:* ${pkg}\n\n` +
    `_Estoy interesado en anunciarme en Dilson 101.9 FM. Por favor contáctenme._`
  );
  window.open('https://wa.me/59172635314?text=' + msg, '_blank');
  toast('📲 ¡Redirigiendo a WhatsApp!');
}

/* ══ SWIPE CHAT ══ */
let startY = 0;
document.querySelector('.chat-panel').addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
document.querySelector('.chat-panel').addEventListener('touchmove', e => {
  if (e.touches[0].clientY - startY > 70) closeChat();
}, { passive: true });

/* ═══════════════════════════════════════════
   MINI REPRODUCTOR
   ═══════════════════════════════════════════ */
const miniPlayer  = document.getElementById('miniPlayer');
const miniPlayBtn = document.getElementById('miniPlayBtn');
const pcardEl     = document.querySelector('.pcard');

const scrollObserver = new IntersectionObserver(entries => {
  const visible = entries[0].isIntersecting;
  miniPlayer.classList.toggle('show', !visible);
}, { threshold: 0.2 });
scrollObserver.observe(pcardEl);

function syncMiniPlayer() {
  miniPlayBtn.textContent = playing ? '⏸' : '▶';
  miniPlayBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
  miniPlayBtn.classList.toggle('playing', playing);
  const liveStatus = document.getElementById('miniLiveStatus');
  if (liveStatus) liveStatus.style.opacity = playing ? '1' : '0.4';
}

const _origGoLive = goLive;
window.goLive = function(on) {
  _origGoLive(on);
  syncMiniPlayer();
  const logoImg = document.getElementById('logoImg');
  if (logoImg) logoImg.style.filter = on
    ? 'drop-shadow(0 0 22px rgba(168,85,247,0.75)) drop-shadow(0 0 8px rgba(216,180,254,0.45))'
    : 'drop-shadow(0 0 14px rgba(168,85,247,0.3))';
};

/* ═══════════════════════════════════════════
   CHAT EN VIVO — Firebase
   ═══════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCE2m-TPWIlUTQQSk_pdgPknLuCauk0LIU",
  authDomain:        "dilson101fm.firebaseapp.com",
  databaseURL:       "https://dilson101fm-default-rtdb.firebaseio.com",
  projectId:         "dilson101fm",
  storageBucket:     "dilson101fm.firebasestorage.app",
  messagingSenderId: "884622282020",
  appId:             "1:884622282020:web:993369ff8d992d320377b1"
};

const _fbScript1 = document.createElement('script');
_fbScript1.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js';
document.head.appendChild(_fbScript1);

const _fbScript2 = document.createElement('script');
_fbScript2.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js';
document.head.appendChild(_fbScript2);

/* SDK DE AUTENTICACIÓN — imprescindible desde que las reglas de la base de
   datos exigen "auth != null" para escribir. Sin este script, firebase.auth
   no existiría y ningún envío del chat, del mercado, de las dedicatorias ni
   de los avisos funcionaría. */
const _fbScript3 = document.createElement('script');
_fbScript3.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js';
document.head.appendChild(_fbScript3);

const chatModal      = document.getElementById('chatModal');
const chatMessagesEl = document.getElementById('chatMessages');
let activeTab   = 'chat';
let chatOpen    = false;
let fbDB        = null;
let renderedKeys = new Set();
const MAX_MSGS  = 80;

function initFirebase() {
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    fbDB = firebase.database();
    // Forzar WebSocket — evita long polling que viola el CSP
    if (fbDB.INTERNAL && fbDB.INTERNAL.forceWebSockets) fbDB.INTERNAL.forceWebSockets();

    /* Arranque de los módulos que leen y escriben en la base de datos.
       Es idempotente: aunque se llame dos veces, solo arranca una. */
    let arrancado = false;
    const arrancar = () => {
      if (arrancado) return;
      arrancado = true;
      startListening();
      trackPresence();
      /* Si el oyente ya había concedido la ubicación, se comparte ahora para
         que el mapa de oyentes se vaya llenando aunque no abra esa pestaña.
         Nunca pide permiso: solo usa uno ya concedido. */
      compartirUbicacionSiYaPermitida();
      listenCurrentSong(); // Sincronizar canción actual con Firebase
      initReactions();     // Nivel 2: reacciones en vivo
      loadStreamConfig();
      console.log('🔥 Firebase conectado');
    };

    /* ── AUTENTICACIÓN ANÓNIMA ────────────────────────────────────────
       Las reglas de la base de datos exigen "auth != null" para escribir.
       Aquí se obtiene una identidad anónima (sin pedirle ningún dato al
       oyente) y SOLO ENTONCES se arrancan los módulos, para que ninguna
       escritura salga antes de tener identidad y sea rechazada.
       ──────────────────────────────────────────────────────────────── */
    if (typeof firebase.auth !== 'function') {
      console.warn('[Dilson FM] SDK de autenticación no disponible: se continúa en modo lectura.');
      arrancar();
      return;
    }

    const auth = firebase.auth();
    auth.onAuthStateChanged(user => {
      if (user) { arrancar(); return; }
      auth.signInAnonymously().catch(err => {
        console.warn('[Dilson FM] No se pudo obtener identidad anónima:', (err && err.code) || err);
        console.warn('  → Comprueba en Firebase Console que el proveedor "Anónimo" esté habilitado.');
        /* Se arranca igualmente: la lectura pública sigue funcionando y, si
           alguien intenta escribir, la consola dirá que faltan permisos. */
        arrancar();
      });
    });
  } catch(e) {
    console.warn('Firebase no inicializado:', e.message);
    showOfflineMode();
  }
}

/* Barrera de carga: se inicializa solo cuando están listos el SDK de base
   de datos y el de autenticación, sin depender del orden en que terminen
   de cargar (son scripts asíncronos). */
const _fbListo = { db: false, auth: false };
function _fbPuedeIniciar() {
  if (_fbListo.db && _fbListo.auth) setTimeout(initFirebase, 100);
}
_fbScript2.onload = () => { _fbListo.db = true; _fbPuedeIniciar(); };
_fbScript2.onerror = () => showOfflineMode();
_fbScript3.onload = () => { _fbListo.auth = true; _fbPuedeIniciar(); };
_fbScript3.onerror = () => {
  console.warn('[Dilson FM] No se pudo cargar el SDK de autenticación: se continúa en modo lectura.');
  _fbListo.auth = true;
  _fbPuedeIniciar();
};

function showOfflineMode() {
  addMessageDOM({
    nombre: 'Sistema', ciudad: '',
    texto: '⚠️ Chat en modo local. Configura Firebase para chat en tiempo real.',
    tipo: 'chat', esRadio: true, ts: Date.now()
  });
}

function startListening() {
  if (!fbDB) return;
  const ref = fbDB.ref('chat/mensajes').orderByChild('ts').limitToLast(MAX_MSGS);
  ref.on('child_added', snap => {
    const key = snap.key;
    if (renderedKeys.has(key)) return;
    renderedKeys.add(key);
    addMessageDOM(snap.val());
  });
  ref.once('value', snap => {
    if (!snap.exists()) {
      fbDB.ref('chat/mensajes').push({
        nombre: 'Radio Dilson', ciudad: 'Cuevo, Bolivia',
        texto: '🎙️ ¡Bienvenidos al chat en vivo de Dilson 101.9 FM! Aquí pueden pedir canciones 🎵 y enviar dedicatorias 💌. ¡Estamos al aire para toda Bolivia! 🇧🇴',
        tipo: 'chat', esRadio: true,
        ts: firebase.database.ServerValue.TIMESTAMP
      });
    }
  });
  fbDB.ref('.info/connected').on('value', snap => {
    const conectado = snap.val();
    const dot   = document.querySelector('.chat-online-dot');
    const label = document.getElementById('chatOnline');
    if (dot) dot.style.background = conectado ? 'var(--green)' : 'var(--red)';
    if (label && !conectado) label.textContent = 'Reconectando...';
  });
}

function trackPresence() {
  if (!fbDB) return;
  const presRef = fbDB.ref('chat/presencia/' + _uid);
  presRef.set(true);
  presRef.onDisconnect().remove();
  fbDB.ref('chat/presencia').on('value', snap => {
    const n = snap.numChildren();
    const label = document.getElementById('chatOnline');
    if (label) label.textContent = n + (n === 1 ? ' oyente' : ' oyentes') + ' en línea';
    // Sincronizar a radio/listeners para que el panel lateral y statListeners lo tengan como fallback
    // (se usa el max entre presencia Firebase y el dato real de Icecast)
    const statEl = document.getElementById('statListeners');
    const currentVal = statEl ? parseInt(statEl.textContent) : 0;
    // Solo sobreescribir si Icecast no tiene datos (statListeners en '--')
    if (statEl && statEl.textContent === '--' && n > 0) {
      statEl.textContent = n;
    }
    // Actualizar panel lateral siempre
    const lfpEl = document.getElementById('lfpOnlineCount');
    if (lfpEl) lfpEl.textContent = n;
  });
}

let _uid = sessionStorage.getItem('dilson_uid');
if (!_uid) {
  _uid = 'u_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
  sessionStorage.setItem('dilson_uid', _uid);
}

function timeNow() {
  const n = new Date();
  return String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
}

function escapeHTML(str) {
  return String(str == null ? '' : str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function addMessageDOM({ nombre, ciudad, texto, tipo = 'chat', esRadio = false, ts }) {
  while (chatMessagesEl.children.length >= MAX_MSGS) {
    chatMessagesEl.removeChild(chatMessagesEl.firstChild);
  }
  const hora = ts ? (() => {
    const d = new Date(ts);
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  })() : timeNow();
  const avatarIcon  = esRadio ? '🎙️' : (tipo === 'cancion' ? '🎵' : tipo === 'dedica' ? '💌' : '👤');
  const bubbleClass = esRadio ? 'radio-msg' : (tipo === 'cancion' ? 'cancion' : tipo === 'dedica' ? 'dedica' : '');
  const tagHtml     = tipo === 'cancion'
    ? '<span class="msg-tag tag-cancion">🎵 SOLICITUD</span><br>'
    : tipo === 'dedica'
    ? '<span class="msg-tag tag-dedica">💌 DEDICATORIA</span><br>'
    : '';
  const nameClass = esRadio ? 'radio-name' : '';
  const badgeHtml = esRadio ? '<span class="msg-badge">📻 AL AIRE</span>' : '';
  const locHtml   = ciudad ? ` · <span style="opacity:0.55">${escapeHTML(ciudad)}</span>` : '';
  const wrap = document.createElement('div');
  wrap.className = 'chat-msg';
  wrap.innerHTML = `
    <div class="msg-avatar${esRadio?' radio':''}" aria-hidden="true">${avatarIcon}</div>
    <div class="msg-body">
      <div class="msg-name ${nameClass}">${escapeHTML(nombre)}${locHtml}${badgeHtml}
        <span class="msg-time">${hora}</span>
      </div>
      <div class="msg-bubble ${bubbleClass}">${tagHtml}${texto}</div>
    </div>`;
  chatMessagesEl.appendChild(wrap);
  const el = chatMessagesEl;
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  if (nearBottom || chatMessagesEl.children.length <= 5) {
    el.scrollTop = el.scrollHeight;
  }
}

async function pushMessage(data) {
  if (!fbDB) { addMessageDOM(data); return true; }
  try {
    await fbDB.ref('chat/mensajes').push({ ...data, ts: firebase.database.ServerValue.TIMESTAMP });
    /* ── Auto-limpieza: eliminar mensajes con más de 7 días ── */
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    fbDB.ref('chat/mensajes').orderByChild('ts').endBefore(cutoff).limitToFirst(15)
      .once('value', snap => { snap.forEach(c => c.ref.remove()); });
    return true;
  } catch(e) {
    console.error('Error enviando mensaje:', e);
    toast('⚠️ Error al enviar. Revisa tu conexión.');
    return false;
  }
}

function openChat() {
  chatOpen = true;
  chatModal.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => { chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight; }, 350);
}
function closeChat() {
  chatOpen = false;
  chatModal.classList.remove('open');
  document.body.style.overflow = '';
}
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.ctab').forEach((el, i) => {
    const tabs = ['chat','cancion','dedica'];
    el.classList.toggle('active', tabs[i] === tab);
  });
  document.querySelectorAll('.form-tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
}

/* ── Límite de tasa para mensajes de chat: máx 1 mensaje cada 8s por usuario ── */
let _lastMsgTime = 0;
const CHAT_COOLDOWN_MS = 8000;
const MAX_MSGS_PER_SESSION = 40; /* máx 40 mensajes por sesión para anti-spam */
let _sessionMsgCount = 0;

async function sendChatMsg() {
  const now = Date.now();
  if (now - _lastMsgTime < CHAT_COOLDOWN_MS) {
    const wait = Math.ceil((CHAT_COOLDOWN_MS - (now - _lastMsgTime)) / 1000);
    toast(`⏳ Espera ${wait}s antes de enviar otro mensaje`);
    return;
  }
  if (_sessionMsgCount >= MAX_MSGS_PER_SESSION) {
    toast('⚠️ Límite de mensajes alcanzado por esta sesión');
    return;
  }
  const nombre = document.getElementById('chatNombre').value.trim() || 'Oyente';
  const ciudad = document.getElementById('chatCiudad').value.trim();
  const msg    = document.getElementById('chatMsg').value.trim();
  if (!msg) { toast('✏️ Escribe un mensaje primero'); return; }
  const btn = document.querySelector('#tab-chat .chat-send');
  btn.disabled = true; btn.textContent = 'Enviando...';
  const ok = await pushMessage({ nombre: escapeHTML(nombre), ciudad: escapeHTML(ciudad), texto: escapeHTML(msg), tipo: 'chat', esRadio: false });
  btn.disabled = false; btn.textContent = '📡 Enviar al aire';
  if (ok) {
    _lastMsgTime = Date.now();
    _sessionMsgCount++;
    document.getElementById('chatMsg').value = '';
    localStorage.setItem('chat_nombre', nombre);
    localStorage.setItem('chat_ciudad', ciudad);
    toast('📡 ¡Mensaje al aire!');
  }
}

async function sendCancion() {
  const now = Date.now();
  if (now - _lastMsgTime < CHAT_COOLDOWN_MS) {
    const wait = Math.ceil((CHAT_COOLDOWN_MS - (now - _lastMsgTime)) / 1000);
    toast(`⏳ Espera ${wait}s antes de enviar otra solicitud`);
    return;
  }
  if (_sessionMsgCount >= MAX_MSGS_PER_SESSION) {
    toast('⚠️ Límite de solicitudes alcanzado por esta sesión');
    return;
  }
  const nombre  = document.getElementById('cancionNombre').value.trim() || 'Oyente';
  const ciudad  = document.getElementById('cancionCiudad').value.trim();
  const cancion = document.getElementById('cancionTitulo').value.trim();
  if (!cancion) { toast('🎵 Escribe el nombre de la canción'); return; }
  const btn = document.querySelector('#tab-cancion .chat-send');
  btn.disabled = true; btn.textContent = 'Enviando...';
  const ok = await pushMessage({ nombre: escapeHTML(nombre), ciudad: escapeHTML(ciudad), texto: `Pide: <strong>${escapeHTML(cancion)}</strong>`, tipo: 'cancion', esRadio: false });
  btn.disabled = false; btn.textContent = '🎵 Pedir Canción';
  if (ok) {
    _lastMsgTime = Date.now();
    _sessionMsgCount++;
    document.getElementById('cancionTitulo').value = '';
    toast('🎵 ¡Solicitud enviada!');
    const wa = encodeURIComponent(`🎵 *Solicitud de canción — Dilson 101.9 FM*\n\n🎵 *Canción:* ${cancion}\n👤 *De:* ${nombre}\n📍 *Ciudad:* ${ciudad||'Bolivia'}`);
    setTimeout(() => window.open('https://wa.me/59172635314?text=' + wa, '_blank'), 500);
  }
}

async function sendDedicaChat() {
  const now = Date.now();
  if (now - _lastMsgTime < CHAT_COOLDOWN_MS) {
    const wait = Math.ceil((CHAT_COOLDOWN_MS - (now - _lastMsgTime)) / 1000);
    toast(`⏳ Espera ${wait}s antes de enviar otra dedicatoria`);
    return;
  }
  if (_sessionMsgCount >= MAX_MSGS_PER_SESSION) {
    toast('⚠️ Límite de dedicatorias alcanzado por esta sesión');
    return;
  }
  const de      = document.getElementById('dedicaDe').value.trim() || 'Un oyente';
  const para    = document.getElementById('dedicaPara').value.trim();
  const cancion = document.getElementById('dedicaCancion').value.trim();
  const mensaje = document.getElementById('dedicaMensaje').value.trim();
  if (!para && !mensaje) { toast('💌 Completa el destinatario o el mensaje'); return; }
  const btn = document.querySelector('#tab-dedica .chat-send');
  btn.disabled = true; btn.textContent = 'Enviando...';
  const textoHTML = [
    para    ? `<strong>Para:</strong> ${escapeHTML(para)}` : '',
    cancion ? `🎵 <em>${escapeHTML(cancion)}</em>` : '',
    mensaje ? escapeHTML(mensaje) : 'Con mucho cariño 💛'
  ].filter(Boolean).join('<br>');
  const ok = await pushMessage({ nombre: 'De: ' + escapeHTML(de), ciudad: '', texto: textoHTML, tipo: 'dedica', esRadio: false });
  btn.disabled = false; btn.textContent = '💌 Enviar Dedicatoria';
  if (ok) {
    _lastMsgTime = Date.now();
    _sessionMsgCount++;
    ['dedicaDe','dedicaPara','dedicaCancion','dedicaMensaje'].forEach(id => { document.getElementById(id).value = ''; });
    toast('💌 ¡Dedicatoria enviada al aire!');
    const wa = encodeURIComponent(`🎙️ *Dedicatoria — Dilson 101.9 FM!*\n\n👤 *Para:* ${para||'-'}\n💌 *De parte de:* ${de}\n🎵 *Canción:* ${cancion||'-'}\n💬 *Mensaje:* ${mensaje||'-'}\n\n📻 Los escucho en el 101.9 FM 🇧🇴`);
    setTimeout(() => window.open('https://wa.me/59172635314?text=' + wa, '_blank'), 500);
  }
}

/* ── Recuperar nombre/ciudad guardados ── */
window.addEventListener('load', () => {
  const n = localStorage.getItem('chat_nombre');
  const c = localStorage.getItem('chat_ciudad');
  if (n) ['chatNombre','cancionNombre','dedicaDe'].forEach(id => { const el = document.getElementById(id); if(el) el.value = n; });
  if (c) ['chatCiudad','cancionCiudad'].forEach(id => { const el = document.getElementById(id); if(el) el.value = c; });
});

/* ═══════════════════════════════════════════
   SISTEMA DE SONIDOS Y NOTIFICACIONES
   ═══════════════════════════════════════════ */
let audioCtx = null;
let soundEnabled = true;
let unreadCount  = 0;
let isFirstLoad  = true;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
document.addEventListener('click',      getAudioCtx, { once: true });
document.addEventListener('touchstart', getAudioCtx, { once: true });

function toggleSound() {
  soundEnabled = !soundEnabled;
  const icon   = document.getElementById('soundIcon');
  const toggle = document.getElementById('soundToggle');
  icon.textContent = soundEnabled ? '🔔' : '🔕';
  toggle.classList.toggle('muted', !soundEnabled);
  toast(soundEnabled ? '🔔 Sonido de notificaciones activado' : '🔕 Sonido de notificaciones desactivado');
}

function playSoundChat() {
  try {
    const ctx = getAudioCtx(), t = ctx.currentTime;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.12);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.start(t); osc.stop(t + 0.35);
  } catch(e) {}
}

function playSoundCancion() {
  try {
    const ctx = getAudioCtx();
    [[0,523,0.15],[0.13,659,0.13],[0.26,784,0.2]].forEach(([delay,freq,dur]) => {
      const t = ctx.currentTime + delay, osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0,t); gain.gain.linearRampToValueAtTime(0.2,t+0.01); gain.gain.exponentialRampToValueAtTime(0.001,t+dur);
      osc.start(t); osc.stop(t+dur);
    });
  } catch(e) {}
}

function playSoundDedica() {
  try {
    const ctx = getAudioCtx();
    [[0,1047,0.2],[0.1,1319,0.18],[0.2,1047,0.15],[0.32,1568,0.25]].forEach(([delay,freq,dur]) => {
      const t = ctx.currentTime + delay, osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0,t); gain.gain.linearRampToValueAtTime(0.14,t+0.01); gain.gain.exponentialRampToValueAtTime(0.001,t+dur);
      osc.start(t); osc.stop(t+dur);
    });
  } catch(e) {}
}

function playSoundConnect() {
  try {
    const ctx = getAudioCtx();
    [[0,392,0.12],[0.12,523,0.12],[0.24,659,0.2]].forEach(([delay,freq,dur]) => {
      const t = ctx.currentTime + delay, osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0,t); gain.gain.linearRampToValueAtTime(0.1,t+0.01); gain.gain.exponentialRampToValueAtTime(0.001,t+dur);
      osc.start(t); osc.stop(t+dur);
    });
  } catch(e) {}
}

function playNotifSound(tipo) {
  if (!soundEnabled) return;
  if (tipo === 'cancion') playSoundCancion();
  else if (tipo === 'dedica') playSoundDedica();
  else playSoundChat();
}

function incrementBadge() {
  unreadCount++;
  const badge = document.getElementById('fabBadge');
  badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
  badge.classList.add('show');
  if (navigator.vibrate) navigator.vibrate([40]);
  // App Badge API — muestra número rojo en el ícono de la app instalada (Chrome/Android)
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(unreadCount).catch(() => {});
  }
}
function clearBadge() {
  unreadCount = 0;
  const badge = document.getElementById('fabBadge');
  badge.classList.remove('show');
  badge.textContent = '';
  // Limpiar badge del ícono de la app
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {});
  }
}

function showNotifPopup(nombre, texto, tipo) {
  if (chatOpen) return;
  const icon = tipo === 'cancion' ? '🎵' : tipo === 'dedica' ? '💌' : '💬';
  const container = document.getElementById('notifPopup');
  while (container.children.length >= 2) container.removeChild(container.firstChild);
  const card = document.createElement('div');
  card.className = 'notif-card';
  card.setAttribute('role', 'alert');
  const textoLimpio = texto.replace(/<[^>]+>/g, '');
  card.innerHTML = `
    <div class="notif-icon" aria-hidden="true">${icon}</div>
    <div class="notif-body">
      <div class="notif-name">${nombre}</div>
      <div class="notif-text">${textoLimpio.slice(0,60)}${textoLimpio.length>60?'…':''}</div>
    </div>`;
  card.addEventListener('click', () => {
    openChat(); dismissNotif(card);
    if (tipo === 'cancion') switchTab('cancion');
    else if (tipo === 'dedica') switchTab('dedica');
  });
  container.appendChild(card);
  setTimeout(() => dismissNotif(card), 4000);
}

function dismissNotif(card) {
  if (!card.parentNode) return;
  card.classList.add('out');
  setTimeout(() => card.parentNode && card.parentNode.removeChild(card), 350);
}

const originalTitle = document.title;
function updateTitle() {
  document.title = (unreadCount > 0 && !chatOpen)
    ? `(${unreadCount}) ${originalTitle}`
    : originalTitle;
}

/* ── Sistema de callbacks unificado (reemplaza monkey-patching encadenado) ── */
const _msgCallbacks = [];
function onMessage(fn) { _msgCallbacks.push(fn); }

const _origAddMsg = addMessageDOM;
window.addMessageDOM = function(data) {
  _origAddMsg(data);
  _msgCallbacks.forEach(fn => fn(data));
};

/* Callback 1: sonidos y badge */
onMessage((data) => {
  if (isFirstLoad || data.esRadio) return;
  playNotifSound(data.tipo);
  if (!chatOpen) {
    incrementBadge();
    updateTitle();
    const nombreLimpio = data.nombre.replace(/<[^>]+>/g,'').replace(/^De:\s*/,'');
    showNotifPopup(nombreLimpio, data.texto, data.tipo);
  }
});

/* Callback 2: ticker en pantalla */
onMessage((data) => {
  if (isFirstLoad || data.esRadio) return;
  queueTicker(data.nombre, data.texto, data.tipo || 'chat');
});

setTimeout(() => { isFirstLoad = false; }, 2500);

const _origOpen = openChat;
window.openChat = function() {
  _origOpen();
  clearBadge();
  updateTitle();
};

const _origInitFirebase = initFirebase;
window.initFirebase = function() {
  _origInitFirebase();
  setTimeout(() => { if (soundEnabled) playSoundConnect(); }, 2800);
};

/* ══ TICKER DE MENSAJES EN PANTALLA ══ */
const tickerEl2   = document.getElementById('msgTicker');
const tickerQueue = [];
let   tickerBusy  = false;

function queueTicker(nombre, texto, tipo) {
  const textoLimpio = texto.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  if (!textoLimpio) return;
  tickerQueue.push({ nombre, texto: textoLimpio, tipo });
  if (!tickerBusy) showNextTicker();
}

function showNextTicker() {
  if (!tickerQueue.length) {
    tickerBusy = false;
    setTimeout(() => { if (!tickerQueue.length) tickerEl2.classList.remove('visible'); }, 500);
    return;
  }
  tickerBusy = true;
  tickerEl2.classList.add('visible');
  const { nombre, texto, tipo } = tickerQueue.shift();
  const icon      = tipo === 'cancion' ? '🎵' : tipo === 'dedica' ? '💌' : '💬';
  const nameClass = tipo === 'cancion' ? 'green' : tipo === 'dedica' ? 'pink' : '';
  const sep       = tipo === 'cancion' ? 'pide →' : tipo === 'dedica' ? 'dedica →' : 'dice →';
  const nombreLimpio = nombre.replace(/^De:\s*/i,'').slice(0,28);
  const div = document.createElement('div');
  div.className = `mtick tipo-${tipo}`;
  div.innerHTML = `
    <span class="mtick-icon" aria-hidden="true">${icon}</span>
    <div class="mtick-body">
      <span class="mtick-name ${nameClass}">${nombreLimpio}</span>
      <span class="mtick-sep">${sep}</span>
      <span class="mtick-text">${texto.slice(0, 120)}${texto.length > 120 ? '…' : ''}</span>
    </div>
    <button class="mtick-close" onclick="skipTicker(this)" aria-label="Cerrar notificación">✕</button>`;
  tickerEl2.innerHTML = '';
  tickerEl2.appendChild(div);
  requestAnimationFrame(() => { requestAnimationFrame(() => div.classList.add('enter')); });
  const visibleTime = Math.min(10000, 5500 + texto.length * 25);
  const timer = setTimeout(() => exitTicker(div), visibleTime);
  div._timer = timer;
}

function exitTicker(div) {
  if (!div.parentNode) return;
  div.classList.add('exit');
  setTimeout(() => {
    if (div.parentNode) div.parentNode.removeChild(div);
    setTimeout(showNextTicker, 400);
  }, 380);
}

function skipTicker(btn) {
  const div = btn.closest('.mtick');
  if (!div) return;
  clearTimeout(div._timer);
  exitTicker(div);
}
/* ══════════════════════════════════════════════════════════════════
   NIVEL 2 — FEATURE 1: REACCIONES EN VIVO
   ▸ Emojis flotan hacia arriba en pantalla para TODOS los oyentes
   ▸ Contadores en tiempo real vía Firebase
   ▸ Cooldown de 2s por reacción (anti-spam)
   ▸ Canvas animado que cubre toda la pantalla
   ══════════════════════════════════════════════════════════════════ */

const reactCanvas = document.getElementById('reactCanvas');
const rCtx = reactCanvas.getContext('2d');

/* Ajustar canvas al tamaño de pantalla */
function resizeReactCanvas() {
  reactCanvas.width  = window.innerWidth;
  reactCanvas.height = window.innerHeight;
}
resizeReactCanvas();
window.addEventListener('resize', resizeReactCanvas);

/* Partículas de emojis flotantes */
const floatingEmojis = [];
let emojiAnimRunning = false;

function startEmojiAnim() {
  if (emojiAnimRunning) return;
  emojiAnimRunning = true;
  animateFloatingEmojis();
}
function stopEmojiAnim() {
  emojiAnimRunning = false;
}

function spawnFloatingEmoji(emoji, startX) {
  const x = startX !== undefined
    ? startX
    : (window.innerWidth * 0.1 + Math.random() * window.innerWidth * 0.8);
  // Variantes de comportamiento para más dinamismo
  const variant = Math.random();
  floatingEmojis.push({
    emoji,
    x,
    y: window.innerHeight - 100,
    vy: -(3 + Math.random() * 3.5),          // más rápido hacia arriba
    vx: (Math.random() - 0.5) * 2.2,          // más amplitud lateral
    life: 1,
    decay: variant < 0.3
      ? 0.005 + Math.random() * 0.004          // algunos duran más
      : 0.009 + Math.random() * 0.007,
    size: 26 + Math.random() * 28,             // más variedad de tamaños
    scale: 0.2 + Math.random() * 0.8,          // arrancan pequeños y crecen
    scaleSpeed: 0.04 + Math.random() * 0.04,
    rotation: (Math.random() - 0.5) * 0.5,
    rotSpeed: (Math.random() - 0.5) * 0.06,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.05 + Math.random() * 0.06,
    wobbleAmp: 0.6 + Math.random() * 1.4,     // amplitud del vaivén
    glow: variant < 0.4,                       // algunos con glow extra
  });
}

function animateFloatingEmojis() {
  rCtx.clearRect(0, 0, reactCanvas.width, reactCanvas.height);
  for (let i = floatingEmojis.length - 1; i >= 0; i--) {
    const e = floatingEmojis[i];

    // Física de movimiento
    e.y       += e.vy;
    e.x       += e.vx + Math.sin(e.wobble) * (e.wobbleAmp || 0.8);
    e.wobble  += e.wobbleSpeed;
    e.rotation += e.rotSpeed;
    e.life    -= e.decay;

    // Scale-in al aparecer, luego normal
    if (e.scale < 1) e.scale = Math.min(1, e.scale + (e.scaleSpeed || 0.06));

    if (e.life <= 0) { floatingEmojis.splice(i, 1); continue; }

    // Alpha: fade-in rápido, fade-out gradual al final
    const alpha = e.life > 0.85
      ? Math.min(1, (1 - e.life) * 8)    // fade-in en primeros 15%
      : Math.min(1, e.life * 1.3);        // fade-out en últimos 23%

    const currentSize = e.size * e.scale;

    rCtx.save();
    rCtx.globalAlpha = alpha;
    rCtx.translate(e.x, e.y);
    rCtx.rotate(e.rotation);

    // Glow en algunos emojis
    if (e.glow) {
      rCtx.shadowColor = 'rgba(255,220,80,0.8)';
      rCtx.shadowBlur  = 20 * e.life;
    }

    rCtx.font = `${currentSize}px serif`;
    rCtx.textAlign = 'center';
    rCtx.textBaseline = 'middle';
    rCtx.fillText(e.emoji, 0, 0);
    rCtx.restore();
  }
  if (emojiAnimRunning) requestAnimationFrame(animateFloatingEmojis);
}
startEmojiAnim();

/* Mapa emoji → id de contador en Firebase y en DOM */
const REACTION_MAP = {
  '🔥': { id: 'fire',  dom: 'rc-fire'  },
  '❤️': { id: 'heart', dom: 'rc-heart' },
  '🎵': { id: 'music', dom: 'rc-music' },
  '💃': { id: 'dance', dom: 'rc-dance' },
  '😂': { id: 'laugh', dom: 'rc-laugh' },
  '👏': { id: 'clap',  dom: 'rc-clap'  },
};

/* Cooldown por emoji — evita spam */
const reactionCooldowns = {};
const REACTION_COOLDOWN_MS = 2000;

/* Contadores acumulados de hoy */
let reactionTotals = {};

function sendReaction(emoji) {
  const now = Date.now();
  if (reactionCooldowns[emoji] && now - reactionCooldowns[emoji] < REACTION_COOLDOWN_MS) return;
  reactionCooldowns[emoji] = now;

  /* Efecto visual local inmediato */
  const btn = document.querySelector(`.react-btn[data-emoji="${emoji}"]`);
  if (btn) {
    btn.classList.remove('fired', 'cooldown');
    void btn.offsetWidth; // force reflow
    btn.classList.add('fired');
    setTimeout(() => { btn.classList.remove('fired'); btn.classList.add('cooldown'); }, 350);
    setTimeout(() => btn.classList.remove('cooldown'), REACTION_COOLDOWN_MS);
  }

  /* Spawn emojis locales (3 en posiciones distintas) */
  const btnRect = btn?.getBoundingClientRect();
  const baseX = btnRect ? btnRect.left + btnRect.width / 2 : window.innerWidth / 2;
  for (let i = 0; i < 3; i++) {
    setTimeout(() => spawnFloatingEmoji(emoji, baseX + (Math.random()-0.5)*60), i * 80);
  }

  /* Vibración táctil */
  if (navigator.vibrate) navigator.vibrate(30);

  /* ✅ FIX: NO guardar contadores en Firebase — reacciones libres sin conteo */
  // Solo emitir el emoji flotante para que otros oyentes lo vean
  if (!fbDB) return;
  // Guardar solo el evento puntual (sin acumular), con TTL de 5 segundos
  fbDB.ref('reactions/live/' + _uid).set({
    emoji,
    ts: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    // Borrar automáticamente después de 5 segundos para que no se acumule
    setTimeout(() => {
      fbDB.ref('reactions/live/' + _uid).remove().catch(() => {});
    }, 5000);
  }).catch(() => {});
  // Incrementar contador diario para el mini bar (reactions/[fecha]/[id])
  const reactionId = REACTION_MAP[emoji]?.id;
  if (reactionId) {
    const today = new Date().toISOString().slice(0, 10);
    fbDB.ref(`reactions/${today}/${reactionId}`)
      .transaction(cur => (cur || 0) + 1)
      .catch(() => {});
  }
}

/* Escuchar reacciones de OTROS usuarios en tiempo real */
function initReactions() {
  if (!fbDB) return;

  /* ✅ FIX: Escuchar emojis en vivo de otros oyentes (sin contadores acumulados) */
  fbDB.ref('reactions/live').on('child_added', snap => {
    const d = snap.val();
    if (!d || !d.emoji) return;
    // No mostrar los propios (ya se muestran localmente)
    if (snap.key === _uid) return;
    // Solo mostrar si es reciente (menos de 10 segundos)
    const age = Date.now() - (d.ts || 0);
    if (age > 10000) return;
    // Spawn emojis flotantes para todos los que estén escuchando
    const x = window.innerWidth * (0.1 + Math.random() * 0.8);
    for (let i = 0; i < 3; i++) {
      setTimeout(() => spawnFloatingEmoji(d.emoji, x + (Math.random()-0.5)*80), i * 90);
    }
    // Pulso en el botón correspondiente
    const btn = document.querySelector(`.react-btn[data-emoji="${d.emoji}"]`);
    if (btn) {
      btn.classList.add('others-reacting');
      setTimeout(() => btn.classList.remove('others-reacting'), 600);
    }
  });

  // Ocultar contadores si existen en el DOM (limpieza visual)
  document.querySelectorAll('.react-count, #reactionsTotal').forEach(el => {
    el.style.display = 'none';
  });
}

/* ══════════════════════════════════════════════════════════════════
   NIVEL 2 — FEATURE 2: VOTACIÓN DE CANCIÓN EN TIEMPO REAL
   ▸ Aparece automáticamente cuando cambia la canción
   ▸ 👍/👎 sincronizados en Firebase para todos
   ▸ Barra de progreso visual en tiempo real
   ▸ Un voto por usuario por canción
   ══════════════════════════════════════════════════════════════════ */

let currentVoteSongKey = ''; // clave única de la canción votada
let userHasVoted = false;
let voteHideTimer = null;

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 60);
}

/* Mostrar tarjeta de votación cuando cambia canción */
function showVoteCard(songTitle) {
  clearTimeout(voteHideTimer);
  const card = document.getElementById('voteCard');
  const nameEl = document.getElementById('voteSongName');
  const resultEl = document.getElementById('voteResultMsg');
  if (!card) return;

  currentVoteSongKey = slugify(songTitle);
  userHasVoted = false;

  if (nameEl) nameEl.textContent = songTitle;
  if (resultEl) resultEl.textContent = '';

  /* Reset botones */
  document.getElementById('voteBtnYes')?.classList.remove('voted-yes');
  document.getElementById('voteBtnNo')?.classList.remove('voted-no');
  document.getElementById('votePctUp').textContent = '--%';
  document.getElementById('votePctDown').textContent = '--%';
  document.getElementById('voteTotalLabel').textContent = 'Sé el primero en votar';
  document.getElementById('voteBar').style.width = '50%';

  /* Mostrar */
  card.classList.add('visible');
  card.setAttribute('aria-hidden', 'false');

  /* Escuchar votos en tiempo real */
  listenVotes(currentVoteSongKey);

  /* Auto-ocultar después de 45 segundos si no votaron */
  voteHideTimer = setTimeout(() => {
    if (!userHasVoted) hideVoteCard();
  }, 45000);
}

function hideVoteCard() {
  const card = document.getElementById('voteCard');
  if (card) { card.classList.remove('visible'); card.setAttribute('aria-hidden', 'true'); }
}

function castVote(dir) {
  if (userHasVoted || !currentVoteSongKey || !fbDB) return;
  userHasVoted = true;
  clearTimeout(voteHideTimer);

  /* UI inmediata */
  document.getElementById('voteBtnYes')?.classList.toggle('voted-yes', dir === 'up');
  document.getElementById('voteBtnNo')?.classList.toggle('voted-no', dir === 'down');

  const msg = dir === 'up' ? '¡Gracias! Tu voto fue registrado 🎵' : '¡Gracias por tu opinión! 👊';
  const msgEl = document.getElementById('voteResultMsg');
  if (msgEl) msgEl.textContent = msg;

  /* Guardar en Firebase */
  fbDB.ref(`votes/${currentVoteSongKey}/${dir}`).transaction(v => (v || 0) + 1);

  /* Ocultar después de 6 segundos */
  voteHideTimer = setTimeout(hideVoteCard, 6000);

  /* Vibración */
  if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
}

function listenVotes(songKey) {
  if (!fbDB) return;
  /* Desvincular listener anterior */
  fbDB.ref(`votes/${songKey}`).on('value', snap => {
    const d = snap.val() || {};
    const up   = d.up   || 0;
    const down = d.down || 0;
    const total = up + down;
    if (total === 0) return;
    const pctUp   = Math.round((up   / total) * 100);
    const pctDown = Math.round((down / total) * 100);
    const upEl    = document.getElementById('votePctUp');
    const downEl  = document.getElementById('votePctDown');
    const barEl   = document.getElementById('voteBar');
    const totEl   = document.getElementById('voteTotalLabel');
    if (upEl)   upEl.textContent   = pctUp + '%';
    if (downEl) downEl.textContent = pctDown + '%';
    if (barEl)  barEl.style.width  = pctUp + '%';
    if (totEl)  totEl.textContent  = `${total} voto${total !== 1 ? 's' : ''} — ${up} 👍 · ${down} 👎`;
  });
}

/* initReactions e initMap ya están en initFirebase */

/* Votación activada desde addToHistory */

/* goLive map integration applied directly */

/* ═══════════════════════════════════════════════════════════════════════
   FEATURE 1 — CLIMA EXPANDIBLE CON PRONÓSTICO 3 DÍAS
   Usa la misma API open-meteo ya autorizada, sin costo extra.
   ═══════════════════════════════════════════════════════════════════════ */
let forecastOpen = false;
let forecastData = null;

async function fetchWeatherForecast() {
  try {
    const lat = _geoLat || -20.46;
    const lng = _geoLng || -63.66;
    const tz  = _geoAccurate ? 'auto' : 'America%2FLa_Paz';
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum` +
      `&timezone=${tz}&forecast_days=4`
    );
    const d = await r.json();
    forecastData = d.daily;
    renderForecast();
  } catch(e) {}
}

function renderForecast() {
  const grid = document.getElementById('forecastGrid');
  if (!grid || !forecastData) return;
  const codes = { 0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',61:'🌧️',71:'❄️',80:'🌧️',95:'⛈️' };
  const dias  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  // Saltamos hoy (índice 0), mostramos los próximos 3 días
  grid.innerHTML = forecastData.time.slice(1, 4).map((dateStr, i) => {
    const idx   = i + 1;
    const d     = new Date(dateStr + 'T12:00:00');
    const label = dias[d.getDay()];
    const code  = forecastData.weather_code[idx];
    const icon  = Object.entries(codes).reverse().find(([k]) => code >= +k)?.[1] ?? '🌡️';
    const max   = Math.round(forecastData.temperature_2m_max[idx]);
    const min   = Math.round(forecastData.temperature_2m_min[idx]);
    const rain  = forecastData.precipitation_sum[idx];
    return `
      <div class="forecast-day">
        <div class="fc-day">${label}</div>
        <div class="fc-icon">${icon}</div>
        <div class="fc-temps"><span class="fc-max">${max}°</span><span class="fc-min">${min}°</span></div>
        ${rain > 0 ? `<div class="fc-rain">💧${rain}mm</div>` : ''}
      </div>`;
  }).join('');
}

function toggleWeatherForecast() {
  forecastOpen = !forecastOpen;
  const panel = document.getElementById('weatherForecast');
  const btn   = document.getElementById('weatherToggleBtn');
  if (panel) {
    panel.classList.toggle('open', forecastOpen);
    panel.setAttribute('aria-hidden', String(!forecastOpen));
  }
  if (btn) btn.textContent = forecastOpen ? '▲ Cerrar' : '▼ 3 días';
  if (forecastOpen && !forecastData) fetchWeatherForecast();
}

/* ═══════════════════════════════════════════════════════════════════════
   FEATURE 2 — CONTADOR REACCIONES SIEMPRE VISIBLE
   Se actualiza junto con el panel de reacciones existente.
   ═══════════════════════════════════════════════════════════════════════ */
function updateReactionsMiniBar(totals, total) {
  const miniTotal = document.getElementById('reactionsMiniTotal');
  const miniTop   = document.getElementById('reactionsMiniTop');
  if (miniTotal) miniTotal.textContent = `${total.toLocaleString()} reacciones hoy`;
  if (miniTop && totals) {
    // Encontrar el emoji más reaccionado hoy
    const best = Object.entries(REACTION_MAP).reduce((best, [emoji, info]) => {
      const cnt = totals[info.id] || 0;
      return cnt > (best.cnt || 0) ? { emoji, cnt } : best;
    }, {});
    miniTop.textContent = best.cnt > 0 ? `${best.emoji} ×${best.cnt}` : '';
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   FEATURE 3 — BUSCAR CANCIÓN EN SPOTIFY / YOUTUBE
   Cuando hay una canción activa muestra el botón 🔍 en la song-card.
   Al tocar, abre un mini modal con links a ambas plataformas.
   ═══════════════════════════════════════════════════════════════════════ */
function searchSongOnStreaming() {
  if (!currentSongTitle && !currentSongArtist) return;
  const query = encodeURIComponent(`${currentSongArtist} ${currentSongTitle}`.trim());
  const spotifyUrl = `https://open.spotify.com/search/${query}`;
  const youtubeUrl = `https://music.youtube.com/search?q=${query}`;
  const ytUrl      = `https://www.youtube.com/results?search_query=${query}`;

  // Modal ligero inline
  const existing = document.getElementById('streamSearchModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'streamSearchModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Buscar canción en streaming');
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9200;display:flex;align-items:flex-end;
    background:rgba(0,0,0,0.65);backdrop-filter:blur(8px);
  `;
  modal.innerHTML = `
    <div style="width:100%;background:var(--bg2);border-radius:20px 20px 0 0;padding:20px 16px 32px;
                box-shadow:0 -8px 40px rgba(0,0,0,0.5);animation:slideUp .28s ease;">
      <div style="width:40px;height:4px;background:rgba(255,255,255,0.15);border-radius:99px;margin:0 auto 16px;"></div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:.1em;color:var(--gold);margin-bottom:4px;">🔍 BUSCAR EN STREAMING</div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:0.72rem;color:var(--muted);margin-bottom:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${escHtml(currentSongTitle)} — ${escHtml(currentSongArtist)}
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <a href="${spotifyUrl}" target="_blank" rel="noopener"
           style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-radius:12px;
                  background:rgba(29,185,84,0.12);border:1px solid rgba(29,185,84,0.3);
                  color:#1db954;font-family:'Space Grotesk',sans-serif;font-size:0.85rem;font-weight:600;text-decoration:none;">
          <span style="font-size:1.4rem;">🎧</span> Buscar en Spotify
        </a>
        <a href="${youtubeUrl}" target="_blank" rel="noopener"
           style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-radius:12px;
                  background:rgba(255,0,0,0.10);border:1px solid rgba(255,0,0,0.25);
                  color:#ff4444;font-family:'Space Grotesk',sans-serif;font-size:0.85rem;font-weight:600;text-decoration:none;">
          <span style="font-size:1.4rem;">🎵</span> Buscar en YouTube Music
        </a>
        <a href="${ytUrl}" target="_blank" rel="noopener"
           style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-radius:12px;
                  background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                  color:var(--text);font-family:'Space Grotesk',sans-serif;font-size:0.85rem;font-weight:600;text-decoration:none;">
          <span style="font-size:1.4rem;">▶️</span> Buscar en YouTube
        </a>
      </div>
      <button onclick="document.getElementById('streamSearchModal').remove()"
              style="margin-top:16px;width:100%;padding:11px;border:1px solid rgba(255,255,255,0.1);
                     border-radius:10px;background:transparent;color:var(--muted);
                     font-family:'Space Grotesk',sans-serif;font-size:0.8rem;cursor:pointer;">
        Cerrar
      </button>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

/* Mostrar/ocultar botón de streaming según si hay canción */
function updateStreamSearchBtn() {
  const btn = document.getElementById('streamSearchBtn');
  if (!btn) return;
  btn.style.display = (currentSongTitle && currentSongTitle !== 'Dilson 101.9 FM' && playing) ? 'flex' : 'none';
}

/* Hook into setSong to show/hide button */
const _origSetSongForSearch = window.setSong || setSong;
window.setSong = function(t, a, ic, live, meta) {
  _origSetSongForSearch(t, a, ic, live, meta);
  setTimeout(updateStreamSearchBtn, 100);
};

/* ═══════════════════════════════════════════════════════════════════════
   FEATURE 4 — NOTIFICACIONES PUSH (Web Notifications API)
   Sin backend propio: usa las Notifications del navegador para avisar
   cuando cambia la canción o empieza un programa especial.
   ═══════════════════════════════════════════════════════════════════════ */
let pushEnabled = localStorage.getItem('dilson_push') === 'on';

function updatePushBtn() {
  const btn   = document.getElementById('notifPermBtn');
  const icon  = document.getElementById('notifBtnIcon');
  const label = document.getElementById('notifBtnLabel');
  const sub   = document.getElementById('notifBtnSub');
  if (!btn) return;
  if (pushEnabled && Notification.permission === 'granted') {
    if (icon)  icon.textContent  = '🔔';
    if (label) label.textContent = 'Notificando';
    if (sub)   sub.textContent   = 'Toca para desactivar';
    btn.style.borderColor = 'rgba(0,255,150,0.4)';
  } else {
    if (icon)  icon.textContent  = '🔕';
    if (label) label.textContent = 'Notificaciones';
    if (sub)   sub.textContent   = 'Activar avisos';
    btn.style.borderColor = '';
  }
}

async function requestPushNotifications() {
  if (!('Notification' in window)) {
    toast('⚠️ Tu navegador no soporta notificaciones'); return;
  }
  if (pushEnabled && Notification.permission === 'granted') {
    pushEnabled = false;
    localStorage.setItem('dilson_push', 'off');
    updatePushBtn();
    toast('🔕 Notificaciones desactivadas');
    return;
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      pushEnabled = true;
      localStorage.setItem('dilson_push', 'on');
      updatePushBtn();
      toast('🔔 ¡Notificaciones activadas!');
      // Notificación de bienvenida
      new Notification('🎙️ Dilson 101.9 FM', {
        body: '¡Listo! Te avisaremos cuando cambie la canción.',
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: 'dilson-welcome'
      });
    } else {
      toast('⚠️ Permiso denegado. Actívalo en la configuración del navegador.');
    }
  } catch(e) { toast('⚠️ No se pudo activar notificaciones'); }
}

function sendPushNotification(title, body, tag) {
  if (!pushEnabled || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: tag || 'dilson-notif',
      silent: false
    });
  } catch(e) {}
}

// Inicializar estado del botón
updatePushBtn();

/* ═══════════════════════════════════════════════════════════════════════
   FEATURE 5 — RANKING TOP CANCIONES MÁS PEDIDAS
   Lee los mensajes de tipo 'cancion' de Firebase y compila el top 5.
   Se actualiza en tiempo real. Se muestra en una tarjeta debajo del
   historial.
   ═══════════════════════════════════════════════════════════════════════ */
let songRankingMap = {}; // titulo → count

function initSongRanking() {
  if (!fbDB) return;
  // Escuchar las solicitudes de canciones en tiempo real
  fbDB.ref('chat/mensajes').orderByChild('tipo').equalTo('cancion')
    .limitToLast(200)
    .on('value', snap => {
      songRankingMap = {};
      snap.forEach(child => {
        const d = child.val();
        // Extraer nombre de canción del texto (formato: "Pide: <strong>CANCIÓN</strong>")
        const match = d.texto && d.texto.match(/Pide:\s*<strong>([^<]+)<\/strong>/i);
        if (match) {
          const song = match[1].trim();
          songRankingMap[song] = (songRankingMap[song] || 0) + 1;
        }
      });
      renderSongRanking();
    });
}

function renderSongRanking() {
  const list = document.getElementById('rankingList');
  if (!list) return;
  const panel = document.getElementById('rankingPanel');
  const sorted = Object.entries(songRankingMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  /* Sin canciones pedidas no se muestra la tarjeta: antes ocupaba sitio con
     un recuadro que solo decía "sé el primero en pedir". Aparece sola en
     cuanto hay el primer pedido. */
  if (sorted.length === 0) {
    list.innerHTML = '<div class="ranking-empty">Sé el primero en pedir 🎵</div>';
    if (panel) panel.style.display = 'none';
    return;
  }
  if (panel) panel.style.display = '';

  /* Los tres primeros llevan medalla; del cuarto en adelante un número, que
     se ve mucho mejor que los emojis 4️⃣ y 5️⃣ (que cambian de forma según
     el teléfono y descuadran la fila). */
  const medals = ['🥇', '🥈', '🥉', '4', '5'];
  list.innerHTML = sorted.map(([song, count], i) => `
    <div class="ranking-item" style="animation-delay:${i * 0.06}s">
      <span class="rank-medal">${medals[i]}</span>
      <div class="rank-info">
        <div class="rank-song">${escHtml(song.slice(0, 32))}${song.length > 32 ? '…' : ''}</div>
        <div class="rank-bar-wrap"><div class="rank-bar" style="width:${Math.round((count / sorted[0][1]) * 100)}%"></div></div>
      </div>
      <span class="rank-count">${count}×</span>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════════════════════════════
   FEATURE 6 — APP SHORTCUTS (ya está en manifest.json)
   Manejar los parámetros URL para autoplay y acciones directas cuando
   el usuario abre desde un shortcut del ícono.
   ═══════════════════════════════════════════════════════════════════════ */
(function handleAppShortcuts() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  const autoplay = params.get('autoplay');

  if (autoplay === '1') {
    // Guardar flag para que setupAutoplay lo tome
    sessionStorage.setItem('dilson_played', '1');
  }

  if (action === 'dedica') {
    window.addEventListener('load', () => {
      setTimeout(() => { openChat(); switchTab('dedica'); }, 2800);
    });
  } else if (action === 'cancion') {
    window.addEventListener('load', () => {
      setTimeout(() => { openChat(); switchTab('cancion'); }, 2800);
    });
  }
})();

/* ═══════════════════════════════════════════════════════════════════════
   FEATURE 7 — DJ / LOCUTOR EN TURNO
   Asocia cada programa con nombre, emoji-avatar y una foto opcional.
   Muestra el locutor actual y el siguiente programa con cuenta regresiva.
   ═══════════════════════════════════════════════════════════════════════ */
/* La tarjeta del locutor usa LA MISMA lista de programas que el resto
   (SCHED, que viene de config/schedule y se puede editar desde el panel
   de administración). Antes tenía su propia lista con nombres inventados
   ("Locutor Mañana", "DJ Tarde", "DJ Noche"...) que no había forma de
   cambiar desde el panel y que contradecían al rótulo de arriba. */
function updateDjCard() {
  const h = new Date().getHours();
  let curIdx = SCHED.length - 1;
  SCHED.forEach((s, i) => {
    if (s.h === 0) { if (h < 6) curIdx = i; }
    else if (h >= s.h) curIdx = i;
  });
  const cur  = SCHED[curIdx];
  const next = SCHED[(curIdx + 1) % SCHED.length];

  const avatarEl  = document.getElementById('djAvatar');
  const nameEl    = document.getElementById('djName');
  const programEl = document.getElementById('djProgram');
  const nextEl    = document.getElementById('djNextName');

  /* El horario se calcula desde la propia lista, así nunca se descuadra */
  const desde = String(cur.h).padStart(2, '0') + ':00';
  const hasta = String(next.h).padStart(2, '0') + ':00';

  if (avatarEl)  avatarEl.textContent  = cur.icon || '🎙️';
  if (nameEl)    nameEl.textContent    = cur.name;
  if (programEl) programEl.textContent = desde + ' – ' + hasta + ' · Dilson 101.9 FM';
  if (nextEl)    nextEl.textContent    = (next.icon || '') + ' ' + next.name;
}

updateDjCard();
setInterval(updateDjCard, 60000);

/* ═══════════════════════════════════════════════════════════════════════
   HOOKS: conectar features nuevos con sistemas existentes
   ═══════════════════════════════════════════════════════════════════════ */

/* Hook reactions → update mini bar
   Patch initReactions to also call updateReactionsMiniBar.
   We do this by wrapping the existing Firebase 'value' handler output. */
const _origInitReactions = initReactions;
window.initReactions = function() {
  if (typeof _origInitReactions === 'function') _origInitReactions();
  // Attach a separate lightweight listener for the mini bar only
  if (!fbDB) return;
  const today = new Date().toISOString().slice(0, 10);
  fbDB.ref(`reactions/${today}`).on('value', snap => {
    const data = snap.val() || {};
    let total = 0;
    const totals = {};
    Object.entries(REACTION_MAP).forEach(([, info]) => {
      const count = data[info.id] || 0;
      total += count;
      totals[info.id] = count;
    });
    updateReactionsMiniBar(totals, total);
  });
};

/* Hook song change → push notification + show streaming search btn */
onMessage((data) => {
  // When a new song is detected (song card updated), fire push notif
  // We hook via the setSong override instead
});
// Hook into fetchRadioStatus song change detection
const _origShowNewSongToast = showNewSongToast;
window.showNewSongToast = function(icon, song, artist) {
  _origShowNewSongToast(icon, song, artist);
  sendPushNotification(
    `🎵 ${icon} ${song}`,
    `${artist} · Dilson 101.9 FM`,
    'dilson-song'
  );
  updateStreamSearchBtn();
};

/* Hook Firebase init → start ranking + reactions mini bar */
const _origInitFirebaseFeats = window.initFirebase;
window.initFirebase = function() {
  if (typeof _origInitFirebaseFeats === 'function') _origInitFirebaseFeats();
  // Start song ranking listener
  setTimeout(initSongRanking, 500);
  // Iniciar feed de comunicados (espera a que fbDB esté listo)
  setTimeout(initComunicados, 600);
  // Escuchar señales push del admin
  setTimeout(listenPushSignals, 800);
};

/* Notificación cuando empieza un programa nuevo (cada hora, si el oyente
   tiene las notificaciones activadas).
   Usa la MISMA lista de programas que el resto de la aplicación (SCHED):
   antes tiraba de DJ_SCHEDULE, la lista de nombres inventados. */
(function scheduleProgNotifs() {
  const ahora = new Date();
  const msHastaLaProximaHora = (60 - ahora.getMinutes()) * 60000 - ahora.getSeconds() * 1000;

  /* Programa que empieza exactamente a esa hora, o null si no hay ninguno */
  function programaQueEmpiezaA(hora) {
    return SCHED.find(p => p.h === hora) || null;
  }

  setTimeout(() => {
    updateDjCard();
    const prog = programaQueEmpiezaA(new Date().getHours());
    if (prog) {
      sendPushNotification(
        `📻 ${prog.icon || '🎙️'} Dilson 101.9 FM`,
        `¡Empieza ahora: ${prog.name}!`,
        'dilson-program'
      );
    }
    setInterval(() => {
      updateDjCard();
      const hh = new Date().getHours();
      if (new Date().getMinutes() === 0) {
        const p = programaQueEmpiezaA(hh);
        if (p) {
          sendPushNotification(`📻 ${p.icon || '🎙️'} Dilson 101.9 FM`, `¡Empieza: ${p.name}!`, 'dilson-program');
        }
      }
    }, 60000);
  }, msHastaLaProximaHora);
})();


/* ═══════════════════════════════════════════════════════════════════════
   MEJORAS VISUALES JS — Efectos interactivos premium
   ═══════════════════════════════════════════════════════════════════════ */

/* ── 1. Play button ripple effect ── */
document.addEventListener('DOMContentLoaded', () => {
  const playBtn = document.getElementById('playBtn');
  if (playBtn) {
    playBtn.addEventListener('pointerdown', () => {
      const ripple = document.createElement('span');
      ripple.className = 'play-ripple';
      playBtn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }

  /* ── 2. Volume icon reacts to volume level ── */
  const volSlider = document.getElementById('volSlider');
  const volIcon   = document.querySelector('.vol-icon');
  if (volSlider && volIcon) {
    const updateVolIcon = () => {
      const v = parseInt(volSlider.value);
      volIcon.textContent = v === 0 ? '🔇' : v < 40 ? '🔈' : v < 75 ? '🔉' : '🔊';
      volIcon.classList.toggle('loud', v > 80);
    };
    volSlider.addEventListener('input', updateVolIcon);
    updateVolIcon();
  }

  /* ── 3. Highlight active stat (status) ── */
  const statSt = document.getElementById('statSt');
  if (statSt) {
    const obs = new MutationObserver(() => {
      const isLive = statSt.textContent.includes('VIVO') || statSt.textContent.includes('EN VIVO');
      statSt.classList.toggle('live-status', isLive);
    });
    obs.observe(statSt, { childList: true, characterData: true, subtree: true });
  }



  /* ── 5. Logo wrap playing ring ── */
  const logoWrap = document.getElementById('logoWrapEl');
  if (logoWrap) {
    const logoObs = new MutationObserver(() => {
      const logoRing = document.getElementById('logoRing');
      const isPlaying = logoRing && logoRing.classList.contains('active');
      logoWrap.classList.toggle('playing-ring', isPlaying);
      // Also pulse ring inner
      if (logoRing) logoRing.classList.toggle('pulsing', isPlaying);
    });
    const logoRing = document.getElementById('logoRing');
    if (logoRing) logoObs.observe(logoRing, { attributes: true, attributeFilter: ['class'] });
  }

  /* ── 6. Player card glow when playing ── */
  const pcard = document.querySelector('.pcard');
  const playBtnEl = document.getElementById('playBtn');
  if (pcard && playBtnEl) {
    const pcardObs = new MutationObserver(() => {
      const isPlaying = playBtnEl.classList.contains('reproduciendo');
      pcard.classList.toggle('playing-glow', isPlaying);
    });
    pcardObs.observe(playBtnEl, { attributes: true, attributeFilter: ['class'] });
  }

  /* ── 7. Song card live accent bar ── */
  const songBadge = document.getElementById('songBadge');
  const songCard  = document.querySelector('.song-card');
  if (songBadge && songCard) {
    const scObs = new MutationObserver(() => {
      songCard.classList.toggle('live-now', songBadge.classList.contains('live'));
    });
    scObs.observe(songBadge, { attributes: true, attributeFilter: ['class'] });
  }

  /* ── 8. Reactions mini bar pop on update ── */
  const miniBar = document.getElementById('reactionsMiniBar');
  if (miniBar) {
    const miniObs = new MutationObserver(() => {
      miniBar.classList.remove('pop');
      void miniBar.offsetWidth;
      miniBar.classList.add('pop');
    });
    const miniTotal = document.getElementById('reactionsMiniTotal');
    if (miniTotal) miniObs.observe(miniTotal, { childList: true, characterData: true, subtree: true });
  }

  /* ── 9. Smooth scroll on section anchor clicks ── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  /* ── 10. Secciones visibles inmediatamente (sin animación de entrada escalonada) ── */
  document.querySelectorAll('.s1,.s2,.s3,.s4,.s5,.s6,.s7,.dj-card,.weather-card,.reactions-mini-bar,.ranking-panel').forEach(el => {
    el.style.animationPlayState = 'running';
    el.style.opacity = '1';
    el.style.transform = 'none';
  });

  /* ── 11. Haptic feedback on key interactions ── */
  const hapticEls = document.querySelectorAll('.btn-play, .react-btn, .vote-btn');
  hapticEls.forEach(el => {
    el.addEventListener('pointerdown', () => {
      if (navigator.vibrate) navigator.vibrate(12);
    });
  });

  /* ── 12. Auto-hide install banner after 12s with fade ── */
  const banner = document.getElementById('installBanner');
  if (banner) {
    const bannerObs = new MutationObserver(() => {
      if (banner.classList.contains('show')) {
        setTimeout(() => {
          banner.style.transition = 'opacity 0.8s ease';
          banner.style.opacity = '0';
          setTimeout(() => {
            banner.classList.remove('show');
            banner.style.opacity = '';
          }, 800);
        }, 14000);
        bannerObs.disconnect();
      }
    });
    bannerObs.observe(banner, { attributes: true, attributeFilter: ['class'] });
  }
});

/*
──────────────────────────────────────────
  COMUNICADOS PÚBLICOS — app.js snippet
──────────────────────────────────────────
Instrucciones:
1. Asegúrate de que Firebase Database ya esté inicializado en tu app.js
   (busca el lugar donde haces firebase.initializeApp o where you reference db)
2. Pega TODO el bloque de abajo al final de app.js
──────────────────────────────────────────
*/

/* ═══════════════════════════════════════════════════════════════
   COMUNICADOS DEL PUEBLO — Feed público en tiempo real
   Lee de Firebase Realtime DB → /comunicados
   ═══════════════════════════════════════════════════════════════ */

/* ── helpers locales ── */
function _escH(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Estado del slider ── */
let _comSlides = [];
let _comIndex  = 0;
let _comAuto   = null;

/* ── Banner de alerta flotante ── */
let _cabTimer = null;
function showCabBanner(c) {
  const isPrio = c.prioridad === 'urgente' || c.prioridad === 'importante';
  if (!isPrio) return;
  const banner = document.getElementById('comAlertBanner');
  if (!banner) return;
  const emoji  = c.prioridad === 'urgente' ? '🔴' : '🟡';
  const label  = c.prioridad === 'urgente' ? '🔴 URGENTE' : '🟡 IMPORTANTE';
  document.getElementById('cabEmoji').textContent  = emoji;
  document.getElementById('cabLabel').textContent  = label;
  document.getElementById('cabTitle').textContent  = c.titulo;
  banner.style.display = 'block';
  requestAnimationFrame(() => banner.classList.add('show'));
  clearTimeout(_cabTimer);
  _cabTimer = setTimeout(() => closeCabBanner(), 9000);
  if (navigator.vibrate) navigator.vibrate(c.prioridad === 'urgente' ? [200,80,200,80,300] : [150,80,150]);
}
window.closeCabBanner = function() {
  const banner = document.getElementById('comAlertBanner');
  if (!banner) return;
  banner.classList.remove('show');
  setTimeout(() => banner.style.display = 'none', 450);
};

/* ── Swipe táctil para móvil ── */
(function() {
  let _tx = 0;
  document.addEventListener('touchstart', e => {
    const wrap = e.target.closest('.com-slider-wrap');
    if (wrap) _tx = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const wrap = e.target.closest('.com-slider-wrap');
    if (!wrap) return;
    const dx = e.changedTouches[0].clientX - _tx;
    if (Math.abs(dx) > 40) window.comSlide(dx < 0 ? 1 : -1);
  }, { passive: true });
})();

/* ── Navegar el slider ── */
window.comSlide = function(dir) {
  if (_comSlides.length < 2) return;
  _comIndex = (_comIndex + dir + _comSlides.length) % _comSlides.length;
  _applySlide();
  _resetAuto();
};
function _applySlide() {
  const el = document.getElementById('comSlider');
  if (el) el.style.transform = `translateX(-${_comIndex * 100}%)`;
  _updateDots();
}
function _updateDots() {
  document.querySelectorAll('.cs-dot').forEach((d, i) => d.classList.toggle('active', i === _comIndex));
}
function _resetAuto() {
  clearInterval(_comAuto);
  if (_comSlides.length > 1) _comAuto = setInterval(() => { _comIndex = (_comIndex + 1) % _comSlides.length; _applySlide(); }, 8000);
}

/* ── Construir un slide ── */
function _buildSlide(c, idx) {
  const pLabels = { urgente: '🔴 URGENTE', importante: '🟡 IMPORTANTE', info: '🟢 INFO' };
  const fecha = new Date(c.ts).toLocaleString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  const esLargo = c.cuerpo && c.cuerpo.length > 160;
  const bodyId  = 'csBody_' + c.id;
  const expId   = 'csExp_'  + c.id;

  /* Imagen con botón de descarga */
  const imgHtml = c.fileURL && c.fileType === 'image' ? `
    <div class="cs-img-wrap">
      <img src="${_escH(c.fileURL)}" alt="${_escH(c.titulo)}" loading="lazy" onerror="this.parentElement.style.display='none'">
    </div>` : '';

  /* Botones del footer */
  const verBtn = c.fileURL ? `
    <a class="cs-btn" href="${_escH(c.fileURL)}" target="_blank" rel="noopener">
      ${c.fileType === 'image' ? '🖼️ Ver imagen' : '📄 Ver archivo'}
    </a>` : '';

  const dlBtn = c.fileURL && c.fileType === 'image' ? `
    <button class="cs-btn dl" onclick="comDownload('${_escH(c.fileURL)}','${_escH(c.titulo)}')">
      ⬇️ Descargar
    </button>` : '';

  const expandBtn = esLargo ? `
    <button class="cs-expand-btn" id="${expId}" onclick="comToggleBody('${bodyId}','${expId}')">+ Leer más</button>` : '';

  const counter = `<span class="cs-counter">${idx + 1} / ${_comSlides.length}</span>`;

  return `
    <div class="com-slide ${_escH(c.prioridad || 'info')}" id="cs_${_escH(c.id)}">
      ${imgHtml}
      <div class="cs-body">
        <div class="cs-top">
          <span class="cs-prio ${_escH(c.prioridad)}">${pLabels[c.prioridad] || 'INFO'}</span>
          <span class="cs-date">📅 ${fecha}</span>
        </div>
        <div class="cs-titulo">${_escH(c.titulo)}</div>
        <div class="cs-cuerpo${esLargo ? ' collapsed' : ''}" id="${bodyId}">${_escH(c.cuerpo)}</div>
        <div class="cs-footer">
          ${expandBtn}
          ${verBtn}
          ${dlBtn}
          ${counter}
        </div>
      </div>
    </div>`;
}

/* ── Descargar imagen de comunicado (con verificación de almacenamiento) ── */
window.comDownload = async function(url, nombre) {
  // Verificar/solicitar permiso de almacenamiento antes de descargar
  if ('storage' in navigator && 'persist' in navigator.storage) {
    const persisted = await navigator.storage.persisted().catch(() => false);
    if (!persisted) {
      // Solicitar persistencia silenciosamente
      navigator.storage.persist().catch(() => {});
    }
  }
  try {
    toast('📥 Preparando descarga...');
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const blob = await resp.blob();
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = (nombre || 'comunicado').replace(/[^a-z0-9áéíóúñ ]/gi,'_') + '.jpg';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
    toast('✅ Comunicado descargado');
  } catch(e) {
    /* fallback: abrir en tab */
    window.open(url, '_blank');
    toast('🖼️ Imagen abierta en nueva pestaña');
  }
};

/* ── Expandir/colapsar cuerpo ── */
window.comToggleBody = function(bodyId, btnId) {
  const body = document.getElementById(bodyId);
  const btn  = document.getElementById(btnId);
  if (!body) return;
  const collapsed = body.classList.toggle('collapsed');
  if (btn) btn.textContent = collapsed ? '+ Leer más' : '— Leer menos';
};

function initComunicados() {
  const comRef = fbDB ? fbDB.ref('comunicados') : null;
  if (!comRef) return;

  const sliderEl  = document.getElementById('comSlider');
  const navEl     = document.getElementById('comSliderNav');
  const dotsEl    = document.getElementById('csDots');
  const badgeEl   = document.getElementById('comBadge');
  if (!sliderEl) return;

  let lastTs    = Date.now();
  let firstLoad = true;

  comRef.orderByChild('ts').on('value', snap => {
    const list = [];
    snap.forEach(c => list.push(c.val()));
    list.sort((a, b) => b.ts - a.ts); // más reciente primero

    /* ── Detectar nuevo ── */
    if (!firstLoad && list.length > 0) {
      const newest = list[0];
      if (newest.ts > lastTs) {
        badgeEl && (badgeEl.style.display = 'inline-flex');
        const emoji = newest.prioridad === 'urgente' ? '🔴' : newest.prioridad === 'importante' ? '🟡' : '🟢';
        toast(`${emoji} Nuevo comunicado: ${newest.titulo}`);
        showCabBanner(newest);
        pushComNotif(newest); // Push notification nativa
        /* Saltar al slide del nuevo comunicado */
        _comIndex = 0;
      }
    }
    firstLoad = false;
    if (list.length > 0) lastTs = list[0].ts;

    _comSlides = list;

    /* ── Renderizar slides ── */
    if (list.length === 0) {
      sliderEl.innerHTML = '<div class="com-empty-slide">📡 Sin comunicados activos</div>';
      navEl && (navEl.style.display = 'none');
      /* Sin comunicados no se muestra la sección: ocupaba sitio arriba del
         reproductor para no decir nada. Reaparece sola en cuanto el locutor
         publique el primero. */
      const secVacia = document.getElementById('secComunicados');
      if (secVacia) secVacia.style.display = 'none';
      return;
    }

    /* Hay comunicados: garantizar que la sección se vea (pudo ocultarse
       antes, cuando la lista estaba vacía). */
    const secConDatos = document.getElementById('secComunicados');
    if (secConDatos) secConDatos.style.display = '';

    sliderEl.innerHTML = list.map((c, i) => _buildSlide(c, i)).join('');

    /* ── Dots ── */
    if (dotsEl) {
      dotsEl.innerHTML = list.map((_, i) =>
        `<div class="cs-dot${i === _comIndex ? ' active' : ''}" onclick="comSlide(${i - _comIndex})"></div>`
      ).join('');
    }

    /* ── Mostrar nav solo si hay más de 1 ── */
    navEl && (navEl.style.display = list.length > 1 ? 'flex' : 'none');

    /* ── Aplicar posición actual y autoplay ── */
    _comIndex = Math.min(_comIndex, list.length - 1);
    _applySlide();
    clearInterval(_comAuto);
    if (list.length > 1) _comAuto = setInterval(() => { _comIndex = (_comIndex + 1) % _comSlides.length; _applySlide(); }, 8000);
  });
}

/* ═══════════════════════════════════════════════════════════════
   PANEL LATERAL — FEED EN VIVO
   Comunicados con reacciones por publicación,
   Chat visible, Dedicatorias, Contadores globales del día
   ═══════════════════════════════════════════════════════════════ */

/* ── Estado del panel ── */
let liveFeedOpen = false;
let _lfpActiveTab = 'comunicados';
let _lfpChatUnread = 0;

/* ── Abrir / cerrar ── */
function toggleLiveFeed() {
  liveFeedOpen ? closeLiveFeed() : openLiveFeed();
}

function openLiveFeed() {
  liveFeedOpen = true;
  const panel = document.getElementById('liveFeedPanel');
  const btn   = document.getElementById('liveFeedBtn');
  if (panel) panel.classList.add('open');
  if (btn)   btn.classList.add('panel-open');
  document.body.style.overflow = 'hidden';
  // Limpiar badge del trigger
  const badge = document.getElementById('liveFeedBadge');
  if (badge) badge.classList.remove('show');
  // Limpiar badge del tab chat si está activo
  if (_lfpActiveTab === 'chat') _clearLfpChatBadge();
  // Scroll al fondo de los feeds
  setTimeout(() => {
    const cl = document.getElementById('lfpChatList');
    const dl = document.getElementById('lfpDedicaList');
    if (cl) cl.scrollTop = cl.scrollHeight;
    if (dl) dl.scrollTop = dl.scrollHeight;
  }, 420);
}

function closeLiveFeed() {
  liveFeedOpen = false;
  const panel = document.getElementById('liveFeedPanel');
  const btn   = document.getElementById('liveFeedBtn');
  if (panel) panel.classList.remove('open');
  if (btn)   btn.classList.remove('panel-open');
  document.body.style.overflow = '';
}

/* ── Cambiar tab ── */
function switchFeedTab(tab) {
  _lfpActiveTab = tab;
  document.querySelectorAll('.lfp-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
    el.setAttribute('aria-selected', el.dataset.tab === tab ? 'true' : 'false');
  });
  document.querySelectorAll('.lfp-tab-content').forEach(el => el.classList.remove('active'));
  const content = document.getElementById('lfp-tab-' + tab);
  if (content) content.classList.add('active');
  if (tab === 'chat') _clearLfpChatBadge();
}

function _clearLfpChatBadge() {
  _lfpChatUnread = 0;
  const b = document.getElementById('lfpChatBadge');
  if (b) { b.textContent = ''; b.classList.remove('show'); }
}

function _incrementLfpChatBadge() {
  if (liveFeedOpen && _lfpActiveTab === 'chat') return;
  _lfpChatUnread++;
  const b = document.getElementById('lfpChatBadge');
  if (b) { b.textContent = _lfpChatUnread > 9 ? '9+' : _lfpChatUnread; b.classList.add('show'); }
  // También mostrar punto en el trigger
  const t = document.getElementById('liveFeedBadge');
  if (t && !liveFeedOpen) t.classList.add('show');
}

/* ── Helpers de tiempo ── */
function _fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

function _fmtRelative(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
  return Math.floor(diff / 86400000) + 'd';
}

/* ── Construir tarjeta de comunicado con reacciones ── */
const LFP_REACT_EMOJIS = ['🔥','❤️','🎵','👏','😮','💯'];
const _lfpComReacted = {}; // { comKey: emoji }

function _buildLfpComCard(com, key) {
  const prioClass = com.prioridad === 'urgente' ? 'urgente' : com.prioridad === 'importante' ? 'importante' : '';
  const prioLabel = com.prioridad === 'urgente' ? '🔴 URGENTE' : com.prioridad === 'importante' ? '🟡 IMPORTANTE' : '🟢 INFO';
  const imgHtml   = com.imagen
    ? `<img class="lfp-com-img" src="${escHtml(com.imagen)}" alt="${escHtml(com.titulo || '')}" loading="lazy" onerror="this.style.display='none'">`
    : '';
  const texto     = escHtml(com.texto || com.cuerpo || '');
  const reactions = com.reactions || {};

  const reactsHtml = LFP_REACT_EMOJIS.map(emoji => {
    const emojiKey   = emoji.codePointAt(0).toString(16);
    const isReacted  = _lfpComReacted[key] === emoji;
    // ✅ FIX: sin conteo — solo mostrar el emoji sin número
    return `<button class="lfp-react-btn${isReacted ? ' reacted' : ''}"
      onclick="sendComReaction('${escHtml(key)}','${emoji}',this)"
      aria-label="Reaccionar con ${emoji}">${emoji}</button>`;
  }).join('');

  return `
  <div class="lfp-com-card ${prioClass}" id="lfpcom-${escHtml(key)}">
    ${imgHtml}
    <div class="lfp-com-body">
      <div class="lfp-com-meta">
        <span class="lfp-com-badge ${prioClass}">${prioLabel}</span>
        <span class="lfp-com-time">${_fmtRelative(com.ts)}</span>
      </div>
      <div class="lfp-com-title">${escHtml(com.titulo || 'Sin título')}</div>
      <div class="lfp-com-text" id="lfpct-${escHtml(key)}">${texto}</div>
      ${texto.length > 120 ? `<button class="lfp-com-readmore" onclick="toggleLfpComText('${escHtml(key)}',this)">+ Leer más</button>` : ''}
    </div>
    <div class="lfp-com-reactions">${reactsHtml}</div>
  </div>`;
}

function toggleLfpComText(key, btn) {
  const el = document.getElementById('lfpct-' + key);
  if (!el) return;
  el.classList.toggle('expanded');
  btn.textContent = el.classList.contains('expanded') ? '— Menos' : '+ Leer más';
}

/* ── Enviar reacción a un comunicado específico ── */
function sendComReaction(comKey, emoji, btnEl) {
  if (!fbDB) return;
  // Solo una reacción por comunicado por sesión
  if (_lfpComReacted[comKey]) {
    toast('Ya reaccionaste a este comunicado');
    return;
  }
  _lfpComReacted[comKey] = emoji;

  // Animación local
  if (btnEl) {
    btnEl.classList.add('reacted', 'fired');
    setTimeout(() => btnEl.classList.remove('fired'), 400);
  }

  // Spawn emoji flotante
  if (typeof spawnFloatingEmoji === 'function') {
    spawnFloatingEmoji(emoji);
    spawnFloatingEmoji(emoji);
  }

  // ✅ FIX: No acumular contadores — solo emitir evento puntual en vivo
  fbDB.ref('reactions/live/' + _uid).set({
    emoji,
    ts: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    setTimeout(() => {
      fbDB.ref('reactions/live/' + _uid).remove().catch(() => {});
    }, 5000);
  }).catch(() => {});
}

/* ── Renderizar lista de comunicados en el panel ── */
function _renderLfpComunicados(list, keys) {
  const el = document.getElementById('lfpComList');
  if (!el) return;
  if (list.length === 0) {
    el.innerHTML = '<div class="lfp-empty">📡 Sin comunicados activos</div>';
    return;
  }
  el.innerHTML = list.map((c, i) => _buildLfpComCard(c, keys[i])).join('');
}

/* ── Añadir mensaje al feed de chat del panel ── */
const MAX_LFP_MSGS = 60;

function _addLfpMsg(data, listId) {
  const el = document.getElementById(listId);
  if (!el) return;
  while (el.children.length >= MAX_LFP_MSGS) el.removeChild(el.firstChild);

  const tipo        = data.tipo || 'chat';
  const esRadio     = data.esRadio || false;
  const avatarIcon  = esRadio ? '🎙️' : (tipo === 'cancion' ? '🎵' : tipo === 'dedica' ? '💌' : '👤');
  const avatarClass = tipo === 'dedica' ? 'dedica' : tipo === 'cancion' ? 'cancion' : '';
  const nombre      = (data.nombre || 'Oyente').replace(/<[^>]+>/g,'').replace(/^De:\s*/,'');
  const ciudad      = (data.ciudad || '').replace(/<[^>]+>/g,'');
  const textoLimpio = (data.texto || '').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const tagHtml     = tipo === 'cancion'
    ? '<span class="lfp-msg-tag cancion">🎵 Solicitud</span> '
    : tipo === 'dedica'
    ? '<span class="lfp-msg-tag dedica">💌 Dedicatoria</span> '
    : '';

  const div = document.createElement('div');
  div.className = 'lfp-msg';
  div.innerHTML = `
    <div class="lfp-msg-avatar ${avatarClass}" aria-hidden="true">${avatarIcon}</div>
    <div class="lfp-msg-body">
      <div class="lfp-msg-name">
        ${escHtml(nombre)}
        ${ciudad ? `<span class="city">· ${escHtml(ciudad)}</span>` : ''}
        <span class="lfp-msg-time">${_fmtTime(data.ts)}</span>
      </div>
      <div class="lfp-msg-text">${tagHtml}${escHtml(textoLimpio.slice(0, 180))}${textoLimpio.length > 180 ? '…' : ''}</div>
    </div>`;
  el.appendChild(div);

  // Auto-scroll si está cerca del fondo
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  if (nearBottom) el.scrollTop = el.scrollHeight;
}

/* ── Contadores diarios globales ── */
let _lfpMsgCount = 0, _lfpDedicaCount = 0;

function _updateLfpStats() {
  // ✅ FIX: reacciones sin conteo — ocultar total de reacciones
  const rEl  = document.getElementById('lfpTotalReacciones');
  const mEl  = document.getElementById('lfpTotalMsgs');
  const dEl  = document.getElementById('lfpTotalDedicas');
  if (rEl) rEl.closest && rEl.closest('.lfp-stat') ? rEl.closest('.lfp-stat').style.display = 'none' : (rEl.style.display = 'none');
  if (mEl) mEl.textContent = _lfpMsgCount;
  if (dEl) dEl.textContent = _lfpDedicaCount;
}

/* ── Actualizar contador de oyentes en el panel ── */
function _updateLfpOnline(count) {
  const el = document.getElementById('lfpOnlineCount');
  if (el && count != null) el.textContent = count;
}

/* ── Inicializar el panel (se llama cuando fbDB está listo) ── */
function initLiveFeedPanel() {
  if (!fbDB) return;

  // 1. Escuchar comunicados con sus reacciones
  fbDB.ref('comunicados').orderByChild('ts').on('value', snap => {
    const list = [], keys = [];
    snap.forEach(child => {
      list.push(child.val());
      keys.push(child.key);
    });
    list.reverse(); keys.reverse(); // más reciente primero
    _renderLfpComunicados(list, keys);
    // Señalizar actividad nueva en el trigger si el panel está cerrado
    if (!liveFeedOpen) {
      const b = document.getElementById('liveFeedBadge');
      if (b) b.classList.add('show');
    }
  });

  // 2. Escuchar mensajes de chat en tiempo real
  fbDB.ref('chat/mensajes').orderByChild('ts').limitToLast(60).on('child_added', snap => {
    const d = snap.val();
    if (!d) return;
    if (d.tipo === 'dedica') {
      _addLfpMsg(d, 'lfpDedicaList');
      _lfpDedicaCount++;
    } else {
      _addLfpMsg(d, 'lfpChatList');
      _lfpMsgCount++;
      if (!liveFeedOpen || _lfpActiveTab !== 'chat') _incrementLfpChatBadge();
    }
    _updateLfpStats();
  });

  // 3. Sincronizar oyentes online — actualiza AMBOS elementos
  fbDB.ref('radio/listeners').on('value', snap => {
    const v = snap.val();
    if (v != null) {
      _updateLfpOnline(v);
      // También actualizar el contador principal si Icecast tiene datos válidos
      const statEl = document.getElementById('statListeners');
      if (statEl) statEl.textContent = v;
    }
  });
}

/* ── Hook: llamar initLiveFeedPanel cuando Firebase esté listo ── */
const _lfpOrigInitFb = window.initFirebase;
window.initFirebase = function() {
  if (typeof _lfpOrigInitFb === 'function') _lfpOrigInitFb();
  setTimeout(initLiveFeedPanel, 600);
};

/* ── También enganchar al callback de mensajes existente para los contadores ── */
if (typeof onMessage === 'function') {
  onMessage((data) => {
    _updateLfpStats();
  });
}

/* ── Cerrar panel con tecla Escape ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && liveFeedOpen) closeLiveFeed();
});

/* ════════════════════════════════════════════════════════════════
   🎨 ARTE DE ÁLBUM — Last.fm API (gratuita)
   ─────────────────────────────────────────────────────────────────
   Registra tu cuenta y obtén tu API key gratuita en:
   https://www.last.fm/api/account/create
   Pega tu clave de Last.fm en la constante LASTFM_API_KEY de este archivo para activarla.
   ════════════════════════════════════════════════════════════════ */
const LASTFM_API_KEY = ''; /* ← PON AQUÍ tu clave de Last.fm para activar la búsqueda de carátulas.
                              Si está vacía, la función se salta sin error. */

async function fetchAlbumArt(artist, track) {
  if (!LASTFM_API_KEY) return; /* Sin clave configurada no se consulta Last.fm. */
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const images = data?.track?.album?.image;

    if (images && images.length > 0) {
      // Preferir tamaño "large" (300x300), fallback al último disponible
      const img = images.find(i => i.size === 'large') || images[images.length - 1];
      const src = img?.['#text'];
      if (src && src.startsWith('http')) {
        const artEl   = document.getElementById('songAlbumArt');
        const emojiEl = document.getElementById('songEmoji');
        if (artEl) {
          artEl.src   = src;
          artEl.style.display = 'block';
          artEl.onerror = () => clearAlbumArt();
        }
        if (emojiEl) emojiEl.style.display = 'none';
        return;
      }
    }
  } catch(e) { /* Last.fm no disponible o canción desconocida */ }
  clearAlbumArt();
}

function clearAlbumArt() {
  const artEl   = document.getElementById('songAlbumArt');
  const emojiEl = document.getElementById('songEmoji');
  if (artEl)   { artEl.src = ''; artEl.style.display = 'none'; }
  if (emojiEl) emojiEl.style.display = 'block';
}

async function fetchAlbumArtMusicBrainz(artist, title) {
  try {
    const q = encodeURIComponent(`recording:"${title}" AND artist:"${artist}"`);
    const mbResp = await fetch(
      `https://musicbrainz.org/ws/2/recording/?query=${q}&limit=1&fmt=json`,
      { headers: { 'User-Agent': 'DilsonFM/1.0 (contacto@dilsonfm.com)' } }
    );
    const mb = await mbResp.json();
    const releaseId = mb?.recordings?.[0]?.releases?.[0]?.id;
    if (!releaseId) return null;
    
    const caResp = await fetch(`https://coverartarchive.org/release/${releaseId}`);
    const ca = await caResp.json();
    return ca?.images?.[0]?.thumbnails?.['500'] || ca?.images?.[0]?.image || null;
  } catch { return null; }
}

// NOTA: Spotify Client Secret NUNCA debe estar en el frontend.
// Para usar Spotify, mover getSpotifyToken() a una Netlify Function
// y llamarla desde aquí como: fetch('/.netlify/functions/spotify-token')
// Por ahora se deshabilita para no exponer credenciales.
let _spotifyToken = null, _spotifyTokenExp = 0;

async function getSpotifyToken() {
  // Deshabilitado — implementar como Netlify Function para proteger el secret
  return null;
}

async function searchSpotify(artist, title) {
  return null; // Deshabilitado hasta migrar a Netlify Function
}
/* ════════════════════════════════════════════════════════════════
   📸 COMPARTIR CANCIÓN COMO IMAGEN
   ─────────────────────────────────────────────────────────────────
   Genera un canvas 1080×1080 con la canción actual y permite
   compartirlo directamente a WhatsApp, Instagram Stories, etc.
   mediante la Web Share API. Si no está disponible, descarga la imagen.
   ════════════════════════════════════════════════════════════════ */
async function shareSongAsImage() {
  const artist = document.getElementById('songArtist')?.textContent?.trim() || 'Dilson 101.9 FM';
  const song   = document.getElementById('songTitle')?.textContent?.trim()  || 'En Vivo';
  const artSrc = document.getElementById('songAlbumArt')?.src || '';

  const canvas = document.createElement('canvas');
  canvas.width  = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  // ── Fondo degradado oscuro ──
  const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
  grad.addColorStop(0, '#07070f');
  grad.addColorStop(0.5, '#0d1a15');
  grad.addColorStop(1, '#07070f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);

  // ── Arte de álbum si está disponible ──
  if (artSrc && artSrc.startsWith('http')) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = artSrc + '?cb=' + Date.now(); // evitar cache CORS
      });
      // Arte como fondo borroso y oscurecido
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.filter = 'blur(50px)';
      ctx.drawImage(img, -100, -100, 1280, 1280);
      ctx.restore();
      // Arte centrado con bordes redondeados
      const s = 500, x = (1080 - s) / 2, y = 150;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur  = 60;
      ctx.beginPath();
      roundRect(ctx, x, y, s, s, 28);
      ctx.clip();
      ctx.drawImage(img, x, y, s, s);
      ctx.restore();
    } catch(e) {
      drawFallbackEmoji(ctx);
    }
  } else {
    drawFallbackEmoji(ctx);
  }

  // ── Línea decorativa ──
  ctx.strokeStyle = 'rgba(168,85,247,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 720); ctx.lineTo(1000, 720);
  ctx.stroke();

  // ── Nombre de la radio ──
  ctx.fillStyle = '#A855F7';
  ctx.font = 'bold 44px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(168,85,247,0.4)';
  ctx.shadowBlur  = 20;
  ctx.fillText('📻 Radio Dilson 101.9 FM', 540, 778);
  ctx.shadowBlur = 0;

  // ── Título de la canción ──
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px Arial, sans-serif';
  wrapTextCentered(ctx, song, 540, 848, 880, 60);

  // ── Artista ──
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '36px Arial, sans-serif';
  ctx.fillText(artist, 540, 940);

  // ── URL ──
  ctx.fillStyle = 'rgba(0,255,204,0.8)';
  ctx.font = '28px Arial, sans-serif';
  ctx.fillText('radiodilson.com · Escúchanos en vivo 🌐', 540, 1020);

  // ── Compartir o descargar ──
  canvas.toBlob(async blob => {
    if (!blob) { toast('❌ Error al generar imagen'); return; }
    const file = new File([blob], 'dilson-fm-ahora.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `🎵 ${song} — Radio Dilson 101.9 FM`,
          text: `Estoy escuchando "${song}" de ${artist} en Radio Dilson 101.9 FM 📻\n🎧 radiodilson.com`,
          files: [file]
        });
      } catch(e) {
        if (e.name !== 'AbortError') _downloadImage(blob);
      }
    } else {
      _downloadImage(blob);
    }
  }, 'image/png');
}

function _downloadImage(blob) {
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'dilson-fm-ahora.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('📥 Imagen guardada');
}

function drawFallbackEmoji(ctx) {
  ctx.font = '220px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🎵', 540, 550);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapTextCentered(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, y);
      line = words[i] + ' ';
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, y);
}
/* ═══════════════════════════════════════════════════════════════
   GENERADOR DE PARTÍCULAS DE FONDO
   ═══════════════════════════════════════════════════════════════ */
function initParticles() {
  const container = document.getElementById('particleContainer');
  if (!container) return;
  
  const particleCount = window.innerWidth < 600 ? 20 : 40;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Posición inicial aleatoria
    const left = Math.random() * 100;
    const delay = Math.random() * 15;
    const duration = 10 + Math.random() * 15;
    const size = 1 + Math.random() * 3;
    
    particle.style.left = left + '%';
    particle.style.animationDelay = delay + 's';
    particle.style.animationDuration = duration + 's';
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    // Color aleatorio entre dorado y rojo
    if (Math.random() > 0.7) {
      particle.style.background = 'rgba(255, 64, 96, 0.4)';
    } else {
      particle.style.background = 'rgba(245, 200, 66, 0.4)';
    }
    
    container.appendChild(particle);
  }
}

// Inicializar partículas después del splash
window.addEventListener('load', () => {
  setTimeout(initParticles, 2500);
});

/* ════════════════════════════════════════════════════════════════
   PUSH NOTIFICATIONS — Comunicados urgentes / importantes
   ─────────────────────────────────────────────────────────────────
   pushComNotif()       → muestra notificación nativa vía SW
   listenPushSignals()  → escucha /push_signals en Firebase
   ════════════════════════════════════════════════════════════════ */

async function pushComNotif(com) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  // info nunca genera push
  if (com.prioridad === 'info') return;

  const prioTitle = {
    urgente:    '⚠️ COMUNICADO URGENTE',
    importante: '📢 Comunicado Importante'
  };

  const title = prioTitle[com.prioridad] || '📡 Dilson FM 101.9';
  const body  = (com.titulo || '') +
    (com.cuerpo ? '\n' + com.cuerpo.slice(0, 80) + (com.cuerpo.length > 80 ? '…' : '') : '');

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.showNotification) {
      await reg.showNotification(title, {
        body,
        icon:               './logodilson2.png',
        badge:              './icon-192.png',
        tag:                'comunicado-' + (com.id || Date.now()),
        renotify:           true,
        vibrate:            com.prioridad === 'urgente' ? [200, 100, 300, 100, 200] : [150],
        requireInteraction: com.prioridad === 'urgente',
        silent:             false,
        data:               { url: '/', tipo: 'comunicado', id: com.id },
        actions: [
          { action: 'open',    title: '📻 Ver comunicado' },
          { action: 'dismiss', title: 'Cerrar' }
        ]
      });
    } else {
      // Fallback: notificación del navegador (solo primer plano)
      new Notification(title, {
        body,
        icon:  './logodilson2.png',
        badge: './icon-192.png',
        tag:   'comunicado-' + (com.id || Date.now()),
      });
    }
  } catch(e) {
    console.warn('[Dilson] pushComNotif:', e.message);
  }
}

function listenPushSignals() {
  if (!fbDB) return;
  const signalsRef = fbDB.ref('push_signals');
  let firstLoad = true;

  signalsRef.orderByChild('ts').limitToLast(1).on('child_added', snap => {
    // Ignorar señales que ya existían al cargar
    if (firstLoad) return;
    const signal = snap.val();
    if (!signal) return;
    // Descartar señales de más de 60 segundos (antiguas)
    if (Date.now() - signal.ts > 60000) return;
    pushComNotif(signal);
  });

  setTimeout(() => { firstLoad = false; }, 2000);
}

/* ═══════════════════════════════════════════════════════════════
   URL DEL STREAM — FIJA, no depende de Firebase
   ▸ El proxy /radio-stream de Netlify reenvía al Icecast real.
   ▸ Cambiar esta constante si cambia el servidor Icecast.
   ▸ Firebase SOLO se usa para chat, comunicados y presencia.
═══════════════════════════════════════════════════════════════ */
const _activeStreamUrl = 'radio-stream'; /* proxy Netlify → http://37.157.242.101:39848/;stream */

function loadStreamConfig() {
  if (!fbDB) return;
  /* Solo carga la programación desde Firebase — la URL del stream es fija */
  fbDB.ref('config/schedule').once('value', snap => {
    const data = snap.val();
    if (!data) return;
    const arr = Array.isArray(data) ? data : Object.values(data);
    if (!arr.length) return;
    SCHED.length = 0;
    arr.forEach(p => SCHED.push({ h: Number(p.h) || 0, name: p.name || '', icon: p.icon || '🎙️' }));
    /* Se vuelve a dibujar la lista y la tarjeta del locutor para que los
       tres textos (rótulo, tarjeta y programación) sigan coincidiendo. */
    renderSched();
    updateDjCard();
    console.log('[Dilson FM] Programación cargada desde Firebase:', SCHED.length, 'programas');
  });
}
/* ═══════════════════════════════════════════════════════════════════════
   NUEVAS FUNCIONES COMUNITARIAS — Radio Dilson 101.9 FM
   Mapa · Noticias · Encuestas · Eventos · Mercado · Empleos · Ranking
   Todos leen/escriben en Firebase Realtime Database
═══════════════════════════════════════════════════════════════════════ */

/* ── Helper: escapar HTML ── */
function _esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

/* ── Helper: fecha legible ── */
function _fmtFecha(ts) {
  return new Date(ts).toLocaleString('es-BO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
}

/* ── Helper: abrir/cerrar modal ── */
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.style.display='flex'; document.body.style.overflow='hidden'; }
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.style.display='none'; document.body.style.overflow=''; }
}
// Cerrar modal al tocar el fondo
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.style.display = 'none';
    document.body.style.overflow = '';
  }
});

/* ══════════════════════════════════════════════════════════
   1. MAPA DE OYENTES EN VIVO
══════════════════════════════════════════════════════════ */
let _mapaInited = false;
let _miPosicion = null;
let _leafletMap = null;
let _mapaMarkers = {};

function initMapa() {
  if (_mapaInited) return;
  _mapaInited = true;

  /* Cargar Leaflet dinámicamente */
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  document.head.appendChild(css);

  const scr = document.createElement('script');
  scr.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  scr.onload = () => _initLeafletMap();
  document.head.appendChild(scr);
}

function _initLeafletMap() {
  const container = document.getElementById('mapaContainer');
  if (!container) return;
  container.innerHTML = '';

  /* Centro en Cuevo, Bolivia */
  _leafletMap = L.map('mapaContainer', { zoomControl:false, attributionControl:false }).setView([-20.46, -63.66], 10);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18
  }).addTo(_leafletMap);

  /* ── Estado del mapa ─────────────────────────────────────────────
     El número de "en línea" sale de la PRESENCIA (chat/presencia), que es
     la única fuente fiable. Antes se contaban las POSICIONES compartidas,
     así que el mapa decía "1 en línea" cuando había 4 oyentes conectados. */
  let presenciaMapa = 0;
  let conUbicacionMapa = 0;

  function actualizarResumenMapa() {
    const el = document.getElementById('mapaCount');
    if (el) el.textContent = presenciaMapa;
    const hint = document.querySelector('.mapa-hint');
    if (!hint) return;
    if (conUbicacionMapa === 0) {
      hint.textContent = '📍 Ningún oyente ha compartido su ubicación todavía. Activa la tuya para aparecer.';
    } else {
      hint.textContent = '📍 ' + conUbicacionMapa +
        (conUbicacionMapa === 1 ? ' oyente comparte su ubicación' : ' oyentes comparten su ubicación') +
        ' · activa la tuya para aparecer';
    }
  }

  /* Escuchar posiciones en Firebase */
  if (fbDB) {
    fbDB.ref('oyentes_pos').on('value', snap => {
      const data = snap.val() || {};

      /* Limpiar marcadores viejos */
      Object.values(_mapaMarkers).forEach(m => m.remove());
      _mapaMarkers = {};

      conUbicacionMapa = 0;
      Object.entries(data).forEach(([uid, pos]) => {
        if (!pos || typeof pos.lat !== 'number' || typeof pos.lng !== 'number') return;
        conUbicacionMapa++;
        const esYo = uid === _uid;
        const tam   = esYo ? 16 : 11;
        const color = esYo ? '#A855F7' : '#D8B4FE';
        const icon = L.divIcon({
          className: '',
          html: '<div style="width:' + tam + 'px;height:' + tam + 'px;border-radius:50%;background:' + color +
                ';border:2px solid #fff;box-shadow:0 0 ' + (esYo ? 10 : 6) + 'px ' + color + '"></div>',
          iconSize:   [tam, tam],
          iconAnchor: [tam / 2, tam / 2]
        });
        const marker = L.marker([pos.lat, pos.lng], { icon }).addTo(_leafletMap);
        if (pos.nombre) marker.bindPopup('<b>' + _esc(pos.nombre) + '</b><br><small>' + _esc(pos.ciudad || '') + '</small>');
        _mapaMarkers[uid] = marker;
      });

      actualizarResumenMapa();
    });

    /* Presencia: cuántos oyentes hay conectados de verdad */
    fbDB.ref('chat/presencia').on('value', snap => {
      presenciaMapa = snap.numChildren();
      actualizarResumenMapa();
    });
  }

  actualizarResumenMapa();

  /* ── Mi ubicación ────────────────────────────────────────────────
     IMPORTANTE: si no hay una ubicación REAL, no se sube nada.

     Antes, cuando el oyente negaba el permiso, se subía el centro de Cuevo
     (-20.46, -63.66) por defecto. Eso tenía dos consecuencias graves:
       · TODOS los que no comparten acababan apilados en el mismo punto,
         así que el mapa parecía tener una sola persona;
       · era mentira: mostraba en Cuevo a gente que podía estar en
         cualquier parte del mundo. */
  if (navigator.geolocation && _geoAccurate) {
    _subirPosicionMapa(_geoLat, _geoLng);
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => _subirPosicionMapa(pos.coords.latitude, pos.coords.longitude),
      () => { /* denegado o no disponible: no se inventa la ubicación */ }
    );
  }
}

/* Comparte la ubicación al abrir la app SI el oyente ya la había concedido
   antes. Nunca pide permiso aquí (eso solo ocurre al entrar al mapa): si ya
   estaba concedido, la posición se comparte igualmente para que el mapa se
   vaya llenando con los oyentes que vuelven. */
function compartirUbicacionSiYaPermitida() {
  if (!('geolocation' in navigator) || !navigator.permissions) return;
  navigator.permissions.query({ name: 'geolocation' })
    .then(perm => {
      if (perm.state !== 'granted') return;
      navigator.geolocation.getCurrentPosition(
        pos => _subirPosicionMapa(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { maximumAge: 600000, timeout: 8000 }
      );
    })
    .catch(() => {});
}

function _subirPosicionMapa(lat, lng) {
  if (!fbDB || !_uid) return;
  _miPosicion = {lat, lng};
  const nombre = localStorage.getItem('dilson_chat_nick') || 'Oyente';
  fbDB.ref(`oyentes_pos/${_uid}`).set({
    lat, lng,
    nombre,
    ciudad: 'Cuevo, Bolivia',
    ts: Date.now()
  });
  /* Auto-limpiar al salir */
  fbDB.ref(`oyentes_pos/${_uid}`).onDisconnect().remove();
}

/* Inicializar mapa cuando sea visible */
const _mapaObs = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) { initMapa(); _mapaObs.disconnect(); }
}, { threshold: 0.1 });
const _mapaEl = document.getElementById('secMapa');
if (_mapaEl) _mapaObs.observe(_mapaEl);

/* ══════════════════════════════════════════════════════════
   2. NOTICIAS LOCALES DE CUEVO
   Lee de /comunicados (ya existente en Firebase)
══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   UPLOAD DE IMÁGENES — imgBB (compartido para eventos y mercado)
══════════════════════════════════════════════════════════ */
/* Sube un File a imgBB a través de una función propia del servidor y
   devuelve la URL pública.

   La clave de imgBB ya NO está en este archivo: estaba a la vista de
   cualquiera y podía agotar la cuota. Ahora vive en la variable de
   entorno IMGBB_KEY de Netlify y solo la usa la función
   netlify/functions/imgbb-upload.js.

   ⚠️ PENDIENTE: hay que ROTAR la clave antigua en imgbb.com, porque la
   que estaba publicada aquí quedó expuesta. */
async function _uploadImagen(file, onProgress) {
  if (!file) return null;
  if (file.size > 5 * 1024 * 1024) { toast('⚠️ La foto pesa más de 5 MB'); return null; }
  const fd = new FormData();
  fd.append('image', file);
  try {
    if (onProgress) onProgress('📤 Subiendo foto...');
    const res  = await fetch('/.netlify/functions/imgbb-upload', { method:'POST', body:fd });
    const data = await res.json();
    if (data && data.success) return data.data.url;
    throw new Error((data && data.error && data.error.message) || 'Error al subir la imagen');
  } catch(e) {
    toast('⚠️ No se pudo subir la foto: ' + e.message);
    return null;
  }
}

/* Preview inline de foto seleccionada en un modal */
function previewFoto(inputId, previewId, labelId) {
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const label   = document.getElementById(labelId);
  const file    = input?.files?.[0];
  if (!file || !preview) return;

  /* Validar tipo y tamaño */
  if (!file.type.startsWith('image/')) { toast('⚠️ Solo se aceptan imágenes'); input.value=''; return; }
  if (file.size > 5 * 1024 * 1024)    { toast('⚠️ La foto pesa más de 5 MB');  input.value=''; return; }

  const reader = new FileReader();
  reader.onload = e => {
    preview.style.display = 'block';
    preview.innerHTML = `
      <img src="${e.target.result}" alt="Vista previa">
      <button class="foto-remove" onclick="removeFoto('${inputId}','${previewId}','${labelId}')" aria-label="Quitar foto">✕</button>`;
    if (label) label.classList.add('has-foto');
  };
  reader.readAsDataURL(file);
}

function removeFoto(inputId, previewId, labelId) {
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const label   = document.getElementById(labelId);
  if (input)   input.value = '';
  if (preview) { preview.style.display='none'; preview.innerHTML=''; }
  if (label)   label.classList.remove('has-foto');
}

function initNoticias() {
  if (!fbDB) return;
  fbDB.ref('comunicados').orderByChild('ts').limitToLast(20).on('value', snap => {
    const items = [];
    snap.forEach(c => items.unshift(c.val()));
    renderNoticias(items);
  });
}

function renderNoticias(items) {
  const list = document.getElementById('noticiasList');
  if (!list) return;
  if (!items.length) {
    list.innerHTML = '<div class="noticias-empty">📡 No hay noticias por ahora. Vuelve más tarde.</div>';
    return;
  }
  const labels = { urgente:'🔴 URGENTE', importante:'🟡 IMPORTANTE', info:'🟢 INFO' };
  list.innerHTML = items.map((c, idx) => {
    const hasImg = !!c.imagen;
    return `
    <div class="noticia-card ${_esc(c.prioridad||'info')} ${hasImg?'has-img':''}" onclick="toggleNoticia(${idx})">
      ${hasImg ? `<img class="noticia-img" src="${_esc(c.imagen)}" alt="${_esc(c.titulo)}" loading="lazy" onerror="this.style.display='none'">` : ''}
      <div class="noticia-body">
        <div class="noticia-badge ${_esc(c.prioridad||'info')}">${labels[c.prioridad]||'📢 INFO'}</div>
        <div class="noticia-titulo">${_esc(c.titulo)}</div>
        <div class="noticia-cuerpo" id="ncuerpo-${idx}">${_esc(c.cuerpo)}</div>
        <span class="noticia-expandir" id="nexp-${idx}">Leer más ▾</span>
        <div class="noticia-fecha">${_fmtFecha(c.ts)} · ${_esc(c.autor||'Dilson FM')}</div>
      </div>
    </div>`;
  }).join('');
}

function toggleNoticia(idx) {
  const cuerpo = document.getElementById('ncuerpo-' + idx);
  const btn    = document.getElementById('nexp-' + idx);
  if (!cuerpo) return;
  const open = cuerpo.classList.toggle('expandida');
  if (btn) btn.textContent = open ? 'Ver menos ▴' : 'Leer más ▾';
}

/* ══════════════════════════════════════════════════════════
   3. ENCUESTAS EN VIVO
══════════════════════════════════════════════════════════ */
let _encuestaActiva = null;
let _encuestaVotada = null;

function initEncuesta() {
  if (!fbDB) return;
  /* Escuchar encuesta activa */
  fbDB.ref('encuesta_activa').on('value', snap => {
    const data = snap.val();
    _encuestaActiva = data;
    const badge = document.getElementById('encuestaBadgeLive');
    if (badge) badge.style.display = data ? 'flex' : 'none';
    renderEncuesta(data);
  });
}

function renderEncuesta(data) {
  const cont = document.getElementById('encuestaContainer');
  if (!cont) return;
  if (!data || !data.pregunta) {
    cont.innerHTML = `<div class="encuesta-empty"><div style="font-size:2rem;margin-bottom:8px">🗳️</div><div>No hay encuesta activa ahora mismo.</div><div style="font-size:0.7rem;opacity:0.5;margin-top:4px">El locutor lanzará la próxima encuesta al aire</div></div>`;
    return;
  }

  const votadaKey = `enc_${data.id}`;
  _encuestaVotada = localStorage.getItem(votadaKey);
  const totalVotos = Object.values(data.votos||{}).reduce((a,b) => a+(b||0), 0);

  const opcionesHtml = (data.opciones||[]).map((op, i) => {
    const votos = (data.votos||{})[i] || 0;
    const pct = totalVotos > 0 ? Math.round((votos/totalVotos)*100) : 0;
    const esMia = _encuestaVotada == i;
    return `
      <button class="encuesta-opcion${esMia?' votada':''}" onclick="votarEncuesta(${i})" ${_encuestaVotada!==null?'disabled':''}>
        <div class="encuesta-barra" style="width:${_encuestaVotada!==null?pct:0}%"></div>
        <span>${_esc(op)}</span>
        ${_encuestaVotada!==null?`<span class="encuesta-pct">${pct}%</span>`:''}
      </button>`;
  }).join('');

  cont.innerHTML = `
    <div class="encuesta-pregunta">❓ ${_esc(data.pregunta)}</div>
    ${opcionesHtml}
    ${totalVotos>0?`<div class="encuesta-total">${totalVotos} voto${totalVotos!==1?'s':''} en total</div>`:''}`;
}

function votarEncuesta(opcionIdx) {
  if (!_encuestaActiva || !fbDB || _encuestaVotada !== null) return;
  const key = `enc_${_encuestaActiva.id}`;
  localStorage.setItem(key, opcionIdx);
  _encuestaVotada = opcionIdx;
  fbDB.ref(`encuesta_activa/votos/${opcionIdx}`).transaction(v => (v||0)+1);
  /* Sumar al score del oyente */
  _sumarPuntosOyente(5, 'votó en encuesta');
}

/* ══════════════════════════════════════════════════════════
   4. EVENTOS DE CUEVO
══════════════════════════════════════════════════════════ */
function initEventos() {
  if (!fbDB) return;
  const ahora = Date.now();
  fbDB.ref('eventos_cuevo').orderByChild('fecha').startAt(ahora).limitToFirst(20).on('value', snap => {
    const items = [];
    snap.forEach(c => items.push(c.val()));
    renderEventos(items);
  });
}

function renderEventos(items) {
  const list = document.getElementById('eventosList');
  if (!list) return;
  if (!items.length) {
    list.innerHTML = '<div class="eventos-empty">📅 No hay eventos próximos. ¡Sé el primero en anunciar el tuyo!</div>';
    return;
  }
  list.innerHTML = items.map(ev => {
    const d   = new Date(ev.fecha);
    const dia = d.getDate();
    const mes = d.toLocaleDateString('es-BO', {month:'short'}).toUpperCase();
    const hora = d.toLocaleTimeString('es-BO', {hour:'2-digit', minute:'2-digit'});
    const wa  = ev.contacto ? ev.contacto.replace(/[^0-9]/g, '') : '';
    const ahora = Date.now();
    const diff  = ev.fecha - ahora;
    const pronto = diff > 0 && diff < 24*60*60*1000;
    return `
      <div class="evento-card">
        ${ev.imagen ? `<img class="evento-img" src="${_esc(ev.imagen)}" alt="${_esc(ev.titulo)}" loading="lazy" onerror="this.style.display='none'">` : ''}
        <div class="evento-body">
          <div class="evento-fecha-box">
            <div class="evento-dia">${dia}</div>
            <div class="evento-mes">${mes}</div>
          </div>
          <div class="evento-info">
            ${pronto ? '<span style="font-size:0.6rem;font-family:JetBrains Mono,monospace;color:var(--red);letter-spacing:0.08em">● HOY</span>' : ''}
            <div class="evento-titulo">${_esc(ev.titulo)}</div>
            <div class="evento-desc">${_esc(ev.desc||'')}</div>
            <div class="evento-hora">🕐 ${hora}</div>
            <div class="evento-autor">👤 ${_esc(ev.nombre)}</div>
            ${wa ? `<a class="evento-contacto" href="https://wa.me/591${wa}" target="_blank" rel="noopener">📱 Contactar</a>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

function openAnunciarEvento() { openModal('modalEvento'); }

async function publicarEvento() {
  const nombre   = document.getElementById('evNombre')?.value.trim();
  const titulo   = document.getElementById('evTitulo')?.value.trim();
  const desc     = document.getElementById('evDesc')?.value.trim();
  const fechaStr = document.getElementById('evFecha')?.value;
  const contacto = document.getElementById('evContacto')?.value.trim();
  const fotoFile = document.getElementById('evFoto')?.files?.[0];
  if (!nombre || !titulo || !fechaStr) { toast('⚠️ Completa los campos obligatorios'); return; }
  if (!fbDB) { toast('⚠️ Sin conexión'); return; }
  const btn = document.querySelector('#modalEvento .modal-btn-pub');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Publicando...'; }
  try {
    /* Subir foto primero si hay una */
    let imagenUrl = null;
    if (fotoFile) {
      if (btn) btn.textContent = '📤 Subiendo foto...';
      imagenUrl = await _uploadImagen(fotoFile);
    }
    if (btn) btn.textContent = '⏳ Guardando...';
    await fbDB.ref('eventos_cuevo').push({
      nombre, titulo, desc: desc || '',
      fecha: new Date(fechaStr).getTime(),
      contacto: contacto || '',
      imagen: imagenUrl || null,
      ts: Date.now(), uid: _uid
    });
    toast('🎉 ¡Evento publicado! La radio lo mencionará al aire.');
    closeModal('modalEvento');
    ['evNombre','evTitulo','evDesc','evFecha','evContacto'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    removeFoto('evFoto','evFotoPreview','evFotoLabel');
    _sumarPuntosOyente(10, 'publicó evento');
  } catch(e) { toast('❌ Error al publicar: ' + e.message); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '📅 Publicar evento'; } }
}

/* ══════════════════════════════════════════════════════════
   5. MERCADO LOCAL DE CUEVO
══════════════════════════════════════════════════════════ */
let _mercadoCat  = 'todo';
let _mercadoData = []; /* cada item incluye {key, cat, nombre, titulo, desc, contacto, ts, uid, estado} */

function initMercado() {
  if (!fbDB) return;
  fbDB.ref('mercado_cuevo').orderByChild('ts').limitToLast(60).on('value', snap => {
    _mercadoData = [];
    snap.forEach(c => {
      const v = c.val();
      if (v) _mercadoData.unshift({ ...v, key: c.key });
    });
    /* Auto-limpiar avisos con más de 30 días (se hace solo en el cliente del publicador) */
    _mercadoData.forEach(av => {
      if (av.uid === _uid && Date.now() - av.ts > 30 * 24 * 60 * 60 * 1000) {
        fbDB.ref('mercado_cuevo/' + av.key).remove().catch(() => {});
      }
    });
    renderMercado();
  });
}

function setMercadoCat(btn, cat) {
  document.querySelectorAll('.mer-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _mercadoCat = cat;
  renderMercado();
}

function renderMercado() {
  const list = document.getElementById('mercadoList');
  if (!list) return;
  const items = _mercadoCat === 'todo'
    ? _mercadoData
    : _mercadoData.filter(i => i.cat === _mercadoCat);
  /* Ordenar: disponibles primero, vendidos/cerrados al final */
  items.sort((a, b) => {
    const aD = (a.estado || 'disponible') === 'disponible' ? 0 : 1;
    const bD = (b.estado || 'disponible') === 'disponible' ? 0 : 1;
    return aD - bD || b.ts - a.ts;
  });
  if (!items.length) {
    list.innerHTML = `<div class="mercado-empty">🛒 No hay avisos de "${_mercadoCat}" aún. ¡Publica el tuyo!</div>`;
    return;
  }
  const catLabels = { vendo:'🏷️ VENDO', compro:'🛍️ COMPRO', alquilo:'🏠 ALQUILO', busco:'🔍 BUSCO' };
  list.innerHTML = items.map(av => {
    const wa      = av.contacto ? av.contacto.replace(/[^0-9]/g, '') : '';
    const estado  = av.estado || 'disponible';
    const esOwner = av.uid === _uid;
    const vendido = estado !== 'disponible';
    return `
      <div class="aviso-card ${vendido ? 'aviso-vendido' : ''}">
        ${av.imagen ? `<img class="aviso-img" src="${_esc(av.imagen)}" alt="${_esc(av.titulo)}" loading="lazy" onerror="this.style.display='none'" onclick="abrirImagenGrande('${_esc(av.imagen)}')">` : ''}
        <div class="aviso-body">
          <div class="aviso-cat-badge">${catLabels[av.cat] || av.cat}</div>
          ${vendido ? `<div class="aviso-estado-badge">✅ ${estado === 'vendido' ? 'VENDIDO' : 'CERRADO'}</div>` : ''}
          <div class="aviso-titulo">${_esc(av.titulo)}</div>
          <div class="aviso-desc">${_esc(av.desc)}</div>
          <div class="aviso-foot">
            <span class="aviso-nombre">👤 ${_esc(av.nombre)} · ${_fmtFecha(av.ts)}</span>
            ${wa && !vendido ? `<a class="aviso-wa" href="https://wa.me/591${wa}" target="_blank" rel="noopener">📱 WhatsApp</a>` : ''}
          </div>
          ${esOwner ? `
          <div class="aviso-owner-btns">
            ${!vendido
              ? `<button class="aviso-btn-vendido" onclick="marcarAvisoVendido('${av.key}')">✅ Marcar como vendido</button>`
              : `<button class="aviso-btn-reabrir" onclick="reabrirAviso('${av.key}')">🔄 Reactivar aviso</button>`
            }
            <button class="aviso-btn-del" onclick="eliminarAviso('${av.key}')">🗑️ Eliminar</button>
          </div>` : ''}
        </div>
      </div>`;
  }).join('');
}

/* ── Marcar vendido (solo el dueño) ── */
function marcarAvisoVendido(key) {
  if (!fbDB) return;
  fbDB.ref('mercado_cuevo/' + key).update({ estado: 'vendido' })
    .then(() => toast('✅ Aviso marcado como vendido'))
    .catch(() => toast('❌ No se pudo actualizar'));
}

/* ── Reactivar aviso (solo el dueño) ── */
function reabrirAviso(key) {
  if (!fbDB) return;
  fbDB.ref('mercado_cuevo/' + key).update({ estado: 'disponible' })
    .then(() => toast('🔄 Aviso reactivado'))
    .catch(() => toast('❌ No se pudo actualizar'));
}

/* ── Eliminar aviso (solo el dueño) ── */
function eliminarAviso(key) {
  if (!fbDB) return;
  if (!confirm('¿Eliminar este aviso definitivamente?')) return;
  fbDB.ref('mercado_cuevo/' + key).remove()
    .then(() => toast('🗑️ Aviso eliminado'))
    .catch(() => toast('❌ No se pudo eliminar'));
}

function openPublicarAviso() { openModal('modalMercado'); }

async function publicarAviso() {
  const cat      = document.getElementById('merCat')?.value;
  const nombre   = document.getElementById('merNombre')?.value.trim();
  const titulo   = document.getElementById('merTitulo')?.value.trim();
  const desc     = document.getElementById('merDesc')?.value.trim();
  const contacto = document.getElementById('merContacto')?.value.trim();
  const fotoFile = document.getElementById('merFoto')?.files?.[0];
  if (!nombre || !titulo) { toast('⚠️ Completa tu nombre y el aviso'); return; }
  if (!fbDB) { toast('⚠️ Sin conexión'); return; }
  const btn = document.querySelector('#modalMercado .modal-btn-pub');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Publicando...'; }
  try {
    let imagenUrl = null;
    if (fotoFile) {
      if (btn) btn.textContent = '📤 Subiendo foto...';
      imagenUrl = await _uploadImagen(fotoFile);
    }
    if (btn) btn.textContent = '⏳ Guardando...';
    await fbDB.ref('mercado_cuevo').push({
      cat, nombre, titulo,
      desc: desc || '', contacto: contacto || '',
      imagen: imagenUrl || null,
      ts: Date.now(), uid: _uid,
      estado: 'disponible'
    });
    toast('✅ ¡Aviso publicado en el mercado!');
    closeModal('modalMercado');
    ['merNombre','merTitulo','merDesc','merContacto'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    removeFoto('merFoto','merFotoPreview','merFotoLabel');
    _sumarPuntosOyente(8, 'publicó aviso en mercado');
  } catch(e) { toast('❌ Error: ' + e.message); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '📢 Publicar aviso'; } }
}

/* Lightbox para ver imagen grande */
function abrirImagenGrande(url) {
  const lb = document.createElement('div');
  lb.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;cursor:zoom-out;backdrop-filter:blur(8px)';
  lb.innerHTML = `<img src="${url}" style="max-width:92vw;max-height:88vh;border-radius:12px;object-fit:contain" alt="Imagen completa">`;
  lb.onclick = () => lb.remove();
  document.body.appendChild(lb);
}

/* ══════════════════════════════════════════════════════════
   6. EMPLEOS DE CUEVO
══════════════════════════════════════════════════════════ */
let _empleoTipo = 'todo';
let _empleoData = [];

function initEmpleos() {
  if (!fbDB) return;
  fbDB.ref('empleos_cuevo').orderByChild('ts').limitToLast(30).on('value', snap => {
    _empleoData = [];
    snap.forEach(c => _empleoData.unshift(c.val()));
    renderEmpleos();
  });
}

function setEmpleoTipo(btn, tipo) {
  document.querySelectorAll('.emp-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  _empleoTipo = tipo;
  renderEmpleos();
}

function renderEmpleos() {
  const list = document.getElementById('empleoList');
  if (!list) return;
  const items = _empleoTipo==='todo' ? _empleoData : _empleoData.filter(i=>i.tipo===_empleoTipo);
  if (!items.length) {
    list.innerHTML = `<div class="empleo-empty">🙋 No hay empleos de "${_empleoTipo}" aún. ¡Publica el tuyo!</div>`;
    return;
  }
  list.innerHTML = items.map(emp => {
    const wa = emp.contacto ? emp.contacto.replace(/[^0-9]/g,'') : '';
    const tipoLabel = emp.tipo==='ofrezco' ? '💼 OFREZCO TRABAJO' : '🔍 BUSCO TRABAJO';
    return `
      <div class="empleo-card">
        <div class="emp-tipo-badge ${emp.tipo}">${tipoLabel}</div>
        <div class="emp-titulo">${_esc(emp.titulo)}</div>
        <div class="emp-desc">${_esc(emp.desc)}</div>
        <div class="aviso-foot">
          <span class="aviso-nombre">👤 ${_esc(emp.nombre)} · ${_fmtFecha(emp.ts)}</span>
          ${wa?`<a class="aviso-wa" href="https://wa.me/591${wa}" target="_blank" rel="noopener">📱 WhatsApp</a>`:''}
        </div>
      </div>`;
  }).join('');
}

function openPublicarEmpleo() { openModal('modalEmpleo'); }

async function publicarEmpleo() {
  const tipo     = document.getElementById('empTipo')?.value;
  const nombre   = document.getElementById('empNombre')?.value.trim();
  const titulo   = document.getElementById('empTitulo')?.value.trim();
  const desc     = document.getElementById('empDesc')?.value.trim();
  const contacto = document.getElementById('empContacto')?.value.trim();
  if (!nombre||!titulo) { toast('⚠️ Completa tu nombre y el puesto'); return; }
  if (!fbDB) { toast('⚠️ Sin conexión'); return; }
  const btn = document.querySelector('#modalEmpleo .modal-btn-pub');
  if (btn) { btn.disabled=true; btn.textContent='Publicando...'; }
  try {
    await fbDB.ref('empleos_cuevo').push({ tipo,nombre,titulo,desc:desc||'',contacto:contacto||'',ts:Date.now(),uid:_uid });
    toast('✅ ¡Empleo publicado!');
    closeModal('modalEmpleo');
    ['empNombre','empTitulo','empDesc','empContacto'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    _sumarPuntosOyente(8, 'publicó empleo');
  } catch(e) { toast('❌ Error: '+e.message); }
  finally { if(btn){btn.disabled=false;btn.textContent='📢 Publicar empleo';} }
}

/* ══════════════════════════════════════════════════════════
   7. RANKING DE OYENTES MÁS ACTIVOS
══════════════════════════════════════════════════════════ */
let _miNickRanking = localStorage.getItem('dilson_chat_nick') || 'Oyente';

function _sumarPuntosOyente(puntos, accion) {
  if (!fbDB || !_uid) return;
  const nick = localStorage.getItem('dilson_chat_nick') || 'Oyente';
  const ref = fbDB.ref(`ranking_oyentes/${_uid}`);
  ref.transaction(actual => {
    if (!actual) return { uid:_uid, nick, pts:puntos, ts:Date.now() };
    return { ...actual, nick, pts:(actual.pts||0)+puntos, ts:Date.now() };
  });
}

/* Llamar _sumarPuntosOyente desde acciones existentes */
/* Pedir canción = 3pts, dedicatoria = 5pts, reacción = 1pt */
const _origSendMsg = window.sendMessage;
if (typeof _origSendMsg === 'function') {
  window.sendMessage = function(...args) {
    _origSendMsg.apply(this, args);
    _sumarPuntosOyente(2, 'mensaje en chat');
  };
}

function initRankingOyentes() {
  if (!fbDB) return;
  fbDB.ref('ranking_oyentes').orderByChild('pts').limitToLast(20).on('value', snap => {
    const items = [];
    snap.forEach(c => items.unshift(c.val()));
    renderRankingOyentes(items);
  });
}

function renderRankingOyentes(items) {
  if (!items.length) {
    const list = document.getElementById('rankingOyentesList');
    if (list) list.innerHTML = '<div class="ranking-empty">Sé el primero en el ranking 🏆</div>';
    return;
  }

  const medallas = ['🥇','🥈','🥉'];
  const top3 = items.slice(0,3);
  const resto = items.slice(3);

  /* Top 3 */
  const topEl = document.getElementById('rankingOyentesTop');
  if (topEl) {
    topEl.innerHTML = top3.map((oy,i) => `
      <div class="rank-top-card pos-${i+1}">
        <div class="rank-medal">${medallas[i]}</div>
        <div class="rank-avatar">${(oy.nick||'?').charAt(0).toUpperCase()}</div>
        <div class="rank-nombre">${_esc(oy.nick||'Oyente')}</div>
        <div class="rank-pts">${oy.pts||0} pts</div>
      </div>`).join('');
  }

  /* Resto */
  const listEl = document.getElementById('rankingOyentesList');
  if (listEl) {
    listEl.innerHTML = resto.map((oy,i) => {
      const esYo = oy.uid === _uid;
      return `
        <div class="rank-item${esYo?' es-yo':''}">
          <span class="rank-num">#${i+4}</span>
          <div class="rank-av2">${(oy.nick||'?').charAt(0).toUpperCase()}</div>
          <div class="rank-info2">
            <div class="rank-n2">${_esc(oy.nick||'Oyente')}${esYo?' (tú)':''}</div>
            <div class="rank-pts2">${oy.pts||0} pts</div>
          </div>
        </div>`;
    }).join('') || '<div class="ranking-empty" style="padding:12px">Solo los 3 primeros por ahora</div>';
  }

  /* Mi posición */
  const miIdx = items.findIndex(o => o.uid === _uid);
  const miPosEl = document.getElementById('rankingMiPos');
  if (miPosEl) {
    if (miIdx >= 0) {
      miPosEl.style.display = 'block';
      miPosEl.textContent = `Tu posición: #${miIdx+1} · ${items[miIdx].pts||0} puntos 🎖️`;
    } else {
      miPosEl.style.display = 'block';
      miPosEl.textContent = '¡Participa para entrar al ranking! 🎵';
    }
  }
}

/* ══════════════════════════════════════════════════════════
   INICIALIZACIÓN — enganchar al initFirebase existente
══════════════════════════════════════════════════════════ */
const _origInitFbComunidad = window.initFirebase;
window.initFirebase = function() {
  if (typeof _origInitFbComunidad === 'function') _origInitFbComunidad();
  /* Esperar un tick para que fbDB esté listo */
  setTimeout(() => {
    initNoticias();
    initEncuesta();
    initEventos();
    initMercado();
    initEmpleos();
    initRankingOyentes();
  }, 300);
};

/* Puntos por acciones ya existentes */
document.addEventListener('DOMContentLoaded', () => {
  /* Reacciones: +1pt */
  document.querySelectorAll('.react-btn').forEach(btn => {
    btn.addEventListener('click', () => _sumarPuntosOyente(1, 'reacción'));
  });
});

