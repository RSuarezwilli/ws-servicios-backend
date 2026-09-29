document.body.classList.add('js-ready');

// ============================================================
// 1. BARRA DE PROGRESO DE LECTURA (arriba de la página)
// ============================================================
const progressBar = document.getElementById('progress-bar');

function actualizarBarraProgreso() {
  const alturaTotal = document.documentElement.scrollHeight - window.innerHeight;
  const progreso = alturaTotal > 0 ? (window.scrollY / alturaTotal) * 100 : 0;
  progressBar.style.width = progreso + '%';
}

// ============================================================
// 2. ENCABEZADO QUE SE "ENCOGE" AL HACER SCROLL
// ============================================================
const header = document.getElementById('site-header');

function actualizarHeader() {
  if (window.scrollY > 40) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}

// ============================================================
// 3. BOTÓN "VOLVER ARRIBA"
// ============================================================
const toTopBtn = document.getElementById('to-top');

function actualizarBotonArriba() {
  if (window.scrollY > 500) {
    toTopBtn.classList.add('visible');
  } else {
    toTopBtn.classList.remove('visible');
  }
}

toTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Agrupamos las 3 funciones de scroll en un solo listener, para no
// registrar tres eventos de scroll separados (más eficiente).
window.addEventListener('scroll', () => {
  actualizarBarraProgreso();
  actualizarHeader();
  actualizarBotonArriba();
});

// ============================================================
// 4. MENÚ MÓVIL (hamburguesa)
// ============================================================
const hamburger = document.getElementById('hamburger');
const mobileDrawer = document.getElementById('mobile-drawer');
const drawerBackdrop = document.getElementById('drawer-backdrop');

function abrirMenu() {
  hamburger.classList.add('open');
  mobileDrawer.classList.add('open');
  drawerBackdrop.classList.add('open');
  hamburger.setAttribute('aria-expanded', 'true');
}

function cerrarMenu() {
  hamburger.classList.remove('open');
  mobileDrawer.classList.remove('open');
  drawerBackdrop.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
}

hamburger.addEventListener('click', () => {
  const estaAbierto = mobileDrawer.classList.contains('open');
  estaAbierto ? cerrarMenu() : abrirMenu();
});

drawerBackdrop.addEventListener('click', cerrarMenu);

// Si la persona hace clic en un link del menú, lo cerramos para que
// pueda ver la sección a la que saltó.
mobileDrawer.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', cerrarMenu);
});

// ============================================================
// 5. ANIMACIÓN AL APARECER EN PANTALLA (scroll reveal)
// ============================================================
// IntersectionObserver avisa cuando un elemento entra o sale del área
// visible, sin tener que calcular posiciones manualmente en cada scroll.
const elementosParaRevelar = document.querySelectorAll('.reveal');

const observador = new IntersectionObserver((entradas) => {
  entradas.forEach(entrada => {
    if (entrada.isIntersecting) {
      const elemento = entrada.target;
      const retraso = elemento.dataset.revealDelay || 0;

      setTimeout(() => {
        elemento.classList.add('is-visible');
      }, retraso);

      // Una vez que ya apareció, dejamos de observarlo (no necesita
      // volver a animarse si la persona sube y baja la página).
      observador.unobserve(elemento);
    }
  });
}, {
  threshold: 0.15 // se activa cuando el 15% del elemento es visible
});

elementosParaRevelar.forEach(el => observador.observe(el));

// ============================================================
// 6. NÚMEROS QUE CUENTAN HACIA ARRIBA (los de la barra de estadísticas)
// ============================================================
function animarConteo(elemento) {
  const destino = Number(elemento.dataset.count);
  const sufijo = elemento.dataset.suffix || '';
  const duracion = 1200; // milisegundos
  const inicio = performance.now();

  function paso(ahora) {
    const progreso = Math.min((ahora - inicio) / duracion, 1);
    const valorActual = Math.floor(progreso * destino);
    elemento.textContent = valorActual + sufijo;

    if (progreso < 1) {
      requestAnimationFrame(paso);
    }
  }

  requestAnimationFrame(paso);
}

const numerosParaContar = document.querySelectorAll('.num[data-count]');
const numerosDeTexto = document.querySelectorAll('.num[data-text]');

// Los que son texto fijo (como "SENA" o "✓") solo se muestran, sin contar.
numerosDeTexto.forEach(el => { el.textContent = el.dataset.text; });

// Los numéricos se animan solo la primera vez que se ven en pantalla.
const observadorNumeros = new IntersectionObserver((entradas) => {
  entradas.forEach(entrada => {
    if (entrada.isIntersecting) {
      animarConteo(entrada.target);
      observadorNumeros.unobserve(entrada.target);
    }
  });
}, { threshold: 0.5 });

numerosParaContar.forEach(el => observadorNumeros.observe(el));

// ============================================================
// 7. BRILLO QUE SIGUE AL CURSOR EN EL HERO
// ============================================================
const hero = document.getElementById('hero');
const cursorGlow = document.getElementById('cursor-glow');

hero.addEventListener('mousemove', (e) => {
  const rect = hero.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  cursorGlow.style.setProperty('--x', x + '%');
  cursorGlow.style.setProperty('--y', y + '%');
});

// ============================================================
// 8. FORMULARIO: guarda en el backend y abre WhatsApp
// (esta parte es la misma lógica que ya conocías)
// ============================================================
document.getElementById('visit-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const status = document.getElementById('form-status');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  const datos = {
    nombre: document.getElementById('f-name').value.trim(),
    telefono: document.getElementById('f-phone').value.trim(),
    correo: document.getElementById('f-email').value.trim(),
    direccion: document.getElementById('f-address').value.trim(),
    servicio: document.getElementById('f-service').value,
    detalle: document.getElementById('f-detail').value.trim()
  };

  // --- Validaciones antes de enviar ---
  const soloNumeros = /^[0-9]{7,10}$/;
  if (!soloNumeros.test(datos.telefono)) {
    status.style.display = 'block';
    status.textContent = 'El teléfono debe tener entre 7 y 10 números, sin espacios ni letras.';
    return;
  }

  if (datos.correo) {
    const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formatoCorreo.test(datos.correo)) {
      status.style.display = 'block';
      status.textContent = 'Ese correo no parece válido. Revísalo o déjalo vacío.';
      return;
    }
  }

  status.style.display = 'block';

  status.style.display = 'block';
  status.textContent = 'Enviando solicitud...';
  submitBtn.disabled = true;

  try {
    const resp = await fetch('/api/solicitudes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

    const data = await resp.json();

    if (!resp.ok || !data.ok) {
      throw new Error(data.error || 'Error al enviar la solicitud.');
    }

    status.textContent = '¡Listo! Recibimos tu solicitud, te contactaremos pronto.';
    e.target.reset();

    const lineas = [
      'Hola, quiero agendar una visita.',
      'Nombre: ' + datos.nombre,
      'Teléfono: ' + datos.telefono,
      'Dirección/barrio: ' + datos.direccion,
      'Servicio: ' + datos.servicio
    ];
    if (datos.detalle) lineas.push('Detalle: ' + datos.detalle);
    const msg = encodeURIComponent(lineas.join('\n'));
    window.open('https://wa.me/573178633441?text=' + msg, '_blank');

  } catch (err) {
    console.error(err);
    status.textContent = 'No se pudo enviar la solicitud. Intenta de nuevo o escríbenos por WhatsApp.';
  } finally {
    submitBtn.disabled = false;
  }
});
