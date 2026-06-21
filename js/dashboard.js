/* ============================================================================
   CLÍNICA RESPIRA · dashboard.js
   Panel del dueño: KPIs, pestañas "Hoy" / "Próximos días", tarjetas de cita
   con teléfono y botones Completada / Cancelada. Lee del mismo localStorage
   que la landing (window.CR), de modo que las reservas aparecen en vivo.
   ============================================================================ */
(function () {
  'use strict';

  const CR = window.CR;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 2800);
  }

  /* --------------------------------------------------------------------------
     Reloj de la barra superior
     -------------------------------------------------------------------------- */
  function actualizarReloj() {
    const ahora = new Date();
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    $('#clockDate').textContent = `${dias[ahora.getDay()]} ${ahora.getDate()} ${meses[ahora.getMonth()]}`;
    $('#clockTime').textContent = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  /* --------------------------------------------------------------------------
     KPIs
     -------------------------------------------------------------------------- */
  function renderKPIs() {
    const r = CR.resumenHoy();
    const kpis = [
      { ic: '📅', val: r.total, label: 'Citas hoy', cls: '' },
      { ic: '⏳', val: r.pendientes, label: 'Pendientes', cls: 'warn' },
      { ic: '✅', val: r.completadas, label: 'Completadas', cls: 'accent' },
      { ic: '💶', val: r.ingresosEstimados + ' €', label: 'Ingresos estimados', cls: 'accent' }
    ];
    $('#kpis').innerHTML = kpis.map(k => `
      <div class="kpi ${k.cls}">
        <div class="kpi-ic">${k.ic}</div>
        <div class="kpi-val">${k.val}</div>
        <div class="kpi-label">${k.label}</div>
      </div>
    `).join('');
  }

  /* --------------------------------------------------------------------------
     Tarjeta de cita
     -------------------------------------------------------------------------- */
  function badgeEstado(estado) {
    const map = {
      pendiente: ['badge-pendiente', '⏳ Pendiente'],
      completada: ['badge-completada', '✅ Completada'],
      cancelada: ['badge-cancelada', '✖ Cancelada']
    };
    const [cls, txt] = map[estado] || map.pendiente;
    return `<span class="appt-badge ${cls}">${txt}</span>`;
  }

  // Normaliza el teléfono a dígitos para el enlace de llamada/WhatsApp.
  function telLink(telefono) {
    return telefono.replace(/[^\d+]/g, '');
  }

  function tarjeta(cita, mostrarDia) {
    const s = CR.getServicio(cita.servicioId);
    const dia = mostrarDia ? CR.fechaLegible(cita.fecha).split(' ').slice(0, 2).join(' ') : '';
    const tel = telLink(cita.paciente.telefono);

    // Botones según estado.
    let acciones = '';
    if (cita.estado === CR.ESTADOS.PENDIENTE) {
      acciones = `
        <button class="btn btn-done" data-accion="completar" data-id="${cita.id}">✓ Completada</button>
        <button class="btn btn-cancel" data-accion="cancelar" data-id="${cita.id}">✕ Cancelar</button>`;
    } else {
      acciones = `<button class="btn btn-reopen" data-accion="reabrir" data-id="${cita.id}">↺ Marcar pendiente</button>`;
    }

    const motivo = cita.paciente.motivo
      ? `<div class="row"><span class="ic">📝</span><span class="appt-motivo">${cita.paciente.motivo}</span></div>` : '';

    return `
      <article class="appt estado-${cita.estado}">
        <div class="appt-top">
          <div class="appt-time">
            <span class="h">${cita.hora}</span>
            <span class="d">${dia || s.duracion + ' min'}</span>
          </div>
          ${badgeEstado(cita.estado)}
        </div>
        <div class="appt-name">${cita.paciente.nombre}</div>
        <div class="appt-service">${s.icono} ${cita.servicioNombre} · ${cita.precio} €</div>
        <div class="appt-meta">
          <div class="row">
            <span class="ic">📞</span>
            <a class="val appt-phone" href="tel:${tel}">${cita.paciente.telefono}</a>
          </div>
          <div class="row">
            <span class="ic">✉️</span>
            <span class="val">${cita.paciente.email || '—'}</span>
          </div>
          ${motivo}
        </div>
        <div class="appt-actions">
          ${acciones}
          <a class="btn btn-call" href="https://wa.me/${tel.replace('+', '')}" target="_blank" rel="noopener" title="Escribir por WhatsApp">💬</a>
        </div>
      </article>`;
  }

  /* --------------------------------------------------------------------------
     Render de la vista HOY
     -------------------------------------------------------------------------- */
  function renderHoy() {
    const citas = CR.citasDeHoy();
    $('#badgeHoy').textContent = citas.length;
    const cont = $('#cardsHoy');
    const empty = $('#emptyHoy');

    if (citas.length === 0) {
      cont.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    cont.innerHTML = citas.map(c => tarjeta(c, false)).join('');
  }

  /* --------------------------------------------------------------------------
     Render de la vista PRÓXIMOS (agrupada por día)
     -------------------------------------------------------------------------- */
  function renderProximos() {
    const citas = CR.citasProximas();
    $('#badgeProx').textContent = citas.length;
    const cont = $('#groupsProximos');
    const empty = $('#emptyProx');

    if (citas.length === 0) {
      cont.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    // Agrupar por fecha conservando el orden.
    const grupos = {};
    citas.forEach(c => { (grupos[c.fecha] = grupos[c.fecha] || []).push(c); });

    cont.innerHTML = Object.keys(grupos).sort().map(fecha => `
      <div class="day-group">
        <div class="day-group-title">${CR.fechaLegible(fecha)} · ${grupos[fecha].length} cita${grupos[fecha].length > 1 ? 's' : ''}</div>
        <div class="cards">${grupos[fecha].map(c => tarjeta(c, false)).join('')}</div>
      </div>
    `).join('');
  }

  /* --------------------------------------------------------------------------
     Re-render global
     -------------------------------------------------------------------------- */
  function renderTodo() {
    renderKPIs();
    renderHoy();
    renderProximos();
  }

  /* --------------------------------------------------------------------------
     Acciones sobre las citas (delegación de eventos)
     -------------------------------------------------------------------------- */
  function manejarAccion(e) {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;
    const { accion, id } = btn.dataset;

    if (accion === 'completar') {
      CR.updateEstado(id, CR.ESTADOS.COMPLETADA);
      toast('Cita marcada como completada ✅');
    } else if (accion === 'cancelar') {
      CR.updateEstado(id, CR.ESTADOS.CANCELADA);
      toast('Cita cancelada. El hueco vuelve a estar libre.');
    } else if (accion === 'reabrir') {
      CR.updateEstado(id, CR.ESTADOS.PENDIENTE);
      toast('Cita marcada como pendiente.');
    }
    renderTodo();
  }

  /* --------------------------------------------------------------------------
     Pestañas
     -------------------------------------------------------------------------- */
  function activarTab(nombre) {
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === nombre));
    const esHoy = nombre === 'hoy';
    $('#vistaHoy').classList.toggle('hidden', !esHoy);
    $('#vistaProximos').classList.toggle('hidden', esHoy);
  }

  function cablearTabs() {
    $$('.tab').forEach(tab => tab.addEventListener('click', () => activarTab(tab.dataset.tab)));
  }

  // Abre por defecto la pestaña con citas: si hoy no hay (p. ej. fin de semana),
  // muestra directamente "Próximos días" para que el panel nunca se vea vacío.
  function seleccionarTabInicial() {
    if (CR.citasDeHoy().length === 0 && CR.citasProximas().length > 0) {
      activarTab('proximos');
    } else {
      activarTab('hoy');
    }
  }

  /* --------------------------------------------------------------------------
     Sincronización entre pestañas del navegador:
     si reservas en la web (otra pestaña), el panel se actualiza solo.
     -------------------------------------------------------------------------- */
  function escucharCambios() {
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.indexOf('clinica_respira') === 0) renderTodo();
    });
    // Al volver a la pestaña, refrescar por si acaso.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) renderTodo();
    });
  }

  /* --------------------------------------------------------------------------
     Arranque
     -------------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    CR.seedDemoData();
    actualizarReloj();
    setInterval(actualizarReloj, 30000);
    renderTodo();
    cablearTabs();
    seleccionarTabInicial();
    escucharCambios();

    document.addEventListener('click', manejarAccion);

    $('#resetBtn').addEventListener('click', () => {
      if (confirm('¿Reiniciar los datos de la demo? Se borrarán las citas actuales y se cargarán las de ejemplo.')) {
        CR.resetDemo();
        CR.seedDemoData();
        renderTodo();
        toast('Datos de demo reiniciados.');
      }
    });
  });
})();
