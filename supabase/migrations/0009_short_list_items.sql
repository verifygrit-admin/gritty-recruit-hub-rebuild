-- Migration: 0009_short_list_items
-- Table: short_list_items
-- Spec: patch-schema-auth-spec-v2.md Section 2.11
-- SAID REMOVED (DEC-CFBRB-002)
-- grit_fit_status: NOT NULL DEFAULT 'not_evaluated' (DEC-CFBRB-013)
--   'not_evaluated' added to CHECK enum; IS NULL guard removed (column is non-nullable)
--   Manual-add rows default to 'not_evaluated'; app code updates to specific status on GRIT FIT eval
-- 15-step recruiting journey JSON (15 steps is correct; "16-step" in directive narrative is an error)

CREATE TABLE public.short_list_items (
  id                      bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unitid                  integer NOT NULL,
  school_name             text,
  div                     text,
  conference              text,
  state                   text,
  match_rank              integer,
  match_tier              text,
  net_cost                numeric,
  droi                    numeric,
  break_even              numeric,
  adltv                   numeric,
  grad_rate               numeric,
  coa                     numeric,
  dist                    numeric,
  q_link                  text,
  coach_link              text,
  source                  text NOT NULL DEFAULT 'manual_add' CHECK (source IN ('grit_fit', 'manual_add')),
  grit_fit_status         text NOT NULL DEFAULT 'not_evaluated' CHECK (grit_fit_status IN (
                            'not_evaluated',
                            'currently_recommended',
                            'out_of_academic_reach',
                            'below_academic_fit',
                            'out_of_athletic_reach',
                            'below_athletic_fit',
                            'outside_geographic_reach'
                          )),
  recruiting_journey_steps jsonb NOT NULL DEFAULT '[
    {"step_id": 1,  "label": "Added to shortlist",                        "completed": true,  "completed_at": null},
    {"step_id": 2,  "label": "Completed recruiting questionnaire",         "completed": false, "completed_at": null},
    {"step_id": 3,  "label": "Completed admissions info form",             "completed": false, "completed_at": null},
    {"step_id": 4,  "label": "Contacted coach via email",                  "completed": false, "completed_at": null},
    {"step_id": 5,  "label": "Contacted coach via social media",           "completed": false, "completed_at": null},
    {"step_id": 6,  "label": "Received junior day invite",                 "completed": false, "completed_at": null},
    {"step_id": 7,  "label": "Received visit invite",                      "completed": false, "completed_at": null},
    {"step_id": 8,  "label": "Received prospect camp invite",              "completed": false, "completed_at": null},
    {"step_id": 9,  "label": "School contacted student via text",          "completed": false, "completed_at": null},
    {"step_id": 10, "label": "Head coach contacted student",               "completed": false, "completed_at": null},
    {"step_id": 11, "label": "Assistant coach contacted student",          "completed": false, "completed_at": null},
    {"step_id": 12, "label": "School requested transcript",                "completed": false, "completed_at": null},
    {"step_id": 13, "label": "School requested financial info",            "completed": false, "completed_at": null},
    {"step_id": 14, "label": "Received verbal offer",                      "completed": false, "completed_at": null},
    {"step_id": 15, "label": "Received written offer",                     "completed": false, "completed_at": null}
  ]'::jsonb,
  added_at                timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT short_list_items_pkey PRIMARY KEY (id),
  CONSTRAINT short_list_items_user_unitid_key UNIQUE (user_id, unitid)
);
