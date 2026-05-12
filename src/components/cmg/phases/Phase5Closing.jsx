/**
 * Phase 5: Closing Questions — stub.
 * Sprint 025 Phase 4 scaffold. Real implementation lands in Phase 5.
 *
 * Renders the junior_day_question_text and camp_question_text inputs,
 * gated by scenario.closing_questions ("both" | "junior_day" | "camp" |
 * "neither"). Five of eleven scenarios (#2-#6) have both; the rest have
 * neither in the locked template set.
 */
export default function Phase5Closing({ scenario, form, onFormChange }) {
  return (
    <section className="cmg-phase" data-phase="5" aria-label="Closing questions">
      <h3 className="cmg-phase-heading">Closing Questions</h3>
      <p className="cmg-phase-stub">
        Phase 5 implementation pending. Closing flag:{' '}
        <code>{scenario?.closing_questions ?? '—'}</code>.
      </p>
    </section>
  );
}
