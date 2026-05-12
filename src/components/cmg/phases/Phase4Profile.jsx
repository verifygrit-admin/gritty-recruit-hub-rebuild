/**
 * Phase 4: Your Profile (read-only display) — stub.
 * Sprint 025 Phase 4 scaffold. Real implementation lands in Phase 5.
 *
 * Renders the student's auto-filled profile fields (name, grad_year,
 * position, high_school, state, gpa, hudl_url, twitter, height, weight)
 * with the auto-fill visual treatment from DESIGN_NOTES, plus an
 * "edit in profile" link to /profile for changes.
 */
export default function Phase4Profile({ profile }) {
  return (
    <section className="cmg-phase" data-phase="4" aria-label="Your profile">
      <h3 className="cmg-phase-heading">Your Profile</h3>
      <p className="cmg-phase-stub">
        Phase 5 implementation pending. Profile keys:{' '}
        <code>{profile ? Object.keys(profile).join(', ') : '—'}</code>.
      </p>
    </section>
  );
}
