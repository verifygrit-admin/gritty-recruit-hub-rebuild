/**
 * Phase 1: Channel & School — stub.
 * Sprint 025 Phase 4 scaffold. Real implementation lands in Phase 5.
 *
 * Renders:
 *   - Email / Twitter DM channel toggle (pill group)
 *   - School picker (defaults to shortlist; "Other school" expands to typeahead
 *     against all 662 public.schools rows)
 *
 * Advances when both channel and school are selected.
 */
export default function Phase1Channel({ scenario, channel, onChannelChange, school, onSchoolChange }) {
  return (
    <section className="cmg-phase" data-phase="1" aria-label="Channel and school">
      <h3 className="cmg-phase-heading">Channel &amp; School</h3>
      <p className="cmg-phase-stub">
        Phase 5 implementation pending. Scenario: <code>{scenario?.title ?? '—'}</code>.
        Channel: <code>{channel ?? 'unset'}</code>. School:{' '}
        <code>{school?.school_name ?? 'unset'}</code>.
      </p>
    </section>
  );
}
