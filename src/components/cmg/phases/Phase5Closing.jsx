/**
 * Phase 5: Closing Questions — Sprint 025 Phase 5 implementation.
 *
 * Renders the optional junior_day_question_text and camp_question_text
 * inputs, gated by scenario.closing_questions:
 *
 *   "both"        — render both Junior Day and Camp inputs (scenarios 2–6)
 *   "junior_day"  — render only Junior Day (forward-compat; no locked scenario)
 *   "camp"        — render only Camp (forward-compat)
 *   "neither"     — return null (FormPane also gates, but defense in depth)
 *
 * Both fields are OPTIONAL. Empty string is a valid state — the substitution
 * layer is expected to strip the surrounding question text when either field
 * is empty (see SUBSTITUTION_TOKENS entries for [Junior Day Question] and
 * [Camp Question] in src/data/cmgScenarios.ts).
 */
export default function Phase5Closing({ scenario, form, onFormChange }) {
  const flag = scenario?.closing_questions ?? 'neither';

  if (flag === 'neither' || !scenario) {
    return null;
  }

  const showJuniorDay = flag === 'both' || flag === 'junior_day';
  const showCamp = flag === 'both' || flag === 'camp';

  const setField = (field) => (event) => {
    const value = event?.target?.value ?? '';
    if (typeof onFormChange === 'function') {
      onFormChange((prev) => ({ ...(prev ?? {}), [field]: value }));
    }
  };

  return (
    <section className="cmg-phase" data-phase="5" aria-label="Closing questions">
      <h3 className="cmg-phase-heading">Closing Questions</h3>
      <p className="cmg-p5-prompt">
        Optional — closing questions invite a response and give the coach a clear next step.
      </p>

      <div className="cmg-p5-fields">
        {showJuniorDay && (
          <div className="cmg-p5-field">
            <label className="cmg-p5-label" htmlFor="cmg-p5-junior-day">
              Junior Day Question <span className="cmg-p5-label-hint">(optional)</span>
            </label>
            <input
              id="cmg-p5-junior-day"
              className="cmg-p5-input"
              type="text"
              value={form?.junior_day_question_text ?? ''}
              onChange={setField('junior_day_question_text')}
              placeholder="Will you be hosting a Junior Day this spring?"
            />
            <p className="cmg-p5-help">
              If your prospect school has a Junior Day, ask about it here.
            </p>
          </div>
        )}

        {showCamp && (
          <div className="cmg-p5-field">
            <label className="cmg-p5-label" htmlFor="cmg-p5-camp">
              Camp Question <span className="cmg-p5-label-hint">(optional)</span>
            </label>
            <input
              id="cmg-p5-camp"
              className="cmg-p5-input"
              type="text"
              value={form?.camp_question_text ?? ''}
              onChange={setField('camp_question_text')}
              placeholder="Which camps would you recommend for me to attend?"
            />
            <p className="cmg-p5-help">
              Asking about camps gives the coach an evaluation hook.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
