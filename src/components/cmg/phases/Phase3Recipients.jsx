/**
 * Phase 3: Coach Recipients — stub.
 * Sprint 025 Phase 4 scaffold. Real implementation lands in Phase 5.
 *
 * Renders recipient tab selector (Position Coach / Recruiting Area Coach,
 * absent for Scenario 1 / public-post) plus per-recipient last_name fields.
 * Scenario 6 adds the ac_or_rc_last_name field.
 */
export default function Phase3Recipients({ scenario, activeRecipient, onActiveRecipientChange, formByRecipient, onRecipientFormChange }) {
  return (
    <section className="cmg-phase" data-phase="3" aria-label="Coach recipients">
      <h3 className="cmg-phase-heading">Coach Recipients</h3>
      <p className="cmg-phase-stub">
        Phase 5 implementation pending. Applies to:{' '}
        <code>{scenario?.applies_to_recipients?.join(', ') || '—'}</code>.
      </p>
    </section>
  );
}
