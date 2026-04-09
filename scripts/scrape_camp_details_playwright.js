/**
 * scrape_camp_details_playwright.js
 *
 * Node Playwright camp details scraper (Objective 4, Session 016, DEC-CFBRB-090).
 *
 * Purpose:
 *   Node rewrite of scrape_camp_details_playwright.py. Replaces the WebFetch-based
 *   camp scraper that failed on 14/16 schools due to JS-rendered content
 *   (TotalCamps, SideArm, ABC Sports Camps, Wix, etc.). Uses headless Chromium
 *   via @playwright/test (already installed for the e2e suite) to execute page
 *   JS before extraction — zero new install burden vs the Python path.
 *
 * Spec:
 *   C:/Users/chris/dev/_org/specs/gritty-recruit-hub-rebuild/
 *     2026-04-07_spec_scraper-coach-contact-camp-data_DEC-CFBRB-090.md
 *
 * Scope (pilot):
 *   17 Division III schools hardcoded below (Scout-provided list for Session 016
 *   Objective 4 pilot). Scraper reads prospect_camp_link from Supabase per
 *   unitid via PostgREST (supabase-js), opens each URL in headless Chromium,
 *   extracts camp details, and appends to CSV.
 *
 * Currency rule (per spec):
 *   Only 2025 or 2026 camps retained. Any camp dated 2024 or earlier is dropped.
 *   If a page offers no date at all, it is logged as CAMP_DATA_ABSENT.
 *
 * Output (writes only — no Supabase writes):
 *   extracted/camp_details_pilot.csv   — append, one row per camp
 *   extracted/scraper_failure_log.csv  — append, one row per failure
 *
 * Dedup key:
 *   unitid + event_type + event_date. Prevents duplicate rows on re-runs.
 *
 * Timeout / retry:
 *   30 second per-page timeout. One retry on nav timeout before logging failure.
 *
 * Usage:
 *   node scripts/scrape_camp_details_playwright.js
 *
 * NO Supabase writes. NO coach scraper changes. NO Layer 2 navigation (deferred).
 */

