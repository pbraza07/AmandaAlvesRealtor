-- Attach the verified Zillow home to the existing Ashmonte tour.
UPDATE "SiteContent" AS settings
SET content = jsonb_set(settings.content, '{tours}', (
  SELECT jsonb_agg(CASE
    WHEN tour->>'id' = '87e4f55b-a89e-4f0b-b639-b3fe1aa117d4'
      AND split_part(tour->>'url', '?', 1) = 'https://www.instagram.com/reel/Df-I-c5xpf9/'
      AND coalesce(tour->>'zillowUrl', '') = ''
    THEN tour || '{"zillowUrl":"https://www.zillow.com/homedetails/3304-Ashmonte-Dr-Land-O-Lakes-FL-34638/55805130_zpid/"}'::jsonb
    ELSE tour END ORDER BY position)
  FROM jsonb_array_elements(settings.content->'tours') WITH ORDINALITY AS tours(tour, position)
)), "updatedAt" = CURRENT_TIMESTAMP
WHERE settings.id = 'homepage-listing-tours'
  AND settings.content->'tours' @> '[{"id":"87e4f55b-a89e-4f0b-b639-b3fe1aa117d4"}]'::jsonb;
