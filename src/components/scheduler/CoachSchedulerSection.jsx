/**
 * CoachSchedulerSection — Sprint 012 Phase 3
 *
 * Inline scheduler section embedded in /athletes between the roster grid and
 * the footer. Phase 2 shipped the four cards + section-level Submit as a
 * no-op. Phase 3 wires Submit to the intake-log reframed write pattern
 * (EXECUTION_PLAN v5.8): plain .insert() on three tables, no .upsert(),
 * no .select() chains.
 *
 * Submit fires three sequential writes:
 *   1. supabase.from('coach_submissions').insert(coach_payload)
 *   2. supabase.from('visit_requests').insert(visit_payload)
 *   3. supabase.from('visit_request_players').insert(join_rows)
 *
 * Both parent ids are generated client-side via crypto.randomUUID() so the
 * downstream rows can FK them without needing a SELECT on the parent
 * (anon has no SELECT policy on coach_submissions or visit_requests).
 *
 * The school slug (e.g. 'bc-high') is resolved to partner_high_schools.id
 * via a SELECT at section mount; visit_requests.school_id is the resolved
 * uuid, not the slug.
 *
 * Honeypot semantics: a populated honeypot toggles to the success state
 * silently and fires zero Supabase calls — bot deception.
 */

import { useEffect, useMemo, useState } from 'react';
import { RECRUIT_SCHOOLS } from '../../data/recruits-schools.js';
import useRecruitsRoster from '../../hooks/useRecruitsRoster.js';
import { supabase } from '../../lib/supabaseClient.js';

