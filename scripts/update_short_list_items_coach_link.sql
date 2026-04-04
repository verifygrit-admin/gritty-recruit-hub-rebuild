-- UPDATE: Refresh short_list_items.coach_link from clean schools.coach_link
-- Generated: 2026-04-04
-- Purpose: Backfill stale coach_link values written at add-time from pre-remediation schools data.
--          The Recruiting Intelligence tab resolves item.coach_link || school?.coach_link,
--          so stale copies shadow the clean schools values. This update brings all 108 rows
--          into sync with the now-clean schools table.
--
-- Scope:
--   - 108 short_list_items rows across 93 distinct unitids will be touched
--   - 74 rows have a differing (stale) coach_link — these are the actual overwrites
--   - 34 rows already match schools.coach_link — these are no-ops (SET = same value)
--   - 1 row (Bryant University, unitid 366139) has NULL in short_list_items — will be filled
--   - 0 rows reference unitids outside the 573 updated schools set (all 93 distinct unitids
--     are present in schools with a non-null coach_link)
--
-- Join key: short_list_items.unitid = schools.unitid (INTEGER, PRIMARY KEY on schools)
-- No rows are left untouched that should be updated.
--
-- DO NOT EXECUTE without Scout CHECK WITH ME gate confirmation.

UPDATE short_list_items sli
SET
  coach_link = s.coach_link,
  updated_at = now()
FROM schools s
WHERE sli.unitid = s.unitid
  AND s.coach_link IS NOT NULL
  AND sli.coach_link IS DISTINCT FROM s.coach_link;

-- Post-run verification query (run after execution to confirm):
-- SELECT COUNT(*) AS remaining_stale
-- FROM short_list_items sli
-- INNER JOIN schools s ON sli.unitid = s.unitid
-- WHERE s.coach_link IS NOT NULL
--   AND sli.coach_link IS DISTINCT FROM s.coach_link;
-- Expected result: 0
