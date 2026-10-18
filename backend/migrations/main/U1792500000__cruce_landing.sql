-- Prototype landings: public visits and leads. No record API; only the agent
-- service writes them (from /l/:token) and reads them for the project owner.
CREATE TABLE cruce_landing_events (
  id TEXT PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES cruce_projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('visit', 'lead')),
  visitor TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX cruce_landing_events_token ON cruce_landing_events(project_id, token, kind, created_at);
