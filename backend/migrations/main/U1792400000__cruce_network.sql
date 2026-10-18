-- Founder network: AI-confirmed matches between projects, anonymous contact
-- requests and push subscriptions. These tables have no record API; only the
-- agent service reads them, so owners never see each other's identity until
-- a request is accepted.
CREATE TABLE cruce_network_profiles (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  updated_at TEXT NOT NULL
) STRICT;

-- Last memory sync of each project, so only meaningful changes trigger a search.
CREATE TABLE cruce_network_scans (
  project_id INTEGER PRIMARY KEY REFERENCES cruce_projects(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  scanned_at TEXT NOT NULL
) STRICT;

CREATE TABLE cruce_network_matches (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  project_id INTEGER NOT NULL REFERENCES cruce_projects(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL,
  other_owner TEXT NOT NULL,
  other_project_id INTEGER NOT NULL REFERENCES cruce_projects(id) ON DELETE CASCADE,
  other_note_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('same_problem', 'hypothesis_validated', 'hypothesis_rejected', 'hypothesis_peer', 'partnership')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  description TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  seen_at TEXT,
  dismissed_at TEXT,
  UNIQUE(project_id, note_id, other_project_id, other_note_id, type)
) STRICT;

CREATE INDEX cruce_network_matches_owner ON cruce_network_matches(owner, created_at);

CREATE TABLE cruce_network_requests (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  from_owner TEXT NOT NULL,
  from_project_id INTEGER NOT NULL REFERENCES cruce_projects(id) ON DELETE CASCADE,
  from_note_id TEXT NOT NULL,
  to_owner TEXT NOT NULL,
  to_project_id INTEGER NOT NULL REFERENCES cruce_projects(id) ON DELETE CASCADE,
  to_note_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected')),
  created_at TEXT NOT NULL,
  responded_at TEXT,
  seen_by_recipient_at TEXT,
  seen_by_sender_at TEXT,
  UNIQUE(from_project_id, to_project_id)
) STRICT;

CREATE INDEX cruce_network_requests_to ON cruce_network_requests(to_owner, created_at);
CREATE INDEX cruce_network_requests_from ON cruce_network_requests(from_owner, created_at);

CREATE TABLE cruce_network_push (
  endpoint TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subscription TEXT NOT NULL CHECK(json_valid(subscription)),
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX cruce_network_push_user ON cruce_network_push(user_id);

CREATE TABLE cruce_network_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;
