# 🫁 Clínica Respira — Sistema de reservas, panel y asistente automático para clínicas

Demo completa de lo que **MISTEREIA** construye para clínicas y negocios con cita previa:
una **web donde el paciente reserva solo**, un **panel privado para el equipo** y un
**asistente automático** que atiende por chat y manda recordatorios.

> "Clínica Respira" es una clínica ficticia de fisioterapia y osteopatía creada para esta demo.
> Los pacientes, citas y teléfonos que ves son datos de ejemplo.

---

## 🎯 El problema que resuelve

Casi todas las clínicas pequeñas viven lo mismo: audios de WhatsApp para cuadrar citas,
huecos que se pisan, pacientes que no aparecen y una agenda que está "en la cabeza" de alguien.

| Antes (manual) | Con este sistema |
|---|---|
| Cuadrar citas por audios y llamadas | El paciente elige servicio, día y hora en la web, a cualquier hora |
| Dos citas a la misma hora por descuido | Un hueco ocupado desaparece al instante: una cita por bloque |
| Pacientes que olvidan la cita | Recordatorio automático el día anterior |
| La agenda dispersa entre móvil, papel y memoria | Panel único con las citas de hoy y de los próximos días |
| Contestar fuera de horario | Asistente que responde por chat 24/7 y guarda la cita |

---

## ⚙️ Qué hace la app

### 1. Web de reservas para pacientes (`index.html`)
- Landing profesional, adaptada a móvil, con servicios, precios, preguntas frecuentes y animaciones.
- **Reserva en 3 pasos:** servicio → día y hora libres → datos del paciente → confirmación.
- Muestra **solo los huecos realmente libres**, separados en mañana y tarde. Si es hoy, no ofrece horas que ya pasaron.
- Validación de datos: nombre y teléfono obligatorios (el teléfono es la clave para los recordatorios), email opcional con formato válido.
- Si dos personas intentan coger el mismo hueco, la segunda recibe un aviso y vuelve a elegir hora.

### 2. Panel privado para el equipo (`dashboard.html`)
- Citas de **hoy** y de **próximos días**, agrupadas por día.
- Cada cita con paciente, servicio, hora, precio, teléfono, email y motivo de consulta.
- Un toque para marcar **completada**, **cancelada** (el hueco vuelve a quedar libre) o **pendiente**.
- Llamada o WhatsApp al paciente directamente desde su ficha.
- Resumen del día: citas totales, pendientes, completadas e **ingresos estimados**.
- Las reservas de la web aparecen en el panel sin recargar.

### 3. Asistente automático (`arquitectura.html` · `ARQUITECTURA-N8N.md` · `n8n-workflow-clinica-respira.json`)
- Asistente virtual por **Telegram** (migrable a WhatsApp Business) montado con **n8n + IA**.
- Entiende al paciente, consulta los huecos libres y, si el pedido está ocupado, **propone 3 alternativas**.
- Recoge nombre, teléfono y motivo, guarda la cita y confirma por chat.
- **Recordatorios programados** (L–V a las 18:00) para las citas del día siguiente.
- Incluye el workflow de n8n (para importar y adaptar a cada clínica) y la documentación paso a paso.

---

## 💼 Qué aportaría a tu clínica si lo monta MISTEREIA

- **Menos tiempo en administración:** el equipo deja de cuadrar citas a mano.
- **Agenda sin solapamientos** y siempre visible.
- **Menos ausencias** gracias a los recordatorios automáticos.
- **Reservas fuera de horario:** el paciente reserva de noche o en fin de semana.
- **Imagen profesional:** web propia con tus servicios, tu marca y tus precios.
- **Escalable:** el mismo sistema sirve para fisioterapia, osteopatía, psicología, podología, dentistas, estética, veterinarias, peluquerías y cualquier negocio que trabaje con cita.

### Qué incluye el trabajo
1. Web de reservas personalizada con tu marca, servicios, precios y horarios.
2. Panel de gestión para tu equipo, protegido con acceso.
3. Base de datos real conectada a web, panel y asistente.
4. Asistente automático por chat y recordatorios.
5. Puesta en marcha, pruebas con tu equipo y ajustes.

