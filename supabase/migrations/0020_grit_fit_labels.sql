-- Migration: 0020_grit_fit_labels
-- Adds multi-label support to short_list_items.
-- grit_fit_status is retained as the primary (single) status for existing filter compatibility.
-- grit_fit_labels carries the full set of applicable labels from GRIT FIT evaluation.
-- Both columns are written together on every scoring evaluation write.

ALTER TABLE public.short_list_items
  ADD COLUMN grit_fit_labels text[] NOT NULL DEFAULT ARRAY['not_evaluated'];

-- Seed existing rows from their current single-value status
UPDATE public.short_list_items
  SET grit_fit_labels = ARRAY[grit_fit_status];

-- Validate array contents — every element must be a known label
ALTER TABLE public.short_list_items
  ADD CONSTRAINT grit_fit_labels_valid CHECK (
    grit_fit_labels <@ ARRAY[
      'not_evaluated',
      'currently_recommended',
      'out_of_academic_reach',
      'below_academic_fit',
      'out_of_athletic_reach',
      'below_athletic_fit',
      'outside_geographic_reach'
    ]::text[]
  );

COMMENT ON COLUMN public.short_list_items.grit_fit_labels IS
  'Full set of GRIT FIT labels for this school. A school failing multiple gates carries multiple labels. grit_fit_status is always labels[0] (primary).';
