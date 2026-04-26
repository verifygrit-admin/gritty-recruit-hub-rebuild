-- 0037_relabel_journey_steps_for_scoreboard.sql
-- Relabels three steps in short_list_items.recruiting_journey_steps so the
-- student-facing meaning of those steps matches the seven Scoreboard column
-- meanings introduced in Sprint 007. No DDL on schema shape: the JSONB array
-- structure (15 elements, step_id / label / completed / completed_at) is
-- unchanged. Only the 'label' string at three positions is updated.
--
-- Sprint 007 — Recruiting Scoreboard prerequisite (B.1 data wiring).
-- Operator decision: Sprint 007 open exchange, Ambiguity #2 resolution
--   ("Take the label-only relabel path. ... No DDL, no new columns,
--    no derivations from other tables.").
--
-- Relabel map:
--   step_id 8  : "Received visit invite"            -> "Tour / Visit Confirmed"
--   step_id 12 : "School requested transcript"      -> "Admissions Pre-Read Requested"
--   step_id 13 : "School requested financial info"  -> "Financial Aid Pre-Read Submitted"
--
-- The toggle action that flips each boolean stays in the existing school card
-- UI elsewhere on the Shortlist (out of scope for this sprint). The Scoreboard
-- reads the booleans as-is.
--
-- Pre-existing state (verified 2026-04-26 via Supabase MCP execute_sql against
-- project xyudnajzhuwdauwkwsbh):
--   - 108 rows in public.short_list_items, 100% with jsonb_array_length = 15
--   - All 108 rows hold the three old labels at array indexes 7 / 11 / 12
--   - Server column DEFAULT (post-0024_reorder_journey_steps) carries the old
--     labels at the same positions
--
-- This migration is reversible: a follow-on jsonb_set call swapping the new
-- labels back to the old strings restores prior state. step_id, completed,
-- and completed_at fields are preserved by the surgical jsonb_set updates.

BEGIN;

-- ============================================================
-- PART 1: ALTER column DEFAULT to the relabeled 15-step shape
-- ============================================================
-- The DEFAULT is the literal JSON used when a new short_list_items row
-- is inserted without an explicit recruiting_journey_steps value. Twelve
-- of the fifteen entries are unchanged from the 0024 default; three carry
-- the new labels.

ALTER TABLE public.short_list_items
  ALTER COLUMN recruiting_journey_steps
  SET DEFAULT '[
    {"step_id": 1,  "label": "Added to shortlist",                        "completed": true,  "completed_at": null},
    {"step_id": 2,  "label": "Completed recruiting questionnaire",         "completed": false, "completed_at": null},
    {"step_id": 3,  "label": "Completed admissions info form",             "completed": false, "completed_at": null},
    {"step_id": 4,  "label": "Assistant coach contacted student",          "completed": false, "completed_at": null},
    {"step_id": 5,  "label": "Contacted coach via email",                  "completed": false, "completed_at": null},
    {"step_id": 6,  "label": "Contacted coach via social media",           "completed": false, "completed_at": null},
    {"step_id": 7,  "label": "Received junior day invite",                 "completed": false, "completed_at": null},
    {"step_id": 8,  "label": "Tour / Visit Confirmed",                     "completed": false, "completed_at": null},
    {"step_id": 9,  "label": "Received prospect camp invite",              "completed": false, "completed_at": null},
    {"step_id": 10, "label": "Coach contacted student via text",           "completed": false, "completed_at": null},
    {"step_id": 11, "label": "Head coach contacted student",               "completed": false, "completed_at": null},
    {"step_id": 12, "label": "Admissions Pre-Read Requested",              "completed": false, "completed_at": null},
    {"step_id": 13, "label": "Financial Aid Pre-Read Submitted",           "completed": false, "completed_at": null},
    {"step_id": 14, "label": "Received verbal offer",                      "completed": false, "completed_at": null},
    {"step_id": 15, "label": "Received written offer",                     "completed": false, "completed_at": null}
  ]'::jsonb;


-- ============================================================
-- PART 2: Remap existing rows by surgically updating only the
-- three 'label' fields. Preserves step_id, completed, completed_at.
-- ============================================================
-- jsonb_set with create_missing=false guards against accidentally inserting
-- new keys; the path '{N,label}' targets only the label field of array
-- index N. The WHERE clause guards against any future row that doesn't
-- conform to the post-0024 shape (verified zero such rows today, but the
-- guard is cheap and idempotent).

