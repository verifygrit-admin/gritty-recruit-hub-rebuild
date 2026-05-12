/**
 * Phase 2: Event Context — Sprint 025 Phase 5 implementation.
 *
 * Renders ONLY for scenarios that include event/camp tokens in their
 * required_form_fields. The field set is self-derived per scenario:
 *
 *   Scenario 1  — camp_name
 *   Scenario 2  — camp_name, camp_location
 *   Scenario 7  — camp_name, camp_date
 *   Scenario 8  — event_name, event_day_of_week, thank_you_sentence
 *
 * Visibility gating lives in FormPane (it does not render Phase 2 when the
 * scenario has no event fields). This component still degrades gracefully
 * if it ever receives an unexpected scenario — it returns a small note
 * rather than crashing.
 *
 * Form state shape: flat object on the parent. onFormChange accepts a
 * functional updater (prev => next), matching the Phase 4 contract.
 */

const DAY_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const EVENT_FIELDS = [
  'camp_name',
  'camp_location',
  'camp_date',
  'event_name',
  'event_day_of_week',
  'thank_you_sentence',
];

export default function Phase2Event({ scenario, form, onFormChange }) {
  const required = scenario?.required_form_fields ?? [];
  const visible = EVENT_FIELDS.filter((f) => required.includes(f));

  const setField = (field) => (event) => {
    const value = event?.target?.value ?? '';
    if (typeof onFormChange === 'function') {
      onFormChange((prev) => ({ ...(prev ?? {}), [field]: value }));
    }
  };

  if (visible.length === 0) {
    return (
      <section className="cmg-phase" data-phase="2" aria-label="Event context">
        <h3 className="cmg-phase-heading">Event Context</h3>
        <p className="cmg-p2-empty">No event fields required for this scenario.</p>
      </section>
    );
  }

  return (
    <section className="cmg-phase" data-phase="2" aria-label="Event context">
      <h3 className="cmg-phase-heading">Event Context</h3>
      <p className="cmg-p2-prompt">Tell us about the camp or visit.</p>

      <div className="cmg-p2-fields">
        {visible.includes('camp_name') && (
          <div className="cmg-p2-field">
            <label className="cmg-p2-label" htmlFor="cmg-p2-camp-name">
              Camp Name
            </label>
            <input
              id="cmg-p2-camp-name"
              className="cmg-p2-input"
              type="text"
              value={form?.camp_name ?? ''}
              onChange={setField('camp_name')}
              placeholder="e.g., Boston College Elite Camp"
            />
          </div>
        )}

        {visible.includes('camp_location') && (
          <div className="cmg-p2-field">
            <label className="cmg-p2-label" htmlFor="cmg-p2-camp-location">
              Camp Location
            </label>
            <input
              id="cmg-p2-camp-location"
              className="cmg-p2-input"
              type="text"
              value={form?.camp_location ?? ''}
              onChange={setField('camp_location')}
              placeholder="e.g., Chestnut Hill, MA"
            />
          </div>
        )}

        {visible.includes('camp_date') && (
          <div className="cmg-p2-field">
            <label className="cmg-p2-label" htmlFor="cmg-p2-camp-date">
              Camp Date
            </label>
            <input
              id="cmg-p2-camp-date"
              className="cmg-p2-input"
              type="date"
              value={form?.camp_date ?? ''}
              onChange={setField('camp_date')}
            />
          </div>
        )}

        {visible.includes('event_name') && (
          <div className="cmg-p2-field">
            <label className="cmg-p2-label" htmlFor="cmg-p2-event-name">
              Event Name <span className="cmg-p2-label-hint">(e.g., Junior Day, Prospect Camp)</span>
            </label>
            <input
              id="cmg-p2-event-name"
              className="cmg-p2-input"
              type="text"
              value={form?.event_name ?? ''}
              onChange={setField('event_name')}
              placeholder="e.g., Junior Day"
            />
          </div>
        )}

        {visible.includes('event_day_of_week') && (
          <div className="cmg-p2-field">
            <label className="cmg-p2-label" htmlFor="cmg-p2-event-day">
              Day of Week
            </label>
            <select
              id="cmg-p2-event-day"
              className="cmg-p2-input cmg-p2-select"
              value={form?.event_day_of_week ?? ''}
              onChange={setField('event_day_of_week')}
            >
              <option value="">— Select a day —</option>
              {DAY_OPTIONS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        )}

        {visible.includes('thank_you_sentence') && (
          <div className="cmg-p2-field cmg-p2-field--wide">
            <label className="cmg-p2-label" htmlFor="cmg-p2-thank-you">
              Thank-You Sentence
            </label>
            <textarea
              id="cmg-p2-thank-you"
              className="cmg-p2-input cmg-p2-textarea"
              rows={3}
              value={form?.thank_you_sentence ?? ''}
              onChange={setField('thank_you_sentence')}
              placeholder="What was meaningful for you at the camp or visit?"
            />
            <p className="cmg-p2-help">
              Share one specific moment that stood out — a drill, a conversation, the campus
              feel. The coach reads dozens of these; specifics make yours memorable.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
