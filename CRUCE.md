# cruce · Discover → Explore → Prototype

## Arrancar

```sh
ENABLE_TUNNEL=0 ./start.sh
```

El inicio aplica las migraciones de TrailBase. Se usa la autenticación existente:
entrar con una cuenta verificada. `./watch.sh` habilita la recarga de desarrollo.

En `.env`:

El core del agente es Claude Code en modo headless: cada llamada ejecuta
`claude -p --model claude-haiku-5-5` con un JSON Schema de salida, sin tools,
sin sesión y sin leer la configuración del proyecto (`agents/src/cruce/claude.ts`).
Usa la sesión local de `claude` (iniciá sesión una vez en esa máquina).

- `EXA_API_KEY`: el research le da a Claude el MCP de Exa (`web_search_exa`, `web_fetch_exa`) para buscar alternativas, experiencias y contraejemplos. Solo se guardan fuentes cuya URL devolvió Exa; la cita queda marcada solo si aparece textual en el resultado.

Todo el contenido de investigación (preguntas del grill, hipótesis, encuestas,
entrevistas, experimento y aprendizajes) se genera con IA desde el contexto real.
No hay instrumentos ni entrevistas de fallback. Las llamadas hacen hasta seis
intentos, con backoff exponencial, jitter, tiempos de espera progresivos y feedback
de validación. Los instrumentos pasan una segunda revisión de IA que comprueba
rol, evento, resultado y correspondencia con el criterio de cada hipótesis.
Si se agotan los intentos, se muestra un error recuperable y no se publica contenido
genérico. Los instrumentos de versiones anteriores se conservan en el historial;
los instrumentos legados se regeneran con IA antes de mostrarlos o compartirlos.
Los errores de IA muestran una causa y una referencia que se puede encontrar en
`.run/agents.log`, sin registrar prompts ni claves.

Discover hace un grill liviano: como máximo tres preguntas del asistente después
de la idea inicial, con cierre anticipado si ya alcanza para encuadrar segmento,
situación y fricción. No agota un cuestionario de ramas ni audita evidencia de
terceros: las incertidumbres pasan al research y a las hipótesis. Las preguntas
son abiertas, sin opciones de respuesta ni recomendaciones. Con `OPENAI_API_KEY`
el grill corre sobre GPT-Realtime (WebRTC desde el navegador): se puede escribir
o contar el problema hablando, y el cofounder lee cada pregunta en voz alta, igual
a la que muestra el chat. Por voz es una conversación: el modelo responde al
terminar cada turno y, cuando aprende algo, llama a `frame_problem` con
`founderAnswer` (lo que contó el fundador) y el encuadre; el servidor guarda ambos
juntos (`intake-voice`) y el modelo sigue con su próxima pregunta. Es un grill-me
sin cupo fijo de preguntas (tope de seguridad de 10). La interfaz de voz no muestra
texto: solo el orbe y su estado. Escribiendo se conserva el orden del flujo con
Claude: se guarda la respuesta, el modelo llama a `frame_problem` y el servidor lo
aplica con `intake-result`.
Research, mapa, hipótesis, instrumentos, rewind y reintento funcionan igual. Si
el navegador corta el turno, a los 3 minutos queda reintentable. Sin la key, o si
Realtime no conecta, el grill sigue con Claude y el micrófono usa el dictado del
navegador. Cierra con el
problem statement y exactamente 3 hipótesis falsables, priorizadas por riesgo e
incertidumbre. Cada una incluye una encuesta estructurada y una guía de entrevista.
No trabaja Customer Journey.

## Interfaz y recorrido

La navegación tiene **Recorrido** (con las tres fases como subopciones) y **Personas**.
El login y el registro son una página aparte, sin sidebar. Discover empieza con un único
input centrado; después el cofounder define el problema en un chat junto al mapa
(sidebar | chat | grafo), sin la barra inferior de IA. Al terminar las preguntas
se confirma el planteo y la validación ocupa el lugar
del chat; la barra de IA queda centrada únicamente dentro del grafo. El problema
se puede ajustar desde su nota, reabriendo la validación.

