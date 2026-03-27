-- Migration: 0018_document_shares
-- Table: document_shares
-- Purpose: Tracks which library docs have been shared to which school (unitid).
--   One share row per (library_doc, unitid) pair.
--   Sharing is permanent — no unshare (D4). Student cannot UPDATE or DELETE share rows.
--   When the library doc is deleted, shares cascade-delete via FK.
-- Coach access: NOT in scope (D2). No coach policies on this table.

CREATE TABLE public.document_shares (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  library_doc_id   uuid        NOT NULL REFERENCES public.document_library(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unitid           integer     NOT NULL,
  shared_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT document_shares_pkey PRIMARY KEY (id),
  -- One share row per doc per school — idempotent share
  CONSTRAINT document_shares_unique UNIQUE (library_doc_id, unitid)
);

-- Indexes for common access patterns
CREATE INDEX document_shares_user_id_idx    ON public.document_shares (user_id);
CREATE INDEX document_shares_unitid_idx     ON public.document_shares (unitid);
CREATE INDEX document_shares_lib_doc_idx    ON public.document_shares (library_doc_id);
