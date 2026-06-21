# 🤖 Arquitectura del Asistente Automático — Clínica Respira

### Recepcionista virtual 24/7 por Telegram · n8n + IA + Base de datos

> **Para el dueño, en cristiano:** esto es el "empleado digital" que contesta a los
> pacientes a cualquier hora, cuadra la agenda sin solaparse y guarda cada cita
> automáticamente. Tú solo lo ves todo ordenado en tu panel. **Cero audios, cero
> citas perdidas.**

---

## 1. ¿Qué problema resuelve?

| Antes (manual) | Después (automatizado) |
|---|---|
| Contestas audios entre paciente y paciente | El asistente responde solo, al instante, 24/7 |
| Se solapan citas por descuido | Imposible: el sistema bloquea el hueco al momento |
| 150–200 €/semana perdidos por "no shows" | Recordatorio automático antes de cada cita |
| La agenda está en tu cabeza | Todo guardado y visible en el panel |

Esta automatización es **la misma lógica que ya ves funcionando en la demo web**
(elegir servicio → ver huecos libres → reservar). Aquí simplemente ocurre dentro
de un chat de Telegram, gestionado por una IA.

---

## 2. Visión general (el flujo de un vistazo)

```
   ┌─────────────┐     ┌──────────────────────────────────────────┐     ┌──────────────┐
   │   PACIENTE  │     │                  n8n                       │     │  BASE DATOS  │
   │ (Telegram)  │     │            (el orquestador)                │     │  (Airtable / │
   └──────┬──────┘     │                                            │     │ Google Sheets)│
          │            │  1. Telegram Trigger  (escucha mensajes)   │     └──────┬───────┘
          │  "Hola,    │           │                                │            │
          │   quiero   │           ▼                                │            │
          │   cita" ──────────►  2. IA "Mistereia Bot"              │            │
          │            │      (OpenRouter / Groq · Llama 3)         │            │
          │            │           │   decide qué hacer             │            │
          │            │           ▼                                │            │
          │            │  3. ¿Consultar huecos? ──────────────────────────────► │
          │            │           │   lee disponibilidad           │  ◄──────── │
          │            │           ▼                                │            │
          │            │  4. ¿Solapamiento? → ofrece 3 alternativas │            │
          │            │           ▼                                │            │
          │            │  5. Recoge datos del paciente              │            │
          │            │           ▼                                │            │
          │  ◄────────────  6. Guarda la cita ─────────────────────────────────►│
          │  "✅ Cita   │           │                                │            │
          │  confirmada"│           ▼                                │            │
          └─────────────┘  7. Responde confirmación por Telegram    │            │
                       └──────────────────────────────────────────┘            │
                                                                                │
                       8. (Programado) Recordatorio 24h antes ◄─────────────────┘
```

---

## 3. Componentes (stack 100% gratuito)

| Pieza | Herramienta | Para qué sirve | Coste |
|---|---|---|---|
| **Canal** | Telegram Bot API | Donde el paciente escribe | Gratis |
| **Orquestador** | n8n (local o n8n.cloud free) | Conecta todo y aplica las reglas | Gratis |
| **Cerebro (IA)** | OpenRouter o Groq (Llama 3 / Gemini Flash) | Entiende al paciente y conversa | Gratis (modelos free) |
| **Base de datos** | Airtable o Google Sheets | Guarda servicios, horarios y citas | Gratis |

> 🔄 **Migración a WhatsApp:** el día de mañana, sustituir el nodo *Telegram Trigger*
> por *WhatsApp Business Cloud API* es lo único que cambia. Todo el resto del flujo
> (IA + reglas + base de datos) **se reutiliza al 100%**.

---

## 4. Preparación previa (una sola vez)

### 4.1 Crear el bot de Telegram
1. Abre Telegram y busca **@BotFather**.
2. Envía `/newbot`, ponle nombre (ej. *Clínica Respira*) y usuario (ej. `@ClinicaRespiraBot`).
3. BotFather te da un **TOKEN** (algo como `7123456:AAH...`). Guárdalo.

### 4.2 Crear la API Key de IA (gratis)
- **OpenRouter:** crea cuenta en `openrouter.ai` → *Keys* → copia tu API Key. Usa un modelo gratuito como `meta-llama/llama-3.1-8b-instruct:free`.
- **Alternativa Groq:** crea cuenta en `console.groq.com` → *API Keys*. Muy rápido, modelos Llama gratuitos.

