/**
 * recruit-card.test.jsx — Sprint 011 D6
 *
 * Covers <RecruitCard> — the production card on /recruits. Distinct from
 * the frozen styleguide exemplar (PlayerCardReference). Receives a
 * pre-resolved profile shape (avatar URL already constructed by the data
 * hook); does no Supabase work itself, so tests run as pure functions.
 *
 * Critical assertions:
 *   - PII enforcement (render-layer): profiles passed in with email, phone,
 *     parent_guardian_email populated must NEVER surface those values in
 *     the rendered card text content.
 *   - Initials fallback: avatarUrl=null renders the two-letter initials
 *     derived from the profile name.
 *   - Twitter normalizer: link href is exactly https://x.com/${normalized}
 *     across all input forms; link is omitted when twitter is null/empty.
 *   - Active-interest summary: "X schools · Recruiting Progress Y%" when
 *     schoolsShortlisted > 0; "Not yet active" when 0 (locked decision 8).
 *   - Accolade chips: render exactly the slots whose boolean is true.
 *   - 2-stat grid (GPA, 40 yd) per Q1 lock; no Home State, no also-plays.
 *   - Token purity.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import RecruitCard from '../../src/components/recruits/RecruitCard.jsx';

function collect(el, predicate, acc = []) {
  if (el == null || typeof el !== 'object') return acc;
  if (predicate(el)) acc.push(el);
  const children = el.props && el.props.children;
  if (children == null) return acc;
  if (Array.isArray(children)) {
    for (const child of children) collect(child, predicate, acc);
  } else {
    collect(children, predicate, acc);
  }
  return acc;
}

function findByTestId(el, id) {
  const m = collect(el, (n) => n.props && n.props['data-testid'] === id);
  return m[0] || null;
}

function flattenText(el) {
  if (el == null) return '';
  if (typeof el === 'string' || typeof el === 'number') return String(el);
  if (Array.isArray(el)) return el.map(flattenText).join('');
  if (typeof el === 'object' && el.props) return flattenText(el.props.children);
  return '';
}

const BASE_PROFILE = {
  user_id: '00000000-0000-0000-0000-000000000001',
  name: 'Ayden Watkins',
  high_school: 'Boston College High School',
  grad_year: 2027,
  state: 'MA',
  position: 'CB',
  height: '5\'11"',
  weight: 175,
  speed_40: 4.52,
  gpa: 3.4,
  twitter: '@ayden',
  hudl_url: 'https://www.hudl.com/profile/12345',
  avatarUrl: 'https://example.com/avatar.jpg',
  expected_starter: true,
  captain: false,
  all_conference: false,
  all_state: false,
  schoolsShortlisted: 41,
  recruitingProgressPct: 32.4,
};

// ── render basics ────────────────────────────────────────────────────────

describe('RecruitCard — render', () => {
  it('does not throw with a complete profile', () => {
    expect(() => RecruitCard({ profile: BASE_PROFILE })).not.toThrow();
  });

  it('returns null when profile is null', () => {
    expect(RecruitCard({ profile: null })).toBeNull();
  });

  it('renders the rc-card root', () => {
    const el = RecruitCard({ profile: BASE_PROFILE });
    expect(findByTestId(el, 'rc-card')).not.toBeNull();
  });

  it('renders name, position line, school, class year', () => {
    const el = RecruitCard({ profile: BASE_PROFILE });
    expect(flattenText(findByTestId(el, 'rc-name'))).toBe('Ayden Watkins');
    expect(flattenText(findByTestId(el, 'rc-position'))).toContain('CB');
    expect(flattenText(findByTestId(el, 'rc-position'))).toContain('175 lbs');
    expect(flattenText(findByTestId(el, 'rc-school'))).toContain('Boston College High School');
    expect(flattenText(findByTestId(el, 'rc-tag'))).toContain('Class 2027');
  });
});

// ── PII enforcement (render-layer) ───────────────────────────────────────

describe('RecruitCard — PII enforcement (render-layer defense)', () => {
  it('does not render email, phone, or parent_guardian_email even when present on profile', () => {
    const piiBomb = {
      ...BASE_PROFILE,
      email: 'a.watkins27@students.bchigh.edu',
      phone: '9175931695',
      parent_guardian_email: 'parent@example.com',
      agi: 85000,
      dependents: 3,
      hs_lat: 42.3201,
      hs_lng: -71.0596,
      sat: 1280,
      last_login: '2026-04-29T10:00:00Z',
    };
    const el = RecruitCard({ profile: piiBomb });
    const text = flattenText(el);

    expect(text).not.toContain('a.watkins27@students.bchigh.edu');
    expect(text).not.toContain('9175931695');
    expect(text).not.toContain('parent@example.com');
    expect(text).not.toContain('85000');
    expect(text).not.toContain('1280');
    expect(text).not.toContain('42.3201');
    expect(text).not.toContain('-71.0596');
    expect(text).not.toContain('2026-04-29');
  });
});

// ── photo + initials fallback ────────────────────────────────────────────

describe('RecruitCard — photo / initials fallback', () => {
  it('renders <img> when avatarUrl is set', () => {
    const el = RecruitCard({ profile: BASE_PROFILE });
    const imgs = collect(el, (n) => n.type === 'img');
    expect(imgs.length).toBe(1);
    expect(imgs[0].props.src).toBe(BASE_PROFILE.avatarUrl);
    expect(imgs[0].props.alt).toBe('Ayden Watkins');
  });

  it('renders initials fallback when avatarUrl is null', () => {
    const el = RecruitCard({ profile: { ...BASE_PROFILE, avatarUrl: null } });
    const imgs = collect(el, (n) => n.type === 'img');
    expect(imgs).toHaveLength(0);
    expect(flattenText(findByTestId(el, 'rc-photo'))).toBe('AW');
  });

  it('initials handle single-name profiles defensively', () => {
    const el = RecruitCard({
      profile: { ...BASE_PROFILE, name: 'Cher', avatarUrl: null },
    });
    expect(flattenText(findByTestId(el, 'rc-photo'))).toBe('C');
  });

  it('initials handle 3-part names: first + last only', () => {
    const el = RecruitCard({
      profile: { ...BASE_PROFILE, name: 'Aiden Daniel McGhie', avatarUrl: null },
    });
    expect(flattenText(findByTestId(el, 'rc-photo'))).toBe('AM');
  });
});

// ── Twitter normalizer at render time ────────────────────────────────────

describe('RecruitCard — Twitter link', () => {
  it('renders link to https://x.com/${handle} when twitter is "@ayden"', () => {
    const el = RecruitCard({ profile: { ...BASE_PROFILE, twitter: '@ayden' } });
    const links = collect(el, (n) => n.type === 'a');
    const tw = links.find((a) => /x\.com/.test(a.props.href));
    expect(tw).toBeDefined();
    expect(tw.props.href).toBe('https://x.com/ayden');
    expect(tw.props.target).toBe('_blank');
    expect(tw.props.rel).toBe('noopener noreferrer');
  });

  it('normalizes a full URL (https://twitter.com/ayden) the same way', () => {
    const el = RecruitCard({
      profile: { ...BASE_PROFILE, twitter: 'https://twitter.com/ayden' },
    });
    const links = collect(el, (n) => n.type === 'a');
    const tw = links.find((a) => /x\.com/.test(a.props.href));
    expect(tw.props.href).toBe('https://x.com/ayden');
  });

  it('omits the Twitter link when twitter is null', () => {
    const el = RecruitCard({ profile: { ...BASE_PROFILE, twitter: null } });
    const links = collect(el, (n) => n.type === 'a');
    const tw = links.find((a) => /x\.com/.test(a.props.href));
    expect(tw).toBeUndefined();
  });

  it('omits the Twitter link when twitter is empty string', () => {
    const el = RecruitCard({ profile: { ...BASE_PROFILE, twitter: '' } });
    const links = collect(el, (n) => n.type === 'a');
    const tw = links.find((a) => /x\.com/.test(a.props.href));
    expect(tw).toBeUndefined();
  });
});

// ── Hudl link ────────────────────────────────────────────────────────────

describe('RecruitCard — Hudl link', () => {
  it('renders Hudl link with target=_blank rel=noopener when hudl_url is set', () => {
    const el = RecruitCard({ profile: BASE_PROFILE });
    const links = collect(el, (n) => n.type === 'a');
    const hudl = links.find((a) => /hudl/.test(a.props.href));
    expect(hudl).toBeDefined();
    expect(hudl.props.href).toBe(BASE_PROFILE.hudl_url);
    expect(hudl.props.target).toBe('_blank');
    expect(hudl.props.rel).toBe('noopener noreferrer');
  });

  it('omits the Hudl link when hudl_url is null', () => {
    const el = RecruitCard({ profile: { ...BASE_PROFILE, hudl_url: null } });
    const links = collect(el, (n) => n.type === 'a');
    const hudl = links.find((a) => a.props.href && /hudl/.test(a.props.href));
    expect(hudl).toBeUndefined();
  });
});

// ── active interest summary ──────────────────────────────────────────────

describe('RecruitCard — active interest summary', () => {
  it('renders "41 schools" + "32.4%" when shortlist count > 0', () => {
    const el = RecruitCard({ profile: BASE_PROFILE });
    const interest = findByTestId(el, 'rc-interest');
    const text = flattenText(interest);
    expect(text).toContain('41');
    expect(text).toContain('schools');
    expect(text).toContain('32.4');
  });

  it('renders "Not yet active" when shortlist count is 0 (zero-state)', () => {
    const el = RecruitCard({
      profile: {
        ...BASE_PROFILE,
        schoolsShortlisted: 0,
        recruitingProgressPct: null,
      },
    });
    const interest = findByTestId(el, 'rc-interest');
    expect(flattenText(interest)).toContain('Not yet active');
    expect(flattenText(interest)).not.toContain('0 schools');
  });

  it('singular form "1 school" when shortlist count is 1', () => {
    const el = RecruitCard({
      profile: {
        ...BASE_PROFILE,
        schoolsShortlisted: 1,
        recruitingProgressPct: 6.7,
      },
    });
    const text = flattenText(findByTestId(el, 'rc-interest'));
    expect(text).toMatch(/1\s+school\b/);
    expect(text).not.toMatch(/1\s+schools\b/);
  });
});

// ── accolade chips ───────────────────────────────────────────────────────

describe('RecruitCard — accolade chips', () => {
  it('renders zero chips when all four booleans are false', () => {
    const el = RecruitCard({
      profile: {
        ...BASE_PROFILE,
        expected_starter: false,
        captain: false,
        all_conference: false,
        all_state: false,
      },
    });
    const chips = collect(el, (n) => n.props && n.props['data-testid'] === 'rc-chip');
    expect(chips).toHaveLength(0);
  });

  it('renders zero chips when all four booleans are null', () => {
    const el = RecruitCard({
      profile: {
        ...BASE_PROFILE,
        expected_starter: null,
        captain: null,
        all_conference: null,
        all_state: null,
      },
    });
    const chips = collect(el, (n) => n.props && n.props['data-testid'] === 'rc-chip');
    expect(chips).toHaveLength(0);
  });

  it('renders four chips when all four booleans are true', () => {
    const el = RecruitCard({
      profile: {
        ...BASE_PROFILE,
        expected_starter: true,
        captain: true,
        all_conference: true,
        all_state: true,
      },
    });
    const chips = collect(el, (n) => n.props && n.props['data-testid'] === 'rc-chip');
    expect(chips).toHaveLength(4);
    const labels = chips.map(flattenText).join(' ');
    expect(labels).toContain('Expected Starter');
    expect(labels).toContain('Captain');
    expect(labels).toContain('All-Conference');
    expect(labels).toContain('All-State');
  });

  it('renders only the true ones (defaults to expected_starter only)', () => {
    const el = RecruitCard({ profile: BASE_PROFILE });
    const chips = collect(el, (n) => n.props && n.props['data-testid'] === 'rc-chip');
    expect(chips).toHaveLength(1);
    expect(flattenText(chips[0])).toContain('Expected Starter');
  });
});

// ── stats grid (Q1 lock: GPA + 40 yd, no state) ──────────────────────────

describe('RecruitCard — stats grid', () => {
  it('renders exactly 2 stat slots: GPA and 40 yd', () => {
    const el = RecruitCard({ profile: BASE_PROFILE });
    const stats = collect(el, (n) => n.props && n.props['data-testid'] === 'rc-stat');
    expect(stats).toHaveLength(2);
    const labels = stats.map((s) => flattenText(s));
    expect(labels.some((l) => /GPA/i.test(l))).toBe(true);
    expect(labels.some((l) => /40\s*yd/i.test(l))).toBe(true);
  });

  it('does not render state in the stats grid (Q1 lock)', () => {
    const el = RecruitCard({ profile: BASE_PROFILE });
    const stats = collect(el, (n) => n.props && n.props['data-testid'] === 'rc-stat');
    const labels = stats.map((s) => flattenText(s)).join(' ');
    expect(labels).not.toMatch(/Home State/i);
    expect(labels).not.toMatch(/Hometown/i);
  });

  it('renders gpa with one decimal and 40 yd as e.g. "4.52s"', () => {
    const el = RecruitCard({ profile: BASE_PROFILE });
    const stats = collect(el, (n) => n.props && n.props['data-testid'] === 'rc-stat');
    const text = stats.map(flattenText).join(' ');
    expect(text).toContain('3.4');
    expect(text).toContain('4.52');
  });
});

// ── token purity ─────────────────────────────────────────────────────────

describe('RecruitCard — token purity', () => {
  it('contains no `#xxxxxx` or `#xxx` hex color literals', () => {
    const compPath = resolve(
      __dirname,
      '../../src/components/recruits/RecruitCard.jsx'
    );
    const src = readFileSync(compPath, 'utf8');
    const matches = src.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
    expect(matches).toEqual([]);
  });
});
