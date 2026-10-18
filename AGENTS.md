# Comandos
- Arrancar: `./start.sh [--port 4000]` (local: `ENABLE_TUNNEL=0 ./start.sh`; TrailBase usa el puerto siguiente).
- Desarrollo con recarga: `./watch.sh` (frontend `:5173`, agentes reinician al guardar).
- Build: `pnpm --dir agents build && pnpm --dir frontend build`.
- UI dev: `pnpm --dir frontend dev`. Logs: `.run/*.log`.
- IA: Claude Code headless (`claude -p`, `claude-haiku-5-5`) con la sesión local de `claude`; Exa vía `EXA_API_KEY` en `.env`. La barra de asistente y el grill de onboarding usan OpenAI GPT-Realtime por WebRTC (`OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL`; agents/src/cruce/realtime.ts); sin la key, el grill vuelve a Claude. Admin: `/_/admin/`.

# Forma de Trabajo
- Backend: TrailBase para auth, datos y schedules; único WASM en backend/extensions/.
- Agentes: Node.js + TypeScript en agents/; cada llamada al modelo es un `claude -p` (agents/src/cruce/claude.ts). Un proceso para todos los agentes.
- Memoria de la red: Graphiti + FalkorDB en memory/service.py (Python, solo localhost), lanzado por start/watch vía memory/run.sh; `ENABLE_MEMORY=0` lo apaga.
- Entrada pública: Node en :4000, /api/agents/* propio y proxy a TrailBase privado en :4001.
- Front: React+Vite+Tailwind+Shadcn en frontend/ -> dist/.
- API: /api/records/v1/* y endpoints en backend/extensions/.
- MCP: exa, context7 en .mcp.json. Skills en .agents/skills.
- No agregar ni ejecutar tests.
