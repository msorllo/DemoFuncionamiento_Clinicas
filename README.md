# 🫁 Clínica Respira — Demo completa (web + panel + automatización)

Demo lista para enseñar a tu cliente. Muestra el **sistema completo** que resuelve
sus dos problemas: perder tiempo cuadrando citas por audios y perder dinero por
"no shows".

Incluye:
1. **Landing pública** (`index.html`) — el paciente reserva su cita en 30 segundos.
2. **Panel del personal** (`dashboard.html`) — el dueño ve y gestiona las citas (Dark Mode).
3. **Arquitectura del asistente automático** (`ARQUITECTURA-N8N.md`) — el bot de Telegram + IA + base de datos.

---

## ▶️ Cómo enseñarlo al cliente (sin instalar nada)

1. **Abre la web:** doble clic en **`index.html`**.
2. **Reserva una cita de prueba:** elige servicio → día → hora → rellena tus datos → *Confirmar*.
3. **Abre el panel:** doble clic en **`dashboard.html`** (o pulsa "Panel" arriba).
4. **¡Magia!** La cita que acabas de reservar **ya aparece** en el panel del dueño.
5. Prueba los botones **Completada** / **Cancelada** en cada tarjeta.

> 💡 **El efecto "wow":** reserva en el móvil y enséñale el panel en el portátil.
> Verá en directo cómo una reserva del paciente llega a su agenda al instante.

---

## 🎬 Guion sugerido para la reunión

1. *"Esto es lo que verían tus pacientes desde el móvil"* → muestras la landing y reservas.
2. *"Y esto es lo que verías tú, en privado"* → abres el panel y aparece la cita.
3. *"Fíjate: si una hora ya está cogida, desaparece sola. Nunca más dos citas a la vez."*
4. *"Y esto se conecta a un asistente que contesta solo por WhatsApp/Telegram 24/7"*
   → abres `ARQUITECTURA-N8N.md`.

---

## 🗂️ Estructura del proyecto

```
Cliente_demo-01/
├── index.html              → Landing premium (hero con foto, servicios, panel,
│                             automatización, reserva, FAQ) + animaciones GSAP
├── dashboard.html          → Panel privado del dueño (Dark Mode)
├── arquitectura.html       → Explicación visual de la automatización n8n (no técnica)
├── css/
│   ├── landing.css         → Estilos de la web pública (rediseño "Aliento Sereno")
│   ├── dashboard.css       → Estilos del panel oscuro
│   └── arquitectura.css    → Estilos de la página de automatización
├── js/
│   ├── store.js            → "Cerebro": datos + reglas de negocio (anti-solape)
│   ├── landing.js          → Lógica de reserva por pasos
│   ├── dashboard.js        → Render de citas + botones de estado
│   ├── anim.js             → Animaciones de scroll (GSAP + Lenis + IntersectionObserver)
│   └── arquitectura.js     → Animación del flujo paso a paso
├── assets/
│   ├── img/                → Fotografía + arte de marca (arte-respira.png)
│   ├── FILOSOFIA-DISENO.md → Filosofía visual "Aliento Sereno" (canvas-design)
│   └── generar-arte.js     → Generador del arte de marca (SVG → PNG)
├── ARQUITECTURA-N8N.md     → Documentación técnica del asistente Telegram + IA
└── README.md               → Este archivo
```

---

## ⚙️ Detalles técnicos

- **Sin build:** HTML/CSS/JS puro. Las animaciones usan GSAP + Lenis cargados por CDN
  (requieren conexión a internet, igual que las fuentes Fraunces/Inter de Google).
  Si no hay internet o el usuario prefiere menos movimiento, todo se muestra igual
  sin animar (mejora progresiva).
- **Datos de la demo:** se guardan en el `localStorage` del navegador. La primera vez
  se cargan citas de ejemplo para que el panel no esté vacío.
- **Reiniciar la demo:** en el panel, botón *"↺ Reiniciar datos demo"*.
- **Reglas de negocio** (en `js/store.js`, fáciles de editar):
  - Servicios y precios: Fisioterapia (45'/40 €), Osteopatía (60'/55 €), Masaje (45'/45 €).
  - Horario: L–V · 09:00–14:00 y 16:00–20:00 · bloques de 1 hora.
  - Anti-solapamiento: una cita por bloque; al cancelar, el hueco se libera.

---

## 🚀 Publicarla online (opcional, gratis)

Para enviarle un enlace al cliente en vez de archivos:

- **Netlify Drop:** arrastra la carpeta a `app.netlify.com/drop` → te da una URL.
- **Vercel:** `vercel` desde la carpeta, o conéctala a un repositorio.
- **GitHub Pages:** sube la carpeta a un repo y actívalo en *Settings → Pages*.

> Al ser estática, cualquiera de estas opciones la sirve gratis y carga al instante.

---

## 🔌 Paso a producción (cuando el cliente diga "sí")

1. Conectar el formulario y el panel a una base de datos real (Airtable / Google Sheets / Supabase).
2. Montar el workflow de n8n descrito en `ARQUITECTURA-N8N.md` (Telegram → IA → base de datos).
3. Proteger el panel con acceso por contraseña.
4. Activar los recordatorios automáticos (adiós a los "no shows").
5. (Más adelante) Migrar el canal de Telegram a WhatsApp Business.

---

*Demo creada para presentación comercial. Marca: azul marino + verde menta. Mobile-first.*
