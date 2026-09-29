// mailer.js
// Envía un correo de notificación cada vez que llega una solicitud nueva.
// Si no configuras las variables de SMTP en .env, simplemente lo muestra
// en la consola en vez de fallar, para que puedas probar el resto sin
// tener el correo listo todavía.

import nodemailer from 'nodemailer';

// Valores de ejemplo que vienen en .env.example — si el usuario no los
// cambió todavía, es mejor no intentar usarlos como credenciales reales.
const VALORES_DE_EJEMPLO = ['tucorreo@gmail.com', 'tu-contraseña-de-aplicacion'];

// Quita saltos de línea de un texto antes de usarlo en un encabezado de
// correo (como el asunto), para que nadie pueda "inyectar" líneas extra
// escribiendo cosas raras en el formulario.
function limpiarParaEncabezado(texto) {
  return String(texto || '').replace(/[\r\n]+/g, ' ').trim();
}

function construirTransportador() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null; // No configurado todavía.
  }

  if (VALORES_DE_EJEMPLO.includes(SMTP_USER) || VALORES_DE_EJEMPLO.includes(SMTP_PASS)) {
    return null; // Siguen siendo los valores de ejemplo, no credenciales reales.
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

export async function notificarNuevaSolicitud(solicitud) {
  const transportador = construirTransportador();
  const destino = process.env.NOTIFY_EMAIL;

  const cuerpo = `
Nueva solicitud de visita — WS. SERVICIOS

Nombre: ${solicitud.nombre}
Teléfono: ${solicitud.telefono}
Correo: ${solicitud.correo || '(no dejó correo)'}
Dirección/barrio: ${solicitud.direccion}
Servicio: ${solicitud.servicio}
Detalle: ${solicitud.detalle || '(sin detalle)'}
`.trim();

  if (!transportador || !destino) {
    console.log('--- [correo NO configurado, mostrando en consola] ---');
    console.log(cuerpo);
    console.log('-----------------------------------------------------');
    return;
  }

  await transportador.sendMail({
    from: `"WS. SERVICIOS — Web" <${process.env.SMTP_USER}>`,
    to: destino,
    subject: `Nueva solicitud de ${limpiarParaEncabezado(solicitud.nombre)}`,
    text: cuerpo
  });
}
