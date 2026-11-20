CREATE TABLE "RecordingPart" (
  "reportId" text NOT NULL REFERENCES "MeetingReport"(id) ON DELETE CASCADE,
  "position" integer NOT NULL,
  "bytes" bytea NOT NULL,
  PRIMARY KEY ("reportId", "position")
);
CREATE FUNCTION remove_recording_parts() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM "RecordingPart" WHERE "reportId" = NEW.id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER release_recording_parts AFTER UPDATE OF audio ON "MeetingReport"
FOR EACH ROW WHEN (OLD.audio IS NOT NULL AND NEW.audio IS NULL)
EXECUTE FUNCTION remove_recording_parts();
