/**
 * Formulario de confirmación. Vive fuera del componente porque, dentro de una
 * expresión JSX de Astro, las llaves del JavaScript se interpretarían como
 * expresiones de plantilla.
 *
 * Escucha los eventos que emite el cliente de Firestore y solo hace algo si
 * el formulario existe, es decir, en la ruta /i/<slug>.
 */
(() => {
  const form = document.querySelector('[data-rsvp-form]');
  if (!form) return;

  const seccion = document.querySelector('.rsvp');
  const cfg = {
    horaCeremonia: seccion.dataset.horaCeremonia,
    fechaCompleta: seccion.dataset.fechaCompleta,
  };

  const cargando = document.querySelector('[data-rsvp-cargando]');
  const fallo = document.querySelector('[data-rsvp-fallo]');
  const detalle = document.querySelector('[data-rsvp-detalle]');
  const error = document.querySelector('[data-rsvp-error]');
  const enviar = document.querySelector('[data-rsvp-enviar]');
  const hecho = document.querySelector('[data-rsvp-hecho]');
  const hechoTitulo = document.querySelector('[data-rsvp-hecho-titulo]');
  const hechoMensaje = document.querySelector('[data-rsvp-hecho-mensaje]');
  const opciones = Array.from(document.querySelectorAll('[data-asiste]'));

  let asiste = null;
  let enviando = false;

  const mostrarError = (texto) => {
    error.textContent = texto;
    error.hidden = false;
  };

  const pintarOpciones = () => {
    opciones.forEach((b) => {
      const activo = (b.dataset.asiste === 'si') === (asiste === true) && asiste !== null;
      b.classList.toggle('rsvp__opcion--activa', activo);
      b.setAttribute('aria-pressed', String(activo));
    });
    detalle.hidden = asiste !== true;
    enviar.classList.toggle('rsvp__enviar--inactivo', asiste === null);
    if (asiste !== null) error.hidden = true;
  };

  const mostrarHecho = (confirmado, asistentes) => {
    hechoTitulo.textContent = confirmado ? '¡Te esperamos!' : 'Gracias por avisarnos';
    hechoMensaje.textContent = confirmado
      ? `Registramos tu confirmación${asistentes ? ` para ${asistentes} ${asistentes === 1 ? 'persona' : 'personas'}` : ''}. Nos vemos el ${cfg.fechaCompleta} a las ${cfg.horaCeremonia}.`
      : 'Te extrañaremos ese día. Gracias por tomarte el tiempo de responder.';
    cargando.hidden = true;
    form.hidden = true;
    hecho.hidden = false;
  };

  document.addEventListener('invitado:listo', () => {
    cargando.hidden = true;
    form.hidden = false;
    pintarOpciones();
  });

  document.addEventListener('invitado:ya-respondio', (e) => {
    mostrarHecho(e.detail.estado === 'confirmado', e.detail.asistentes);
  });

  document.addEventListener('invitado:error', () => {
    cargando.hidden = true;
    fallo.hidden = false;
  });

  opciones.forEach((b) =>
    b.addEventListener('click', () => {
      asiste = b.dataset.asiste === 'si';
      pintarOpciones();
    }),
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (enviando) return;

    if (asiste === null) {
      mostrarError('Elige "Sí, asistiré" o "No podré" para enviar.');
      return;
    }
    const nombre = form.nombre.value.trim();
    if (!nombre) {
      form.nombre.focus();
      return;
    }

    enviando = true;
    error.hidden = true;
    const etiqueta = enviar.textContent;
    enviar.textContent = 'Enviando…';
    enviar.disabled = true;

    try {
      const asistentes = asiste ? Number(form.lugares.value || 1) : 0;
      const r = await window.__firestore.guardarRsvp(window.__invitado.slug, {
        nombre,
        asiste,
        asistentes,
        dieta: form.dieta.value,
      });

      if (!r.ok) {
        mostrarError(
          r.codigo === 'rechazado'
            ? 'No pudimos guardar esa cantidad de personas. Revisa los lugares reservados para ti.'
            : 'No pudimos guardar tu confirmación. Inténtalo de nuevo.',
        );
        return;
      }
      mostrarHecho(asiste, asistentes);
      hecho.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      mostrarError('Sin conexión. Revisa tu internet e inténtalo de nuevo.');
    } finally {
      enviando = false;
      enviar.textContent = etiqueta;
      enviar.disabled = false;
    }
  });
})();
