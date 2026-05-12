# Bulk PDS Selector Contract — Sprint 026

Coordination file between Agents 1a (Coach UI) + 1b (Admin UI) and Agent 1d (Playwright). Owner: Agent 1a (may revise; 1b appends Admin entries). Reads: Agent 1d.

Purpose: lock the `data-testid` taxonomy across the Coach View and Admin Panel so Playwright specs can be authored without seeing the components.

Convention: `bulk-pds-<scope>-<role>-<descriptor>`. Coach View scope = `coach`. Admin Panel scope = `admin`. Use kebab-case throughout.

---

## Coach View — `/coach/player-updates` (Agent 1a)

| `data-testid`                             | Element                                                       |
|-------------------------------------------|---------------------------------------------------------------|
| `bulk-pds-coach-page`                     | Root page container                                           |
| `bulk-pds-coach-background`               | Background image + token overlay layer                        |
| `bulk-pds-coach-header`                   | Title + how-to copy block                                     |
| `bulk-pds-coach-identity-box`             | Read-only coach name/email/school panel                       |
| `bulk-pds-coach-identity-name`            | Coach name text node                                          |
| `bulk-pds-coach-identity-email`           | Coach email text node                                         |
| `bulk-pds-coach-identity-school`          | Coach school text node                                        |
| `bulk-pds-coach-student-picker`           | `<select>` element                                            |
| `bulk-pds-coach-student-add-btn`          | "Add Player" button                                           |
| `bulk-pds-coach-card-list`                | Container for dynamic Player Update Cards                     |
| `bulk-pds-coach-card-<student_user_id>`   | One Player Update Card (templated by student id)              |
| `bulk-pds-coach-card-remove-<id>`         | Per-card remove button                                        |
| `bulk-pds-coach-field-height-<id>`        | Height input (per card)                                       |
| `bulk-pds-coach-field-weight-<id>`        | Weight input                                                  |
| `bulk-pds-coach-field-speed_40-<id>`      | 40-yard-dash input                                            |
| `bulk-pds-coach-field-time_5_10_5-<id>`   | 5-10-5 input                                                  |
| `bulk-pds-coach-field-time_l_drill-<id>`  | L-Drill input                                                 |
| `bulk-pds-coach-field-bench_press-<id>`   | Bench press input                                             |
| `bulk-pds-coach-field-squat-<id>`         | Squat input                                                   |
| `bulk-pds-coach-field-clean-<id>`         | Clean input                                                   |
| `bulk-pds-coach-submit-btn`               | Submit batch button                                           |
| `bulk-pds-coach-submit-toast`             | Post-submit confirmation toast                                |

## Admin Panel — `/admin/bulk-pds` (Agent 1b)

| `data-testid`                                       | Element                                                  |
|-----------------------------------------------------|----------------------------------------------------------|
| `admin-tab-bulk-pds`                                | Tab button in AdminPage nav                              |
| `bulk-pds-admin-tab-shell`                          | Tab root container                                        |
| `bulk-pds-admin-batch-list`                         | Left-column list of pending batches                       |
| `bulk-pds-admin-batch-row-<batch_id>`               | One batch in the list                                     |
| `bulk-pds-admin-batch-detail`                       | Right-column detail panel                                 |
| `bulk-pds-admin-batch-header`                       | Detail header with coach + ts + batch CTAs                |
| `bulk-pds-admin-batch-approve-btn`                  | "Verify and Update Profiles" (whole batch) button         |
| `bulk-pds-admin-batch-reject-btn`                   | "Reject Batch" button                                     |
| `bulk-pds-admin-compare-row-<submission_id>`        | One side-by-side A/B row per student in the batch         |
| `bulk-pds-admin-staging-card-<submission_id>`       | A: staging row card                                       |
| `bulk-pds-admin-profile-card-<submission_id>`       | B: current profiles row card                              |
| `bulk-pds-admin-row-approve-btn-<submission_id>`    | Per-row approve button                                    |
| `bulk-pds-admin-row-reject-btn-<submission_id>`     | Per-row reject button                                     |
| `bulk-pds-admin-reject-modal`                       | Reject modal root                                         |
| `bulk-pds-admin-reject-reason-input`                | Reject reason textarea                                    |
| `bulk-pds-admin-reject-modal-confirm-btn`           | Reject modal confirm button                               |
| `bulk-pds-admin-reject-modal-cancel-btn`            | Reject modal cancel button                                |
| `bulk-pds-admin-diff-highlight`                     | Field-delta highlight wrapper                             |

## Nav — both views

| `data-testid`                          | Element                                            |
|----------------------------------------|----------------------------------------------------|
| `coach-nav-player-updates`             | `COACH_NAV_LINKS` "PLAYER UPDATES" `<a>`           |

---

## Playwright spec coverage map (Agent 1d)

| Spec                                           | Selectors used                                                                              |
|------------------------------------------------|---------------------------------------------------------------------------------------------|
| `coach-player-updates.spec.js`                 | `bulk-pds-coach-page`, `student-picker`, `student-add-btn`, `card-list`, `field-*`, `submit-btn`, `submit-toast` |
| `coach-player-updates-mobile.spec.js`          | same — viewport 375×667                                                                     |
| `admin-bulk-pds-approval.spec.js`              | `admin-tab-bulk-pds`, `batch-list`, `batch-detail`, `compare-row`, `staging-card`, `profile-card`, `batch-approve-btn`, plus per-row reject modal |
| `profile-note1-lock.spec.js`                   | none from this file — verifies absence of new field inputs on `/profile`                    |

Last revision: 2026-05-12 (orchestrator scaffold; Agent 1a takes ownership at task start; Agent 1b may append admin entries).
