SUPERSEDED FOR NEW WRITES — DEC-CFBRB-066 (2026-03-31)
coach_contacts is now a separate table. This contract doc is retained as legacy reference for existing data in short_list_items.coach_contact only. All new coach contact records go to the coach_contacts table.
Do not use this schema for new development.

# JSONB Schema Contract: coach_contact

## Schema Definition

Field name: `short_list_items.coach_contact`

Type: JSONB array of contact touchpoint objects.

Each contact touchpoint object has the following structure:

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| `contact_date` | string (ISO 8601 date) | Required | Date of the contact event. Format: YYYY-MM-DD. |
| `contact_type` | string (enum) | Required | Classification of contact method. Allowed values: `email`, `call`, `text`, `in_person`, `dm`, `camp`. |
| `initiated_by` | string (enum) | Required | Party that initiated the contact. Allowed values: `student`, `parent`, `hs_coach`, `college_coach`. |
| `short_list_step` | integer | Required | Pipeline step number (1-15) at which contact occurred. Range: 1 to 15. |
| `notes` | string | Optional | Freeform text notes about the contact. Max length: 1000 characters (not enforced at schema level; application responsibility). |

## Constraints

- `coach_contact` must be an array (can be empty `[]`).
- Each object in the array must include all four required fields: `contact_date`, `contact_type`, `initiated_by`, `short_list_step`.
- `contact_date` must be a valid ISO 8601 date string or null.
- `contact_type` and `initiated_by` must match their respective enum values exactly (case-sensitive).
- `short_list_step` must be an integer between 1 and 15 inclusive.
- `notes` is optional and may be omitted; if present, it must be a string.

## Valid JSON Example

```json
{
  "coach_contact": [
    {
      "contact_date": "2026-03-15",
      "contact_type": "email",
      "initiated_by": "college_coach",
      "short_list_step": 3,
      "notes": "Initial recruiting inquiry sent via email"
    },
    {
      "contact_date": "2026-03-20",
      "contact_type": "call",
      "initiated_by": "student",
      "short_list_step": 5
    },
    {
      "contact_date": "2026-03-25",
      "contact_type": "in_person",
      "initiated_by": "college_coach",
      "short_list_step": 7,
      "notes": "Campus visit scheduled for spring break"
    },
    {
      "contact_date": "2026-03-28",
      "contact_type": "text",
      "initiated_by": "hs_coach",
      "short_list_step": 8,
      "notes": "Follow-up on scholarship details"
    },
    {
      "contact_date": "2026-03-29",
      "contact_type": "dm",
      "initiated_by": "student",
      "short_list_step": 9
    }
  ]
}
```

## SQL Audit Query

Run this query to check whether existing `short_list_items` rows conform to the `coach_contact` schema:

```sql
SELECT
  sli.id,
  sli.user_id,
  sli.coach_contact,
  CASE
    WHEN sli.coach_contact IS NULL THEN 'NULL (valid empty state)'
    WHEN jsonb_typeof(sli.coach_contact) != 'array' THEN 'FAIL: not an array'
    ELSE (
      WITH contact_validation AS (
        SELECT
          elem ->> 'contact_date' AS contact_date,
          elem ->> 'contact_type' AS contact_type,
          elem ->> 'initiated_by' AS initiated_by,
          (elem ->> 'short_list_step')::text AS short_list_step_str,
          elem ->> 'notes' AS notes
        FROM jsonb_array_elements(sli.coach_contact) AS elem
      )
      SELECT
        CASE
          WHEN COUNT(*) = 0 THEN 'PASS: empty array'
          WHEN COUNT(*) FILTER (WHERE contact_date IS NULL) > 0 THEN 'FAIL: missing contact_date'
          WHEN COUNT(*) FILTER (WHERE contact_date !~ '^\d{4}-\d{2}-\d{2}$') > 0 THEN 'FAIL: invalid date format'
          WHEN COUNT(*) FILTER (WHERE contact_type NOT IN ('email', 'call', 'text', 'in_person', 'dm', 'camp')) > 0 THEN 'FAIL: invalid contact_type'
          WHEN COUNT(*) FILTER (WHERE initiated_by NOT IN ('student', 'parent', 'hs_coach', 'college_coach')) > 0 THEN 'FAIL: invalid initiated_by'
          WHEN COUNT(*) FILTER (WHERE short_list_step_str IS NULL OR (short_list_step_str::int < 1 OR short_list_step_str::int > 15)) > 0 THEN 'FAIL: short_list_step out of range 1-15'
          ELSE 'PASS: all contacts conform'
        END
      FROM contact_validation
    )::text
  END AS conformance_status
FROM short_list_items sli
ORDER BY sli.created_at DESC;
```

## Interpretation

- **PASS: empty array** — Row has no contacts recorded; valid state.
- **PASS: all contacts conform** — All contact objects match the schema exactly.
- **FAIL: [reason]** — One or more contacts violate the schema. The reason indicates which field(s) are non-compliant.

## Notes for David

This schema enforces the exact shape of coach contact history at the application/audit level. The Supabase schema itself will store this as JSONB without type constraints (Postgres JSONB is semi-structured). Use the audit query to verify compliance before any report generation or data migration. All contact_date values should be set by the application at contact record creation time; do not rely on server-side defaults.
