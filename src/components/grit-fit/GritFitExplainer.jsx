/**
 * GritFitExplainer — Sprint 003 D4 + Sprint 004 Wave 3 G4a.
 *
 * Narrative section explaining the division mix for this profile. The title
 * bar is a CollapsibleTitleStrip (SC-1) with local collapse state — default
 * expanded, hides body only, strip stays visible either way. Body copy comes
 * from the operator-editable `DIVISION_MIX_EXPLAINER` constant (two paragraphs
 * separated by \n\n), rendered as two <p> elements to match the existing
 * paragraph-rendering convention in this file.
 */

import { useState } from 'react';
import CollapsibleTitleStrip from '../CollapsibleTitleStrip.jsx';
import {
  GRIT_FIT_EXPLAINER,
  DIVISION_MIX_EXPLAINER,
} from '../../lib/copy/gritFitExplainerCopy.js';

const BODY_ID = 'grit-fit-division-mix-body';
const STRIP_ID = 'grit-fit-division-mix-strip';

export default function GritFitExplainer() {
  const [isDivisionMixCollapsed, setIsDivisionMixCollapsed] = useState(false);

  const paragraphs = DIVISION_MIX_EXPLAINER.split('\n\n');

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
      <CollapsibleTitleStrip
        title={GRIT_FIT_EXPLAINER.heading}
        isCollapsed={isDivisionMixCollapsed}
        onToggle={() => setIsDivisionMixCollapsed((v) => !v)}
        id={STRIP_ID}
        ariaControls={BODY_ID}
      />
      {!isDivisionMixCollapsed && (
        <div
          id={BODY_ID}
          data-testid="grit-fit-division-mix-body"
          style={{ marginTop: 12 }}
        >
          {paragraphs.map((p, i) => (
            <p
              key={i}
              style={{
                margin: '0 0 10px 0',
                color: '#4A4A4A',
                fontSize: '0.95rem',
                lineHeight: 1.65,
              }}
            >
              {p}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
