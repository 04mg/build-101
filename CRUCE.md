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

Sin Claude Code disponible se usa una entrevista guiada explícita; no se inventan resultados de investigación. Si una búsqueda falla, el estado queda reintentable.
Los errores de IA muestran una causa y una referencia que se puede encontrar en
`.run/agents.log`, sin registrar prompts ni claves.

Discover hace grill-me: el agente recorre segmento → situación concreta → proceso
actual → pain points → evidencia, redacta cada pregunta según la conversación y
repregunta una vez si la respuesta es vaga. Al cubrir las ramas cierra con el
problem statement y de 1 a 3 hipótesis falsables. No trabaja Customer Journey.

## Interfaz y recorrido

La navegación tiene **Recorrido** (con las tres fases como subopciones) y **Personas**.
El login y el registro son una página aparte, sin sidebar. Discover empieza con un único
input centrado; después el cofounder define el problema en un chat junto al mapa
(sidebar | chat | grafo), sin la barra inferior de IA. Cuando no quedan preguntas,
**Continuar** confirma el problema y la vista pasa al mapa con la barra de IA abajo.

Sin SMTP, `/api/agents/register` crea la cuenta en TrailBase y la marca verificada.

1. **Discover** agrupa Discover & Frame Problem y Validate Problem. Idea → seis
   preguntas → confirmar problema → research → experimento → evidencia → decisión
   o fork. Entregables: Problem Statement, hipótesis, Evidence Board, experimento
   y Problem Verdict. Customer Journey es opcional; guía de entrevistas y
   cuestionario se pueden preparar con IA y editar como borradores.
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

El porcentaje de Discover se calcula en el servidor: problema confirmado 15%, research 20%
(10% si es parcial), hipótesis 15%, experimento 10%, evidencia 25%, decisión 15%.
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
