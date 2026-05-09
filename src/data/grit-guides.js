/**
 * grit-guides.js — Sprint 022 E1 config
 *
 * Canonical mapping from studentEmail (lowercased) → published Grit Guide
 * URLs on app.grittyfb.com/recruits/[lastNameSlug]. One entry per student;
 * each entry can have multiple guides (home + future variants).
 *
 * Timelines are not published as standalone guides. The home guide embeds
 * a link to the timeline view. See Sprint 022 hotfix.
 *
 * The `type` field is preserved on each guide for forward compatibility,
 * but only `"home"` is in active use.
 *
 * Lifecycle: Build-time. Updates require git commit + Vercel deploy.
 *
 * Adding a new student:
 *   - Append an entry keyed by lowercased email.
 *   - publishedAt is the canonical first-publish date for that guide,
 *     captured from the grittos-guides repo via:
 *       git log --diff-filter=A --follow --format=%aI -- <path>
 *     If the source path is gitignored, fall back to file mtime and note
 *     it in the commit message.
 *
 * URL convention:
 *   home guide:    https://app.grittyfb.com/recruits/[lastNameSlug]
 *   timeline guide: https://app.grittyfb.com/recruits/[lastNameSlug]/timeline
 */

export const GRIT_GUIDES = [
  {
    studentEmail: 'monteiroky@belmonthill.org',
    studentName: 'Ky-Mani Monteiro',
    schoolSlug: 'belmont-hill',
    lastNameSlug: 'monteiro',
    guides: [
      {
        title: 'Recruiting Guide',
        url: 'https://app.grittyfb.com/recruits/monteiro',
        publishedAt: '2026-04-25T20:04:33-04:00',
        type: 'home',
      },
    ],
  },
  {
    studentEmail: 'copelandul@belmonthill.org',
    studentName: 'Ricky Copeland',
    schoolSlug: 'belmont-hill',
    lastNameSlug: 'rcopeland',
    guides: [
      {
        title: 'Recruiting Guide',
        // Source path rcopeland/local/rcopeland/index.html is gitignored
        // in grittos-guides; publishedAt below is file mtime fallback,
        // not git authoritative. See sprint-022 commit message.
        url: 'https://app.grittyfb.com/recruits/rcopeland',
        publishedAt: '2026-05-06T15:58:47-04:00',
        type: 'home',
      },
    ],
  },
];

/**
 * findGuidesByEmail — returns the GRIT_GUIDES entry for a given email
 * (case-insensitive), or null if no match. Used by the student view.
 */
export function findGuidesByEmail(email) {
  if (!email) return null;
  const lower = email.toLowerCase();
  return GRIT_GUIDES.find(g => g.studentEmail === lower) || null;
}

/**
 * filterGuidesByEmails — returns a flat list of { entry, guide } pairs
 * for all guides whose studentEmail is in the given email list. Used by
 * the coach/counselor aggregate view. Sorted by publishedAt DESC.
 */
export function filterGuidesByEmails(emails) {
  if (!Array.isArray(emails) || emails.length === 0) return [];
  const lowerSet = new Set(emails.map(e => (e || '').toLowerCase()).filter(Boolean));
  const out = [];
  for (const entry of GRIT_GUIDES) {
    if (!lowerSet.has(entry.studentEmail)) continue;
    for (const guide of entry.guides) {
      out.push({ entry, guide });
    }
  }
  out.sort((a, b) => (b.guide.publishedAt || '').localeCompare(a.guide.publishedAt || ''));
  return out;
}