/* ----------------------------- date helpers ----------------------------- */

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad2(n) { return n < 10 ? `0${n}` : String(n); }
function isoLocal(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function buildDates(daysAhead) {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      iso: isoLocal(d),
      dow: DOW[d.getDay()],
      day: d.getDate(),
      month: MONTHS[d.getMonth()],
    });
  }
  return out;
}
function formatDateLong(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DOW_LONG[dt.getDay()]}, ${MONTHS_LONG[dt.getMonth()]} ${dt.getDate()}`;
}

/* ----------------------------- time windows ----------------------------- */

const TIME_WINDOWS = [
  { id: 'morning', label: 'Morning', hours: '8 AM – 12 PM' },
  { id: 'midday', label: 'Midday', hours: '12 PM – 2 PM' },
  { id: 'afternoon', label: 'Afternoon', hours: '2 PM – 5 PM' },
  { id: 'evening', label: 'Evening', hours: '5 PM – 8 PM' },
  { id: 'flexible', label: 'Flexible', hours: 'Any time' },
];

/* ----------------------------- form helpers ----------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTES_MAX = 500;

function validateContact(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Required.';
  if (!values.email.trim()) {
    errors.email = 'Required.';
  } else if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!values.program.trim()) errors.program = 'Required.';
  if (values.notes.length > NOTES_MAX) {
    errors.notes = `Notes must be ${NOTES_MAX} characters or fewer.`;
  }
  return errors;
}

function initialsOf(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0] ? parts[0][0] : '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

/* ============================== STYLES ============================== */

const STYLE = `
  .scheduler-section {
    background: var(--gf-bg-deep);
    color: var(--gf-text);
    padding: var(--gf-space-3xl) var(--gf-space-xl);
    font-family: var(--gf-body);
    scroll-margin-top: 72px;
  }
  .scheduler-section-inner {
    max-width: 1280px;
    margin: 0 auto;
  }
  .scheduler-section-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--gf-accent);
    margin-bottom: var(--gf-space-md);
    text-align: center;
  }
  .scheduler-section-title {
    font-family: var(--gf-display);
    font-size: 2rem;
    font-weight: 500;
    text-align: center;
    color: var(--gf-text);
    margin-bottom: var(--gf-space-sm);
    letter-spacing: -0.01em;
  }
  .scheduler-section-sub {
    text-align: center;
    color: var(--gf-text-muted);
    font-size: 0.95rem;
    margin-bottom: var(--gf-space-xl);
  }

  /* dark-variant school pill toggle */
  .scheduler-school-toggle {
    display: flex;
    justify-content: center;
    margin-bottom: var(--gf-space-xl);
  }
  .scheduler-school-toggle-inner {
    display: inline-flex;
    background: var(--gf-bg-elev);
    border: 1px solid var(--gf-border);
    border-radius: var(--gf-radius-pill);
    padding: 4px;
    gap: 2px;
  }
  .scheduler-school-pill {
    background: transparent;
    border: none;
    padding: 0.55rem 1.1rem;
    font-family: var(--gf-body);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--gf-text-muted);
    border-radius: var(--gf-radius-pill);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    display: inline-flex;
    align-items: baseline;
    gap: var(--gf-space-xs);
  }
  .scheduler-school-pill.active {
    background: var(--gf-accent);
    color: var(--gf-text-on-accent);
  }
  .scheduler-school-pill:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
  .scheduler-school-pill-coming {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--gf-text-dim);
  }

  /* card row */
  .scheduler-card-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--gf-space-lg);
    align-items: start;
  }
  .scheduler-card-row .scheduler-card-contact {
    grid-column: 1 / -1;
  }

  .scheduler-card {
    background: var(--gf-light-bg-elev);
    border-radius: var(--gf-radius-lg);
    padding: var(--gf-space-xl);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
    color: var(--gf-light-text);
  }
  .scheduler-card-h {
    font-family: var(--gf-display);
    font-weight: 600;
    font-size: 1.25rem;
    color: var(--gf-light-text);
    margin-bottom: 4px;
  }
  .scheduler-card-sub {
    font-size: 0.85rem;
    color: var(--gf-light-text-muted);
    margin-bottom: var(--gf-space-lg);
  }
  .scheduler-card-section-h {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--gf-light-text-muted);
    margin-bottom: var(--gf-space-sm);
    margin-top: var(--gf-space-sm);
  }

  /* date card */
  .scheduler-date-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--gf-space-sm);
  }
  .scheduler-date-card {
    background: var(--gf-light-bg);
    border: 1.5px solid var(--gf-light-border);
    border-radius: var(--gf-radius-sm);
    padding: var(--gf-space-sm) 0.4rem;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    font-family: var(--gf-body);
    color: inherit;
  }
  .scheduler-date-card:hover { border-color: var(--gf-accent-deep); }
  .scheduler-date-card.selected {
    border-color: var(--gf-accent-deep);
    background: var(--gf-accent-soft);
  }
  .scheduler-date-card:focus-visible {
    outline: 2px solid var(--gf-accent-deep);
    outline-offset: 2px;
  }
  .scheduler-date-dow {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: var(--gf-light-text-muted);
  }
  .scheduler-date-day {
    font-family: var(--gf-display);
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--gf-light-text);
    line-height: 1;
    margin: 4px 0;
  }
  .scheduler-date-month {
    font-size: 0.7rem;
    color: var(--gf-light-text-muted);
  }
  .scheduler-date-nav {
    display: flex;
    justify-content: space-between;
    margin-top: var(--gf-space-md);
  }
  .scheduler-date-nav-btn {
    background: var(--gf-light-bg);
    border: 1px solid var(--gf-light-border);
    color: var(--gf-light-text-muted);
    border-radius: var(--gf-radius-sm);
    padding: var(--gf-space-xs) var(--gf-space-sm);
    font-family: var(--gf-body);
    font-size: 0.8rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .scheduler-date-nav-btn:hover:not(:disabled) {
    border-color: var(--gf-accent-deep);
    color: var(--gf-light-text);
  }
  .scheduler-date-nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .scheduler-date-show-more {
    margin-top: var(--gf-space-sm);
    background: transparent;
    border: 1px dashed var(--gf-light-border);
    color: var(--gf-light-text-muted);
    border-radius: var(--gf-radius-sm);
    padding: 0.5rem var(--gf-space-md);
    font-family: var(--gf-body);
    font-size: 0.8rem;
    cursor: pointer;
    width: 100%;
  }
  .scheduler-date-show-more:hover {
    border-color: var(--gf-accent-deep);
    color: var(--gf-light-text);
  }

  /* time card */
  .scheduler-time-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .scheduler-time-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.7rem var(--gf-space-md);
    background: var(--gf-light-bg);
    border: 1.5px solid var(--gf-light-border);
    border-radius: var(--gf-radius-sm);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    font-size: 0.9rem;
    font-family: var(--gf-body);
    color: inherit;
    text-align: left;
    width: 100%;
  }
  .scheduler-time-row:hover { border-color: var(--gf-accent-deep); }
  .scheduler-time-row.selected {
    border-color: var(--gf-accent-deep);
    background: var(--gf-accent-soft);
  }
  .scheduler-time-row:focus-visible {
    outline: 2px solid var(--gf-accent-deep);
    outline-offset: 2px;
  }
  .scheduler-time-name { color: var(--gf-light-text); font-weight: 500; }
  .scheduler-time-hours { color: var(--gf-light-text-muted); font-size: 0.85rem; }

  /* players card */
  .scheduler-players-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 320px;
    overflow-y: auto;
    padding-right: 4px;
  }
  .scheduler-players-empty,
  .scheduler-players-loading {
    padding: var(--gf-space-md);
    color: var(--gf-light-text-muted);
    text-align: center;
    font-size: 0.85rem;
  }
  .scheduler-player-row {
    display: flex;
    align-items: center;
    gap: var(--gf-space-sm);
    padding: 0.55rem 0.65rem;
    border: 1.5px solid var(--gf-light-border);
    border-radius: var(--gf-radius-sm);
    background: var(--gf-light-bg);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    font-size: 0.85rem;
    color: inherit;
    text-align: left;
    width: 100%;
  }
  .scheduler-player-row.selected {
    border-color: var(--gf-accent-deep);
    background: var(--gf-accent-soft);
  }
  .scheduler-player-row:focus-visible {
    outline: 2px solid var(--gf-accent-deep);
    outline-offset: 2px;
  }
  .scheduler-player-photo {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--gf-bg-deep);
    color: var(--gf-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--gf-display);
    font-size: 0.75rem;
    font-weight: 600;
    flex-shrink: 0;
  }
  .scheduler-player-name {
    color: var(--gf-light-text);
    font-weight: 500;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .scheduler-player-meta {
    color: var(--gf-light-text-muted);
    font-size: 0.75rem;
  }
  .scheduler-player-check {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 1.5px solid var(--gf-light-border);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 0.7rem;
  }
  .scheduler-player-row.selected .scheduler-player-check {
    background: var(--gf-accent-deep);
    border-color: var(--gf-accent-deep);
    color: var(--gf-bg-deep);
  }

  /* contact card */
  .scheduler-contact-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--gf-space-md);
  }
  .scheduler-contact-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .scheduler-contact-field-full {
    grid-column: 1 / -1;
  }
  .scheduler-contact-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--gf-light-text-muted);
  }
  .scheduler-contact-input,
  .scheduler-contact-textarea {
    background: var(--gf-light-bg);
    border: 1.5px solid var(--gf-light-border);
    border-radius: var(--gf-radius-sm);
    padding: 0.7rem var(--gf-space-md);
    font-family: var(--gf-body);
    font-size: 0.95rem;
    color: var(--gf-light-text);
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .scheduler-contact-input:focus,
  .scheduler-contact-textarea:focus {
    outline: none;
    border-color: var(--gf-accent-deep);
    box-shadow: 0 0 0 3px var(--gf-accent-soft);
  }
  .scheduler-contact-input.error,
  .scheduler-contact-textarea.error {
    border-color: #c53030;
  }
  .scheduler-contact-textarea {
    min-height: 90px;
    resize: vertical;
    font-family: var(--gf-body);
  }
  .scheduler-contact-error {
    font-size: 0.8rem;
    color: #c53030;
  }
  .scheduler-contact-counter {
    font-size: 0.75rem;
    color: var(--gf-light-text-muted);
    text-align: right;
  }
  .scheduler-honeypot {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }

  /* submitting state — mute the cards while writes are in flight */
  .scheduler-card-row.submitting {
    opacity: 0.55;
    pointer-events: none;
  }

  /* error banner */
  .scheduler-error-banner {
    background: #fff5f5;
    border: 1px solid #fed7d7;
    border-left: 3px solid #c53030;
    border-radius: var(--gf-radius-sm);
    padding: var(--gf-space-md) var(--gf-space-lg);
    margin: var(--gf-space-xl) auto 0 auto;
    max-width: 640px;
    color: #742a2a;
    font-size: 0.9rem;
    text-align: center;
  }

  /* success panel — replaces the four cards on confirmed submit */
  .scheduler-success-panel {
    background: var(--gf-light-bg-elev);
    color: var(--gf-light-text);
    border-radius: var(--gf-radius-lg);
    padding: var(--gf-space-2xl) var(--gf-space-xl);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
    text-align: center;
    max-width: 640px;
    margin: 0 auto;
  }
  .scheduler-success-h {
    font-family: var(--gf-display);
    font-weight: 600;
    font-size: 1.5rem;
    color: var(--gf-light-text);
    margin-bottom: var(--gf-space-md);
  }
  .scheduler-success-body {
    color: var(--gf-light-text-muted);
    font-size: 1rem;
    line-height: 1.55;
  }
  .scheduler-success-body strong {
    color: var(--gf-light-text);
    font-weight: 600;
  }

  /* submit row */
  .scheduler-submit-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--gf-space-sm);
    margin-top: var(--gf-space-2xl);
  }
  .scheduler-submit-btn {
    background: var(--gf-accent);
    color: var(--gf-text-on-accent);
    border: none;
    padding: 1rem 2.5rem;
    border-radius: var(--gf-radius-pill);
    font-family: var(--gf-body);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    box-shadow: var(--gf-shadow-glow);
    transition: background 0.15s, transform 0.1s, opacity 0.15s, box-shadow 0.2s;
  }
  .scheduler-submit-btn:hover:not(:disabled) {
    background: var(--gf-accent-hover);
    transform: translateY(-1px);
  }
  .scheduler-submit-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
  .scheduler-submit-hint {
    font-size: 0.85rem;
    color: var(--gf-text-muted);
    min-height: 1.2em;
  }

  @media (max-width: 768px) {
    .scheduler-section {
      padding: var(--gf-space-2xl) var(--gf-space-md);
    }
    .scheduler-section-title {
      font-size: 1.6rem;
    }
    .scheduler-card-row {
      grid-template-columns: 1fr;
    }
    .scheduler-card {
      padding: var(--gf-space-lg);
    }
    .scheduler-date-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .scheduler-contact-grid {
      grid-template-columns: 1fr;
    }
    .scheduler-submit-btn {
      width: 100%;
      min-height: 48px;
    }
  }