Sin SMTP, `/api/agents/register` crea la cuenta en TrailBase y la marca verificada.

1. **Discover** agrupa Discover & Frame Problem y Validate Problem. Idea → grill
   breve con research exploratorio en paralelo desde la primera aclaración →
   problema provisional → experimento → evidencia → decisión
   o fork. Cada hipótesis tiene una encuesta editable con link público `/s/:token`,
   resultados por versión, una guía de entrevista editable y múltiples entrevistas
   por persona. El micrófono usa MediaRecorder y el reconocimiento de voz disponible
   en el navegador; se guarda el texto corregible y el audio se puede descargar
   localmente. Los instrumentos y respuestas crudas no son nodos. La IA sintetiza
   hasta tres temas generales por hipótesis con Observación → Insight → Oportunidad
   (HMW), citando internamente registros de todas las respuestas o de un subconjunto
   acotado junto con las síntesis previas. Actualiza el mismo tema al llegar nuevas
   señales, en lugar de crear notas por pregunta o participante. Si no hay un
   aprendizaje sustentado, no crea ninguna nota. Los veredictos y la insuficiencia
   de evidencia se comunican aparte, con una frase breve, nunca como insights.
2. **Explore** (sin grafo: sidebar con gauge y pasos | matriz y soluciones).
   Un agente reutiliza el research y los insights de Discover (sin nueva búsqueda
   web) y arma la **matriz de alternativas**: criterios salidos de los insights,
   proceso actual y competidores (solo URLs que ya devolvió Exa; "sin datos" si
   no hay información) y tres soluciones, cada una respondiendo a un How might we.
   El fundador elige una y la IA redacta Solution Concept, Value Proposition y
   Critical Assumptions como borradores (`agents/src/cruce/explore.ts`).
3. **Prototype** (sidebar con gauge, link, métricas, hipótesis y leads | landing
   en vivo con chat). Haiku plantea tres hipótesis que la landing puede contrastar
   y Claude Sonnet (`claude-sonnet-5-5`) escribe una única landing con la skill
   `.agents/skills/landing-page`; cada mensaje del chat la reescribe. Se publica en
   `/l/:token`, servida por el agente con CSP `sandbox` (origen opaco), y un script
   inyectado registra visitas y leads del `<form data-cruce-lead>` en
   `cruce_landing_events` (`agents/src/cruce/landing.ts`). La IA evalúa cada
   hipótesis contra visitas, leads y respuestas; el fundador confirma **Validar** o
   **No validar** como en Discover. Experiment Results y Learnings reciben esos datos.
   Cada fase descarga sus entregables en un `.md`.

Los entregables se pueden generar o iterar con IA, ajustar manualmente, guardar
como borrador y aprobar con **Dar OK**. Se guardan como nodos con fase, relaciones
y versiones, por lo que también forman parte de la memoria buscable. La barra
de IA corre sobre OpenAI GPT-Realtime (`OPENAI_API_KEY`): el navegador se conecta
por WebRTC con una clave efímera que el servidor crea con las instrucciones, el
contexto del proyecto y las tools (`agents/src/cruce/realtime.ts`). Se puede
escribir o hablar: en modo voz, un orbe animado sigue el volumen del micrófono
y de la voz del cofounder. Las tools son `read_project` (estado completo con
evidencia), `edit_map` (cambios en el mapa de Discover, validados y aplicados
por el servidor con `assist-edit`) y `navigate` (botón "Continuar por acá" o ir
directo). Cada turno se guarda en el historial con `assist-turn`. No declara
ejecutar acciones que todavía no ocurrieron.

