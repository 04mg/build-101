CREATE TABLE cruce_projects (
  id INTEGER PRIMARY KEY,
  owner BLOB NOT NULL REFERENCES _user(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT NOT NULL CHECK(json_valid(document)),
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX cruce_projects_owner ON cruce_projects(owner);

-- The graph document is the source of truth. This searchable projection is
-- updated in the same SQLite transaction, including edits and fork creation.
CREATE TABLE cruce_knowledge (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES cruce_projects(id) ON DELETE CASCADE,
  node_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  UNIQUE(project_id, node_key)
) STRICT;

CREATE INDEX cruce_knowledge_project ON cruce_knowledge(project_id, kind, status);

CREATE TRIGGER cruce_project_created AFTER INSERT ON cruce_projects BEGIN
  INSERT INTO cruce_knowledge(project_id, node_key, kind, title, body, status, data)
  SELECT NEW.id, value->>'id', value->>'kind', value->>'title',
         value->>'body', value->>'status', value
  FROM json_each(NEW.document, '$.nodes');
END;

CREATE TRIGGER cruce_project_updated AFTER UPDATE OF document ON cruce_projects BEGIN
  DELETE FROM cruce_knowledge
  WHERE project_id = NEW.id AND node_key NOT IN (
    SELECT value->>'id' FROM json_each(NEW.document, '$.nodes')
  );
  INSERT INTO cruce_knowledge(project_id, node_key, kind, title, body, status, data)
  SELECT NEW.id, value->>'id', value->>'kind', value->>'title',
         value->>'body', value->>'status', value
  FROM json_each(NEW.document, '$.nodes') WHERE true
  ON CONFLICT(project_id, node_key) DO UPDATE SET
    kind = excluded.kind, title = excluded.title, body = excluded.body,
    status = excluded.status, data = excluded.data;
END;
