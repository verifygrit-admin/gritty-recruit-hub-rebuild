-- Migration: 0008_schools
-- Table: schools (NCAA — 662 schools)
-- Spec: patch-schema-auth-spec-v2.md Section 2.10
-- Source: Verified against live Supabase schema + David's PROTO-GLOBAL-010 artifact
-- Sheet source: Google Sheet ID 1Pc4LOnD1fhQz-9pI_CUEDaAMDfTkUXcCRTVDfoDWvqo, tab 'GrittyOS DB'
-- Schema unchanged from prior project (cfb-recruit-hub migration 20260319000001)
-- 662 rows seeded via sync_schools.py — this migration creates the table only

CREATE TABLE IF NOT EXISTS public.schools (
  unitid                      integer        NOT NULL,
  school_name                 text           NOT NULL,
  state                       text,
  city                        text,
  control                     text,
  school_type                 text,
  type                        text,
  ncaa_division               text,
  conference                  text,
  latitude                    numeric,
  longitude                   numeric,
  coa_out_of_state            numeric,
  est_avg_merit               numeric,
  avg_merit_award             numeric,
  share_stu_any_aid           numeric,
  share_stu_need_aid          numeric,
  need_blind_school           boolean,
  dltv                        numeric,
  acad_rigor_senior           numeric,
  acad_rigor_junior           numeric,
  acad_rigor_soph             numeric,
  acad_rigor_freshman         numeric,
  acad_rigor_test_opt_senior  numeric,
  acad_rigor_test_opt_junior  numeric,
  acad_rigor_test_opt_soph    numeric,
  acad_rigor_test_opt_freshman numeric,
  is_test_optional            boolean,
  graduation_rate             numeric,
  recruiting_q_link           text,
  coach_link                  text,
  prospect_camp_link          text,
  field_level_questionnaire   text,
  avg_gpa                     numeric,
  avg_sat                     numeric,
  last_updated                timestamptz    DEFAULT now(),
  adltv                       numeric,
  adltv_rank                  integer,
  admissions_rate             numeric,
  PRIMARY KEY (unitid)
);
