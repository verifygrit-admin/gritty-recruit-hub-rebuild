import Phase1Channel from './phases/Phase1Channel.jsx';
import Phase2Event from './phases/Phase2Event.jsx';
import Phase3Recipients from './phases/Phase3Recipients.jsx';
import Phase4Profile from './phases/Phase4Profile.jsx';
import Phase5Closing from './phases/Phase5Closing.jsx';

/**
 * FormPane — orchestrates the five form sub-phases with progressive reveal.
 *
 * Sprint 025 Phase 5e wires the per-phase reveal gating. The Phase 4 scaffold
 * rendered all phases unconditionally; this revision computes a `revealed`
 * boolean per phase based on whether the prior phase's required inputs are
 * filled. The phase mounts in the DOM at scenario-select time; CSS
 * (.cmg-phase-reveal[data-revealed]) controls the staggered opacity/translateY
 * transition. See /* Phase 5 — FormPane reveal *\/ in src/index.css.
 *
 * Layout: vertical stack of phase sections inside the left-pane container.
 */

const EVENT_FIELDS = [
  'camp_name',
  'camp_location',
  'camp_date',
  'event_name',
  'event_day_of_week',
  'thank_you_sentence',
];

/**
 * Compute which phases should be visible AND which should be revealed.
 * Visibility (`show*`) is a function of the scenario alone — visible phases
 * mount unconditionally once a scenario is selected. Reveal (`reveal*`) is a
 * function of the current form state — reveal flips true when the prior
 * phase's required fields are filled, triggering the CSS transition.
 *
 * @param {object} scenario - The active CMG scenario.
 * @param {object} state - Current form state: { channel, selectedSchool, form,
 *   activeRecipient }.
 * @returns {object} - { showEvent, showRecipients, showClosing,
 *   revealPhase1..5 }.
 */
function computeReveal(scenario, state) {
  const { channel, selectedSchool, form, activeRecipient } = state;

  const showEvent =
    scenario.required_form_fields?.some(f => EVENT_FIELDS.includes(f)) ?? false;
  const showRecipients = scenario.kind === 'coach_message';
  const showClosing =
    !!scenario.closing_questions && scenario.closing_questions !== 'neither';

  // Phase 1: always revealed.
  const revealPhase1 = true;

  // Phase 1 prerequisites: a channel selection and a school selection.
  const phase1Filled = !!channel && !!selectedSchool;

  // Phase 2: revealed when Phase 1 is filled. (Only renders when showEvent.)
  const revealPhase2 = phase1Filled;

  // Phase 2 prerequisites: every event-related required field on the scenario
  // is non-empty in `form`. If Phase 2 doesn't apply, this collapses to
  // phase1Filled.
  const phase2Filled = !showEvent
    ? phase1Filled
    : phase1Filled &&
      (scenario.required_form_fields ?? [])
        .filter(f => EVENT_FIELDS.includes(f))
        .every(f => {
          const v = form?.[f];
          return v !== undefined && v !== null && String(v).trim() !== '';
        });

  // Phase 3: revealed when phases 1 (and 2 if applicable) are complete.
  const revealPhase3 = phase2Filled;

  // Phase 3 prerequisites: an active recipient is selected. If Phase 3 doesn't
  // apply, this collapses to phase2Filled.
  const phase3Filled = !showRecipients ? phase2Filled : phase2Filled && !!activeRecipient;

  // Phase 4: revealed when all prior visible phases are revealed.
  const revealPhase4 = phase3Filled;

  // Phase 5: revealed when Phase 4 is revealed (auto-fill makes Phase 4
  // immediately "complete" once it reveals).
  const revealPhase5 = revealPhase4;

  return {
    showEvent,
    showRecipients,
    showClosing,
    revealPhase1,
    revealPhase2,
    revealPhase3,
    revealPhase4,
    revealPhase5,
  };
}

export default function FormPane({
  scenario,
  profile,
  channel,
  onChannelChange,
  selectedSchool,
  onSchoolChange,
  form,
  onFormChange,
  activeRecipient,
  onActiveRecipientChange,
  formByRecipient,
  onRecipientFormChange,
}) {
  if (!scenario) return null;

  const reveal = computeReveal(scenario, {
    channel,
    selectedSchool,
    form,
    activeRecipient,
  });

  return (
    <div className="cmg-form-pane" data-testid="cmg-form-pane">
      <div className="cmg-phase-reveal" data-revealed={String(reveal.revealPhase1)}>
        <Phase1Channel
          scenario={scenario}
          channel={channel}
          onChannelChange={onChannelChange}
          school={selectedSchool}
          onSchoolChange={onSchoolChange}
        />
      </div>
      {reveal.showEvent && (
        <div className="cmg-phase-reveal" data-revealed={String(reveal.revealPhase2)}>
          <Phase2Event scenario={scenario} form={form} onFormChange={onFormChange} />
        </div>
      )}
      {reveal.showRecipients && (
        <div className="cmg-phase-reveal" data-revealed={String(reveal.revealPhase3)}>
          <Phase3Recipients
            scenario={scenario}
            activeRecipient={activeRecipient}
            onActiveRecipientChange={onActiveRecipientChange}
            formByRecipient={formByRecipient}
            onRecipientFormChange={onRecipientFormChange}
          />
        </div>
      )}
      <div className="cmg-phase-reveal" data-revealed={String(reveal.revealPhase4)}>
        <Phase4Profile profile={profile} />
      </div>
      {reveal.showClosing && (
        <div className="cmg-phase-reveal" data-revealed={String(reveal.revealPhase5)}>
          <Phase5Closing scenario={scenario} form={form} onFormChange={onFormChange} />
        </div>
      )}
    </div>
  );
}