### 4.3 Preparar la base de datos
Crea dos tablas (en **Airtable** o pestañas en **Google Sheets**):

**Tabla `Servicios`** (datos fijos del negocio)
| servicio_id | nombre | duracion_min | precio_eur |
|---|---|---|---|
| fisioterapia | Fisioterapia General | 45 | 40 |
| osteopatia | Osteopatía | 60 | 55 |
| masaje | Masaje Deportivo | 45 | 45 |

**Tabla `Citas`** (se rellena automáticamente)
| id | fecha | hora | servicio | nombre | telefono | email | motivo | estado | creada_en |
|---|---|---|---|---|---|---|---|---|---|

> Los **horarios** (L–V, 09–14h y 16–20h, bloques de 1 h) van escritos en las
> instrucciones de la IA y en el nodo de validación (ver paso 5).

---

## 5. Construcción del workflow en n8n (paso a paso)

### 🟢 Nodo 1 — Telegram Trigger
- **Tipo:** *Telegram Trigger*.
- **Credencial:** pega el TOKEN de BotFather.
- **Evento:** `message`.
- **Función:** se activa cada vez que un paciente escribe al bot.

### 🟢 Nodo 2 — (Memoria de conversación)
- **Tipo:** *Window Buffer Memory* (o tabla "conversaciones" en la BD).
- **Función:** recuerda lo que el paciente ya ha dicho (servicio, día...), para que la
  conversación tenga sentido y no pregunte dos veces lo mismo.
- **Clave:** el `chat.id` de Telegram identifica a cada paciente.

### 🟢 Nodo 3 — AI Agent · "Mistereia Bot"
- **Tipo:** *AI Agent* (o *Basic LLM Chain*) con el modelo de OpenRouter/Groq.
- **System Prompt:** *(ver sección 6 — es el corazón del asistente)*.
- **Herramientas (Tools) que se le conectan:**
  - 🔧 `consultarDisponibilidad(fecha)` → Nodo 4
  - 🔧 `guardarCita(datos)` → Nodo 6
- **Función:** entiende al paciente, conversa con tono cercano y decide cuándo
  consultar huecos o guardar la cita.

### 🟢 Nodo 4 — Consultar disponibilidad (Tool)
- **Tipo:** *Airtable/Google Sheets → Search* + nodo *Code* (o *Function*).
- **Lógica (idéntica a la de la demo, `getBloquesDisponibles`):**
  1. Lee de la tabla `Citas` las del día pedido con estado distinto de `cancelada`.
  2. Parte de los bloques fijos: `09:00, 10:00, 11:00, 12:00, 13:00, 16:00, 17:00, 18:00, 19:00`.
  3. Quita los bloques ya ocupados → devuelve los **libres**.
  4. Si el día no es L–V, devuelve "cerrado".

```javascript
// Nodo Code (n8n) — calcular huecos libres de un día
const BLOQUES = ['09:00','10:00','11:00','12:00','13:00','16:00','17:00','18:00','19:00'];
const fecha = $json.fecha;                       // 'YYYY-MM-DD' que pide la IA
const ocupadas = $items('Buscar Citas')          // citas de ese día (no canceladas)
  .map(i => i.json.hora);
const libres = BLOQUES.filter(b => !ocupadas.includes(b));
return [{ json: { fecha, libres } }];
```

### 🟢 Nodo 5 — Gestión proactiva del solapamiento
- **Dentro de la lógica de la IA + Nodo 4.**
- **Regla de oro:** si el paciente pide una hora **ocupada**, el asistente **NO** dice
  solo "no hay". Coge la lista de `libres` y ofrece **3 alternativas** claras:

  > *"Las 10:00 ya está reservada 🙈. Pero te puedo ofrecer: **09:00**, **11:00** o
  > **17:00**. ¿Cuál te viene mejor?"*

### 🟢 Nodo 6 — Guardar la cita (Tool)
- **Tipo:** *Airtable/Google Sheets → Create Record*.
- **Antes de guardar — doble verificación anti-solape:** vuelve a comprobar que el
  hueco sigue libre (por si dos personas reservan a la vez). Si se ocupó, vuelve al Nodo 5.
- **Campos que guarda:** `fecha, hora, servicio, nombre, telefono, email, motivo`,
  `estado = "pendiente"`, `creada_en = ahora`.
- 📞 El **teléfono es obligatorio** (es la clave para el recordatorio posterior).