El porcentaje de Discover se calcula en el servidor: problema confirmado 25% y
cada una de las tres hipótesis validada 25%. La IA evalúa los insights contra el
criterio previo y devuelve apoyo, contradicción o evidencia insuficiente, con
justificación e IDs de los registros. El usuario solo puede confirmar **Validar**
si la evaluación vigente es favorable y cita al menos una encuesta actual o una
entrevista con un insight sustentado; para los otros resultados confirma **No validar**. El servidor exige
la misma evaluación, vinculada a la evidencia actual, y bloquea Explore/Prototype
hasta validar las tres. Un tick verde grande o una cruz roja marca el resultado
en lugar del número del checklist y centrado sobre la nota del grafo.
Editar una encuesta conserva las respuestas anteriores como contexto y exige una
respuesta de la nueva versión; reformular una hipótesis reabre su validación.
Nueva evidencia reabre la revisión de la hipótesis correspondiente.
Explore suma cinco hitos: matriz, solución elegida y sus tres entregables
(borrador medio hito, aprobado uno). Prototype: landing publicada 25% y cada una
de sus tres hipótesis decidida 25%. Las generaciones de Explore y Prototype corren
en segundo plano (`phaseJobs.ts`) y se retoman tras un reinicio. El avance global es
el promedio de las tres fases. Representa hitos resueltos, no certeza de éxito.
Los proyectos anteriores se leen en Discover por defecto, sin migrar ni perder
sus respuestas, notas o evidencia.

El canvas está implementado con HTML, SVG y Pointer Events, sin librerías de grafos.
Permite mover notas, desplazar el fondo, zoom con rueda/pinch, ajustar el mapa y
seleccionar notas. Las relaciones se agregan desde el detalle de una nota.

## Memoria

- `cruce_projects.document` conserva nodos, relaciones tipadas, respuestas, versiones, decisiones y posiciones visuales separadas.
- Los triggers SQLite proyectan los nodos a `cruce_knowledge` de forma atómica con cada guardado. Las notas no dependen del historial de un chat.
- Fuentes web identificadas por URL, fragmentos originales y fechas. Cada interpretación enlaza sus fuentes. Las nuevas síntesis conservan las anteriores.
- La búsqueda recupera notas y versiones de los proyectos accesibles al usuario. La búsqueda es textual.
- Desde una búsqueda se puede abrir el proyecto original o traer una referencia contextual. Un fork conserva la procedencia y reabre las hipótesis del nuevo enfoque.
- Las evidencias registradas por el fundador se distinguen de las señales web. Una síntesis web no marca automáticamente una hipótesis como validada.
- Las reglas de TrailBase restringen proyectos y memoria a su propietario.

## Red de founders (Graphiti + FalkorDB)

- Cada vez que cambia el problema, un pain point, una hipótesis o su resultado (validada / no validada), el agente proyecta esas notas al grafo compartido de Graphiti en FalkorDB (`memory/service.py`, privado en `127.0.0.1:MEMORY_PORT`) y busca notas parecidas de otros founders.
- Claude decide qué candidatos son cruces reales y escribe cada aviso: **mismo problema**, **ya validó / no validó tu hipótesis**, **prueba tu misma hipótesis** o **partnership** (otra persona ataca uno de tus pain points, hipótesis o tu problema desde otro enfoque). Cada cruce se crea para ambos lados, con la descripción anónima del proyecto del otro.
- Los cruces llegan como notificaciones Sonner (y push si el navegador las activó) con **Contactar**, **Ver nota** (abre la nota en el grafo) y **Detalle** (Personas).
- Contactar genera con IA una solicitud anónima, tipo LinkedIn. Quien la recibe ve una notificación push y un aviso Sonner, y puede **Aceptar** o **Rechazar**. Al aceptar, ambos ven email, nombre del proyecto, problema e hipótesis con su estado.
- Los cruces, contactos y conexiones quedan como relaciones entre proyectos en el grafo (`SAME_PROBLEM`, `SAME_HYPOTHESIS`, `PARTNERSHIP_FIT`, `CONTACTED`, `CONNECTED`). El estado (vistos, solicitudes, suscripciones push) vive en tablas `cruce_network_*` de SQLite sin record API: solo el agente las lee, así nadie ve identidades ajenas antes de aceptar.
- `./start.sh` y `./watch.sh` arrancan la memoria con `memory/run.sh` (Docker + venv). Es opcional: sin ella la app funciona y Personas avisa que la red no está disponible. Usa embeddings de OpenRouter con `AI_API_KEY`, si no `text-embedding-3-small` de OpenAI con `OPENAI_API_KEY`, y sin ninguna, embeddings locales deterministas; cada uno en su propio grafo.

