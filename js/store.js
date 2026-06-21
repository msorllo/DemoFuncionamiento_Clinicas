/* ============================================================================
   CLÍNICA RESPIRA · store.js
   ----------------------------------------------------------------------------
   "Cerebro" compartido entre la landing (index.html) y el panel (dashboard.html).
   Simula el backend usando localStorage del navegador, de modo que una cita
   reservada en la web aparece AL INSTANTE en el panel del dueño.

   En producción, esta misma lógica vive en n8n + Airtable/Google Sheets:
   las funciones de aquí (getBloquesDisponibles, addCita, updateEstado...)
   se corresponden 1:1 con los nodos de la automatización.

   No usa módulos ES (import/export) a propósito: así los archivos funcionan
   abriéndolos con doble clic (protocolo file://) sin necesidad de servidor.
   Todo se expone bajo el espacio de nombres global window.CR
   ============================================================================ */
(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     1) CONFIGURACIÓN DEL NEGOCIO (datos reales de Clínica Respira)
     -------------------------------------------------------------------------- */

  // Catálogo de servicios. El "id" es la clave estable que se guarda en cada cita.
  const SERVICIOS = [
    {
      id: 'fisioterapia',
      nombre: 'Fisioterapia General',
      descripcion: 'Tratamiento de lesiones, contracturas y dolor muscular.',
      duracion: 45,            // minutos
      precio: 40,              // euros
      icono: '🦴'
    },
    {
      id: 'osteopatia',
      nombre: 'Osteopatía',
      descripcion: 'Terapia manual integral para recuperar tu equilibrio corporal.',
      duracion: 60,
      precio: 55,
      icono: '🤲'
    },
    {
      id: 'masaje',
      nombre: 'Masaje Deportivo',
      descripcion: 'Descarga muscular post-entrenamiento y prevención de lesiones.',
      duracion: 45,
      precio: 45,
      icono: '💪'
    }
  ];

  // Reglas del calendario.
  // - diasApertura: 1=Lunes ... 5=Viernes (0=Domingo, 6=Sábado quedan cerrados).
  // - bloques: franjas de 1 hora dentro de los dos tramos (09-14h y 16-20h).
  //   Usamos bloques de 1 h para que quepa la Osteopatía (60') y sobre margen
  //   en los servicios de 45'. Regla del negocio: 1 cita por bloque (anti-solape).
  const HORARIO = {
    diasApertura: [1, 2, 3, 4, 5],
    bloques: ['09:00', '10:00', '11:00', '12:00', '13:00',
              '16:00', '17:00', '18:00', '19:00']
  };

  // Estados posibles de una cita.
  const ESTADOS = {
    PENDIENTE: 'pendiente',
    COMPLETADA: 'completada',
    CANCELADA: 'cancelada'
  };

  // Clave de almacenamiento en el navegador.
  const STORAGE_KEY = 'clinica_respira_citas_v1';

  /* --------------------------------------------------------------------------
     2) UTILIDADES DE FECHA (sin librerías externas)
     -------------------------------------------------------------------------- */

  // Devuelve una fecha en formato 'YYYY-MM-DD' (clave estable, sin zona horaria).
  function aISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Convierte 'YYYY-MM-DD' en un objeto Date local (a mediodía, para evitar
  // saltos por husos horarios).
  function desdeISO(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  // ¿Es un día laborable de la clínica (Lunes a Viernes)?
  function esDiaLaborable(iso) {
    const dia = desdeISO(iso).getDay();
    return HORARIO.diasApertura.includes(dia);
  }

  // Texto bonito en español: "Lunes 23 de junio".
  function fechaLegible(iso) {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                   'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const f = desdeISO(iso);
    return `${dias[f.getDay()]} ${f.getDate()} de ${meses[f.getMonth()]}`;
  }

  // Devuelve el ISO de hoy.
  function hoyISO() {
    return aISO(new Date());
  }

  // Devuelve los próximos N días laborables a partir de hoy (incluido si lo es).
  function proximosDiasLaborables(n) {
    const dias = [];
    const cursor = new Date();
    // Limita el bucle por seguridad (máximo 30 iteraciones).
    let guard = 0;
    while (dias.length < n && guard < 30) {
      const iso = aISO(cursor);
      if (esDiaLaborable(iso)) dias.push(iso);
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }
    return dias;
  }

  /* --------------------------------------------------------------------------
     3) ACCESO A DATOS (lectura / escritura en localStorage)
     -------------------------------------------------------------------------- */

  function getCitas() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('No se pudieron leer las citas:', e);
      return [];
    }
  }

  function _guardar(citas) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(citas));
  }

  // Genera un identificador único legible (no necesita librerías).
  function _nuevoId() {
    return 'CR-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }

  // Busca un servicio por su id.
  function getServicio(id) {
    return SERVICIOS.find(s => s.id === id) || null;
  }

  /* --------------------------------------------------------------------------
     4) LÓGICA DE DISPONIBILIDAD (anti-solapamiento)
     -------------------------------------------------------------------------- */

  // Citas "que ocupan" un bloque = todas menos las canceladas.
  function _citasActivasEn(iso) {
    return getCitas().filter(c => c.fecha === iso && c.estado !== ESTADOS.CANCELADA);
  }

  // ¿Está libre un bloque concreto en una fecha?
  function bloqueDisponible(iso, hora) {
    if (!esDiaLaborable(iso)) return false;
    return !_citasActivasEn(iso).some(c => c.hora === hora);
  }

  // Devuelve la lista de bloques LIBRES para una fecha.
  // Si la fecha es HOY, además descarta las horas que ya han pasado.
  function getBloquesDisponibles(iso) {
    if (!esDiaLaborable(iso)) return [];
    const ocupados = _citasActivasEn(iso).map(c => c.hora);

    let bloques = HORARIO.bloques.filter(b => !ocupados.includes(b));

    // Si es hoy, no ofrecer horas pasadas.
    if (iso === hoyISO()) {
      const ahora = new Date();
      const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
      bloques = bloques.filter(b => {
        const [h, m] = b.split(':').map(Number);
        return (h * 60 + m) > minutosAhora;
      });
    }
    return bloques;
  }

  // Devuelve hasta N bloques alternativos disponibles (mismo día y, si hace falta,
  // días siguientes). Lo usa el bot de n8n para "ofrecer 3 alternativas".
  function getAlternativas(iso, n) {
    n = n || 3;
    const alternativas = [];
    let dias = [iso].concat(proximosDiasLaborables(6));
    // Quitar duplicados manteniendo orden.
    dias = dias.filter((d, i) => dias.indexOf(d) === i);

    for (const d of dias) {
      for (const b of getBloquesDisponibles(d)) {
        alternativas.push({ fecha: d, hora: b });
        if (alternativas.length >= n) return alternativas;
      }
    }
    return alternativas;
  }

  /* --------------------------------------------------------------------------
     5) OPERACIONES (crear cita, cambiar estado)
     -------------------------------------------------------------------------- */

  // Crea una cita validando todas las reglas de negocio.
  // Devuelve { ok: true, cita } o { ok: false, error }.
  function addCita(datos) {
    const servicio = getServicio(datos.servicioId);
    if (!servicio) return { ok: false, error: 'Servicio no válido.' };

    if (!datos.fecha || !esDiaLaborable(datos.fecha)) {
      return { ok: false, error: 'La clínica abre de lunes a viernes.' };
    }
    if (!datos.hora || !HORARIO.bloques.includes(datos.hora)) {
      return { ok: false, error: 'Esa hora no está dentro del horario de atención.' };
    }
    // Anti-solapamiento: el bloque debe seguir libre en el momento de guardar.
    if (!bloqueDisponible(datos.fecha, datos.hora)) {
      return { ok: false, error: 'Ese hueco se acaba de ocupar. Elige otro, por favor.' };
    }
    // Datos del paciente. El teléfono es obligatorio (clave para el WhatsApp/Telegram).
    if (!datos.nombre || !datos.nombre.trim()) {
      return { ok: false, error: 'El nombre es obligatorio.' };
    }
    if (!datos.telefono || !datos.telefono.trim()) {
      return { ok: false, error: 'El teléfono es obligatorio.' };
    }

    const cita = {
      id: _nuevoId(),
      servicioId: servicio.id,
      servicioNombre: servicio.nombre,
      duracion: servicio.duracion,
      precio: servicio.precio,
      fecha: datos.fecha,
      hora: datos.hora,
      paciente: {
        nombre: datos.nombre.trim(),
        telefono: datos.telefono.trim(),
        email: (datos.email || '').trim(),
        motivo: (datos.motivo || '').trim()
      },
      estado: ESTADOS.PENDIENTE,
      creadaEn: new Date().toISOString()
    };

    const citas = getCitas();
    citas.push(cita);
    _guardar(citas);
    return { ok: true, cita };
  }

  // Cambia el estado de una cita (completada / cancelada / pendiente).
  function updateEstado(id, nuevoEstado) {
    const citas = getCitas();
    const i = citas.findIndex(c => c.id === id);
    if (i === -1) return { ok: false, error: 'Cita no encontrada.' };
    citas[i].estado = nuevoEstado;
    _guardar(citas);
    return { ok: true, cita: citas[i] };
  }

  /* --------------------------------------------------------------------------
     6) CONSULTAS PARA EL PANEL (agrupar por hoy / próximos días)
     -------------------------------------------------------------------------- */

  function _ordenarPorHora(a, b) {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
    return a.hora < b.hora ? -1 : 1;
  }

  // Citas de hoy (cualquier estado), ordenadas por hora.
  function citasDeHoy() {
    const hoy = hoyISO();
    return getCitas().filter(c => c.fecha === hoy).sort(_ordenarPorHora);
  }

  // Citas de días futuros (a partir de mañana), ordenadas.
  function citasProximas() {
    const hoy = hoyISO();
    return getCitas().filter(c => c.fecha > hoy).sort(_ordenarPorHora);
  }

  // Pequeño resumen para los KPIs del panel.
  function resumenHoy() {
    const hoy = citasDeHoy();
    const activas = hoy.filter(c => c.estado !== ESTADOS.CANCELADA);
    const ingresos = activas.reduce((sum, c) => sum + c.precio, 0);
    return {
      total: hoy.length,
      completadas: hoy.filter(c => c.estado === ESTADOS.COMPLETADA).length,
      canceladas: hoy.filter(c => c.estado === ESTADOS.CANCELADA).length,
      pendientes: hoy.filter(c => c.estado === ESTADOS.PENDIENTE).length,
      ingresosEstimados: ingresos
    };
  }

  /* --------------------------------------------------------------------------
     7) DATOS DE DEMOSTRACIÓN
     Precarga algunas citas la primera vez, para que el panel no aparezca vacío
     al enseñárselo al cliente. Solo se ejecuta si no hay datos guardados.
     -------------------------------------------------------------------------- */

  function seedDemoData() {
    if (getCitas().length > 0) return; // ya hay datos: no tocar nada.

    const dias = proximosDiasLaborables(4); // hoy + próximos laborables
    const hoy = dias[0];
    const manana = dias[1] || dias[0];
    const pasado = dias[2] || dias[0];

    const demo = [
      {
        servicioId: 'fisioterapia', fecha: hoy, hora: '10:00',
        nombre: 'Lucía Fernández', telefono: '+34 612 345 678',
        email: 'lucia.fdez@gmail.com', motivo: 'Contractura cervical por trabajo de oficina.'
      },
      {
        servicioId: 'osteopatia', fecha: hoy, hora: '12:00',
        nombre: 'Marcos Pérez', telefono: '+34 655 112 233',
        email: 'marcos.perez@outlook.com', motivo: 'Dolor lumbar recurrente.'
      },
      {
        servicioId: 'masaje', fecha: hoy, hora: '17:00',
        nombre: 'Andrea Gil', telefono: '+34 600 998 877',
        email: 'andrea.gil@gmail.com', motivo: 'Descarga tras maratón.'
      },
      {
        servicioId: 'fisioterapia', fecha: manana, hora: '09:00',
        nombre: 'Javier Ruiz', telefono: '+34 622 334 455',
        email: 'jruiz@gmail.com', motivo: 'Rehabilitación de tobillo.'
      },
      {
        servicioId: 'osteopatia', fecha: manana, hora: '18:00',
        nombre: 'Carmen López', telefono: '+34 633 221 100',
        email: 'carmen.lopez@gmail.com', motivo: 'Migrañas tensionales.'
      },
      {
        servicioId: 'masaje', fecha: pasado, hora: '11:00',
        nombre: 'Diego Santos', telefono: '+34 644 556 677',
        email: 'diego.santos@gmail.com', motivo: 'Sobrecarga gemelos.'
      }
    ];

    const citas = demo.map(d => ({
      id: _nuevoId(),
      servicioId: d.servicioId,
      servicioNombre: getServicio(d.servicioId).nombre,
      duracion: getServicio(d.servicioId).duracion,
      precio: getServicio(d.servicioId).precio,
      fecha: d.fecha,
      hora: d.hora,
      paciente: { nombre: d.nombre, telefono: d.telefono, email: d.email, motivo: d.motivo },
      estado: ESTADOS.PENDIENTE,
      creadaEn: new Date().toISOString()
    }));

    _guardar(citas);
  }

  // Borra todos los datos (útil para reiniciar la demo).
  function resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /* --------------------------------------------------------------------------
     8) EXPOSICIÓN PÚBLICA
     -------------------------------------------------------------------------- */
  window.CR = {
    // configuración
    SERVICIOS, HORARIO, ESTADOS,
    // servicios
    getServicio,
    // fechas
    hoyISO, fechaLegible, esDiaLaborable, proximosDiasLaborables,
    // disponibilidad
    getBloquesDisponibles, bloqueDisponible, getAlternativas,
    // operaciones
    addCita, updateEstado,
    // consultas panel
    getCitas, citasDeHoy, citasProximas, resumenHoy,
    // demo
    seedDemoData, resetDemo
  };
})();
