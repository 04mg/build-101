use trailbase_wasm::http::{HttpError, HttpRoute, Json, Request, StatusCode, routing};
use trailbase_wasm::db::{query, execute, Value};
use serde_json::{json, Value as J};
use trailbase_wasm::{Guest, export};

/// TrailBase owns database-adjacent endpoints and scheduled jobs.
/// AI agents run in the Node service under /api/agents/*.
struct ExtensionsComponent;

impl Guest for ExtensionsComponent {
  fn http_handlers() -> Vec<HttpRoute> {
    vec![routing::get("/api/ping", ping_handler),
      routing::get("/api/public/surveys/{token}", public_survey),
      routing::post("/api/public/surveys/{token}", submit_survey)]
  }
}

fn internal(error: impl std::fmt::Display) -> HttpError {
  HttpError::message(StatusCode::INTERNAL_SERVER_ERROR, error)
}
fn bad(message: &str) -> HttpError { HttpError::message(StatusCode::BAD_REQUEST, message) }

async fn load_survey(token: &str) -> Result<(i64, J, usize), HttpError> {
  if token.len() != 36 { return Err(HttpError::status(StatusCode::NOT_FOUND)); }
  let rows = query("SELECT id, document FROM cruce_projects WHERE json_extract(document, '$.confirmed') = 1 AND EXISTS (SELECT 1 FROM json_each(document, '$.validation') v WHERE json_extract(v.value, '$.survey.token') = ?1) LIMIT 1", vec![Value::Text(token.into())]).await.map_err(internal)?;
  let Some(row) = rows.first() else { return Err(HttpError::status(StatusCode::NOT_FOUND)); };
  let (Value::Integer(id), Value::Text(raw)) = (&row[0], &row[1]) else { return Err(internal("Invalid project")); };
  let doc: J = serde_json::from_str(raw).map_err(internal)?;
  let index = doc["validation"].as_array().and_then(|a| a.iter().position(|p| p["survey"]["token"].as_str() == Some(token))).ok_or_else(|| HttpError::status(StatusCode::NOT_FOUND))?;
  if doc["validation"][index]["instrumentStatus"] != "ready" || doc["validation"][index]["instrumentVersion"].as_i64().unwrap_or(0) < 3 {
    return Err(HttpError::message(StatusCode::SERVICE_UNAVAILABLE, "La encuesta se está preparando. Volvé a abrir el link en unos minutos."));
  }
  Ok((*id, doc, index))
}

async fn public_survey(req: Request) -> Result<Json<J>, HttpError> {
  let token = req.path_param("token").unwrap_or("");
  let (_, doc, index) = load_survey(token).await?;
  let survey = &doc["validation"][index]["survey"];
  // Public links expose only the questionnaire, never people, answers or graph.
  Ok(Json(json!({ "title": survey["title"], "intro": survey["intro"], "questions": survey["questions"], "version": survey["version"] })))
}

