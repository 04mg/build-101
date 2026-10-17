use trailbase_wasm::http::{HttpError, HttpRoute, Json, Request, StatusCode, routing, IntoBody};
use trailbase_wasm::db::query;
use trailbase_wasm::fetch::{self, Request as FetchRequest};
use trailbase_wasm::{Guest, export};

/// Unified TrailBase WASM Extensions Component
/// 
/// Add all your custom endpoints here for the hackathon!
/// Every route registered in `http_handlers` is natively exposed by TrailBase.
struct ExtensionsComponent;

impl Guest for ExtensionsComponent {
  fn http_handlers() -> Vec<HttpRoute> {
    vec![
      // 1. Health check & latency test
      routing::get("/api/ping", ping_handler),

      // 2. AI Chat completion via OpenRouter (WASI outbound HTTP)
      routing::post("/api/chat", chat_handler),

      // 3. Example: Add your hackathon endpoints here!
      // routing::get("/api/hello", hello_handler),
      // routing::post("/api/custom-action", custom_action_handler),
    ]
  }
}

export!(ExtensionsComponent);

/// GET /api/ping
async fn ping_handler(_: Request) -> Result<Json<serde_json::Value>, HttpError> {
  Ok(Json(serde_json::json!({
    "status": "ok",
    "component": "extensions.wasm",
    "runtime": "TrailBase native Wasmtime (WASI-0.2)",
    "message": "Hello World from TrailBase unified extensions component!"
  })))
}

/// POST /api/chat
async fn chat_handler(mut req: Request) -> Result<Json<serde_json::Value>, HttpError> {
  let body: serde_json::Value = req
    .body()
    .json()
    .await
    .map_err(|e| HttpError::message(StatusCode::BAD_REQUEST, e.to_string()))?;

  let user_messages = body.get("messages")
    .and_then(|m| m.as_array())
    .cloned()
    .unwrap_or_else(|| {
      if let Some(msg) = body.get("message").and_then(|m| m.as_str()) {
        vec![serde_json::json!({ "role": "user", "content": msg })]
      } else {
        vec![]
      }
    });

  // Query SQLite DB for any context (e.g., services if exists)
  let services_rows = query("SELECT id, name, description, price FROM services", &[])
    .await
    .unwrap_or_default();

  let mut context_text = String::new();
  for row in services_rows {
    context_text.push_str(&format!("- Item: {:?}\n", row));
  }

  let system_prompt = serde_json::json!({
    "role": "system",
    "content": format!(
      "Eres el asistente inteligente de este producto en TrailBase (WASM).\n\
       Datos disponibles en SQLite:\n{}\n\
       Responde siempre en español, de forma concisa, útil y moderna.",
      if context_text.is_empty() { "No hay datos cargados aún en la BD." } else { &context_text }
    )
  });

  let mut messages_payload = vec![system_prompt];
  for m in user_messages {
    messages_payload.push(m);
  }

  let request_body = serde_json::json!({
    "model": "liquid/lfm-2.5-2.6b:free",
    "messages": messages_payload
  });

  let payload_str = request_body.to_string();

  let openrouter_req = FetchRequest::builder()
    .method("POST")
    .uri("https://openrouter.ai/api/v1/chat/completions")
    .header("Authorization", "Bearer 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")
    .header("Content-Type", "application/json")
    .header("HTTP-Referer", "https://trailbase.io")
    .header("X-Title", "TrailBase WASM Extensions")
    .body(payload_str.into_body())
    .map_err(|e| HttpError::message(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  let res_bytes = fetch::fetch(openrouter_req)
    .await
    .map_err(|e| HttpError::message(StatusCode::BAD_GATEWAY, format!("Fetch error: {:?}", e)))?;

  let parsed: serde_json::Value = serde_json::from_slice(&res_bytes)
    .map_err(|e| HttpError::message(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  let reply = parsed["choices"][0]["message"]["content"]
    .as_str()
    .unwrap_or("Disculpa, no pude procesar la respuesta.")
    .to_string();

  Ok(Json(serde_json::json!({
    "model": "liquid/lfm-2.5-2.6b:free",
    "reply": reply,
    "runtime": "TrailBase native Wasmtime (no server.js)"
  })))
}
