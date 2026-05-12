import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient.js';

/**
 * Phase 1: Channel & School (Sprint 025 Phase 5).
 *
 * Renders:
 *   - Email / Twitter DM channel toggle (pill group). Omitted entirely for
 *     scenarios whose channel_pattern is "twitter-public" (Scenario 1).
 *   - School picker with two states:
 *       State A — <select> over the student's shortlist plus a sentinel
 *                 "— Other school not in my shortlist —".
 *       State B — Inline typeahead against public.schools (662 rows). Picking
 *                 a row collapses back to State A with the chosen school
 *                 appended above the sentinel (session-only — does NOT mutate
 *                 the persisted shortlist).
 *
 * Operator decision (Sprint 025): inline typeahead, no modal, no library;
 * debounce ~150ms, ≤20 results visible, full ARIA combobox semantics.
 *
 * Props:
 *   - scenario             — current ScenarioTemplate (channel_pattern read).
 *   - channel              — "email" | "twitter" | null.
 *   - onChannelChange      — (channel) => void.
 *   - school               — { unitid, school_name, type } | null.
 *   - onSchoolChange       — (school) => void.
 *   - shortlist            — Array<{ unitid, school_name, type }> | undefined.
 */

const OTHER_SENTINEL = '__other__';
const DEBOUNCE_MS = 150;
const MAX_RESULTS = 20;

export default function Phase1Channel({
  scenario,
  channel,
  onChannelChange,
  school,
  onSchoolChange,
  shortlist,
}) {
  const showChannelToggle = scenario?.channel_pattern !== 'twitter-public';

  // Session-only extras: schools picked via typeahead this session that were
  // not in the persisted shortlist. Appended above the "Other" sentinel.
  const [extras, setExtras] = useState([]);

  const baseList = useMemo(() => {
    const list = Array.isArray(shortlist) ? [...shortlist] : [];
    // Dedupe extras by unitid in case the user picks the same school twice.
    const seen = new Set(list.map((s) => s.unitid));
    for (const x of extras) {
      if (!seen.has(x.unitid)) {
        list.push(x);
        seen.add(x.unitid);
      }
    }
    return list;
  }, [shortlist, extras]);

  // Typeahead state — visible only when user explicitly picks "Other".
  const [typeaheadOpen, setTypeaheadOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const listboxId = useRef(`cmg-p1-typeahead-${Math.random().toString(36).slice(2, 8)}`).current;

  // Debounced Supabase query.
  useEffect(() => {
    if (!typeaheadOpen) return undefined;
    const q = query.trim();
    if (q.length === 0) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('unitid, school_name, type')
        .ilike('school_name', `%${q}%`)
        .limit(MAX_RESULTS);
      if (!error) {
        setResults(data || []);
        setActiveIdx(-1);
      }
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, typeaheadOpen]);

  function handleSelectChange(e) {
    const val = e.target.value;
    if (val === OTHER_SENTINEL) {
      setTypeaheadOpen(true);
      setQuery('');
      setResults([]);
      return;
    }
    if (val === '') {
      onSchoolChange?.(null);
      return;
    }
    const unitid = Number(val);
    const found = baseList.find((s) => s.unitid === unitid);
    if (found) onSchoolChange?.(found);
  }

  function pickResult(row) {
    setExtras((prev) => (prev.some((s) => s.unitid === row.unitid) ? prev : [...prev, row]));
    onSchoolChange?.(row);
    setTypeaheadOpen(false);
    setQuery('');
    setResults([]);
    setActiveIdx(-1);
  }

  function handleTypeaheadKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && activeIdx < results.length) {
        e.preventDefault();
        pickResult(results[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setTypeaheadOpen(false);
      setQuery('');
      setResults([]);
      setActiveIdx(-1);
    }
  }

  const selectValue = school?.unitid != null ? String(school.unitid) : '';
  const trimmed = query.trim();

  return (
    <section className="cmg-phase" data-phase="1" aria-label="Channel and school">
      <h3 className="cmg-phase-heading">Channel &amp; School</h3>

      {showChannelToggle && (
        <div className="cmg-p1-field">
          <label className="cmg-p1-label">Send as</label>
          <div className="cmg-p1-channel-toggle" role="group" aria-label="Channel">
            <button
              type="button"
              className={`cmg-p1-channel-btn${channel === 'email' ? ' is-active' : ''}`}
              aria-pressed={channel === 'email'}
              onClick={() => onChannelChange?.('email')}
            >
              Email
            </button>
            <button
              type="button"
              className={`cmg-p1-channel-btn${channel === 'twitter' ? ' is-active' : ''}`}
              aria-pressed={channel === 'twitter'}
              onClick={() => onChannelChange?.('twitter')}
            >
              Twitter DM
            </button>
          </div>
        </div>
      )}

      <div className="cmg-p1-field">
        <label className="cmg-p1-label" htmlFor="cmg-p1-school-select">
          School
        </label>
        {!typeaheadOpen && (
          <>
            <select
              id="cmg-p1-school-select"
              className="cmg-p1-school-select"
              value={selectValue === '' && school == null ? '' : selectValue}
              onChange={handleSelectChange}
            >
              <option value="">— Select a school —</option>
              {baseList.map((s) => (
                <option key={s.unitid} value={s.unitid}>
                  {s.school_name}
                  {s.type ? ` (${s.type})` : ''}
                </option>
              ))}
              <option value={OTHER_SENTINEL}>— Other school not in my shortlist —</option>
            </select>
            <div className="cmg-p1-help">
              Defaults to schools currently in your shortlist.
            </div>
          </>
        )}

        {typeaheadOpen && (
          <div className="cmg-p1-typeahead">
            <input
              type="text"
              className="cmg-p1-typeahead-input"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                activeIdx >= 0 ? `${listboxId}-opt-${activeIdx}` : undefined
              }
              placeholder="Search all 662 schools…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleTypeaheadKey}
              autoFocus
            />
            {trimmed.length === 0 && (
              <div className="cmg-p1-typeahead-hint">Type to search 662 schools…</div>
            )}
            {trimmed.length > 0 && loading && (
              <div className="cmg-p1-typeahead-hint">Searching…</div>
            )}
            {trimmed.length > 0 && !loading && results.length === 0 && (
              <div className="cmg-p1-typeahead-hint">No matches.</div>
            )}
            {results.length > 0 && (
              <ul
                id={listboxId}
                role="listbox"
                className="cmg-p1-typeahead-list"
              >
                {results.map((row, idx) => (
                  <li
                    key={row.unitid}
                    id={`${listboxId}-opt-${idx}`}
                    role="option"
                    aria-selected={activeIdx === idx}
                    className={`cmg-p1-typeahead-row${activeIdx === idx ? ' is-active' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickResult(row);
                    }}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <span className="cmg-p1-typeahead-name">{row.school_name}</span>
                    {row.type && (
                      <span className="cmg-p1-typeahead-type">{row.type}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="cmg-p1-typeahead-cancel"
              onClick={() => {
                setTypeaheadOpen(false);
                setQuery('');
                setResults([]);
                setActiveIdx(-1);
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
