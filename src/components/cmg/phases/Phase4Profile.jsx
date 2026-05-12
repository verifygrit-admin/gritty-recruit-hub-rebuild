/**
 * Phase 4: Your Profile (read-only auto-fill display).
 *
 * Sprint 025 Phase 5 implementation. Renders the ten profile fields that
 * the CMG auto-fills from `public.profiles` for the authenticated student.
 *
 * Per DESIGN_NOTES.md D3.2, fields use the theme-invariant auto-fill visual
 * treatment (sand-tinted background `--autofill-bg`, sand-tinted border
 * `--autofill-edge`, dark-sand text `--autofill-text`). An "auto-filled"
 * badge in the section heading signals the source. Field values render as
 * non-interactive read-only display — edits happen on the Profile page,
 * not here.
 *
 * Field column-mapping (prototype lines 1140–1198):
 *   name        → "Name"
 *   grad_year   → "Grad Year"
 *   position    → "Position"
 *   high_school → "High School"
 *   state       → "State"
 *   gpa         → "GPA"            (operator-locked label; not "CGPA")
 *   height      → "Height"
 *   weight      → "Weight"
 *   hudl_url    → "Hudl Film"      (clickable when present)
 *   twitter     → "Twitter / X"    (clickable when present)
 *
 * Null handling: missing profile or empty field renders as a muted "—".
 */

import { Link } from 'react-router-dom';

const FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'grad_year', label: 'Grad Year' },
  { key: 'position', label: 'Position' },
  { key: 'high_school', label: 'High School' },
  { key: 'state', label: 'State' },
  { key: 'gpa', label: 'GPA' },
  { key: 'height', label: 'Height' },
  { key: 'weight', label: 'Weight' },
  { key: 'hudl_url', label: 'Hudl Film', isLink: true },
  { key: 'twitter', label: 'Twitter / X', isLink: true },
];

const EMPTY = '—'; // em-dash

function hasValue(raw) {
  if (raw === null || raw === undefined) return false;
  if (typeof raw === 'string' && raw.trim() === '') return false;
  return true;
}

function renderValue(field, raw) {
  if (!hasValue(raw)) {
    return <span className="cmg-p4-value cmg-p4-value--empty" aria-label="Not set">{EMPTY}</span>;
  }
  if (field.isLink) {
    const href = String(raw).trim();
    return (
      <a
        className="cmg-p4-value cmg-p4-value--link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {href}
      </a>
    );
  }
  return <span className="cmg-p4-value">{String(raw)}</span>;
}

export default function Phase4Profile({ profile }) {
  const profileObj = profile || {};

  return (
    <section className="cmg-phase" data-phase="4" aria-label="Your profile">
      <div className="cmg-p4-header">
        <h3 className="cmg-phase-heading">Your Profile</h3>
        <span className="cmg-p4-badge" aria-label="Auto-filled from your profile">
          auto-filled
        </span>
      </div>

      <dl className="cmg-p4-grid">
        {FIELDS.map((field) => {
          const fieldId = `cmg-p4-${field.key}`;
          return (
            <div key={field.key} className="cmg-p4-field" data-field={field.key}>
              <dt className="cmg-p4-label" id={fieldId}>{field.label}</dt>
              <dd className="cmg-p4-dd" aria-labelledby={fieldId}>
                {renderValue(field, profileObj[field.key])}
              </dd>
            </div>
          );
        })}
      </dl>

      <p className="cmg-p4-help">
        Need to update your profile?{' '}
        <Link to="/profile" className="cmg-p4-help-link">
          Edit it in My Profile.
        </Link>
      </p>
    </section>
  );
}
