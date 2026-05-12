import FormPane from './FormPane.jsx';
import PreviewPane from './PreviewPane.jsx';

/**
 * MessageBuilder — two-column container that mounts when a scenario is
 * selected. Left = FormPane, right = PreviewPane. Stacks vertically on
 * narrow viewports (CSS @media in index.css).
 *
 * Sprint 025 Phase 4 — visual shell + child orchestration only.
 */
export default function MessageBuilder(props) {
  const { scenario } = props;
  if (!scenario) return null;
  return (
    <div className="cmg-builder" data-testid="cmg-message-builder" id="builder">
      <header className="cmg-builder-header">
        <h2 className="cmg-builder-title">{scenario.title}</h2>
        <p className="cmg-builder-subtitle">
          Scenario #{scenario.id} ·{' '}
          {scenario.channel_pattern === 'twitter-public'
            ? 'Public X post'
            : scenario.channel_pattern === 'dm-first'
              ? 'DM → Email'
              : 'Email → DM'}
        </p>
      </header>
      <div className="cmg-builder-grid">
        <FormPane {...props} />
        <PreviewPane {...props} />
      </div>
    </div>
  );
}
