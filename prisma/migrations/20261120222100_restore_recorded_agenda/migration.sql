-- Older reports sometimes received topic headings only in Fireflies' notes.
UPDATE "MeetingReport" AS report
SET agenda = topics.agenda
FROM (
  SELECT r.id, string_agg(heading, E'\n' ORDER BY position) AS agenda
  FROM "MeetingReport" r
  CROSS JOIN LATERAL regexp_split_to_table(r.notes, E'\n') WITH ORDINALITY AS item(line, position)
  CROSS JOIN LATERAL (SELECT substring(trim(line) FROM '^\*\*([^*]+)\*\*:?$') AS heading) AS topic
  WHERE r."reviewedAt" IS NULL AND r.agenda = '' AND heading IS NOT NULL
  GROUP BY r.id
) AS topics
WHERE report.id = topics.id AND report."reviewedAt" IS NULL AND report.agenda = '';