### 🟢 Nodo 7 — Responder confirmación (Telegram)
- **Tipo:** *Telegram → Send Message*.
- **Función:** confirma con un mensaje cálido y el resumen de la cita.

  > *"¡Listo, Lucía! ✅ Te esperamos el **martes 24 a las 10:00** para tu
  > **Fisioterapia** (45 min · 40 €). Si necesitas cambiarla, escríbeme cuando quieras 💚"*

### 🟢 Nodo 8 — Recordatorio automático (workflow aparte)
- **Tipo:** *Schedule Trigger* (se ejecuta 1 vez al día, ej. a las 18:00).
- **Lógica:** busca las citas de **mañana** con estado `pendiente` y envía un recordatorio
  por Telegram/WhatsApp.
- **Resultado:** ataca directamente los 150–200 €/semana de "no shows".

---

## 6. El System Prompt del "Mistereia Bot"

> Este texto se pega en el nodo de la IA (Nodo 3). Define su personalidad y sus reglas.

```text
# IDENTIDAD
Eres la recepcionista de Clínica Respira, una clínica de fisioterapia y osteopatía
en el centro de Madrid. Tu trato es cercano, empático y muy profesional. Hablas
siempre en español, con calidez y frases cortas.

# REGLAS INQUEBRANTABLES
- NUNCA digas que eres una IA, un bot o un sistema automático. Eres "el equipo de
  recepción de Clínica Respira".
- NUNCA te inventes precios, servicios ni horas libres. Consulta SIEMPRE la base de
  datos con tus herramientas antes de afirmar disponibilidad.
- Si un hueco está ocupado, ofrece automáticamente 3 alternativas reales en lista.

# SERVICIOS (consulta la tabla para confirmar precio/duración)
- Fisioterapia General — 45 min — 40 €
- Osteopatía — 60 min — 55 €
- Masaje Deportivo — 45 min — 45 €

# HORARIOS
- Lunes a viernes. Mañanas 09:00–14:00 y tardes 16:00–20:00.
- Citas en bloques de 1 hora. No se solapan: una cita por bloque.

# FLUJO DE LA CONVERSACIÓN
1. Saluda con calidez y pregunta en qué puedes ayudar / qué servicio necesita.
2. Pregunta qué día prefiere. Usa la herramienta consultarDisponibilidad(fecha).
3. Muestra los huecos libres de forma clara. Si pide uno ocupado, ofrece 3 alternativas.
4. Cuando elija hora, pide los datos OBLIGATORIOS uno a uno:
   - Nombre completo
   - Teléfono (imprescindible)
   - Correo electrónico
   - Motivo breve de la consulta
5. Repite el resumen y pide confirmación.
6. Al confirmar, usa la herramienta guardarCita(datos) y da la confirmación final
   con calidez. Recuerda que recibirá un recordatorio antes de la cita.

# TONO
Usa algún emoji con moderación (💚, ✅, 🙂). Nunca seas frío ni robótico.
```

---

## 7. Cómo se conecta esto con lo que ya has visto

| En la demo web (lo que ves) | En la automatización n8n (producción) |
|---|---|
| Eliges servicio en el formulario | La IA te lo pregunta por chat |
| Ves los huecos libres del día | Nodo 4 `consultarDisponibilidad` |
| Un hueco ocupado desaparece | La IA ofrece 3 alternativas (Nodo 5) |
| Pulsas "Confirmar cita" | Nodo 6 `guardarCita` |
| La cita aparece en tu panel | El panel lee la misma tabla `Citas` |

**El panel de control (dashboard) es exactamente el mismo.** En la demo lee del
navegador; en producción leería de Airtable/Google Sheets. Tú no notas diferencia:
sigues viendo "Hoy" y "Próximos días" y marcando Completada / Cancelada.

---

## 8. Puesta en marcha — checklist

- [ ] Crear bot de Telegram con @BotFather y copiar TOKEN.
- [ ] Crear API Key gratuita en OpenRouter o Groq.
- [ ] Montar las tablas `Servicios` y `Citas` en Airtable / Google Sheets.
- [ ] Importar/crear el workflow en n8n con los nodos 1–7.
- [ ] Pegar el System Prompt del Nodo 3.
- [ ] Probar una reserva real desde Telegram.
- [ ] Activar el workflow de recordatorios (Nodo 8).
- [ ] (Opcional) Conectar el panel a la base de datos real.

---

> ✍️ *Documento de arquitectura preparado para Clínica Respira. La demo web y este
> esquema muestran el sistema completo: web de reservas + panel del personal +
> asistente automático. Todo con infraestructura gratuita.*