async fn submit_survey(mut req: Request) -> Result<Json<J>, HttpError> {
  let token = req.path_param("token").unwrap_or("").to_string();
  let bytes = req.body().bytes().await.map_err(internal)?;
  if bytes.len() > 32768 { return Err(HttpError::status(StatusCode::PAYLOAD_TOO_LARGE)); }
  let input: J = serde_json::from_slice(&bytes).map_err(|_| bad("Revisá las respuestas."))?;
  let submission_id = input["id"].as_str().filter(|s| s.len() == 36).ok_or_else(|| bad("Falta el identificador de respuesta."))?;
  for _ in 0..5 {
    let (id, mut doc, index) = load_survey(&token).await?;
    let plan = &doc["validation"][index];
    let survey = &plan["survey"];
    if survey["responses"].as_array().is_some_and(|a| a.iter().any(|r| r["id"].as_str() == Some(submission_id))) {
      return Ok(Json(json!({ "ok": true })));
    }
    if survey["version"] != input["version"] { return Err(HttpError::message(StatusCode::CONFLICT, "La encuesta cambió. Actualizá antes de responder.")); }
    let questions = survey["questions"].as_array().ok_or_else(|| internal("Invalid survey"))?;
    let answers = input["answers"].as_object().ok_or_else(|| bad("Faltan las respuestas."))?;
    let mut cleaned = serde_json::Map::new();
    for q in questions {
      let key = q["id"].as_str().ok_or_else(|| internal("Invalid question"))?;
      let value = answers.get(key);
      let missing = value.is_none() || value.is_some_and(|v| v.is_null() || v.as_str().is_some_and(|s| s.trim().is_empty()) || v.as_array().is_some_and(|a| a.is_empty()));
      if missing {
        if q["required"] == true { return Err(bad("Completá las preguntas obligatorias.")); }
        continue;
      }
      let value = value.unwrap();
      let options = q["options"].as_array().ok_or_else(|| internal("Invalid options"))?;
      let valid = match q["type"].as_str().unwrap_or("") {
        "text" => value.as_str().is_some_and(|s| s.chars().count() <= 4000),
        "single" => value.is_string() && options.contains(value),
        "multiple" => value.as_array().is_some_and(|a| a.len() <= options.len() && a.iter().all(|v| options.contains(v)) && a.iter().enumerate().all(|(i, v)| !a[..i].contains(v))),
        "scale" => value.as_i64().is_some_and(|n| (1..=5).contains(&n)),
        _ => false,
      };
      if !valid { return Err(bad("Revisá el tipo y las opciones de cada respuesta.")); }
      cleaned.insert(key.into(), value.clone());
    }
    if cleaned.is_empty() { return Err(bad("Respondé al menos una pregunta.")); }
    let clock = query("SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now')", vec![]).await.map_err(internal)?;
    let Value::Text(at) = &clock[0][0] else { return Err(internal("Invalid clock")); };
    let revision = doc["revision"].as_i64().ok_or_else(|| internal("Invalid revision"))?;
    let hypothesis = plan["hypothesisId"].as_str().unwrap_or("").to_string();
    let epoch = plan["epoch"].clone();
    let version = survey["version"].clone();
    let snapshot = survey["questions"].clone();
    let plan = &mut doc["validation"][index];
    let responses = plan["survey"]["responses"].as_array_mut().ok_or_else(|| internal("Invalid responses"))?;
    responses.push(json!({ "id": submission_id, "at": at, "version": version, "epoch": epoch, "answers": cleaned, "questions": snapshot }));
    plan["validatedAt"] = J::Null;
    plan["rejectedAt"] = J::Null;
    plan["assessment"] = J::Null;
    plan["assessmentError"] = J::Null;
    plan["analyzedKey"] = json!("");
    doc["activePhase"] = json!("discover");
    doc["decision"] = J::Null;
    doc["pivots"] = json!([]);
    doc["revision"] = json!(revision + 1);
    // Persist raw responses only. Graph notes are published exclusively after
    // the AI has produced an actual discovery insight, never from a question.
    let nodes = doc["nodes"].as_array_mut().ok_or_else(|| internal("Invalid graph"))?;
    if let Some(note) = nodes.iter_mut().find(|n| n["id"] == "decision") { note["status"] = json!("open"); note["updatedAt"] = json!(at); }
    if let Some(note) = nodes.iter_mut().find(|n| n["id"] == hypothesis) { note["status"] = json!("open"); note["updatedAt"] = json!(at); }
    let changed = execute("UPDATE cruce_projects SET document = ?1, updated_at = ?2 WHERE id = ?3 AND json_extract(document, '$.revision') = ?4", vec![Value::Text(doc.to_string()), Value::Text(at.clone()), Value::Integer(id), Value::Integer(revision)]).await.map_err(internal)?;
    if changed == 1 { return Ok(Json(json!({ "ok": true }))); }
  }
  Err(HttpError::message(StatusCode::CONFLICT, "El proyecto se está actualizando. Reintentá en unos segundos."))
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
