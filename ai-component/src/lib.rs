use trailbase_wasm::http::{HttpError, HttpRoute, Json, Request, StatusCode, routing};
use trailbase_wasm::db::query;
use trailbase_wasm::fetch::{self, Request as FetchRequest};
use trailbase_wasm::{Guest, export};
use trailbase_wasm::http::IntoBody;

struct Component;

impl Guest for Component {
  fn http_handlers() -> Vec<HttpRoute> {
    vec![
      routing::get("/api/ping", async |_| {
        Ok("pong\n".to_string())
      }),
      routing::post("/api/chat", chat_handler),
    ]
  }
}

export!(Component);

async fn chat_handler(mut req: Request) -> Result<Json<serde_json::Value>, HttpError> {
  let body: serde_json::Value = req
    .body()
    .json()
    .await
    .map_err(|e| HttpError::message(StatusCode::BAD_REQUEST, e.to_string()))?;

  let user_messages = body.get("messages")
    .and_then(|m| m.as_array())
    .cloned()
    .unwrap_or_default();

  // Query SQLite DB for services
  let services_rows = query("SELECT id, name, description, price, duration_min, category FROM services", &[])
    .await
    .unwrap_or_default();

  let mut services_text = String::new();
  for row in services_rows {
    services_text.push_str(&format!("- Service: {:?}\n", row));
  }

  // Build payload for OpenRouter
  let system_prompt = serde_json::json!({
    "role": "system",
    "content": format!(
      "Eres el Asistente Inteligente de Reservas de TrailBase ejecutándose en un componente nativo Rust-WASM.\n\
       Servicios en SQLite:\n{}\n\
       Responde siempre en español, de forma concisa y profesional.",
      services_text
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
    .header("X-Title", "TrailBase WASM Booking Assistant")
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
    "model": "liquid/lfm-2.5-2.6b:free (Rust-WASM Component)",
    "reply": reply,
    "runtime": "TrailBase native Wasmtime (no server.js)"
  })))
}