`;

/* ============================== SUB-COMPONENTS ============================== */

function SchedulerSchoolToggle({ activeSlug, onChange }) {
  return (
    <div className="scheduler-school-toggle">
      <div className="scheduler-school-toggle-inner" role="group" aria-label="Pick a partner school">
        {RECRUIT_SCHOOLS.map((school) => {
          const isActive = school.slug === activeSlug;
          const isDisabled = !school.active;
          return (
            <button
              key={school.slug}
              type="button"
              className={`scheduler-school-pill${isActive ? ' active' : ''}`}
              disabled={isDisabled}
              aria-pressed={isActive ? 'true' : 'false'}
              onClick={isDisabled ? undefined : () => onChange(school.slug)}
            >
              <span>{school.label}</span>
              {isDisabled && school.comingMonth && (
                <span className="scheduler-school-pill-coming">
                  (coming {school.comingMonth})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DateCard({ selectedDate, onSelect }) {
  const [extended, setExtended] = useState(false);
  const [offset, setOffset] = useState(0);
  const dataset = useMemo(() => buildDates(extended ? 180 : 60), [extended]);
  const visible = dataset.slice(offset, offset + 6);
  const canEarlier = offset > 0;
  const canLater = offset + 6 < dataset.length;

  return (
    <div className="scheduler-card" data-testid="scheduler-date-card">
      <div className="scheduler-card-h">Pick a date</div>
      <div className="scheduler-card-sub">Showing valid contact period dates only.</div>
      <div className="scheduler-card-section-h">Available dates</div>

      <div className="scheduler-date-grid" role="listbox" aria-label="Available dates">
        {visible.map((d) => {
          const isSelected = d.iso === selectedDate;
          return (
            <button
              key={d.iso}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-testid={`scheduler-date-${d.iso}`}
              className={`scheduler-date-card${isSelected ? ' selected' : ''}`}
              onClick={() => onSelect(d.iso)}
            >
              <div className="scheduler-date-dow">{d.dow}</div>
              <div className="scheduler-date-day">{d.day}</div>
              <div className="scheduler-date-month">{d.month}</div>
            </button>
          );
        })}
      </div>

      <div className="scheduler-date-nav">
        <button
          type="button"
          className="scheduler-date-nav-btn"
          disabled={!canEarlier}
          onClick={() => setOffset((o) => Math.max(0, o - 6))}
        >
          ← Earlier
        </button>
        <button
          type="button"
          className="scheduler-date-nav-btn"
          disabled={!canLater}
          onClick={() => setOffset((o) => Math.min(dataset.length - 6, o + 6))}
        >
          Later →
        </button>
      </div>

      {!extended && (
        <button
          type="button"
          className="scheduler-date-show-more"
          onClick={() => setExtended(true)}
        >
          Show more dates (out to 180 days)
        </button>
      )}
    </div>
  );
}

function TimeCard({ selectedDate, selectedTimeWindow, onSelect }) {
  const sub = selectedDate
    ? formatDateLong(selectedDate)
    : 'Pick a date first to see context.';
  return (
    <div className="scheduler-card" data-testid="scheduler-time-card">
      <div className="scheduler-card-h">Pick a time window</div>
      <div className="scheduler-card-sub">{sub}</div>
      <div className="scheduler-card-section-h">Time windows</div>

      <div className="scheduler-time-list" role="listbox" aria-label="Time windows">
        {TIME_WINDOWS.map((w) => {
          const isSelected = w.id === selectedTimeWindow;
          return (
            <button
              key={w.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-testid={`scheduler-time-${w.id}`}
              className={`scheduler-time-row${isSelected ? ' selected' : ''}`}
              onClick={() => onSelect(w.id)}
            >
              <span className="scheduler-time-name">{w.label}</span>
              <span className="scheduler-time-hours">{w.hours}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlayersCard({ schoolLabel, profiles, loading, error, selectedPlayerIds, onToggle }) {
  const togglePlayer = (id) => {
    const next = selectedPlayerIds.includes(id)
      ? selectedPlayerIds.filter((p) => p !== id)
      : [...selectedPlayerIds, id];
    onToggle(next);
  };

  return (
    <div className="scheduler-card" data-testid="scheduler-players-card">
      <div className="scheduler-card-h">Select players</div>
      <div className="scheduler-card-sub">{selectedPlayerIds.length} selected</div>
      <div className="scheduler-card-section-h">{schoolLabel} roster</div>

      <div className="scheduler-players-list">
        {loading && (
          <div className="scheduler-players-loading">Loading roster…</div>
        )}
        {error && !loading && (
          <div className="scheduler-players-empty">
            Couldn't load roster. {error.message ? `(${error.message})` : ''}
          </div>
        )}
        {!loading && !error && profiles.length === 0 && (
          <div className="scheduler-players-empty">No athletes available yet.</div>
        )}
        {!loading && !error && profiles.map((p) => {
          const isSelected = selectedPlayerIds.includes(p.user_id);
          return (
            <button
              key={p.user_id}
              type="button"
              data-testid={`scheduler-player-${p.user_id}`}
              className={`scheduler-player-row${isSelected ? ' selected' : ''}`}
              aria-pressed={isSelected ? 'true' : 'false'}
              onClick={() => togglePlayer(p.user_id)}
            >
              <span className="scheduler-player-photo" aria-hidden="true">
                {initialsOf(p.name)}
              </span>
              <span className="scheduler-player-name">
                <span>{p.name}</span>
                <span className="scheduler-player-meta">
                  {[p.position, p.grad_year].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="scheduler-player-check" aria-hidden="true">
                {isSelected ? '✓' : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ContactCard({ values, errors, touched, onField, onBlur }) {
  const showError = (field) => touched[field] && errors[field];
  return (
    <div
      className="scheduler-card scheduler-card-contact"
      data-testid="scheduler-contact-card"
    >
      <div className="scheduler-card-h">Your contact info</div>
      <div className="scheduler-card-sub">We'll send the calendar invite to this email.</div>

      <div className="scheduler-contact-grid">
        <div className="scheduler-contact-field">
          <label className="scheduler-contact-label" htmlFor="cs-name">Your name *</label>
          <input
            id="cs-name"
            data-testid="scheduler-contact-name"
            className={`scheduler-contact-input${showError('name') ? ' error' : ''}`}
            type="text"
            value={values.name}
            onChange={(e) => onField('name', e.target.value)}
            onBlur={() => onBlur('name')}
            autoComplete="name"
          />
          {showError('name') && (
            <span className="scheduler-contact-error">{errors.name}</span>
          )}
        </div>

        <div className="scheduler-contact-field">
          <label className="scheduler-contact-label" htmlFor="cs-email">Email address *</label>
          <input
            id="cs-email"
            data-testid="scheduler-contact-email"
            className={`scheduler-contact-input${showError('email') ? ' error' : ''}`}
            type="email"
            value={values.email}
            onChange={(e) => onField('email', e.target.value)}
            onBlur={() => onBlur('email')}
            autoComplete="email"
          />
          {showError('email') && (
            <span className="scheduler-contact-error">{errors.email}</span>
          )}
        </div>

        <div className="scheduler-contact-field">
          <label className="scheduler-contact-label" htmlFor="cs-program">College or program *</label>
          <input
            id="cs-program"
            data-testid="scheduler-contact-program"
            className={`scheduler-contact-input${showError('program') ? ' error' : ''}`}
            type="text"
            value={values.program}
            onChange={(e) => onField('program', e.target.value)}
            onBlur={() => onBlur('program')}
            autoComplete="organization"
          />
          {showError('program') && (
            <span className="scheduler-contact-error">{errors.program}</span>
          )}
        </div>

        <div className="scheduler-contact-field scheduler-contact-field-full">
          <label className="scheduler-contact-label" htmlFor="cs-notes">Notes (optional)</label>
          <textarea
            id="cs-notes"
            data-testid="scheduler-contact-notes"
            className={`scheduler-contact-textarea${showError('notes') ? ' error' : ''}`}
            value={values.notes}
            onChange={(e) => onField('notes', e.target.value)}
            onBlur={() => onBlur('notes')}
            maxLength={NOTES_MAX + 50}
          />
          <div className="scheduler-contact-counter">{values.notes.length} / {NOTES_MAX}</div>
          {showError('notes') && (
            <span className="scheduler-contact-error">{errors.notes}</span>
          )}
        </div>

        {/* Honeypot — invisible to humans, visible to bots */}
        <div className="scheduler-honeypot" aria-hidden="true">
          <label htmlFor="cs-website">Website (leave blank)</label>
          <input
            id="cs-website"
            data-testid="scheduler-contact-honeypot"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.honeypot}
            onChange={(e) => onField('honeypot', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================== ROOT ============================== */

export default function CoachSchedulerSection() {
  const initialActive = RECRUIT_SCHOOLS.find((s) => s.active) || RECRUIT_SCHOOLS[0];
  const [selectedSchool, setSelectedSchool] = useState(initialActive.slug);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    program: '',
    notes: '',
    honeypot: '',
  });
  const [touched, setTouched] = useState({});

  // Phase 3: resolve the selected school's slug to partner_high_schools.id.
  // Anon SELECT is granted on partner_high_schools per migration 0039.
  // visit_requests.school_id requires the uuid, not the slug.
  const [partnerSchoolId, setPartnerSchoolId] = useState(null);
  const [partnerSchoolLoadError, setPartnerSchoolLoadError] = useState(null);

  // Phase 3: submit lifecycle.
  const [submitState, setSubmitState] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [submitError, setSubmitError] = useState(null);
  // Snapshot of submission identity for the success panel — preserves the
  // values even if the user edits the form again post-success (defensive).
  const [confirmation, setConfirmation] = useState(null);

  const submitting = submitState === 'submitting';

  const activeSchool = RECRUIT_SCHOOLS.find((s) => s.slug === selectedSchool);
  const { profiles, loading, error } = useRecruitsRoster({
    filter: activeSchool && activeSchool.active ? activeSchool.filter : null,
  });

  // Resolve partner_high_schools.id whenever the selected school changes.
  useEffect(() => {
    let cancelled = false;
    setPartnerSchoolId(null);
    setPartnerSchoolLoadError(null);
    if (!selectedSchool) return undefined;

    (async () => {
      const { data, error: fetchErr } = await supabase
        .from('partner_high_schools')
        .select('id')
        .eq('slug', selectedSchool)
        .limit(1);
      if (cancelled) return;
      if (fetchErr) {
        setPartnerSchoolLoadError(fetchErr);
        return;
      }
      if (!data || data.length === 0) {
        setPartnerSchoolLoadError(new Error('Partner school not found.'));
        return;
      }
      setPartnerSchoolId(data[0].id);
    })();

    return () => { cancelled = true; };
  }, [selectedSchool]);

  // Reset player selection when the school changes — different roster.
  const handleSchoolChange = (slug) => {
    setSelectedSchool(slug);
    setSelectedPlayerIds([]);
  };

  const setField = (field, v) => setContactForm((prev) => ({ ...prev, [field]: v }));
  const markTouched = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const errors = useMemo(() => validateContact(contactForm), [contactForm]);
  const contactValid = Object.keys(errors).length === 0;
  const honeypotEmpty = contactForm.honeypot === '';
  const ready =
    Boolean(selectedDate) &&
    Boolean(selectedTimeWindow) &&
    selectedPlayerIds.length > 0 &&
    contactValid &&
    honeypotEmpty &&
    Boolean(partnerSchoolId) &&
    !submitting;

  let hint = '';
  if (submitting) hint = 'Sending…';
  else if (!selectedDate) hint = 'Pick a date to continue.';
  else if (!selectedTimeWindow) hint = 'Pick a time window.';
  else if (selectedPlayerIds.length === 0) hint = 'Select at least one player.';
  else if (!contactValid) hint = 'Complete the contact form.';
  else if (!partnerSchoolId) {
    hint = partnerSchoolLoadError
      ? "Couldn't load school info — please retry."
      : 'Loading school info…';
  } else hint = 'Ready to send.';

  const handleSubmit = async () => {
    if (submitting) return;

    // Honeypot tripped — silent no-op, deceive the bot with success UI.
    if (contactForm.honeypot !== '') {
      setConfirmation({
        name: contactForm.name,
        email: contactForm.email,
        schoolLabel: (activeSchool && activeSchool.label) || '',
      });
      setSubmitState('success');
      return;
    }

    if (!ready) return;

    setSubmitState('submitting');
    setSubmitError(null);

    try {
      const submissionId = crypto.randomUUID();
      const visitRequestId = crypto.randomUUID();

      // 1. Append the coach intake event.
      // Plain .insert() — no .upsert() (DF-5 reframe), no .select() chain
      // (Phase 1 retro 3a; anon has no SELECT policy on coach_submissions).
      const { error: submissionErr } = await supabase
        .from('coach_submissions')
        .insert({
          id: submissionId,
          name: contactForm.name.trim(),
          email: contactForm.email.trim(),
          program: contactForm.program.trim(),
          source: 'scheduler',
          submitter_verified: false,
        });
      if (submissionErr) throw submissionErr;

      // 2. Append the visit request event, FK to the coach_submissions row.
      const { error: visitErr } = await supabase
        .from('visit_requests')
        .insert({
          id: visitRequestId,
          coach_submission_id: submissionId,
          school_id: partnerSchoolId,
          requested_date: selectedDate,
          time_window: selectedTimeWindow,
          notes: contactForm.notes.trim() || null,
          status: 'pending',
        });
      if (visitErr) throw visitErr;

      // 3. Bulk insert the player join rows, FK to the visit_requests row.
      if (selectedPlayerIds.length > 0) {
        const joinRows = selectedPlayerIds.map((uid) => ({
          visit_request_id: visitRequestId,
          player_id: uid,
        }));
        const { error: playersErr } = await supabase
          .from('visit_request_players')
          .insert(joinRows);
        if (playersErr) throw playersErr;
      }

      setConfirmation({
        name: contactForm.name.trim(),
        email: contactForm.email.trim(),
        schoolLabel: (activeSchool && activeSchool.label) || '',
      });
      setSubmitState('success');
    } catch (err) {
      setSubmitError((err && err.message) || 'Submission failed. Please try again.');
      setSubmitState('error');
    }
  };

  const isSuccess = submitState === 'success';

  return (
    <section
      id="coach-scheduler-section"
      data-testid="coach-scheduler-section"
      className="scheduler-section"
    >
      <style>{STYLE}</style>
      <div className="scheduler-section-inner">
        <div className="scheduler-section-label">Scheduler · 4 Steps</div>
        <h3 className="scheduler-section-title">How to schedule a drop-in</h3>
        <p className="scheduler-section-sub">
          Date → Time window → Player selection → Contact info.
        </p>

        {!isSuccess && (
          <SchedulerSchoolToggle
            activeSlug={selectedSchool}
            onChange={handleSchoolChange}
          />
        )}

        {isSuccess ? (
          <div
            className="scheduler-success-panel"
            data-testid="scheduler-success-panel"
            role="status"
            aria-live="polite"
          >
            <div className="scheduler-success-h">
              Thanks, {confirmation.name || 'coach'}!
            </div>
            <p className="scheduler-success-body">
              Your drop-in request has been received. The{' '}
              <strong>{confirmation.schoolLabel}</strong> coaching staff will
              follow up at <strong>{confirmation.email}</strong> to confirm the
              date and time.
            </p>
          </div>
        ) : (
          <>
            <div
              className={`scheduler-card-row${submitting ? ' submitting' : ''}`}
              aria-busy={submitting ? 'true' : 'false'}
            >
              <DateCard
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
              />
              <TimeCard
                selectedDate={selectedDate}
                selectedTimeWindow={selectedTimeWindow}
                onSelect={setSelectedTimeWindow}
              />
              <PlayersCard
                schoolLabel={(activeSchool && activeSchool.label) || ''}
                profiles={profiles}
                loading={loading}
                error={error}
                selectedPlayerIds={selectedPlayerIds}
                onToggle={setSelectedPlayerIds}
              />
              <ContactCard
                values={contactForm}
                errors={errors}
                touched={touched}
                onField={setField}
                onBlur={markTouched}
              />
            </div>

            {submitState === 'error' && submitError && (
              <div
                className="scheduler-error-banner"
                data-testid="scheduler-error-banner"
                role="alert"
              >
                {submitError}
              </div>
            )}

            <div className="scheduler-submit-wrap">
              <button
                type="button"
                data-testid="scheduler-submit"
                className="scheduler-submit-btn"
                disabled={!ready}
                onClick={handleSubmit}
              >
                {submitting ? 'Sending…' : 'Submit drop-in request'}
              </button>
              <div className="scheduler-submit-hint" data-testid="scheduler-submit-hint">
                {hint}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
