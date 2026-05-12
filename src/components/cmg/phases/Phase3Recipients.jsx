/**
 * Phase 3: Coach Recipients (Sprint 025 Phase 5).
 *
 * Renders recipient tab selector and per-recipient form fields.
 *
 * - For scenarios with kind === "public_post" (Scenario 1) this component
 *   renders an explanatory note only; FormPane decides whether to mount it.
 * - Tab kinds are sourced from scenario.applies_to_recipients, EXCLUDING
 *   "broadcast" (public-post sentinel) and "recruiting_coordinator" (RC is a
 *   PreviewPane callout, not a tab).
 * - "head_coach" gets its own tab (Scenario 6).
 * - Fields rendered per active recipient:
 *     last_name           — always.
 *     ac_or_rc_last_name  — only if scenario.required_form_fields includes
 *                           "ac_or_rc_last_name" (Scenario 6).
 *
 * Props:
 *   - scenario              — current ScenarioTemplate.
 *   - activeRecipient       — string key matching one of the tabs.
 *   - onActiveRecipientChange — (key) => void.
 *   - formByRecipient       — { [recipientKey]: { last_name?, ac_or_rc_last_name? } }.
 *   - onRecipientFormChange — (updaterFn) => void.
 */

const RECIPIENT_LABELS = {
  position_coach: 'Position Coach',
  recruiting_area_coach: 'Recruiting Area Coach',
  head_coach: 'Head Coach',
};

const TAB_EXCLUDED = new Set(['broadcast', 'recruiting_coordinator']);

export default function Phase3Recipients({
  scenario,
  activeRecipient,
  onActiveRecipientChange,
  formByRecipient,
  onRecipientFormChange,
}) {
  if (!scenario) return null;

  if (scenario.kind === 'public_post') {
    return (
      <section className="cmg-phase" data-phase="3" aria-label="Coach recipients">
        <h3 className="cmg-phase-heading">Coach Recipients</h3>
        <p className="cmg-p3-public-note">
          This scenario posts publicly — no recipient required.
        </p>
      </section>
    );
  }

  const tabs = (scenario.applies_to_recipients || []).filter(
    (k) => !TAB_EXCLUDED.has(k),
  );

  // Fall back to first tab if activeRecipient is missing or not in tabs.
  const effectiveActive =
    activeRecipient && tabs.includes(activeRecipient) ? activeRecipient : tabs[0] || null;

  const activeForm = (formByRecipient && effectiveActive && formByRecipient[effectiveActive]) || {};
  const showAcOrRc = (scenario.required_form_fields || []).includes('ac_or_rc_last_name');

  function updateField(field, value) {
    if (!effectiveActive) return;
    onRecipientFormChange?.((prev) => ({
      ...(prev || {}),
      [effectiveActive]: {
        ...((prev && prev[effectiveActive]) || {}),
        [field]: value,
      },
    }));
  }

  return (
    <section className="cmg-phase" data-phase="3" aria-label="Coach recipients">
      <h3 className="cmg-phase-heading">Coach Recipients</h3>

      {tabs.length > 0 && (
        <div
          className="cmg-p3-tabs"
          role="tablist"
          aria-label="Recipient tabs"
        >
          {tabs.map((key) => {
            const isActive = effectiveActive === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`cmg-p3-tab${isActive ? ' is-active' : ''}`}
                onClick={() => onActiveRecipientChange?.(key)}
              >
                {RECIPIENT_LABELS[key] || key}
              </button>
            );
          })}
        </div>
      )}

      {effectiveActive && (
        <div className="cmg-p3-fields" role="tabpanel">
          <div className="cmg-p3-field">
            <label
              className="cmg-p3-label"
              htmlFor={`cmg-p3-last-name-${effectiveActive}`}
            >
              {RECIPIENT_LABELS[effectiveActive] || effectiveActive} — Last Name
            </label>
            <input
              id={`cmg-p3-last-name-${effectiveActive}`}
              type="text"
              className="cmg-p3-input"
              placeholder="e.g., Reagan"
              value={activeForm.last_name || ''}
              onChange={(e) => updateField('last_name', e.target.value)}
            />
          </div>

          {showAcOrRc && (
            <div className="cmg-p3-field">
              <label
                className="cmg-p3-label"
                htmlFor={`cmg-p3-ac-rc-${effectiveActive}`}
              >
                AC / RC — Last Name
              </label>
              <input
                id={`cmg-p3-ac-rc-${effectiveActive}`}
                type="text"
                className="cmg-p3-input"
                placeholder="Coach you'd previously tried to contact"
                value={activeForm.ac_or_rc_last_name || ''}
                onChange={(e) => updateField('ac_or_rc_last_name', e.target.value)}
              />
              <div className="cmg-p3-help">
                Last name of the Assistant Coach or Recruiting Coordinator
                you've been trying to contact.
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
