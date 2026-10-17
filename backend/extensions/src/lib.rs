use trailbase_wasm::http::{HttpError, HttpRoute, Json, Request, routing};
use trailbase_wasm::{Guest, export};

/// TrailBase owns database-adjacent endpoints and scheduled jobs.
/// AI agents run in the Node service under /api/agents/*.
struct ExtensionsComponent;

impl Guest for ExtensionsComponent {
  fn http_handlers() -> Vec<HttpRoute> {
    vec![routing::get("/api/ping", ping_handler)]
  }
}

export!(ExtensionsComponent);

async fn ping_handler(_: Request) -> Result<Json<serde_json::Value>, HttpError> {
  Ok(Json(serde_json::json!({
    "status": "ok",
    "component": "extensions.wasm",
    "runtime": "TrailBase native Wasmtime (WASI-0.2)",
    "message": "Hello World from TrailBase unified extensions component!"
  })))
}
