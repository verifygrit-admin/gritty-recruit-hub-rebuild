/**
 * GritFitExplainer — Sprint 003 D4.
 *
 * Narrative section explaining the division mix for this profile. Content
 * comes from the operator-editable copy constant.
 */

import { GRIT_FIT_EXPLAINER } from '../../lib/copy/gritFitExplainerCopy.js';

export default function GritFitExplainer() {
  return (
    <section
      data-testid="grit-fit-explainer"
      style={{
        margin: '24px 0',
        padding: '20px 24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E8E8',
        borderLeft: '4px solid #8B3A3A',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#2C2C2C',
          margin: '0 0 12px 0',
        }}
      >
        {GRIT_FIT_EXPLAINER.heading}
      </h3>
      {GRIT_FIT_EXPLAINER.paragraphs.map((p, i) => (
        <p key={i} style={{ margin: '0 0 10px 0', color: '#4A4A4A', fontSize: '0.95rem', lineHeight: 1.65 }}>
          {p}
        </p>
      ))}
    </section>
  );
}
