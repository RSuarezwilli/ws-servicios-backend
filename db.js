// db.js
// Guarda las solicitudes en un archivo JSON local o en el disco persistente del alojamiento.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.SOLICITUDES_FILE || path.join(__dirname, 'solicitudes.json');

function leerTodas() {
  if (!fs.existsSync(DB_PATH)) {
    return [];
  }
  const contenido = fs.readFileSync(DB_PATH, 'utf-8').trim();
  return contenido ? JSON.parse(contenido) : [];
}

function guardarTodas(lista) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(lista, null, 2), 'utf-8');
}

export function crearSolicitud({ nombre, telefono, direccion, servicio, detalle, correo }) {
  const lista = leerTodas();
  const nuevoId = lista.length ? lista[lista.length - 1].id + 1 : 1;

  const nueva = {
    id: nuevoId,
    nombre,
    telefono,
    direccion,
    servicio,
    detalle: detalle || '',
    correo: correo || '',
    creado_en: new Date().toLocaleString('es-CO')
  };

  lista.push(nueva);
  guardarTodas(lista);
  return nuevoId;
}

export function listarSolicitudes() {
  return leerTodas().slice().reverse(); // más nuevas primero
}