## Biblioteca de experiencias

- `cruce_experiences` guarda casos reales de otras empresas (fracasos, pivots y éxitos) con sus fuentes: FuckUp Nights, post-mortems, fidelización y POS, y empresas del ecosistema de Build 101. Se recuperan por similitud (embeddings de OpenAI con `OPENAI_API_KEY`; si no, búsqueda léxica), buscando cada nota y respuesta del fundador por separado (`agents/src/cruce/experiences.ts`).
- El grill los recibe como `documentedCases`, el research puede citarlos como fuentes en el mapa y la barra los consulta con `find_experiences`. Ningún agente tiene reglas por caso: el modelo decide si un caso se parece y cómo usarlo (los fracasos como advertencia; los éxitos como alternativas, sin atribuirlos).

## Datos de demo

`pnpm --dir agents seed` (con la app levantada) guarda un backup en `backend/data/backups/`, deja solo a los admins y carga `seed/data/` (biblioteca y founders con sus proyectos, proyectados a la memoria de la red). `seed/data/` está en `.gitignore`: los datos no se versionan. `pnpm --dir agents seed --update` no borra nada: solo crea o reemplaza los proyectos de los founders de `founders.json`.

## Código

- `agents/src/cruce/`: modelos, persistencia, onboarding, research, búsqueda y endpoints.
- `frontend/src/features/cruce/`: canvas, entrevista, notas y búsqueda.
- `backend/migrations/main/U1792200000__cruce_knowledge.sql`: proyectos e índice de conocimiento.
- `agents/src/cruce/network.ts`, `memory/service.py`, `frontend/src/features/cruce/useNetwork.tsx` y `People.tsx`: red de founders.

Los endpoints viven en `/api/agents/cruce/`. Las mutaciones llevan una revisión
del proyecto para detectar clientes desactualizados. El research guarda su estado
antes de comenzar; si el proceso se reinicia, queda disponible para reintentar.
El onboarding guarda cada respuesta y su operación antes de llamar a la IA y
responde HTTP 202. El navegador consulta el estado con un único polling sin
solapamientos: una desconexión no cancela ni pierde el turno, un reenvío del mismo
turno es idempotente y un reinicio retoma la operación pendiente. Los errores
muestran una acción para reintentar la respuesta ya guardada, sin volver a escribirla.
El research y la síntesis se ejecutan en segundo plano: los GET no esperan llamadas
al modelo ni retienen el lock de la conversación. Sus resultados se integran con
la revisión más reciente, conservando las aclaraciones del fundador y el layout.
La revisión de research no invalida una respuesta a la misma pregunta de onboarding.
Los endpoints públicos `/api/public/surveys/:token` viven en el WASM: exponen solo
el cuestionario y aceptan respuestas sin login. El guardado de las respuestas es
atómico; el mismo reloj de revisión protege las ediciones del propietario de
escrituras simultáneas. La vista autenticada consulta novedades y sintetiza con IA
la evidencia pendiente. Solo publica notas cuando hay un insight real o cambia
uno existente. Si la IA falla, las respuestas quedan guardadas en Resultados y
la síntesis queda reintentable; no se convierte el registro crudo en una nota.