import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';
import { readFileSync, existsSync, appendFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const EXTRACTED_DIR = resolve(PROJECT_ROOT, 'extracted');
const CAMP_CSV = resolve(EXTRACTED_DIR, 'camp_details_pilot.csv');
const FAILURE_CSV = resolve(EXTRACTED_DIR, 'scraper_failure_log.csv');

dotenvConfig({ path: resolve(PROJECT_ROOT, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

// Pilot unitids — Scout-provided 17 DIII schools for Session 016 Objective 4.
// Bowdoin is 161004 (Scout-corrected from prior 160004 typo).
const PILOT_UNITIDS = [
  168528, // Adrian College
  210571, // Albright College
  188641, // Alfred University
  210669, // Allegheny College
  168591, // Alma College
  164465, // Amherst College
  173045, // Augsburg University
  143084, // Augustana College
  143118, // Aurora University
  231420, // Averett University
  201195, // Baldwin Wallace University
  160977, // Bates College
  175421, // Belhaven University
  238333, // Beloit College
  145619, // Benedictine University (may be NULL — Patch NULL pass in parallel)
  139144, // Berry College
  161004, // Bowdoin College (corrected unitid)
];

// CSV schema — must match existing camp_details_pilot.csv header exactly.
const CAMP_FIELDS = [
  'unitid',
  'school_name',
  'event_type',
  'event_name',
  'event_date',
  'end_date',
  'cost_dollars',
  'location',
  'registration_url',
  'registration_deadline',
  'status',
  'description',
  'source_url',
  'scrape_timestamp',
];

const FAILURE_FIELDS = [
  'unitid',
  'school_name',
  'url_attempted',
  'failure_code',
  'timestamp',
];

const VALID_FAILURE_CODES = new Set([
  'CAMP_URL_DEAD',
  'NO_CAMPS_LISTED',
  'NO_LAYER2_NAV',
  'CAMP_DATA_ABSENT',
  'STALE_NO_ALT',
  'JS_RENDERED_BLOCKED', // legacy — should not fire here
  'TIMEOUT',
  'NAV_ERROR',
  'UNKNOWN_ERROR',
  'URL_NULLED_DURING_AUDIT', // Patch parallel NULL pass signal
]);

const PAGE_TIMEOUT_MS = 30_000;
const NETWORK_IDLE_TIMEOUT_MS = 15_000;
const RETRY_ON_TIMEOUT = 1;

// -----------------------------------------------------------------------------
// CSV helpers
// -----------------------------------------------------------------------------

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(fields, obj) {
  return fields.map((k) => csvEscape(obj[k] ?? '')).join(',') + '\n';
}

function parseCsvLine(line) {
  // Minimal RFC4180 parser — handles quoted fields and escaped quotes.
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

function loadExistingDedupKeys() {
  const keys = new Set();
  if (!existsSync(CAMP_CSV)) return keys;
  const content = readFileSync(CAMP_CSV, 'utf-8');
  // Split by lines but respect quoted newlines — simple heuristic: split lines
  // that are NOT inside an open quote. For the existing file all rows are
  // single-line so a plain split is safe.
  const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return keys;
  const header = parseCsvLine(lines[0]);
  const idx = {
    unitid: header.indexOf('unitid'),
    event_type: header.indexOf('event_type'),
    event_date: header.indexOf('event_date'),
  };
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const k = `${(cols[idx.unitid] || '').trim()}|${(cols[idx.event_type] || '').trim()}|${(cols[idx.event_date] || '').trim()}`;
    keys.add(k);
  }
  return keys;
}

function ensureCsvHeaders() {
  mkdirSync(EXTRACTED_DIR, { recursive: true });
  if (!existsSync(CAMP_CSV)) {
    writeFileSync(CAMP_CSV, CAMP_FIELDS.join(',') + '\n', 'utf-8');
  }
  if (!existsSync(FAILURE_CSV)) {
    writeFileSync(FAILURE_CSV, FAILURE_FIELDS.join(',') + '\n', 'utf-8');
  }
}

function appendCampRow(row) {
  const safeRow = {};
  for (const k of CAMP_FIELDS) safeRow[k] = row[k] ?? '';
  appendFileSync(CAMP_CSV, csvRow(CAMP_FIELDS, safeRow), 'utf-8');
}

function appendFailureRow(unitid, schoolName, urlAttempted, failureCode) {
  let code = failureCode;
  if (!VALID_FAILURE_CODES.has(code)) {
    console.log(`[warn] unknown failure_code ${code} — logging as UNKNOWN_ERROR`);
    code = 'UNKNOWN_ERROR';
  }
  const row = {
    unitid,
    school_name: schoolName,
    url_attempted: urlAttempted,
    failure_code: code,
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
  appendFileSync(FAILURE_CSV, csvRow(FAILURE_FIELDS, row), 'utf-8');
}

// -----------------------------------------------------------------------------
// Date extraction + currency rule
// -----------------------------------------------------------------------------

const MONTH_MAP = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const DATE_PATTERNS = [
  // ISO: 2025-06-14 or 2025/6/14
  { re: /\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/g, kind: 'iso' },
  // US: 6/14/2025 or 6-14-2025
  { re: /\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/g, kind: 'us' },
  // Month name + day + year: June 14, 2025 / June 14 2025 / Jun 14, 2025
  {
    re: /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/gi,
    kind: 'mdy_name',
  },
  // Month name + year only: June 2025
  {
    re: /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\s+(20\d{2})\b/gi,
    kind: 'my_name',
  },
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function extractDates(text) {
  if (!text) return [];
  const dates = [];
  for (const { re, kind } of DATE_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      try {
        if (kind === 'iso') {
          const y = parseInt(m[1], 10);
          const mo = parseInt(m[2], 10);
          const d = parseInt(m[3], 10);
          if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
            dates.push(`${y}-${pad2(mo)}-${pad2(d)}`);
          }
        } else if (kind === 'us') {
          const mo = parseInt(m[1], 10);
          const d = parseInt(m[2], 10);
          const y = parseInt(m[3], 10);
          if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
            dates.push(`${y}-${pad2(mo)}-${pad2(d)}`);
          }
        } else if (kind === 'mdy_name') {
          const mo = MONTH_MAP[m[1].toLowerCase()];
          const d = parseInt(m[2], 10);
          const y = parseInt(m[3], 10);
          if (mo) dates.push(`${y}-${pad2(mo)}-${pad2(d)}`);
        } else if (kind === 'my_name') {
          const mo = MONTH_MAP[m[1].toLowerCase()];
          const y = parseInt(m[2], 10);
          if (mo) dates.push(`${y}-${pad2(mo)}`);
        }
      } catch (_e) {
        // ignore parse failures
      }
    }
  }
  return dates;
}

function isCurrentYear(isoDate) {
  if (!isoDate) return false;
  return isoDate.startsWith('2025') || isoDate.startsWith('2026');
}

// -----------------------------------------------------------------------------
// Platform detection + extraction
// -----------------------------------------------------------------------------

function detectPlatform(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('totalcamps.com')) return 'totalcamps';
  if (u.includes('sidearm') || u.includes('.aspx')) return 'sidearm';
  if (u.includes('abcsportscamps')) return 'abc_sports_camps';
  if (u.includes('wix.com') || u.includes('wixsite.com')) return 'wix';
  if (u.includes('express.adobe.com')) return 'adobe_express';
  return 'generic';
}

async function extractTotalcamps(page) {
  const camps = [];
  const selectors = [
    'div.event',
    'div.session',
    'div.camp-listing',
    '[data-event-id]',
    "a[href*='register']",
    '.event-card',
  ];
  for (const sel of selectors) {
    let elements;
    try {
      elements = await page.$$(sel);
    } catch (_e) {
      continue;
    }
    for (const el of elements) {
      try {
        const text = (await el.innerText()).trim();
        if (text && text.length >= 5) camps.push(text);
      } catch (_e) {
        // skip
      }
    }
    if (camps.length > 0) break;
  }
  if (camps.length === 0) {
    try {
      const bodyText = await page.innerText('body');
      if (bodyText) camps.push(bodyText);
    } catch (_e) {
      // skip
    }
  }
  return camps;
}

async function extractGeneric(page) {
  const texts = [];
  for (const sel of ['main', 'article', 'section', 'body']) {
    try {
      const el = await page.$(sel);
      if (el) {
        const t = (await el.innerText()).trim();
        if (t) {
          texts.push(t);
          break;
        }
      }
    } catch (_e) {
      continue;
    }
  }
  return texts;
}

// -----------------------------------------------------------------------------
// Camp section parsing
// -----------------------------------------------------------------------------

const CAMP_KEYWORDS =
  /\b(camp|clinic|combine|showcase|prospect day|elite day|id day|junior day|skills day)\b/i;

const TIME_RANGE_PATTERN =
  /(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i;

const COST_PATTERN = /\$\s*(\d{1,4}(?:\.\d{2})?)/;

function splitIntoCandidateSections(textBlobs) {
  const sections = [];
  for (const blob of textBlobs) {
    const parts = blob.split(/\n\s*\n|\r\n\s*\r\n/);
    for (const raw of parts) {
      const p = raw.trim();
      if (p && CAMP_KEYWORDS.test(p)) sections.push(p);
    }
  }
  return sections;
}

function parseCampSection(section, sourceUrl) {
  const dates = extractDates(section);
  const fullDates = dates.filter((d) => d.length === 10);
  if (fullDates.length === 0) return null;
  const eventDate = fullDates[0];
  if (!isCurrentYear(eventDate)) return null;

  let eventName = '';
  for (const rawLine of section.split('\n')) {
    const line = rawLine.trim();
    if (line && CAMP_KEYWORDS.test(line) && line.length < 200) {
      eventName = line;
      break;
    }
  }
  if (!eventName) {
    const firstLine = section.split('\n')[0].trim();
    eventName = firstLine.slice(0, 200) || 'Camp';
  }

  let cost = '';
  const costMatch = section.match(COST_PATTERN);
  if (costMatch) cost = costMatch[1].split('.')[0];

  const timeMatch = section.match(TIME_RANGE_PATTERN);
  const timeStr = timeMatch ? `${timeMatch[1]} - ${timeMatch[2]}` : '';

  let status = 'Open';
  const low = section.toLowerCase();
  if (
    low.includes('registration closed') ||
    low.includes('no longer accepting') ||
    low.includes('sold out')
  ) {
    status = 'Closed';
  } else if (low.includes('closed') && low.includes('register')) {
    status = 'Closed';
  }

  const descriptionParts = [];
  if (timeStr) descriptionParts.push(timeStr);
  const excerpt = section.split(/\s+/).join(' ').slice(0, 400);
  descriptionParts.push(excerpt);

  return {
    event_type: 'Camp',
    event_name: eventName,
    event_date: eventDate,
    end_date: eventDate,
    cost_dollars: cost,
    location: '',
    registration_url: sourceUrl,
    registration_deadline: '',
    status,
    description: descriptionParts.join(' | '),
  };
}

// -----------------------------------------------------------------------------
// Supabase fetch
// -----------------------------------------------------------------------------

async function fetchPilotRows() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: VITE_SUPABASE_URL and a Supabase key must be set in .env');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from('schools')
    .select('unitid,school_name,prospect_camp_link')
    .in('unitid', PILOT_UNITIDS)
    .order('unitid', { ascending: true });
  if (error) {
    console.error('[supabase error]', error);
    process.exit(1);
  }
  console.log(
    `[fetch] pulled ${data.length} pilot rows from schools (of ${PILOT_UNITIDS.length} pilot unitids)`
  );
  return data;
}

// -----------------------------------------------------------------------------
// Per-school scrape
// -----------------------------------------------------------------------------

async function scrapeSchool(page, row, dedupKeys) {
  const unitid = row.unitid;
  const schoolName = row.school_name;
  const url = row.prospect_camp_link || '';

  if (!url) {
    appendFailureRow(unitid, schoolName, '', 'URL_NULLED_DURING_AUDIT');
    return { written: 0, failure: 'URL_NULLED_DURING_AUDIT' };
  }

  const platform = detectPlatform(url);
  console.log(`[scrape] ${unitid} ${schoolName} — platform=${platform} url=${url}`);

  let lastError = null;
  for (let attempt = 0; attempt <= RETRY_ON_TIMEOUT; attempt++) {
    try {
      const response = await page.goto(url, {
        timeout: PAGE_TIMEOUT_MS,
        waitUntil: 'domcontentloaded',
      });
      if (response === null) {
        lastError = 'null_response';
        continue;
      }
      if (response.status() >= 400) {
        appendFailureRow(unitid, schoolName, url, 'CAMP_URL_DEAD');
        return { written: 0, failure: 'CAMP_URL_DEAD' };
      }
      try {
        await page.waitForLoadState('networkidle', { timeout: NETWORK_IDLE_TIMEOUT_MS });
      } catch (_e) {
        // network idle timeout is non-fatal
      }
      lastError = null;
      break;
    } catch (e) {
      lastError = String(e?.message || e);
      if (attempt < RETRY_ON_TIMEOUT) {
        console.log(`[retry] ${unitid} attempt ${attempt + 1} failed: ${lastError.slice(0, 100)}`);
        continue;
      }
    }
  }

  if (lastError !== null) {
    const code = /timeout/i.test(lastError) ? 'TIMEOUT' : 'NAV_ERROR';
    appendFailureRow(unitid, schoolName, url, code);
    return { written: 0, failure: code };
  }

  let textBlobs;
  try {
    if (platform === 'totalcamps') {
      textBlobs = await extractTotalcamps(page);
    } else {
      textBlobs = await extractGeneric(page);
    }
  } catch (e) {
    console.log(`[extract error] ${unitid}: ${e?.message || e}`);
    appendFailureRow(unitid, schoolName, url, 'UNKNOWN_ERROR');
    return { written: 0, failure: 'UNKNOWN_ERROR' };
  }

  if (!textBlobs || textBlobs.length === 0) {
    appendFailureRow(unitid, schoolName, url, 'CAMP_DATA_ABSENT');
    return { written: 0, failure: 'CAMP_DATA_ABSENT' };
  }

  const sections = splitIntoCandidateSections(textBlobs);
  if (sections.length === 0) {
    appendFailureRow(unitid, schoolName, url, 'NO_CAMPS_LISTED');
    return { written: 0, failure: 'NO_CAMPS_LISTED' };
  }

  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  let written = 0;
  for (const section of sections) {
    const camp = parseCampSection(section, url);
    if (!camp) continue;
    const dedupKey = `${unitid}|${camp.event_type}|${camp.event_date}`;
    if (dedupKeys.has(dedupKey)) continue;
    dedupKeys.add(dedupKey);
    const campRow = {
      unitid,
      school_name: schoolName,
      ...camp,
      source_url: url,
      scrape_timestamp: timestamp,
    };
    appendCampRow(campRow);
    written++;
  }

  if (written === 0) {
    appendFailureRow(unitid, schoolName, url, 'CAMP_DATA_ABSENT');
    return { written: 0, failure: 'CAMP_DATA_ABSENT' };
  }

  return { written, failure: null };
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  const rows = await fetchPilotRows();

  ensureCsvHeaders();
  const dedupKeys = loadExistingDedupKeys();
  console.log(`[dedup] loaded ${dedupKeys.size} existing keys from camp_details_pilot.csv`);

  // Identify any pilot unitids missing from the fetch (e.g. not in DB at all).
  const returnedIds = new Set(rows.map((r) => r.unitid));
  const missing = PILOT_UNITIDS.filter((u) => !returnedIds.has(u));
  if (missing.length > 0) {
    console.log(`[warn] pilot unitids missing from schools fetch: ${missing.join(', ')}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT_MS);

  let totalCamps = 0;
  let failures = 0;
  const failureCounts = {};
  const schoolOutcomes = [];

  let idx = 0;
  for (const row of rows) {
    idx++;
    try {
      const { written, failure } = await scrapeSchool(page, row, dedupKeys);
      totalCamps += written;
      if (failure) {
        failures++;
        failureCounts[failure] = (failureCounts[failure] || 0) + 1;
        schoolOutcomes.push({ unitid: row.unitid, school: row.school_name, written, failure });
      } else {
        schoolOutcomes.push({ unitid: row.unitid, school: row.school_name, written, failure: null });
      }
    } catch (e) {
      console.log(`[fatal school error] ${row.unitid}: ${e?.message || e}`);
      appendFailureRow(
        row.unitid,
        row.school_name || '',
        row.prospect_camp_link || '',
        'UNKNOWN_ERROR'
      );
      failures++;
      failureCounts.UNKNOWN_ERROR = (failureCounts.UNKNOWN_ERROR || 0) + 1;
      schoolOutcomes.push({
        unitid: row.unitid,
        school: row.school_name,
        written: 0,
        failure: 'UNKNOWN_ERROR',
      });
    }

    if (idx % 5 === 0 || idx === rows.length) {
      console.log(
        `[checkpoint] ${idx}/${rows.length} processed | camps written so far: ${totalCamps} | failures: ${failures}`
      );
    }
  }

  await context.close();
  await browser.close();

  console.log('\n===== RUN SUMMARY =====');
  console.log(`schools attempted: ${rows.length}`);
  console.log(`camps written this run: ${totalCamps}`);
  console.log(`failures this run: ${failures}`);
  console.log('failure breakdown:');
  for (const [code, count] of Object.entries(failureCounts)) {
    console.log(`  ${code}: ${count}`);
  }
  console.log('\nper-school outcomes:');
  for (const o of schoolOutcomes) {
    const tag = o.failure ? o.failure : `OK (+${o.written} camps)`;
    console.log(`  ${o.unitid}  ${(o.school || '').slice(0, 40).padEnd(40)}  ${tag}`);
  }
  if (missing.length > 0) {
    console.log(`\nunitids not returned by Supabase fetch: ${missing.join(', ')}`);
  }
}

main().catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});
