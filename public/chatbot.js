// ============================================================
// CHATBOT DE PREGUNTAS FRECUENTES (sin IA, por palabras clave)
// ============================================================

// Cada "intención" tiene palabras clave que la activan y una
// respuesta fija. El orden importa: se revisa de arriba hacia
// abajo y se usa la PRIMERA que coincida.
const INTENCIONES = [
  {
    id: 'saludo',
    palabrasClave: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey'],
    respuesta: '¡Hola! Soy el asistente de WS. SERVICIOS 🔧 Puedo ayudarte con horarios, servicios, zona de cobertura o precios. ¿Qué necesitas saber?'
  },

   {
    id: 'quienes',
    palabrasClave: ['eres tecnico', 'quien eres', 'eres real', 'eres humano', 'eres una persona'],
    respuesta: 'Soy un asistente automático que responde las preguntas más comunes sobre WS. SERVICIOS. Para hablar con Willian directamente, escríbele por WhatsApp.'
  },
  
  {
    id: 'fuga',
    palabrasClave: ['fuga', 'huele a gas', 'huele gas', 'emergencia', 'urgente', 'urgencia'],
    respuesta: '⚠️ Si percibes olor a gas: no enciendas llamas ni uses interruptores o aparatos eléctricos. Sal del lugar y, desde un sitio seguro, llama a la línea de emergencias de tu empresa prestadora de gas. No esperes una respuesta por este chat.'
  },
  
  {
    id: 'horario',
    palabrasClave: ['horario', 'hora', 'atienden', 'abierto', 'abren', 'cierran'],
    respuesta: 'Atendemos de lunes a sábado, de 7:00 a.m. a 6:00 p.m. Para emergencias fuera de ese horario, escríbenos por WhatsApp.'
  },
  {
    id: 'servicios',
    palabrasClave: ['servicio', 'que hacen', 'reparan', 'instalan', 'mantenimiento'],
    respuesta: 'Hacemos mantenimiento de calentadores, reparación de estufas y hornos, instalación de redes de gas natural, revisión de fugas, e instalación de calentadores nuevos.'
  },
  {
    id: 'precios',
    palabrasClave: ['precio', 'cuanto cuesta', 'tarifa', 'costo', 'vale'],
    respuesta: 'El costo depende del equipo y del problema, así que lo confirmamos después de revisarlo en la visita. Cuéntanos qué necesitas por WhatsApp y te damos un estimado.'
  },
  {
    id: 'cobertura',
    palabrasClave: ['zona', 'cubren', 'ciudad', 'municipio', 'bogota', 'cundinamarca', 'llegan'],
    respuesta: 'Atendemos Bogotá D.C. y municipios de Cundinamarca. Escríbenos tu dirección por WhatsApp para confirmar la cobertura exacta en tu zona.'
  },
  {
    id: 'garantia',
    palabrasClave: ['garantia', 'garantía'],
    respuesta: 'Todos nuestros trabajos incluyen garantía. Te explicamos el tiempo y las condiciones exactas durante la visita, según el tipo de servicio.'
  },
  {
    id: 'contacto',
    palabrasClave: ['contacto', 'whatsapp', 'telefono', 'teléfono', 'numero', 'número', 'llamar'],
    respuesta: 'Puedes escribirnos por WhatsApp al +57 317 863 3441, o llenar el formulario de esta página y te contactamos nosotros.'
  },
  {
    id: 'gracias',
    palabrasClave: ['gracias', 'listo', 'chao', 'adios', 'adiós', 'hasta luego'],
    respuesta: '¡Con gusto! Si te surge otra duda, aquí estoy.'
  }
];

const RESPUESTA_POR_DEFECTO = 'No estoy seguro de haber entendido eso. Puedo ayudarte con horarios, servicios, zona de cobertura, precios o garantía — o escríbenos directo por WhatsApp para hablar con nosotros.';

