// server.js
import 'dotenv/config';
import { createHmac, timingSafeEqual } from 'crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { crearSolicitud, listarSolicitudes } from './db.js';
import { notificarNuevaSolicitud } from './mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN?.trim();
const ADMIN_SESSION_COOKIE = 'ws_admin_session';
const ADMIN_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === 'production';

if (process.env.RENDER === 'true') {
  app.set('trust proxy', 1);
}

if (isProduction && (!ADMIN_TOKEN || ADMIN_TOKEN === 'cambia-esto' || ADMIN_TOKEN.length < 32)) {
  throw new Error('Production requires a unique ADMIN_TOKEN of at least 32 characters.');
}

if (!ADMIN_TOKEN || ADMIN_TOKEN === 'cambia-esto') {
  console.warn('Admin panel disabled: configure a unique ADMIN_TOKEN in the environment.');
}

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '2kb' }));
app.get('/healthz', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'ok' });
});
app.use(express.static(path.join(__dirname, 'public')));

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.' }
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiados intentos. Espera unos minutos antes de volver a iniciar sesión.'
});

function compararSecretos(a, b) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

function escaparHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[caracter]);
}

function firmarSesionAdmin(expiraEn) {
  return createHmac('sha256', ADMIN_TOKEN).update(expiraEn).digest('base64url');
}

function tieneSesionAdmin(req) {
  const cookie = req.headers.cookie?.split(';')
    .map(parte => parte.trim())
    .find(parte => parte.startsWith(ADMIN_SESSION_COOKIE + '='))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1);

  if (!cookie) return false;

  const [expiraEn, firma, ...sobrantes] = cookie.split('.');
  if (!/^\d{13}$/.test(expiraEn) || !firma || sobrantes.length) return false;
  if (Number(expiraEn) <= Date.now() || Number(expiraEn) > Date.now() + ADMIN_SESSION_DURATION_MS) return false;

  return compararSecretos(firma, firmarSesionAdmin(expiraEn));
}

function cookieSesionAdmin(expiraEn, maxAge) {
  const opciones = [
    `${ADMIN_SESSION_COOKIE}=${expiraEn ? `${expiraEn}.${firmarSesionAdmin(expiraEn)}` : ''}`,
    'Path=/admin',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`
  ];
  if (isProduction) opciones.push('Secure');
  return opciones.join('; ');
}

function mostrarAccesoAdmin(res, mensaje = '') {
  res.set('Cache-Control', 'no-store');
  res.status(mensaje ? 401 : 200).send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Acceso al panel — WS. SERVICIOS</title>
    <style>
      body{margin:0;padding:32px;background:#f5f7f4;color:#172b22;font:16px system-ui,sans-serif}
      main{max-width:400px;margin:8vh auto;padding:28px;background:#fff;border:1px solid #dce6df;border-radius:18px}
      h1{font-size:24px;margin-top:0}label{display:block;margin:20px 0 6px}
      input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #b9ccc0;border-radius:8px;font:inherit}
      button{margin-top:18px;padding:12px 18px;border:0;border-radius:24px;background:#197457;color:white;font:inherit;font-weight:700;cursor:pointer}
      p{color:#a33}
    </style>
  </head>
  <body><main>
    <h1>Panel de solicitudes</h1>
    ${mensaje ? `<p role="alert">${escaparHtml(mensaje)}</p>` : ''}
    <form method="post" action="/admin/login">
      <label for="token">Clave de administración</label>
      <input id="token" name="token" type="password" autocomplete="current-password" required>
      <button type="submit">Iniciar sesión</button>
    </form>
  </main></body>
</html>`);
}

