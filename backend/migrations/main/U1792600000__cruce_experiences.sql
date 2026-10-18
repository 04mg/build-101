-- Library of documented founder experiences (failures, pivots and successes)
-- with their public sources. The agents retrieve the ones that resemble a
-- founder's problem or strategy and use them as ground truth to advise.
-- No record API: only the agent service reads it.
CREATE TABLE cruce_experiences (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  year TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK(kind IN ('failure', 'pivot', 'success')),
  sector TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  tried TEXT NOT NULL DEFAULT '',
  outcome TEXT NOT NULL DEFAULT '',
  lessons TEXT NOT NULL CHECK(json_valid(lessons)),
  tags TEXT NOT NULL CHECK(json_valid(tags)),
  quote TEXT NOT NULL DEFAULT '',
  urls TEXT NOT NULL CHECK(json_valid(urls)),
  origin TEXT NOT NULL DEFAULT '',
  -- Embedding of the case for semantic retrieval (JSON array), or NULL for lexical only.
  embedding TEXT,
  embedding_model TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
) STRICT;
