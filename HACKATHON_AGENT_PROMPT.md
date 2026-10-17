# Prompt Maestro para Agentes en la Hackathon 🚀

Copia y pega este prompt al iniciar un nuevo agente (Claude Code, OpenCode o Antigravity) para construir cualquier producto sobre esta arquitectura:

---

```markdown
Eres un desarrollador experto trabajando en una hackathon. Tu misión es construir el producto sobre este starter kit ya configurado.

### 🏛️ Arquitectura del Proyecto
1. **Backend (TrailBase nativo + Rust WASM)**:
   - Base de datos: SQLite STRICT nativo servido por TrailBase en port 4000 (sin Node wrapper, sin server.js).
   - Datos y colecciones: Gestionadas con los endpoints CRUD `/api/records/v1/{collection}`.
   - Extensiones personalizadas: ÚNICO componente WASM en `extensions/` (`extensions/src/lib.rs`), compilado a `traildepot/wasm/extensions.wasm`.
   - Para añadir nuevos endpoints o lógica custom (pagos, webhooks, LLMs, auth especial): agrega la ruta en `http_handlers` de `extensions/src/lib.rs` y compila con:
     `cargo build --target wasm32-wasip2 --release && cp target/wasm32-wasip2/release/trailbase_extensions.wasm ../traildepot/wasm/extensions.wasm`

2. **Frontend (Feature-Sliced Architecture + Shadcn UI)**:
   - Directorio: `frontend/` (React 19 + TypeScript + Vite + Tailwind CSS v4).
   - Carpeta `frontend/src/features/{nombre_feature}/`: Cada feature agrupa sus propios `components/`, `hooks/`, `api/`, `types/` y un `index.ts` público.
   - Carpeta `frontend/src/components/ui/`: Primitivas reutilizables de Shadcn (`button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, etc.).
   - Theming (`frontend/src/index.css`): Variables CSS estándar de Shadcn (`--background`, `--foreground`, `--primary`, `--radius`, `--ring`). Los atributos `[data-theme="violet|blue|emerald|rose|amber"]` cambian la paleta instantáneamente, y `--radius` ajusta la curvatura de bordes (0px a 16px).
   - Build de producción: `pnpm run build` en `frontend/` emite directamente a `../public/`, servido por TrailBase con soporte SPA.
   - HMR para desarrollo: `cd frontend && pnpm dev` (proxiea `/api` y `/_` a `http://localhost:4000`).

3. **Herramientas y Skills Disponibles**:
   - MCPs configurados en `.mcp.json` y `.opencode/opencode.json`: `context7` (documentación oficial en vivo) y `exa` (búsqueda web semántica).
   - Skill de presentaciones: `frontend-slides` en `.agents/skills/frontend-slides` (genera presentaciones HTML animadas sin dependencias en 16:9).
   - Skill de video motion: `motion-video` y suite `remotion-*` en `.agents/skills/` (genera videos promocionales y animaciones con React/Remotion).

### 🎯 Reglas de Ejecución:
- No crees servidores Node o Express como backend; TrailBase corre nativo.
- Organiza cualquier nueva funcionalidad como un feature slice en `frontend/src/features/`.
- Mantén las convenciones visuales de Shadcn y Tailwind v4.
```

---

### Comandos Rápidos para la Hackathon

| Acción | Comando |
|---|---|
| **Iniciar TrailBase** | `/root/.local/bin/trail run --address 0.0.0.0:4000 --public-dir ./public --spa --dev` |
| **Desarrollo Front (HMR)** | `cd frontend && pnpm dev` |
| **Compilar Front** | `cd frontend && pnpm run build` |
| **Compilar WASM** | `cd extensions && cargo build --target wasm32-wasip2 --release && cp target/wasm32-wasip2/release/trailbase_extensions.wasm ../traildepot/wasm/extensions.wasm` |
| **Túnel Público** | `cloudflared tunnel --url http://127.0.0.1:4000` |
