-- Public questionnaire submissions and owner edits use the same revision clock.
-- Reject stale full-document writes so neither can overwrite the other's work.
CREATE TRIGGER cruce_project_revision BEFORE UPDATE OF document ON cruce_projects
WHEN json_extract(NEW.document, '$.revision') != json_extract(OLD.document, '$.revision') + 1
BEGIN
  SELECT RAISE(ABORT, 'CRUCE_REVISION_CONFLICT');
END;