👉 **[Quiero algo así para mi clínica](https://www.mistereia.com/#contacto)** · [mistereia.com](https://www.mistereia.com)

---

## 🔍 Qué es demo y qué es producción

Esta demo enseña la experiencia completa, pero **no es todavía un sistema conectado**. Para ser transparentes:

| | En esta demo | En producción (lo que se monta) |
|---|---|---|
| Datos de citas | Se guardan en el navegador (`localStorage`) | Base de datos real (Airtable, Google Sheets o Supabase) |
| Panel | Abierto, sin contraseña | Protegido con acceso |
| Web ↔ panel | Comparten el mismo navegador | Comparten la misma base de datos, desde cualquier dispositivo |
| Asistente de chat | Documentado y con workflow de n8n; no está enchufado a esta web | Conectado a la misma base de datos que la web y el panel |
| Recordatorios | Definidos en el workflow | Activos y enviándose a los pacientes |
| Canal | Telegram | Telegram o WhatsApp Business |

Las cifras de reseñas, valoración y porcentajes que aparecen en la web son **ilustrativas** de la demo.

---

## ▶️ Probar la demo

No hay que instalar nada:

1. Abre **`index.html`** en el navegador (doble clic).
2. Reserva una cita de prueba: servicio → día y hora → tus datos → *Confirmar*.
3. Abre **`dashboard.html`**: la cita ya está en el panel.
4. Prueba los botones **Completada** y **Cancelada** y vuelve a la web: el hueco cancelado se libera.
5. Para empezar de cero, usa *"Reiniciar datos demo"* en el panel.

---

## 🗂️ Estructura del proyecto

```
DemoFuncionamiento_Clinicas/
├── index.html                       Web pública con reserva por pasos
├── dashboard.html                   Panel privado del equipo
├── arquitectura.html                Explicación visual del asistente automático
├── ARQUITECTURA-N8N.md              Documentación técnica del asistente (n8n + IA)
├── n8n-workflow-clinica-respira.json  Workflow de n8n (asistente + recordatorios)
├── css/                             Estilos de la web, del panel y de la página de arquitectura
├── js/
│   ├── store.js                     Datos y reglas de negocio (anti-solape, estados, ingresos)
│   ├── landing.js                   Lógica de la reserva por pasos
│   ├── dashboard.js                 Panel: KPIs, pestañas y acciones sobre citas
│   ├── anim.js                      Animaciones de scroll
│   └── arquitectura.js              Animación del flujo del asistente
└── assets/                          Imágenes y filosofía de diseño
```

---

## 🧩 Detalles técnicos

- **HTML, CSS y JavaScript puro**, sin build ni dependencias que instalar.
- Animaciones con **GSAP + ScrollTrigger** por CDN y tipografías de Google Fonts: requieren internet. Sin conexión o con "reducir movimiento" activado, todo se ve igual, sin animar.
- **Reglas del negocio** editables en `js/store.js`:
  - Servicios: Fisioterapia (45 min · 40 €), Osteopatía (60 min · 55 €), Masaje Deportivo (45 min · 45 €).
  - Horario: lunes a viernes, 09:00–14:00 y 16:00–20:00, en bloques de 1 hora.
  - Una cita por bloque; al cancelar, el hueco se libera.
- Las funciones de `store.js` (disponibilidad, alternativas, crear cita, cambiar estado) se corresponden con los nodos del workflow de n8n, así que la lógica de la demo es la misma que la de producción.
- Para publicarla online basta con servir la carpeta estática (Netlify, Vercel o GitHub Pages).

---

## 🔐 Antes de pasar a producción

Una clínica maneja **datos de salud** (el motivo de consulta lo es). Antes de abrir el sistema a pacientes reales se define con cada clínica:

- Consentimiento y textos legales en el formulario (RGPD / LOPDGDD).
- Dónde se alojan los datos y qué proveedores de mensajería e IA se usan.
- Acceso protegido al panel y copias de seguridad.
- Que el asistente se identifique claramente como asistente virtual.

---

*Demo creada por [MISTEREIA](https://www.mistereia.com) · Marca: azul marino y verde menta · Mobile-first.*
