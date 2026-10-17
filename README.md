# 🚀 TrailBase Booking Hub (100% Nativo + Rust-WASM)

Prototipo fullstack de aplicación de reservas construido utilizando **[TrailBase](https://trailbase.io)** como backend nativo de alto rendimiento (Rust + SQLite STRICT) y una SPA moderna, rápida y responsiva en el frontend.

---

## ⚡ Arquitectura 100% Nativa (Sin Node ni server.js)

- **Backend:** [TrailBase v0.34.7](https://trailbase.io)
  - **Base de datos:** SQLite con tablas `STRICT` y migraciones automáticas (`traildepot/migrations/main/`).
  - **Endpoints REST CRUD nativos:**
    - `GET /api/records/v1/services`: Listado de servicios disponibles para reservar.
    - `GET /api/records/v1/bookings`: Listado de reservas activas.
    - `POST /api/records/v1/bookings`: Creación instantánea de una reserva.
    - `DELETE /api/records/v1/bookings/{id}`: Cancelación y eliminación de reservas.
  - **Componente Nativo Rust-WASM (`traildepot/wasm/trailbase_ai_component.wasm`):**
    - Compilado en Rust con el target `wasm32-wasip2` usando `trailbase-wasm`.
    - Ejecutado directamente por el runtime **Wasmtime** integrado en TrailBase.
    - Expone de forma nativa:
      - `GET /api/ping`: Healthcheck del componente WASM.
      - `POST /api/chat`: Endpoint del asistente IA que consulta SQLite y llama a OpenRouter (`liquid/lfm-2.5-2.6b:free`) con WASI outbound HTTP.
  - Servidor estático integrado con `--public-dir ./public` y `--spa` en el puerto `4000`.

- **Frontend:**
  - SPA sin dependencias pesadas ni tiempos de compilación (HTML5 + Tailwind CSS + Lucide Icons + Vanilla JS).
  - Catálogo interactivo de servicios con filtros por categoría (*Deportes, Espacios, Gastronomía, Negocios*).
  - Modal de reserva con selector de fechas, horarios, asistentes y notas especiales.
  - Panel de Administración y Gestión en tiempo real con estadísticas y cancelación de reservas.
  - Asistente de IA conversacional integrado directamente con el endpoint WASM `/api/chat`.

---

## 🛠️ Cómo Iniciar

El servidor TrailBase se ejecuta directamente en el puerto `4000`:
👉 **[http://localhost:4000](http://localhost:4000)**

Para reiniciar o ejecutar manualmente:
```bash
./start.sh
# O directamente:
trail run --address 0.0.0.0:4000 --public-dir ./public --spa --dev
```

Para recompilar el componente WASM en Rust:
```bash
cd ai-component
cargo build --target wasm32-wasip2 --release
cp target/wasm32-wasip2/release/trailbase_ai_component.wasm ../traildepot/wasm/
```

---

## 📁 Estructura del Proyecto

```text
/root/demotrailbase/
├── ai-component/                 # Código fuente del componente nativo en Rust
│   ├── Cargo.toml
│   └── src/lib.rs                # Handlers /api/ping y /api/chat en Rust
├── public/
│   └── index.html                # Frontend SPA con Tailwind y Lucide
├── traildepot/
│   ├── config.textproto          # Configuración de TrailBase y Record APIs
│   ├── wasm/
│   │   └── trailbase_ai_component.wasm # Binario compilado cargado por Wasmtime
│   └── migrations/main/
│       └── U1792193499__init_bookings.sql # Esquema STRICT de SQLite
├── start.sh                      # Script de arranque nativo
└── README.md
```