UPDATE public.short_list_items
SET recruiting_journey_steps = jsonb_set(
      jsonb_set(
        jsonb_set(
          recruiting_journey_steps,
          '{7,label}',  '"Tour / Visit Confirmed"'::jsonb,           false
        ),
        '{11,label}', '"Admissions Pre-Read Requested"'::jsonb,      false
      ),
      '{12,label}', '"Financial Aid Pre-Read Submitted"'::jsonb,     false
    )
WHERE recruiting_journey_steps IS NOT NULL
  AND jsonb_array_length(recruiting_journey_steps) = 15
  AND (recruiting_journey_steps ->  7 ->> 'step_id') = '8'
  AND (recruiting_journey_steps -> 11 ->> 'step_id') = '12'
  AND (recruiting_journey_steps -> 12 ->> 'step_id') = '13';

COMMIT;


-- ============================================================
-- POST-MIGRATION INTEGRITY CHECKS (run manually after migration)
-- ============================================================

-- CHECK 1: Verify column DEFAULT was updated.
-- Expected: default value string contains "Tour / Visit Confirmed",
-- "Admissions Pre-Read Requested", and "Financial Aid Pre-Read Submitted".
-- Run:
--   SELECT column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name   = 'short_list_items'
--     AND column_name  = 'recruiting_journey_steps';

-- CHECK 2: Verify all existing rows were remapped.
-- Expected: 108 rows show the new labels at idx 7 / 11 / 12, and zero rows
-- still show the old labels.
-- Run:
--   SELECT
--     COUNT(*) FILTER (WHERE (recruiting_journey_steps ->  7 ->> 'label') = 'Tour / Visit Confirmed')           AS new_step8_count,
--     COUNT(*) FILTER (WHERE (recruiting_journey_steps -> 11 ->> 'label') = 'Admissions Pre-Read Requested')    AS new_step12_count,
--     COUNT(*) FILTER (WHERE (recruiting_journey_steps -> 12 ->> 'label') = 'Financial Aid Pre-Read Submitted') AS new_step13_count,
--     COUNT(*) FILTER (WHERE (recruiting_journey_steps ->  7 ->> 'label') = 'Received visit invite')            AS old_step8_count,
--     COUNT(*) FILTER (WHERE (recruiting_journey_steps -> 11 ->> 'label') = 'School requested transcript')      AS old_step12_count,
--     COUNT(*) FILTER (WHERE (recruiting_journey_steps -> 12 ->> 'label') = 'School requested financial info')  AS old_step13_count
--   FROM public.short_list_items;
-- Expected: new counts = 108, old counts = 0.

-- CHECK 3: Verify completed/completed_at preservation on a sample row.
-- Expected: any row that previously had completed=true at one of the three
-- target slots still has completed=true at that slot, with completed_at
-- preserved.
-- Run:
--   SELECT
--     id,
--     recruiting_journey_steps ->  7 ->> 'completed'    AS step8_completed,
--     recruiting_journey_steps ->  7 ->> 'completed_at' AS step8_completed_at,
--     recruiting_journey_steps -> 11 ->> 'completed'    AS step12_completed,
--     recruiting_journey_steps -> 11 ->> 'completed_at' AS step12_completed_at,
--     recruiting_journey_steps -> 12 ->> 'completed'    AS step13_completed,
--     recruiting_journey_steps -> 12 ->> 'completed_at' AS step13_completed_at
--   FROM public.short_list_items
--   WHERE recruiting_journey_steps ->  7 ->> 'completed' = 'true'
--      OR recruiting_journey_steps -> 11 ->> 'completed' = 'true'
--      OR recruiting_journey_steps -> 12 ->> 'completed' = 'true'
--   LIMIT 10;

-- CHECK 4: Verify step_id integrity (no accidental shift).
-- Expected: idx 7 still holds step_id 8, idx 11 still holds step_id 12,
-- idx 12 still holds step_id 13.
-- Run:
--   SELECT DISTINCT
--     recruiting_journey_steps ->  7 ->> 'step_id' AS idx7_step_id,
--     recruiting_journey_steps -> 11 ->> 'step_id' AS idx11_step_id,
--     recruiting_journey_steps -> 12 ->> 'step_id' AS idx12_step_id
--   FROM public.short_list_items;
-- Expected: a single row returning ('8', '12', '13').
