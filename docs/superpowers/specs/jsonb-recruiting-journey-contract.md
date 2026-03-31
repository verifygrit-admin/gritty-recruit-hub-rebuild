# JSONB Schema Contract: recruiting_journey_steps

## Schema Definition

Field name: `short_list_items.recruiting_journey_steps`

Type: JSONB array of pipeline step objects.

Each recruiting journey step object has the following structure:

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| `step_number` | integer | Required | Pipeline step ordinal (1-15). Must be unique within the array. Range: 1 to 15. |
| `step_name` | string | Required | Human-readable name of the step. Examples: "Initial Contact", "Campus Visit", "Verbal Offer", etc. Max 255 characters (application responsibility). |
| `status` | string (enum) | Required | Current progress state. Allowed values: `not_started`, `in_progress`, `completed`. |
| `completed_at` | string (ISO 8601 timestamptz) or null | Nullable | Timestamp when step was marked complete. Format: YYYY-MM-DDTHH:MM:SS.sssZ or similar ISO 8601 with timezone. Null if step is not completed. |
| `completed_by` | string | Optional | User identifier (email, user_id, or name) of the person who marked the step complete. Omit if step is not completed. |

## Constraints

- `recruiting_journey_steps` must be an array (can be empty `[]`).
- Each object in the array must include all three required fields: `step_number`, `step_name`, `status`.
- `step_number` must be an integer between 1 and 15 inclusive. No two objects in the array may have the same `step_number`.
- `step_name` must be a non-empty string.
- `status` must match one of the three enum values exactly (case-sensitive): `not_started`, `in_progress`, or `completed`.
- `completed_at` must be either a valid ISO 8601 timestamptz string or null. If `status` is `completed`, `completed_at` should not be null (application responsibility).
- `completed_by` is optional and may be omitted. If present, it must be a string. Recommendation: use email or numeric user_id for consistency.

## Valid JSON Example

```json
{
  "recruiting_journey_steps": [
    {
      "step_number": 1,
      "step_name": "Initial Contact",
      "status": "completed",
      "completed_at": "2026-03-15T14:23:00Z",
      "completed_by": "college_coach@university.edu"
    },
    {
      "step_number": 2,
      "step_name": "Phone Screening",
      "status": "completed",
      "completed_at": "2026-03-18T10:15:00Z",
      "completed_by": "student@school.com"
    },
    {
      "step_number": 3,
      "step_name": "Film Review",
      "status": "in_progress",
      "completed_at": null
    },
    {
      "step_number": 4,
      "step_name": "Campus Visit",
      "status": "not_started",
      "completed_at": null
    },
    {
      "step_number": 5,
      "step_name": "Coach Meeting",
      "status": "not_started",
      "completed_at": null
    },
    {
      "step_number": 6,
      "step_name": "Verbal Offer",
      "status": "not_started",
      "completed_at": null
    }
  ]
}
```

## SQL Audit Query

Run this query to check whether existing `short_list_items` rows conform to the `recruiting_journey_steps` schema:

```sql
SELECT
  sli.id,
  sli.user_id,
  sli.recruiting_journey_steps,
  CASE
    WHEN sli.recruiting_journey_steps IS NULL THEN 'NULL (valid empty state)'
    WHEN jsonb_typeof(sli.recruiting_journey_steps) != 'array' THEN 'FAIL: not an array'
    ELSE (
      WITH step_validation AS (
        SELECT
          (elem ->> 'step_number')::text AS step_number_str,
          elem ->> 'step_name' AS step_name,
          elem ->> 'status' AS status,
          elem ->> 'completed_at' AS completed_at,
          elem ->> 'completed_by' AS completed_by,
          COUNT(*) OVER (
            PARTITION BY elem ->> 'step_number'
          ) AS step_count
        FROM jsonb_array_elements(sli.recruiting_journey_steps) AS elem
      )
      SELECT
        CASE
          WHEN COUNT(*) = 0 THEN 'PASS: empty array'
          WHEN COUNT(*) FILTER (WHERE step_number_str IS NULL OR (step_number_str::int < 1 OR step_number_str::int > 15)) > 0 THEN 'FAIL: step_number out of range 1-15'
          WHEN COUNT(*) FILTER (WHERE step_count > 1) > 0 THEN 'FAIL: duplicate step_number'
          WHEN COUNT(*) FILTER (WHERE step_name IS NULL OR step_name = '') > 0 THEN 'FAIL: missing or empty step_name'
          WHEN COUNT(*) FILTER (WHERE status NOT IN ('not_started', 'in_progress', 'completed')) > 0 THEN 'FAIL: invalid status'
          WHEN COUNT(*) FILTER (
            WHERE completed_at IS NOT NULL
            AND NOT (completed_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}' OR completed_at ~ '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}')
          ) > 0 THEN 'FAIL: invalid completed_at timestamp format'
          ELSE 'PASS: all steps conform'
        END
      FROM step_validation
    )::text
  END AS conformance_status
FROM short_list_items sli
ORDER BY sli.created_at DESC;
```

## Interpretation

- **PASS: empty array** — Row has no steps defined; valid state (though typically the app will seed default steps).
- **PASS: all steps conform** — All step objects match the schema exactly.
- **FAIL: [reason]** — One or more steps violate the schema. The reason indicates which field(s) are non-compliant.

## Notes for David

This schema captures the recruiting pipeline as a sequence of ordered steps with completion tracking. The Supabase schema will store this as JSONB without type validation at the database layer (Postgres JSONB is semi-structured); conformance is enforced at the application layer and verified by audit.

Design intent:
- `step_number` is the canonical ordering key — the app should render steps in numeric order (1, 2, 3, ..., 15).
- `status` transitions are typically unidirectional in the app: `not_started` → `in_progress` → `completed`.
- `completed_at` and `completed_by` are informational fields for audit trails. They should be set atomically when `status` transitions to `completed`.

All timestamp values should be stored in UTC (Z suffix) for consistency. Use the audit query before any report generation or student outcome analysis.
