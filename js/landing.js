/* ============================================================================
   CLÍNICA RESPIRA · landing.js
   Lógica de la landing: render de servicios, formulario de reserva por pasos,
   calendario con huecos libres (anti-solapamiento) y guardado de la cita.
   Depende de window.CR (definido en store.js).
   ============================================================================ */
(function () {
  'use strict';

  const CR = window.CR;

  // Estado de la reserva en curso.
  const reserva = {
    servicioId: null,
    fecha: null,
    hora: null
  };

  /* --------------------------------------------------------------------------
     Utilidades de UI
     -------------------------------------------------------------------------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  let toastTimer;
  function toast(msg, tipo) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (tipo === 'error' ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
  }

  /* --------------------------------------------------------------------------
     1) Render del catálogo de servicios (sección pública + selector del form)
     -------------------------------------------------------------------------- */
  // Fotografía asignada a cada servicio (en assets/img).
  const IMG_SERVICIO = {
    fisioterapia: 'assets/img/treatment-3.jpg',
    osteopatia: 'assets/img/treatment-1.jpg',
    masaje: 'assets/img/treatment-2.jpg'
  };

  function renderServicios() {
    // Tarjetas de la sección "Servicios" (con fotografía)
    const grid = $('#servicesGrid');
    grid.innerHTML = CR.SERVICIOS.map((s) => `
      <article class="svc-card" data-reveal="up">
        <div class="svc-media">
          <img src="${IMG_SERVICIO[s.id] || 'assets/img/hero.jpg'}" alt="${s.nombre}" loading="lazy" />
          <span class="svc-ic">${s.icono}</span>
        </div>
        <div class="svc-body">
          <h3>${s.nombre}</h3>
          <p>${s.descripcion}</p>
          <div class="svc-foot">
            <span class="svc-price">${s.precio}€</span>
            <span class="svc-dur">🕐 ${s.duracion} min</span>
          </div>
        </div>
      </article>
    `).join('');

    // Opciones del selector dentro del formulario
    const picker = $('#servicePicker');
    picker.innerHTML = CR.SERVICIOS.map(s => `
      <div class="service-option" data-servicio="${s.id}" role="button" tabindex="0">
        <span class="so-ic">${s.icono}</span>
        <span class="so-info">
          <strong>${s.nombre}</strong>
          <small>${s.duracion} min · ${s.descripcion}</small>
        </span>
        <span class="so-price">${s.precio}€</span>
      </div>
    `).join('');

    // Selección de servicio
    $$('.service-option', picker).forEach(opt => {
      const elegir = () => {
        $$('.service-option', picker).forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        reserva.servicioId = opt.dataset.servicio;
        $('#toStep2').disabled = false;
      };
      opt.addEventListener('click', elegir);
      opt.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(); } });
    });
  }

  /* --------------------------------------------------------------------------
     2) Navegación entre pasos
     -------------------------------------------------------------------------- */
  function irAPaso(n) {
    $$('.step').forEach(s => s.classList.toggle('active', Number(s.dataset.step) === n));
    // Indicador de progreso (4 = confirmación, deja los 3 puntos llenos)
    $$('.step-dot').forEach((d, i) => d.classList.toggle('active', i < Math.min(n, 3)));
    // Llevar el foco/scroll al formulario en móvil
    const form = $('.booking-form');
    if (form && n > 1) form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* --------------------------------------------------------------------------
     3) Selector de día (próximos laborables) y horas libres
     -------------------------------------------------------------------------- */
  function renderDias() {
    const dias = CR.proximosDiasLaborables(10); // próximas 2 semanas laborables aprox.
    const dp = $('#dayPicker');
    const dow = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const mon = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    dp.innerHTML = dias.map(iso => {
      const [y, m, d] = iso.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return `
        <button type="button" class="day-chip" data-fecha="${iso}">
          <div class="dc-dow">${dow[date.getDay()]}</div>
          <div class="dc-num">${d}</div>
          <div class="dc-mon">${mon[m - 1]}</div>
        </button>`;
    }).join('');

    $$('.day-chip', dp).forEach(chip => {
      chip.addEventListener('click', () => {
        $$('.day-chip', dp).forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        reserva.fecha = chip.dataset.fecha;
        reserva.hora = null;
        $('#toStep3').disabled = true;
        renderSlots(reserva.fecha);
      });
    });
  }

  // Pinta los huecos libres del día, separados en mañana (09–14) y tarde (16–20).
  function renderSlots(fecha) {
    const cont = $('#slotsContainer');
    const libres = CR.getBloquesDisponibles(fecha);

    if (libres.length === 0) {
      cont.innerHTML = `<div class="slots-grid"><div class="slots-empty">
        😕 No quedan huecos libres este día. Prueba con otra fecha.
      </div></div>`;
      return;
    }

    const manana = libres.filter(h => parseInt(h) < 15);
    const tarde = libres.filter(h => parseInt(h) >= 15);

    let html = '';
    if (manana.length) {
      html += `<div class="tramo-label">☀️ Mañana</div><div class="slots-grid">` +
        manana.map(h => `<button type="button" class="slot" data-hora="${h}">${h}</button>`).join('') +
        `</div>`;
    }
    if (tarde.length) {
      html += `<div class="tramo-label">🌆 Tarde</div><div class="slots-grid">` +
        tarde.map(h => `<button type="button" class="slot" data-hora="${h}">${h}</button>`).join('') +
        `</div>`;
    }
    cont.innerHTML = html;

    $$('.slot', cont).forEach(slot => {
      slot.addEventListener('click', () => {
        $$('.slot', cont).forEach(s => s.classList.remove('selected'));
        slot.classList.add('selected');
        reserva.hora = slot.dataset.hora;
        $('#toStep3').disabled = false;
      });
    });
  }

  /* --------------------------------------------------------------------------
     4) Resumen del paso 3
     -------------------------------------------------------------------------- */
  function renderResumen() {
    const s = CR.getServicio(reserva.servicioId);
    $('#summaryBox').innerHTML = `
      <div class="sb-row"><span>Servicio</span><span>${s.icono} ${s.nombre}</span></div>
      <div class="sb-row"><span>Día</span><span>${CR.fechaLegible(reserva.fecha)}</span></div>
      <div class="sb-row"><span>Hora</span><span>${reserva.hora} h · ${s.duracion} min</span></div>
      <div class="sb-row sb-total"><span>Total</span><span>${s.precio} €</span></div>
    `;
  }

  /* --------------------------------------------------------------------------
     5) Validación y guardado
     -------------------------------------------------------------------------- */
  function marcarError(id, mostrar) {
    const input = $('#' + id);
    const msg = $(`.error-msg[data-for="${id}"]`);
    if (input) input.classList.toggle('invalid', mostrar);
    if (msg) msg.classList.toggle('show', mostrar);
  }

  function validarFormulario() {
    let ok = true;
    const nombre = $('#f-nombre').value.trim();
    const telefono = $('#f-telefono').value.trim();
    const email = $('#f-email').value.trim();

    if (!nombre) { marcarError('f-nombre', true); ok = false; } else marcarError('f-nombre', false);
    // Teléfono: obligatorio y con al menos 9 dígitos.
    const digitos = telefono.replace(/\D/g, '');
    if (digitos.length < 9) { marcarError('f-telefono', true); ok = false; } else marcarError('f-telefono', false);
    // Email: opcional, pero si se rellena debe tener formato válido.
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { marcarError('f-email', true); ok = false; }
    else marcarError('f-email', false);

    return ok;
  }

  function confirmar() {
    if (!validarFormulario()) {
      toast('Revisa los campos marcados en rojo.', 'error');
      return;
    }

    const resultado = CR.addCita({
      servicioId: reserva.servicioId,
      fecha: reserva.fecha,
      hora: reserva.hora,
      nombre: $('#f-nombre').value,
      telefono: $('#f-telefono').value,
      email: $('#f-email').value,
      motivo: $('#f-motivo').value
    });

    if (!resultado.ok) {
      // Caso típico: el hueco se ocupó mientras rellenaba (anti-solapamiento).
      toast(resultado.error, 'error');
      // Volver al paso 2 y refrescar los huecos.
      irAPaso(2);
      renderSlots(reserva.fecha);
      reserva.hora = null;
      $('#toStep3').disabled = true;
      return;
    }

    mostrarConfirmacion(resultado.cita);
  }

  function mostrarConfirmacion(cita) {
    $('#confirmName').textContent = `Te esperamos, ${cita.paciente.nombre.split(' ')[0]} 👋`;
    $('#confirmDetail').innerHTML = `
      <div class="cd-row"><span>Servicio</span><span>${cita.servicioNombre}</span></div>
      <div class="cd-row"><span>Día</span><span>${CR.fechaLegible(cita.fecha)}</span></div>
      <div class="cd-row"><span>Hora</span><span>${cita.hora} h</span></div>
      <div class="cd-row"><span>Duración</span><span>${cita.duracion} min · ${cita.precio} €</span></div>
    `;
    irAPaso(4);
    toast('✅ ¡Cita guardada! Ya aparece en el panel de la clínica.');
  }

  /* --------------------------------------------------------------------------
     6) Reiniciar para una nueva reserva
     -------------------------------------------------------------------------- */
  function reiniciar() {
    reserva.servicioId = null; reserva.fecha = null; reserva.hora = null;
    $$('.service-option').forEach(o => o.classList.remove('selected'));
    $$('.day-chip').forEach(c => c.classList.remove('selected'));
    $('#slotsContainer').innerHTML = '';
    ['f-nombre', 'f-telefono', 'f-email', 'f-motivo'].forEach(id => { $('#' + id).value = ''; marcarError(id, false); });
    $('#toStep2').disabled = true;
    $('#toStep3').disabled = true;
    irAPaso(1);
  }

  /* --------------------------------------------------------------------------
     7) Cableado de eventos
     -------------------------------------------------------------------------- */
  function cablearEventos() {
    $('#toStep2').addEventListener('click', () => { renderDias(); irAPaso(2); });
    $('#toStep3').addEventListener('click', () => { renderResumen(); irAPaso(3); });
    $$('[data-back]').forEach(btn => btn.addEventListener('click', () => irAPaso(Number(btn.dataset.back))));
    $('#confirmBtn').addEventListener('click', confirmar);
    $('#newBooking').addEventListener('click', reiniciar);

    // Limpiar el marcado de error al escribir.
    ['f-nombre', 'f-telefono', 'f-email'].forEach(id => {
      $('#' + id).addEventListener('input', () => marcarError(id, false));
    });
  }

  /* --------------------------------------------------------------------------
     8) Arranque
     Las animaciones de scroll (reveal, parallax, contadores, header) las gestiona
     anim.js con GSAP. Aquí solo se monta la lógica de reserva.
     -------------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    CR.seedDemoData();     // precarga citas de ejemplo la primera vez
    renderServicios();
    cablearEventos();
  });
})();