// Los "chips" de preguntas rápidas que aparecen como botones
const PREGUNTAS_RAPIDAS = [
  { texto: 'Horario', intencion: 'horario' },
  { texto: 'Servicios', intencion: 'servicios' },
  { texto: 'Zona de cobertura', intencion: 'cobertura' },
  { texto: 'Precios', intencion: 'precios' },
  { texto: 'Huele a gas 🚨', intencion: 'fuga' }
];

// ------------------------------------------------------------
// Quita tildes y pasa a minúsculas, para que "Cuánto" y "cuanto"
// se reconozcan igual al buscar palabras clave.
// ------------------------------------------------------------
function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // quita los acentos
}

// Busca la primera intención cuya palabra clave esté contenida
// en el mensaje de la persona.
function buscarRespuesta(mensajeUsuario) {
  const textoNormalizado = normalizarTexto(mensajeUsuario);

  for (const intencion of INTENCIONES) {
    const coincide = intencion.palabrasClave.some(palabra =>
      textoNormalizado.includes(normalizarTexto(palabra))
    );
    if (coincide) {
      return intencion.respuesta;
    }
  }

  return RESPUESTA_POR_DEFECTO;
}

// ------------------------------------------------------------
// Elementos del DOM
// ------------------------------------------------------------
const chatBubble = document.getElementById('chat-bubble');
const chatPanel = document.getElementById('chat-panel');
const chatClose = document.getElementById('chat-close');
const chatMessages = document.getElementById('chat-messages');
const chatQuickReplies = document.getElementById('chat-quick-replies');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

let yaSeAbrioUnaVez = false;

function agregarMensaje(texto, autor) {
  const burbuja = document.createElement('div');
  burbuja.className = 'chat-msg ' + autor; // 'bot' o 'user'
  burbuja.textContent = texto;
  chatMessages.appendChild(burbuja);
  chatMessages.scrollTop = chatMessages.scrollHeight; // baja el scroll al último mensaje
}

function mostrarPreguntasRapidas() {
  chatQuickReplies.innerHTML = ''; // limpia los chips anteriores

  PREGUNTAS_RAPIDAS.forEach(({ texto, intencion }) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chat-chip';
    chip.textContent = texto;
    chip.addEventListener('click', () => {
      procesarMensaje(texto, intencion);
    });
    chatQuickReplies.appendChild(chip);
  });
}

// Simula que el bot está "escribiendo" antes de responder, para
// que se sienta un poco más natural que una respuesta instantánea.
function procesarMensaje(textoMostrado, idIntencionForzada) {
  agregarMensaje(textoMostrado, 'user');
  chatInput.value = '';

  const indicador = document.createElement('div');
  indicador.className = 'chat-msg bot typing';
  indicador.textContent = 'Escribiendo...';
  chatMessages.appendChild(indicador);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  setTimeout(() => {
    indicador.remove();

    const respuesta = idIntencionForzada
      ? INTENCIONES.find(i => i.id === idIntencionForzada).respuesta
      : buscarRespuesta(textoMostrado);

    agregarMensaje(respuesta, 'bot');
  }, 500);
}

// ------------------------------------------------------------
// Abrir / cerrar el panel del chat
// ------------------------------------------------------------
function abrirChat() {
  chatPanel.classList.add('open');

  // Solo muestra el saludo y los chips la primera vez que se abre.
  if (!yaSeAbrioUnaVez) {
    agregarMensaje('¡Hola! Soy el asistente de WS. SERVICIOS 🔧 Elige una pregunta o escribe la tuya.', 'bot');
    mostrarPreguntasRapidas();
    yaSeAbrioUnaVez = true;
  }

  chatInput.focus();
}

function cerrarChat() {
  chatPanel.classList.remove('open');
}

chatBubble.addEventListener('click', () => {
  const estaAbierto = chatPanel.classList.contains('open');
  estaAbierto ? cerrarChat() : abrirChat();
});

chatClose.addEventListener('click', cerrarChat);

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const mensaje = chatInput.value.trim();
  if (!mensaje) return;
  procesarMensaje(mensaje);
});