/**
 * JourneyStepper — vertical three-step user journey on the Home view.
 * Sprint 003 D2a. Composes three JourneyCards with down-arrow connectors
 * between them, driven entirely by the editable HOME_JOURNEY_STEPS constant.
 */
import JourneyCard from './JourneyCard.jsx';
import { HOME_JOURNEY_STEPS } from '../../lib/copy/homeJourneyCopy.js';

function Connector() {
  return (
    <div
      data-testid="journey-connector"
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
      }}
    >
      <svg width="32" height="48" viewBox="0 0 32 48" fill="none">
        <line
          x1="16" y1="0" x2="16" y2="36"
          stroke="#8B3A3A" strokeWidth="3" strokeLinecap="round"
        />
        <polyline
          points="6,32 16,44 26,32"
          fill="none" stroke="#8B3A3A" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function JourneyStepper() {
  return (
    <section
      data-testid="journey-stepper"
      aria-label="Your recruiting journey"
      style={{ marginBottom: 32 }}
    >
      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#2C2C2C',
          textAlign: 'center',
          marginBottom: 24,
        }}
      >
        Your three-step recruiting journey
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        {HOME_JOURNEY_STEPS.map((step, i) => (
          <div key={step.id}>
            <JourneyCard
              stepNumber={i + 1}
              heading={step.heading}
              body={step.body}
              cta={step.cta}
              href={step.href}
            />
            {i < HOME_JOURNEY_STEPS.length - 1 && <Connector />}
          </div>
        ))}
      </div>
    </section>
  );
}
