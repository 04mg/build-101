-- Direct chat between two founders once a contact request is accepted. The
-- first message is the AI-written reason for contact, stored when the
-- request is sent; the recipient reads it only after accepting.
CREATE TABLE cruce_network_messages (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES cruce_network_requests(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX cruce_network_messages_request ON cruce_network_messages(request_id, created_at);

ALTER TABLE cruce_network_requests ADD COLUMN chat_read_by_sender_at TEXT;
ALTER TABLE cruce_network_requests ADD COLUMN chat_read_by_recipient_at TEXT;

-- Requests sent before the chat existed open with their AI description.
INSERT INTO cruce_network_messages(id, request_id, author, body, created_at)
  SELECT lower(hex(randomblob(16))), id, from_owner, description, created_at FROM cruce_network_requests;
