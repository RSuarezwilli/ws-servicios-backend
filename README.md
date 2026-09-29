# WS. SERVICIOS — Sitio + Backend

Este proyecto une tu página web (`public/`) con un backend en Node.js + Express
que guarda cada solicitud del formulario en un archivo JSON local (`solicitudes.json`)
y puede enviar una notificación por correo.

Este proyecto usa **ES Modules** (`import`/`export`), la sintaxis moderna de
JavaScript, en vez de `require`/`module.exports`.

## Estructura

```
ws-backend/
  server.js        → servidor Express (rutas y arranque)
  db.js             → almacenamiento local de solicitudes en JSON
  mailer.js         → envío del correo de notificación
  .env.example      → plantilla de variables de entorno
  public/           → tu sitio web (index.html, style.css, script.js)
```

## 1. Requisitos

Necesitas tener instalado **Node.js** (versión 18 o más reciente).
Verifícalo en una terminal con:

```
node -v
```

Si no lo tienes, descárgalo de https://nodejs.org

## 2. Instalar dependencias

Abre una terminal dentro de la carpeta `ws-backend` y ejecuta:

```
npm install
```

Esto instala Express, nodemailer, dotenv y nodemon.

## 3. Configurar variables de entorno

Copia el archivo de ejemplo:

```
Copy-Item .env.example .env
```

Genera un token privado aleatorio para el panel, por ejemplo:

```
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Pega el resultado como `ADMIN_TOKEN` en `.env`. No lo publiques ni lo compartas.
En producción, el servidor exige un token de al menos 32 caracteres.

- `ADMIN_TOKEN`: token secreto para iniciar sesión en el panel de solicitudes.
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `NOTIFY_EMAIL`: datos de correo, **opcional al inicio**.
  Si los dejas vacíos o de ejemplo, el sistema sigue funcionando: en vez de
  enviar el correo, simplemente imprime la notificación en la consola. Así
  puedes probar todo antes de configurar el correo real.

  Si usas Gmail, necesitas una "contraseña de aplicación" (no tu contraseña normal):
  https://myaccount.google.com/apppasswords

## 4. Correr el proyecto en local

```
npm run dev
```

Verás algo como:

```
Servidor corriendo en http://localhost:3000
Panel de solicitudes en http://localhost:3000/admin
```

Abre `http://localhost:3000` en el navegador: ahí está tu página, ya conectada
al backend. Llena el formulario y dale a "Enviar solicitud" — debe guardarse
y (si configuraste el correo) llegarte una notificación.

## 5. Ver las solicitudes guardadas

Entra a `http://localhost:3000/admin` e inicia sesión con el `ADMIN_TOKEN`
configurado en `.env`. El panel mantiene una sesión temporal en una cookie
HttpOnly; la clave no se envía en la URL.

También puedes abrir directamente el archivo `solicitudes.json` que se crea
solo en la carpeta del proyecto la primera vez que alguien envía el formulario.

## 6. Desplegar en Render

Este proyecto incluye `render.yaml` para configurar el servicio y un disco
persistente para las solicitudes:

1. Sube el proyecto a un repositorio privado en GitHub. No incluyas `.env` ni
   `solicitudes.json`; ambos están excluidos por `.gitignore`.
   Si ya tienes solicitudes guardadas en tu computador, no se transfieren con el
   despliegue; planifica una migración segura antes de publicarlo.
2. Inicia sesión en Render y elige **New > Blueprint**.
3. Conecta el repositorio y confirma la creación del Blueprint `ws-servicios`.
   Render instalará las dependencias, generará `ADMIN_TOKEN` y creará el disco
   persistente donde se guardan las solicitudes.
4. Cuando termine el despliegue, abre la URL `.onrender.com` que Render asignó.
   El servicio usa HTTPS y comprueba su estado en `/healthz`.
5. Guarda el valor generado de `ADMIN_TOKEN` desde las variables del servicio
   Render en un gestor de contraseñas. Lo necesitarás para iniciar sesión en
   `https://TU-DOMINIO.onrender.com/admin`; no lo compartas ni lo pongas en una URL.
6. Configura y prueba el correo SMTP desde las variables de entorno del servicio.
   Sin SMTP, las notificaciones aparecen solo en los registros de Render.

El disco persistente requiere un servicio pago y limita este almacenamiento JSON
a una sola instancia. No aumentes el número de instancias. Render crea snapshots
diarios del disco; verifica desde el panel la disponibilidad de snapshots y el
procedimiento de restauración.

Antes de anunciar la página, publica un aviso de privacidad con los datos reales
de la empresa, las finalidades del formulario y los canales para ejercer los
derechos sobre los datos personales. Prueba el formulario, correo, WhatsApp,
panel y recuperación de un snapshot en la URL de producción.

## 7. Panel y datos

Entra a `http://localhost:3000/admin` en local o a `/admin` en producción e
inicia sesión con `ADMIN_TOKEN`. La sesión usa una cookie temporal HttpOnly; la
clave no se envía en la URL. El formulario y el inicio de sesión limitan los
intentos por dirección IP.

Localmente, las solicitudes se guardan en `solicitudes.json` junto al servidor.
En Render, `SOLICITUDES_FILE` apunta al disco persistente configurado en
`render.yaml`.

El panel no acepta claves por URL. El archivo `.env` no se debe subir al
repositorio y ya está excluido en `.gitignore`.
