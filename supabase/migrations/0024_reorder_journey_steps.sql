-- Migration: 0024_reorder_journey_steps
-- Table: short_list_items
-- Column: recruiting_journey_steps (jsonb)
-- Purpose: Reorder steps 4-11 so coach-initiated contact steps surface higher in the journey.
--          Update column DEFAULT and remap all existing rows.
-- Author: David (Data Steward) — 2026-03-30
--
-- OLD ORDER (from 0009_short_list_items.sql):
--   step_id 1  — Added to shortlist                   (completed: true)
--   step_id 2  — Completed recruiting questionnaire
--   step_id 3  — Completed admissions info form
--   step_id 4  — Contacted coach via email
--   step_id 5  — Contacted coach via social media
--   step_id 6  — Received junior day invite
--   step_id 7  — Received visit invite
--   step_id 8  — Received prospect camp invite
--   step_id 9  — School contacted student via text
--   step_id 10 — Head coach contacted student
--   step_id 11 — Assistant coach contacted student
--   step_id 12 — School requested transcript
--   step_id 13 — School requested financial info
--   step_id 14 — Received verbal offer
--   step_id 15 — Received written offer
--
-- NEW ORDER (this migration):
--   step_id 1  — Added to shortlist                   (completed: true) [unchanged]
--   step_id 2  — Completed recruiting questionnaire   [unchanged]
--   step_id 3  — Completed admissions info form       [unchanged]
--   step_id 4  — Assistant coach contacted student    (was step_id 11)
--   step_id 5  — Contacted coach via email            (was step_id 4)
--   step_id 6  — Contacted coach via social media     (was step_id 5)
--   step_id 7  — Received junior day invite           (was step_id 6)
--   step_id 8  — Received visit invite                (was step_id 7)
--   step_id 9  — Received prospect camp invite        (was step_id 8)
--   step_id 10 — Coach contacted student via text     (was step_id 9; label changed from "School contacted" to "Coach contacted")
--   step_id 11 — Head coach contacted student         (was step_id 10)
--   step_id 12 — School requested transcript          [unchanged]
--   step_id 13 — School requested financial info      [unchanged]
--   step_id 14 — Received verbal offer                [unchanged]
--   step_id 15 — Received written offer               [unchanged]
--
-- REMAP TABLE (old step_id -> new step_id):
--   old 1  -> new 1  (no change)
--   old 2  -> new 2  (no change)
--   old 3  -> new 3  (no change)
--   old 4  -> new 5
--   old 5  -> new 6
--   old 6  -> new 7
--   old 7  -> new 8
--   old 8  -> new 9
--   old 9  -> new 10 (label also updated)
--   old 10 -> new 11
--   old 11 -> new 4
--   old 12 -> new 12 (no change)
--   old 13 -> new 13 (no change)
--   old 14 -> new 14 (no change)
--   old 15 -> new 15 (no change)
--
-- NOTE: completed_at extracted with -> (not ->>) to preserve JSONB null semantics.
-- NOTE: Only rows WHERE recruiting_journey_steps IS NOT NULL
--       AND jsonb_array_length(recruiting_journey_steps) = 15 are targeted.
--       Rows outside that condition are left untouched to avoid data corruption.


-- ============================================================
-- PART 1: ALTER column DEFAULT to new step order
-- ============================================================

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
    {"step_id": 8,  "label": "Received visit invite",                      "completed": false, "completed_at": null},
    {"step_id": 9,  "label": "Received prospect camp invite",              "completed": false, "completed_at": null},
    {"step_id": 10, "label": "Coach contacted student via text",           "completed": false, "completed_at": null},
    {"step_id": 11, "label": "Head coach contacted student",               "completed": false, "completed_at": null},
    {"step_id": 12, "label": "School requested transcript",                "completed": false, "completed_at": null},
    {"step_id": 13, "label": "School requested financial info",            "completed": false, "completed_at": null},
    {"step_id": 14, "label": "Received verbal offer",                      "completed": false, "completed_at": null},
    {"step_id": 15, "label": "Received written offer",                     "completed": false, "completed_at": null}
  ]'::jsonb;


-- ============================================================
-- PART 2: Remap existing rows to new step order
--
-- Pattern: jsonb_agg over a VALUES list that defines the new
-- step_id and label for each position, joined to the old
-- array element at the OLD array index (0-based).
--
-- Array index mapping (0-based old index -> new step_id):
--   old index 0  (step_id 1)  -> new step_id 1   label unchanged
--   old index 1  (step_id 2)  -> new step_id 2   label unchanged
--   old index 2  (step_id 3)  -> new step_id 3   label unchanged
--   old index 3  (step_id 4)  -> new step_id 5   label unchanged
--   old index 4  (step_id 5)  -> new step_id 6   label unchanged
--   old index 5  (step_id 6)  -> new step_id 7   label unchanged
--   old index 6  (step_id 7)  -> new step_id 8   label unchanged
--   old index 7  (step_id 8)  -> new step_id 9   label unchanged
--   old index 8  (step_id 9)  -> new step_id 10  label changed
--   old index 9  (step_id 10) -> new step_id 11  label unchanged
--   old index 10 (step_id 11) -> new step_id 4   label unchanged
--   old index 11 (step_id 12) -> new step_id 12  label unchanged
--   old index 12 (step_id 13) -> new step_id 13  label unchanged
--   old index 13 (step_id 14) -> new step_id 14  label unchanged
--   old index 14 (step_id 15) -> new step_id 15  label unchanged
--
-- The subquery builds a new 15-element array in NEW step_id order
-- (ORDER BY new_step_id ASC) by pulling completed and completed_at
-- from the OLD array position for each step.
-- ============================================================

