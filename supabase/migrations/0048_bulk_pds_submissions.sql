-- 0048_bulk_pds_submissions.sql
-- Sprint 026 — Bulk Player Data Submission staging table.
--
-- One row per (coach submission, student). A single batch_id groups all the
-- Player Update Cards from one submit click. The admin "Bulk PDS Approval"
-- panel reads rows where approval_status='pending' and either approves the
-- whole batch (by batch_id) or one row at a time (by id) — see DEC Q1/Q2.
--
-- Lifecycle:
--   1. Coach submits N cards → N rows INSERTed with submitted_at=now() and
--      approval_status='pending'. Identity fields are snapshotted from the
--      coach-facing read of `profiles` at submit time.
--   2. Admin approves → UPDATE: approval_status='approved', approved_by, approved_at.
--      Side effect (via EF): UPDATE the corresponding profiles row with
--      measurables + sets profiles.last_bulk_pds_approved_at.
--   3. Admin rejects → UPDATE: approval_status='rejected', approved_by,
--      approved_at, rejection_reason. No profiles write.
--
-- Snapshot rationale: the identity fields (name, email, grad_year, high_school,
-- avatar_storage_path) are captured at submit time so the admin compare view is
-- stable even if the underlying profile changes between submission and approval.
--
-- Decision references:
--   Q1 (BOTH approval modes) — batch_id + id both support targeted updates.
--   Q2 (Reject in v1) — rejection_reason column included.
--   Q3 (No staging edits) — no UPDATE policy for coaches; admin EFs use service_role.
--   Q6 (last_bulk_pds_approved_at on profiles) — landed in migration 0049, paired.
--   Q8 (Retain indefinitely) — no purge column, no retention TTL.

CREATE TABLE IF NOT EXISTS public.bulk_pds_submissions (
  id                                  uuid          NOT NULL DEFAULT gen_random_uuid(),
  batch_id                            uuid          NOT NULL,
  coach_user_id                       uuid          NOT NULL,
  student_user_id                     uuid          NOT NULL,

  -- Identity snapshot at submit time (immutable record).
  student_name_snapshot               text,
  student_email_snapshot              text,
  student_grad_year_snapshot          integer,
  student_high_school_snapshot        text,
  student_avatar_storage_path_snap    text,

  -- Performance fields (candidates for write-thru to profiles on approval).
  height                              text,
  weight                              numeric,
  speed_40                            numeric,
  time_5_10_5                         numeric,
  time_l_drill                        numeric,
  bench_press                         numeric,
  squat                               numeric,
  clean                               numeric,

  -- Lifecycle.
  submitted_at                        timestamptz   NOT NULL DEFAULT now(),
  approval_status                     text          NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by                         uuid,
  approved_at                         timestamptz,
  rejection_reason                    text,

  PRIMARY KEY (id),
  CONSTRAINT bulk_pds_submissions_coach_user_id_fkey
    FOREIGN KEY (coach_user_id)    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT bulk_pds_submissions_student_user_id_fkey
    FOREIGN KEY (student_user_id)  REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT bulk_pds_submissions_approved_by_fkey
    FOREIGN KEY (approved_by)      REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX idx_bulk_pds_submissions_batch_id        ON public.bulk_pds_submissions (batch_id);
CREATE INDEX idx_bulk_pds_submissions_coach_user_id   ON public.bulk_pds_submissions (coach_user_id);
CREATE INDEX idx_bulk_pds_submissions_student_user_id ON public.bulk_pds_submissions (student_user_id);
CREATE INDEX idx_bulk_pds_submissions_approval_status ON public.bulk_pds_submissions (approval_status);
CREATE INDEX idx_bulk_pds_submissions_submitted_at    ON public.bulk_pds_submissions (submitted_at DESC);

COMMENT ON TABLE  public.bulk_pds_submissions IS 'Sprint 026 — staging table for HS coach Bulk PDS submissions. Admin approval writes through to public.profiles. Q1/Q2/Q3/Q6/Q8 lock context: docs/sprints/SPRINT_026_PLAN.md §7.';
COMMENT ON COLUMN public.bulk_pds_submissions.batch_id          IS 'Groups all Player Update Cards from a single coach submit click. Indexed for whole-batch approval/reject UI.';
COMMENT ON COLUMN public.bulk_pds_submissions.approval_status   IS 'pending → approved | rejected. Approved rows have written through to profiles; rejected rows have NOT.';
COMMENT ON COLUMN public.bulk_pds_submissions.rejection_reason  IS 'Required when approval_status=rejected. Free text. Surfaced in the rejection email to the coach.';