// Crear una solicitud nueva desde el formulario del sitio.
app.post('/api/solicitudes', formLimiter, async (req, res) => {
  const entrada = req.body;
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
    return res.status(400).json({ ok: false, error: 'La solicitud no tiene un formato válido.' });
  }

  const campos = ['nombre', 'telefono', 'direccion', 'servicio', 'detalle', 'correo'];
  if (campos.some(campo => entrada[campo] !== undefined && typeof entrada[campo] !== 'string')) {
    return res.status(400).json({ ok: false, error: 'Revisa los datos del formulario.' });
  }

  const nombre = (entrada.nombre || '').trim();
  const telefono = (entrada.telefono || '').trim();
  const direccion = (entrada.direccion || '').trim();
  const servicio = (entrada.servicio || '').trim();
  const detalle = (entrada.detalle || '').trim();
  const correo = (entrada.correo || '').trim();
  const serviciosPermitidos = new Set([
    'Mantenimiento de calentador',
    'Reparación de estufa u horno',
    'Instalación de gas natural',
    'Revisión de fuga o emergencia',
    'Instalación de calentador nuevo',
    'Otro'
  ]);

  if (!nombre || !telefono || !direccion || !servicio) {
    return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios.' });
  }
  if (nombre.length > 120 || direccion.length > 250 || detalle.length > 2000) {
    return res.status(400).json({ ok: false, error: 'Uno de los campos supera el máximo permitido.' });
  }
  if (!/^[0-9]{7,10}$/.test(telefono)) {
    return res.status(400).json({ ok: false, error: 'El teléfono debe tener entre 7 y 10 números.' });
  }
  if (!serviciosPermitidos.has(servicio)) {
    return res.status(400).json({ ok: false, error: 'Selecciona un servicio válido.' });
  }
  if (correo.length > 254 || (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))) {
    return res.status(400).json({ ok: false, error: 'El correo no tiene un formato válido.' });
  }

  try {
    const id = crearSolicitud({ nombre, telefono, direccion, servicio, detalle, correo });

    try {
      await notificarNuevaSolicitud({ nombre, telefono, direccion, servicio, detalle, correo });
    } catch (mailErr) {
      // La solicitud ya se guardó bien; que falle el correo no debe
      // tumbar la respuesta al usuario. Solo lo dejamos en el log.
      console.error('No se pudo enviar el correo de notificación (la solicitud sí se guardó):', mailErr.message);
    }

    res.json({ ok: true, id });
  } catch (err) {
    console.error('Error guardando solicitud:', err);
    res.status(500).json({ ok: false, error: 'No se pudo guardar la solicitud.' });
  }
});

app.post('/admin/login', loginLimiter, (req, res) => {
  if (!ADMIN_TOKEN || ADMIN_TOKEN === 'cambia-esto') {
    return res.status(503).send('El panel de administración no está configurado.');
  }

  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  if (!compararSecretos(token, ADMIN_TOKEN)) {
    return mostrarAccesoAdmin(res, 'La clave no es correcta.');
  }

  const expiraEn = String(Date.now() + ADMIN_SESSION_DURATION_MS);
  res.set('Set-Cookie', cookieSesionAdmin(expiraEn, ADMIN_SESSION_DURATION_MS / 1000));
  res.redirect(303, '/admin');
});

app.get('/admin', (req, res) => {
  if (!ADMIN_TOKEN || ADMIN_TOKEN === 'cambia-esto') {
    return res.status(503).send('El panel de administración no está configurado.');
  }
  if (!tieneSesionAdmin(req)) return mostrarAccesoAdmin(res);

  res.set('Cache-Control', 'no-store');

  const solicitudes = listarSolicitudes();
  const filas = solicitudes.map(s => `
    <tr>
      <td>${escaparHtml(s.id)}</td>
      <td>${escaparHtml(s.creado_en)}</td>
      <td>${escaparHtml(s.nombre)}</td>
      <td>${escaparHtml(s.telefono)}</td>
      <td>${escaparHtml(s.direccion)}</td>
      <td>${escaparHtml(s.servicio)}</td>
      <td>${escaparHtml(s.detalle)}</td>
    </tr>
  `).join('');

  res.send(`
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Solicitudes — WS. SERVICIOS</title>
        <style>
          body{font-family:sans-serif; background:#0D1922; color:#EEF2F3; padding:24px;}
          table{border-collapse:collapse; width:100%;}
          th, td{border:1px solid #26404B; padding:8px 10px; font-size:14px; text-align:left;}
          th{background:#132531;}
        </style>
      </head>
      <body>
        <h1>Solicitudes recibidas (${solicitudes.length})</h1>
        <form method="post" action="/admin/logout"><button type="submit">Cerrar sesión</button></form>
        <table>
          <tr><th>#</th><th>Fecha</th><th>Nombre</th><th>Teléfono</th><th>Dirección</th><th>Servicio</th><th>Detalle</th></tr>
          ${filas || '<tr><td colspan="7">Todavía no hay solicitudes.</td></tr>'}
        </table>
      </body>
    </html>
  `);
});

app.post('/admin/logout', (req, res) => {
  res.set('Set-Cookie', cookieSesionAdmin('', 0));
  res.redirect(303, '/admin');
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, error: 'La solicitud supera el tamaño permitido.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: 'La solicitud no tiene un formato válido.' });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Panel de solicitudes en http://localhost:${PORT}/admin`);
});
