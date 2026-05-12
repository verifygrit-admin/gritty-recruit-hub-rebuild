import {
  CMG_SCENARIOS,
  SECTION_SUBTITLE_PUBLIC_POSTS,
  SECTION_SUBTITLE_COACH_MESSAGES,
} from '../../data/cmgScenarios.ts';

/**
 * ScenarioGallery — renders the 11 scenario cards as two grouped sections:
 *   Public Posts (Scenario 1 only) above Coach Messages (Scenarios 2–11).
 *
 * Sprint 025 Phase 4 — visual shell complete; selection wires to parent
 * via onSelect(scenario).
 *
 * Sprint 025 hotfix (2026-05-12): restored section subtitles and per-scenario
 * helper text from the prototype that were dropped during scaffolding.
 *
 * Visual hooks (CSS classes consumed in index.css):
 *   .cmg-gallery-section, .cmg-gallery-section-heading,
 *   .cmg-gallery-section-subtitle (hotfix),
 *   .cmg-gallery-grid (3-col desktop → 2-col @ 900px → 1-col @ 560px),
 *   .cmg-scenario-card, .cmg-scenario-card--public,
 *   .cmg-scenario-card--selected, .cmg-scenario-card-number,
 *   .cmg-scenario-card-title, .cmg-scenario-card-channel,
 *   .cmg-scenario-card-helper (hotfix).
 */
export default function ScenarioGallery({ activeScenarioId, onSelect }) {
  const publicPosts = CMG_SCENARIOS.filter(s => s.kind === 'public_post');
  const coachMessages = CMG_SCENARIOS.filter(s => s.kind === 'coach_message');

  return (
    <div className="cmg-gallery" data-testid="cmg-scenario-gallery">
      <Section
        id="public-posts-section"
        heading="Public Posts"
        subtitle={SECTION_SUBTITLE_PUBLIC_POSTS}
        scenarios={publicPosts}
        activeScenarioId={activeScenarioId}
        onSelect={onSelect}
        variant="public"
      />
      <Section
        id="coach-messages-section"
        heading="Coach Messages"
        subtitle={SECTION_SUBTITLE_COACH_MESSAGES}
        scenarios={coachMessages}
        activeScenarioId={activeScenarioId}
        onSelect={onSelect}
        variant="coach"
      />
    </div>
  );
}

function Section({ id, heading, subtitle, scenarios, activeScenarioId, onSelect, variant }) {
  if (scenarios.length === 0) return null;
  return (
    <section className="cmg-gallery-section" id={id}>
      <h2 className="cmg-gallery-section-heading">{heading}</h2>
      {subtitle ? (
        <p className="cmg-gallery-section-subtitle">{subtitle}</p>
      ) : null}
      <div className="cmg-gallery-grid">
        {scenarios.map(scenario => (
          <Card
            key={scenario.id}
            scenario={scenario}
            isSelected={activeScenarioId === scenario.id}
            onSelect={onSelect}
            variant={variant}
          />
        ))}
      </div>
    </section>
  );
}

function Card({ scenario, isSelected, onSelect, variant }) {
  const channelLabel =
    scenario.channel_pattern === 'twitter-public'
      ? 'X/Twitter post'
      : scenario.channel_pattern === 'dm-first'
        ? 'DM → Email'
        : 'Email → DM';

  return (
    <button
      type="button"
      className={[
        'cmg-scenario-card',
        variant === 'public' ? 'cmg-scenario-card--public' : '',
        isSelected ? 'cmg-scenario-card--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onSelect(scenario)}
      aria-pressed={isSelected}
      data-testid={`cmg-scenario-card-${scenario.id}`}
      data-scenario-id={scenario.id}
    >
      <div className="cmg-scenario-card-row">
        <span className="cmg-scenario-card-number">{scenario.id}</span>
        <span className="cmg-scenario-card-channel">{channelLabel}</span>
      </div>
      <h3 className="cmg-scenario-card-title">{scenario.title}</h3>
      {scenario.helper_text ? (
        <p className="cmg-scenario-card-helper">{scenario.helper_text}</p>
      ) : null}
    </button>
  );
}
