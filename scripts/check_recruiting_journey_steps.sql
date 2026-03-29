-- =============================================================================
-- D-04: short_list_items.recruiting_journey_steps JSONB Integrity Check
-- =============================================================================
-- David — Data Steward | GrittyOS / VerifyGrit
-- Date: 2026-03-29
-- Source schema: supabase/migrations/0009_short_list_items.sql
-- Project: gritty-recruit-hub-rebuild (Supabase project xyudnajzhuwdauwkwsbh)
--
-- PURPOSE:
--   Pre-build integrity check for Item 3 coach dashboard (D-04 flag).
--   Five independent queries, each targeting one failure mode.
--   A healthy table returns ZERO ROWS from every query.
--   Run in the Supabase SQL editor. No writes. Read-only.
--
-- EXPECTED SCHEMA PER ROW:
--   Array of 15 elements, each element:
--   {
--     "step_id":      integer (1-15, sequential),
--     "label":        text (non-null),
--     "completed":    boolean,
--     "completed_at": null | timestamptz string
--   }
--   Step 1 completed=true by default (auto-completed on shortlist add).
--   Steps 2-15 completed=false by default.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- CHECK 1: NULL recruiting_journey_steps
-- -----------------------------------------------------------------------------
-- The column is NOT NULL in the migration, so this should be zero.
-- Non-zero result means rows were inserted before the constraint existed
-- or via a raw SQL bypass (e.g., an early seed script or migration gap).
-- -----------------------------------------------------------------------------

SELECT
  id,
  user_id,
  unitid,
  school_name,
  'NULL recruiting_journey_steps' AS failure_mode
FROM public.short_list_items
WHERE recruiting_journey_steps IS NULL;


-- -----------------------------------------------------------------------------
-- CHECK 2: Array element count != 15
-- -----------------------------------------------------------------------------
-- jsonb_array_length() returns the number of top-level elements.
-- Any row not returning exactly 15 is malformed.
-- Fewer than 15: truncated default, partial insert, or manual edit.
-- More than 15:  duplicate step injection or bad upsert logic.
-- -----------------------------------------------------------------------------

SELECT
  id,
  user_id,
  unitid,
  school_name,
  jsonb_array_length(recruiting_journey_steps) AS actual_step_count,
  'Wrong step count (expected 15)' AS failure_mode
FROM public.short_list_items
WHERE
  recruiting_journey_steps IS NOT NULL
  AND jsonb_array_length(recruiting_journey_steps) != 15;


-- -----------------------------------------------------------------------------
-- CHECK 3: Any element missing a required key
-- -----------------------------------------------------------------------------
-- Expands the array with jsonb_array_elements(), then checks each element
-- for the presence of all four required keys: step_id, label, completed,
-- completed_at.
-- A missing key means the element was constructed without the full schema
-- (e.g., a partial client-side patch, a migration that added steps without
-- the completed_at field, or a manual data correction that dropped keys).
-- Returns one row per offending element, not per row — group by id if
-- you want a deduped row-level list.
-- -----------------------------------------------------------------------------

SELECT
  sli.id,
  sli.user_id,
  sli.unitid,
  sli.school_name,
  step.value AS offending_element,
  'Missing required key(s): step_id | label | completed | completed_at' AS failure_mode
FROM
  public.short_list_items sli,
  jsonb_array_elements(sli.recruiting_journey_steps) AS step(value)
WHERE
  sli.recruiting_journey_steps IS NOT NULL
  AND (
    step.value -> 'step_id'      IS NULL
    OR step.value -> 'label'      IS NULL
    OR step.value -> 'completed'  IS NULL
    OR step.value -> 'completed_at' IS NULL
  );


