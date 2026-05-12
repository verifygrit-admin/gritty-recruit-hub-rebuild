/**
 * Phase 2: Event Context — stub.
 * Sprint 025 Phase 4 scaffold. Real implementation lands in Phase 5.
 *
 * Renders ONLY for scenarios that include event/camp tokens in their
 * body_template. Phase 5 will self-derive the visible field set from
 * scenario.required_form_fields (subset of: camp_name, camp_location,
 * camp_date, event_name, event_day_of_week, thank_you_sentence).
 */
export default function Phase2Event({ scenario, form, onFormChange }) {
  return (
    <section className="cmg-phase" data-phase="2" aria-label="Event context">
      <h3 className="cmg-phase-heading">Event Context</h3>
      <p className="cmg-phase-stub">
        Phase 5 implementation pending. Required fields:{' '}
        <code>{scenario?.required_form_fields?.join(', ') || '—'}</code>.
      </p>
    </section>
  );
}
