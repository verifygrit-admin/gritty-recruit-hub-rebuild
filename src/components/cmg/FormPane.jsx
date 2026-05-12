import Phase1Channel from './phases/Phase1Channel.jsx';
import Phase2Event from './phases/Phase2Event.jsx';
import Phase3Recipients from './phases/Phase3Recipients.jsx';
import Phase4Profile from './phases/Phase4Profile.jsx';
import Phase5Closing from './phases/Phase5Closing.jsx';

/**
 * FormPane — orchestrates the five form sub-phases with progressive reveal.
 * Sprint 025 Phase 4 scaffold; Phase 5 wires the reveal sequencing and the
 * scenario-conditional phase visibility (Phase 2 for scenarios 1/2/7/8;
 * Phase 5 for scenarios with closing_questions !== "neither", etc.).
 *
 * Layout: vertical stack of phase sections inside the left-pane container.
 */
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

  const showEventPhase =
    scenario.required_form_fields?.some(f =>
      ['camp_name', 'camp_location', 'camp_date', 'event_name', 'event_day_of_week', 'thank_you_sentence'].includes(f),
    ) ?? false;

  const showClosingPhase = scenario.closing_questions && scenario.closing_questions !== 'neither';

  return (
    <div className="cmg-form-pane" data-testid="cmg-form-pane">
      <Phase1Channel
        scenario={scenario}
        channel={channel}
        onChannelChange={onChannelChange}
        school={selectedSchool}
        onSchoolChange={onSchoolChange}
      />
      {showEventPhase && (
        <Phase2Event scenario={scenario} form={form} onFormChange={onFormChange} />
      )}
      {scenario.kind === 'coach_message' && (
        <Phase3Recipients
          scenario={scenario}
          activeRecipient={activeRecipient}
          onActiveRecipientChange={onActiveRecipientChange}
          formByRecipient={formByRecipient}
          onRecipientFormChange={onRecipientFormChange}
        />
      )}
      <Phase4Profile profile={profile} />
      {showClosingPhase && (
        <Phase5Closing scenario={scenario} form={form} onFormChange={onFormChange} />
      )}
    </div>
  );
}