-- -----------------------------------------------------------------------------
-- CHECK 4: step_id values not sequential 1-15
-- -----------------------------------------------------------------------------
-- Two sub-checks combined:
--   4a. Any step_id outside the range 1-15.
--   4b. Any duplicate step_id within the same row (e.g., two elements with
--       step_id=3 and no element with step_id=7).
--
-- The aggregate check uses MIN/MAX + COUNT to catch both gaps and duplicates
-- in a single pass:
--   - COUNT(step_id) should equal 15
--   - MIN(step_id) should equal 1
--   - MAX(step_id) should equal 15
--   - If all three hold, the array is sequential with no duplicates and no gaps.
-- -----------------------------------------------------------------------------

SELECT
  sli.id,
  sli.user_id,
  sli.unitid,
  sli.school_name,
  COUNT((step.value ->> 'step_id')::integer)  AS step_id_count,
  MIN((step.value  ->> 'step_id')::integer)   AS step_id_min,
  MAX((step.value  ->> 'step_id')::integer)   AS step_id_max,
  'step_id sequence malformed (expected COUNT=15, MIN=1, MAX=15)' AS failure_mode
FROM
  public.short_list_items sli,
  jsonb_array_elements(sli.recruiting_journey_steps) AS step(value)
WHERE
  sli.recruiting_journey_steps IS NOT NULL
  AND step.value -> 'step_id' IS NOT NULL
GROUP BY
  sli.id, sli.user_id, sli.unitid, sli.school_name
HAVING
  COUNT((step.value ->> 'step_id')::integer) != 15
  OR MIN((step.value  ->> 'step_id')::integer) != 1
  OR MAX((step.value  ->> 'step_id')::integer) != 15;


-- -----------------------------------------------------------------------------
-- CHECK 5: Invalid JSON (not a valid JSONB array)
-- -----------------------------------------------------------------------------
-- The column type is jsonb, so Postgres rejects invalid JSON at insert time
-- for rows written through the normal path. However:
--   - jsonb can store a valid JSON scalar or object — it does not enforce
--     that the value is an array.
--   - A row could contain a valid JSON object {} or scalar 0 that passes
--     the NOT NULL constraint but is not the expected array structure.
-- This check catches rows where the JSONB value is not a JSON array at all
-- (i.e., jsonb_typeof() != 'array').
-- Note: true invalid JSON cannot be stored in a jsonb column — Postgres
-- rejects it at write time. So this check is for type-shape failures,
-- not parse failures.
-- -----------------------------------------------------------------------------

SELECT
  id,
  user_id,
  unitid,
  school_name,
  jsonb_typeof(recruiting_journey_steps) AS actual_jsonb_type,
  'JSONB value is not an array (expected array)' AS failure_mode
FROM public.short_list_items
WHERE
  recruiting_journey_steps IS NOT NULL
  AND jsonb_typeof(recruiting_journey_steps) != 'array';


-- -----------------------------------------------------------------------------
-- SUMMARY QUERY: Row count + baseline stats
-- -----------------------------------------------------------------------------
-- Run this last to provide context for any failures found above.
-- Reports total rows, rows with NULL (redundant with Check 1 but quick),
-- and rows with exactly 15 steps — the expected healthy count.
-- -----------------------------------------------------------------------------

SELECT
  COUNT(*)                                                           AS total_rows,
  COUNT(*) FILTER (WHERE recruiting_journey_steps IS NULL)          AS null_count,
  COUNT(*) FILTER (
    WHERE recruiting_journey_steps IS NOT NULL
    AND   jsonb_typeof(recruiting_journey_steps) = 'array'
    AND   jsonb_array_length(recruiting_journey_steps) = 15
  )                                                                  AS rows_with_15_steps,
  COUNT(*) FILTER (
    WHERE recruiting_journey_steps IS NOT NULL
    AND   jsonb_typeof(recruiting_journey_steps) = 'array'
    AND   jsonb_array_length(recruiting_journey_steps) != 15
  )                                                                  AS rows_wrong_step_count,
  COUNT(*) FILTER (
    WHERE recruiting_journey_steps IS NOT NULL
    AND   jsonb_typeof(recruiting_journey_steps) != 'array'
  )                                                                  AS rows_not_array
FROM public.short_list_items;
