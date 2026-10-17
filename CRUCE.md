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

Discover hace grill-me: el agente recorre segmento → situación concreta → proceso
actual → pain points → evidencia, redacta cada pregunta según la conversación y
repregunta una vez si la respuesta es vaga. Al cubrir las ramas cierra con el
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
   preguntas → confirmar problema → research → experimento → evidencia → decisión
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
2. **Explore**: Solution Concept, Value Proposition y Critical Assumptions.
   La matriz de comparación es un entregable adicional.
3. **Prototype**: diseño de Prototype (Landing, Mago de Oz o Fake Door),
   Experiment Results y Learnings. Generar un borrador de experimento no publica
   una landing ni crea resultados o respuestas de usuarios.

Los entregables se pueden generar o iterar con IA, ajustar manualmente, guardar
como borrador y aprobar con **Dar OK**. Se guardan como nodos con fase, relaciones
y versiones, por lo que también forman parte de la memoria buscable. La barra
de IA consulta el contexto real y recomienda un destino; no declara ejecutar
acciones que todavía no ocurrieron.

El porcentaje de Discover se calcula en el servidor: problema confirmado 25% y
cada una de las tres hipótesis validada 25%. La IA evalúa los insights contra el
criterio previo y devuelve apoyo, contradicción o evidencia insuficiente, con
justificación e IDs de los registros. El usuario solo puede confirmar **Validar**
si la evaluación vigente es favorable y cita al menos una encuesta actual y una
entrevista; para los otros resultados confirma **No validar**. El servidor exige
la misma evaluación, vinculada a la evidencia actual, y bloquea Explore/Prototype
hasta validar las tres. Un tick verde grande o una cruz roja marca el resultado
en lugar del número del checklist y centrado sobre la nota del grafo.
Editar una encuesta conserva las respuestas anteriores como contexto y exige una
respuesta de la nueva versión; reformular una hipótesis reabre su validación.
Nueva evidencia reabre la revisión de la hipótesis correspondiente.
En Explore y Prototype, cada uno de los tres entregables principales aporta la
mitad de su peso como borrador y el total al ser aprobado. El avance global es
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
- Las reglas de TrailBase restringen proyectos y memoria a su propietario. Personas es una vista básica vacía; todavía no se publican perfiles ni conocimientos entre usuarios.

## Código

- `agents/src/cruce/`: modelos, persistencia, onboarding, research, búsqueda y endpoints.
- `frontend/src/features/cruce/`: canvas, entrevista, notas y búsqueda.
- `backend/migrations/main/U1792200000__cruce_knowledge.sql`: proyectos e índice de conocimiento.

Los endpoints viven en `/api/agents/cruce/`. Las mutaciones llevan una revisión
del proyecto para detectar clientes desactualizados. El research guarda su estado
antes de comenzar; si el proceso se reinicia, queda disponible para reintentar.
Los endpoints públicos `/api/public/surveys/:token` viven en el WASM: exponen solo
el cuestionario y aceptan respuestas sin login. El guardado de las respuestas es
atómico; el mismo reloj de revisión protege las ediciones del propietario de
escrituras simultáneas. La vista autenticada consulta novedades y sintetiza con IA
la evidencia pendiente. Solo publica notas cuando hay un insight real o cambia
uno existente. Si la IA falla, las respuestas quedan guardadas en Resultados y
la síntesis queda reintentable; no se convierte el registro crudo en una nota.
