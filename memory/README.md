# Cruce memory spike

CLI aislado para probar **Graphiti + FalkorDB + embeddings de OpenRouter** con perfiles y experiencias completamente ficticios. No modifica `agents/`, `frontend/` ni TrailBase.

## Requisitos

- Docker
- Python 3.12+
- `AI_API_KEY` y `AI_BASE_URL` configurados en `app/.env`
- Una cuenta/modelo de OpenRouter que pueda llamar al endpoint de embeddings

El CLI lee `../.env` relativo a este directorio, no muestra sus valores y no escribe credenciales. Usa `liquid/lfm-2.5-embedding-350m:free` (1024 dimensiones).

## Arranque

Desde `app/`:

```bash
bash memory/falkordb.sh start
python3 -m venv memory/.venv
memory/.venv/bin/pip install -r memory/requirements.txt
memory/.venv/bin/python memory/cli.py demo
```

También se puede ejecutar cada paso por separado:

```bash
memory/.venv/bin/python memory/cli.py doctor
memory/.venv/bin/python memory/cli.py seed
memory/.venv/bin/python memory/cli.py match "Busco founders que hayan sufrido desperdicio de alimentos en restaurantes y hayan probado predicción de compras."
memory/.venv/bin/python memory/cli.py demo --request-first
```

`seed` es repetible: crea UUIDs deterministas y actualiza los mismos nodos y relaciones. `demo` siembra y ejecuta una búsqueda de ejemplo. Si la terminal es interactiva, ofrece simular una solicitud de presentación; no envía mensajes ni contacta personas.

## Alcance del experimento

- Se guardan personas, problemas, enfoques y relaciones en un grafo/grupo separado: `cruce_network_poc`.
- Graphiti ordena candidatos con búsqueda semántica/textual sobre el grafo.
- La elegibilidad para una presentación se filtra además con el campo explícito `open_to_intro`; no se infiere del texto ni del score.
- Todo el dataset es inventado. Este CLI no implementa todavía cuentas, aislamiento entre usuarios, permisos reales de compartir ni un servicio de presentaciones.
- Las búsquedas de embeddings mandan los textos ficticios y la consulta a OpenRouter.

Para detener el contenedor sin borrar el volumen:

```bash
bash memory/falkordb.sh stop
```
