# coach_contacts — Table Specification

---

## 1. Purpose

`coach_contacts` tracks all contact touchpoints between students and college coaches. This table replaces JSONB for new writes per DEC-CFBRB-066. All new contact records are written to this table. Existing data in `short_list_items.coach_contact` remains readable via the JSONB contract doc (now marked superseded) but is not migrated automatically.

---

## 2. Table Definition

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | DEC-CFBRB-064 — UUID per external-facing entity standard |
| profile_id | uuid | FK → profiles(id), NOT NULL | Student owning this contact record |
| unitid | int | FK → schools(unitid), NOT NULL | College program being contacted |
| coach_id | uuid | FK → college_coaches(id), nullable | Specific college coach if known; null if contact was with program only |
| contact_date | date | NOT NULL | Date contact occurred |
| contact_type | text | NOT NULL, CHECK IN (email, call, text, in_person, dm, camp) | Classification of contact method |
| initiated_by | text | NOT NULL, CHECK IN (student, parent, hs_coach, college_coach) | Who initiated the contact |
| short_list_step | int | nullable, CHECK (1-15) | Maps to recruiting_journey_steps pipeline position if applicable; null if contact predates shortlist entry |
| notes | text | nullable | Free-form notes on the contact |
| created_at | timestamptz | DEFAULT now() | Record creation timestamp |

---

## 3. Junction Relationships

**short_list_items** (logical, no direct FK)
- Coach contacts are logically scoped to the student-school shortlist relationship via the composite key (profile_id, unitid).
- This same key exists as UNIQUE(user_id, unitid) in short_list_items.
- A contact record does not require an existing short_list_items entry — contacts may occur before a school is formally added to a shortlist.

**schools** (FK via unitid)
- Ties each contact to the college program (school) directly.
- Ensures referential integrity: no contact can reference a deleted school.

**college_coaches** (FK via coach_id, nullable)
- Ties the contact to a specific coach when the student/HS coach knows which coach initiated or received contact.
- coach_id is nullable — contact may be with a program inbox or general admission contact, not a named coach.

**hs_coach_students** (via RLS indirection, no direct FK)
- HS coaches access coach_contacts via their linked students.
- RLS chain: profile_id → profiles.user_id → hs_coach_students.student_user_id.

**hs_counselor_students** (via RLS indirection, no direct FK)
- HS counselors access coach_contacts via their linked students.
- RLS chain: profile_id → profiles.user_id → hs_counselor_students.student_user_id.

---

## 4. Write Permissions

- **Students**: can create + write rows where profile_id = their profiles.id
- **Parents**: can create + write rows for their child (via parent_student_link, not yet live)
- **HS Coaches**: can create + write rows for their linked students via hs_coach_students
- **HS Counselors**: can create + write rows for their linked students via hs_counselor_students
- **College Coaches**: CANNOT write their own contact records — integrity rule, no exceptions. (Use college_coaches to update coach entity data; use recruiting_events to track program events. Coach contact records are student-initiated or HS coaching staff initiated only.)
- **Service Role**: full access for bulk data imports

---

## 5. RLS Pattern

| Role | Read | Write | Scope |
|------|------|-------|-------|
| Student | ✓ | ✓ | own rows (profile_id = their profiles.id) |
| HS Coach | ✓ | ✓ | linked students via hs_coach_students |
| HS Counselor | ✓ | ✓ | linked students via hs_counselor_students |
| College Coach | ✗ | ✗ | no direct access — see (4) above |
| Public (not authenticated) | ✗ | ✗ | no access |
| Service Role (admin/import) | ✓ | ✓ | full access |

---

## 6. Data Enhancement Note

`coach_contacts` will be populated during Phase 1 data enhancement as students begin logging initial contacts with college coaches. The source of coach names and details is the `college_coaches` table (migration 0028). The coach_id FK will be null for any contact logged before college_coaches is populated for that school. This is expected behavior — matching happens reactively as coaches are added to the database.

---

## 7. Legacy JSONB Relationship

**Superseded:** `short_list_items.coach_contact` (JSONB, no enforced schema)

Existing data in `short_list_items.coach_contact` remains readable via the JSONB contract doc (`docs/superpowers/contracts/short_list_items-coach_contact-contract.md`, marked superseded as of DEC-CFBRB-066). This data is **not migrated automatically** to the coach_contacts table.

All new contact records go to `coach_contacts` only. UI logic must write to `coach_contacts` for any new contacts. Legacy JSONB reads are supported for backward compatibility during Phase 1 but are not extended or enhanced.

---

**Decision Reference:** DEC-CFBRB-066 | **Migration:** 0031 (depends on college_coaches 0028, schools, profiles) | **Owned by:** Patch (migration), Quill (schema contract)