UPDATE public.short_list_items
SET recruiting_journey_steps = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'step_id',      mapping.new_step_id,
      'label',        mapping.new_label,
      'completed',    (recruiting_journey_steps -> mapping.old_index -> 'completed'),
      'completed_at', (recruiting_journey_steps -> mapping.old_index -> 'completed_at')
    )
    ORDER BY mapping.new_step_id ASC
  )
  FROM (
    VALUES
      -- (old_0based_index, new_step_id, new_label)
      ( 0,  1,  'Added to shortlist'),
      ( 1,  2,  'Completed recruiting questionnaire'),
      ( 2,  3,  'Completed admissions info form'),
      (10,  4,  'Assistant coach contacted student'),
      ( 3,  5,  'Contacted coach via email'),
      ( 4,  6,  'Contacted coach via social media'),
      ( 5,  7,  'Received junior day invite'),
      ( 6,  8,  'Received visit invite'),
      ( 7,  9,  'Received prospect camp invite'),
      ( 8, 10,  'Coach contacted student via text'),
      ( 9, 11,  'Head coach contacted student'),
      (11, 12,  'School requested transcript'),
      (12, 13,  'School requested financial info'),
      (13, 14,  'Received verbal offer'),
      (14, 15,  'Received written offer')
  ) AS mapping(old_index, new_step_id, new_label)
)
WHERE recruiting_journey_steps IS NOT NULL
  AND jsonb_array_length(recruiting_journey_steps) = 15;


-- ============================================================
-- POST-MIGRATION INTEGRITY CHECKS (run manually after migration)
-- David — Checks 6-9
-- ============================================================

-- CHECK 6: Verify column DEFAULT was updated.
-- Expected: default value string contains "Assistant coach contacted student" at step_id 4.
-- Run:
--   SELECT column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name   = 'short_list_items'
--     AND column_name  = 'recruiting_journey_steps';

-- CHECK 7: Verify all existing rows were remapped (15-element arrays only).
-- Expected: zero rows still contain old step_id 4 label "Contacted coach via email"
--           at array position index 3 (new position index 4).
-- Also confirms no row has "Assistant coach contacted student" at old index 10 (new index 3).
-- Run:
--   SELECT COUNT(*) AS rows_with_old_order
--   FROM public.short_list_items
--   WHERE recruiting_journey_steps IS NOT NULL
--     AND jsonb_array_length(recruiting_journey_steps) = 15
--     AND (recruiting_journey_steps -> 3 ->> 'label') = 'Contacted coach via email';
-- Expected result: 0

-- CHECK 8: Verify step 1 still reads completed: true on all rows.
-- Expected: zero rows where step_id 1 (array index 0) has completed = false.
-- Run:
--   SELECT COUNT(*) AS rows_step1_not_completed
--   FROM public.short_list_items
--   WHERE recruiting_journey_steps IS NOT NULL
--     AND jsonb_array_length(recruiting_journey_steps) = 15
--     AND (recruiting_journey_steps -> 0 ->> 'completed') = 'false';
-- Expected result: 0

-- CHECK 9: Verify new step order by spot-checking labels at key positions on a sample row.
-- Expected labels at each index after remap:
--   index 3  -> "Assistant coach contacted student"   (new step_id 4)
--   index 4  -> "Contacted coach via email"           (new step_id 5)
--   index 9  -> "Coach contacted student via text"    (new step_id 10)
--   index 10 -> "Head coach contacted student"        (new step_id 11)
-- Run:
--   SELECT
--     id,
--     recruiting_journey_steps -> 3  ->> 'label' AS step4_label,
--     recruiting_journey_steps -> 4  ->> 'label' AS step5_label,
--     recruiting_journey_steps -> 9  ->> 'label' AS step10_label,
--     recruiting_journey_steps -> 10 ->> 'label' AS step11_label
--   FROM public.short_list_items
--   WHERE recruiting_journey_steps IS NOT NULL
--     AND jsonb_array_length(recruiting_journey_steps) = 15
--   LIMIT 5;
-- Expected:
--   step4_label  = "Assistant coach contacted student"
--   step5_label  = "Contacted coach via email"
--   step10_label = "Coach contacted student via text"
--   step11_label = "Head coach contacted student"
