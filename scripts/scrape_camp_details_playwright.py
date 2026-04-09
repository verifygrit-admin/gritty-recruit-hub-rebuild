"""
scrape_camp_details_playwright.py

Playwright-based camp details scraper (Objective 4, Session 016, DEC-CFBRB-090).

Purpose:
  Replace the WebFetch-based camp scraper that failed on 14/16 schools due to
  JS-rendered content (TotalCamps, SideArm, ABC Sports Camps, Wix, etc.). This
  script uses a headless Chromium browser to execute page JS before extraction.

Spec:
  C:/Users/chris/dev/_org/specs/gritty-recruit-hub-rebuild/2026-04-07_spec_scraper-coach-contact-camp-data_DEC-CFBRB-090.md
  C:/Users/chris/.knowing/raw/dev-assets/Scraper_Spec_CoachContact_CampData_Extract.md

Scope (pilot):
  17 Division III schools hardcoded below (Scout-provided list for Session 016
  Objective 4 pilot). Scraper reads prospect_camp_link from Supabase per unitid,
  opens each URL in headless Chromium, extracts camp details, and writes to CSV.

Currency rule (per spec):
  Only 2025 or 2026 camps are retained. Any camp dated 2024 or earlier is
  dropped. If a page offers no date at all, it is logged as CAMP_DATA_ABSENT.

Output (writes only — no Supabase writes):
  extracted/camp_details_pilot.csv       — append mode, one row per camp
  extracted/scraper_failure_log.csv      — append mode, one row per failure

Dedup key:
  unitid + event_type + event_date (normalized to ISO YYYY-MM-DD when possible).
  Prevents duplicate rows on re-runs or multi-session extractions.

Timeout / retry:
  30 second per-page timeout. One retry on timeout before logging failure.

Usage (after Scout authorizes install):
  pip install playwright python-dotenv requests
  python -m playwright install chromium
  python scripts/scrape_camp_details_playwright.py

  Flags:
    --dry-run        Print planned work, do not launch browser
    --school UNITID  Run for a single unitid only
    --headed         Run with visible browser (debugging)

DO NOT execute without Scout authorization. Scout holds the re-run gate.
"""

import argparse
import csv
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

# Playwright is imported lazily inside main() so --dry-run works without install.

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
EXTRACTED_DIR = PROJECT_ROOT / "extracted"
CAMP_CSV = EXTRACTED_DIR / "camp_details_pilot.csv"
FAILURE_CSV = EXTRACTED_DIR / "scraper_failure_log.csv"

load_dotenv(PROJECT_ROOT / ".env")
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Pilot unitids (17 DIII schools — Scout-provided for Session 016 Objective 4).
# Bowdoin is 161004 (Scout-corrected from prior 160004 typo).
PILOT_UNITIDS = [
    168528,  # Adrian College
    210571,  # Albright College
    188641,  # Alfred University
    210669,  # Allegheny College
    168591,  # Alma College
    164465,  # Amherst College
    173045,  # Augsburg University
    143084,  # Augustana College
    143118,  # Aurora University
    231420,  # Averett University
    201195,  # Baldwin Wallace University
    160977,  # Bates College
    175421,  # Belhaven University
    238333,  # Beloit College
    145619,  # Benedictine University (may be NULL — Patch may clear in parallel)
    139144,  # Berry College
    161004,  # Bowdoin College (corrected unitid)
]

# CSV schema for camp details (matches existing camp_details_pilot.csv header).
CAMP_FIELDS = [
    "unitid",
    "school_name",
    "event_type",
    "event_name",
    "event_date",
    "end_date",
    "cost_dollars",
    "location",
    "registration_url",
    "registration_deadline",
    "status",
    "description",
    "source_url",
    "scrape_timestamp",
]

FAILURE_FIELDS = [
    "unitid",
    "school_name",
    "url_attempted",
    "failure_code",
    "timestamp",
]

VALID_FAILURE_CODES = {
    "CAMP_URL_DEAD",
    "NO_CAMPS_LISTED",
    "NO_LAYER2_NAV",
    "CAMP_DATA_ABSENT",
    "STALE_NO_ALT",
    "JS_RENDERED_BLOCKED",   # legacy from WebFetch pass — should not fire here
    "TIMEOUT",
    "NAV_ERROR",
    "UNKNOWN_ERROR",
}

PAGE_TIMEOUT_MS = 30_000
NETWORK_IDLE_TIMEOUT_MS = 15_000
RETRY_ON_TIMEOUT = 1

# -----------------------------------------------------------------------------
# Supabase input fetch
# -----------------------------------------------------------------------------


def fetch_pilot_rows():
    """Fetch unitid/school_name/prospect_camp_link for pilot unitids from Supabase.

    Returns a list of dicts ordered by unitid. Rows with NULL prospect_camp_link
    are dropped (e.g. Benedictine after Patch nulls it).
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        sys.exit(1)

    unitid_list = ",".join(str(u) for u in PILOT_UNITIDS)
    url = f"{SUPABASE_URL}/rest/v1/schools"
    params = {
        "select": "unitid,school_name,prospect_camp_link",
        "unitid": f"in.({unitid_list})",
        "prospect_camp_link": "not.is.null",
        "order": "unitid.asc",
    }
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    resp = requests.get(url, params=params, headers=headers, timeout=30)
    resp.raise_for_status()
    rows = resp.json()
    print(f"[fetch] pulled {len(rows)} rows with prospect_camp_link (of {len(PILOT_UNITIDS)} pilot unitids)")
    return rows


# -----------------------------------------------------------------------------
# Dedup and CSV I/O
# -----------------------------------------------------------------------------


def load_existing_dedup_keys():
    """Read existing camp CSV and return the set of (unitid, event_type, event_date)."""
    keys = set()
    if not CAMP_CSV.exists():
        return keys
    with CAMP_CSV.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            keys.add((
                str(row.get("unitid", "")).strip(),
                (row.get("event_type") or "").strip(),
                (row.get("event_date") or "").strip(),
            ))
    return keys


def ensure_csv_headers():
    """Create CSV files with headers if they do not yet exist."""
    EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)
    if not CAMP_CSV.exists():
        with CAMP_CSV.open("w", encoding="utf-8", newline="") as f:
            csv.DictWriter(f, fieldnames=CAMP_FIELDS).writeheader()
    if not FAILURE_CSV.exists():
        with FAILURE_CSV.open("w", encoding="utf-8", newline="") as f:
            csv.DictWriter(f, fieldnames=FAILURE_FIELDS).writeheader()


def append_camp_row(row):
    with CAMP_CSV.open("a", encoding="utf-8", newline="") as f:
        csv.DictWriter(f, fieldnames=CAMP_FIELDS).writerow(row)


def append_failure_row(unitid, school_name, url_attempted, failure_code):
    if failure_code not in VALID_FAILURE_CODES:
        print(f"[warn] unknown failure_code {failure_code} — logging as UNKNOWN_ERROR")
        failure_code = "UNKNOWN_ERROR"
    with FAILURE_CSV.open("a", encoding="utf-8", newline="") as f:
        csv.DictWriter(f, fieldnames=FAILURE_FIELDS).writerow({
            "unitid": unitid,
            "school_name": school_name,
            "url_attempted": url_attempted,
            "failure_code": failure_code,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        })


# -----------------------------------------------------------------------------
# Date extraction and currency rule
# -----------------------------------------------------------------------------

MONTH_MAP = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}

DATE_PATTERNS = [
    # ISO: 2025-06-14 or 2025/6/14
    re.compile(r"\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b"),
    # US: 6/14/2025 or 6-14-2025
    re.compile(r"\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b"),
    # Month name: June 14, 2025 / June 14 2025 / Jun 14, 2025
    re.compile(r"\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b", re.I),
    # Month name, year only: June 2025 (no day)
    re.compile(r"\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\s+(20\d{2})\b", re.I),
]


def extract_dates(text):
    """Return a list of ISO date strings (YYYY-MM-DD) or YYYY-MM for month-only."""
    if not text:
        return []
    dates = []
    for pat in DATE_PATTERNS:
        for m in pat.finditer(text):
            groups = m.groups()
            try:
                if pat.pattern.startswith(r"\b(20"):
                    y, mo, d = int(groups[0]), int(groups[1]), int(groups[2])
                    dates.append(f"{y:04d}-{mo:02d}-{d:02d}")
                elif pat.pattern.startswith(r"\b(\d{1,2})[-/]"):
                    mo, d, y = int(groups[0]), int(groups[1]), int(groups[2])
                    dates.append(f"{y:04d}-{mo:02d}-{d:02d}")
                elif len(groups) == 3:
                    mo = MONTH_MAP.get(groups[0].lower(), 0)
                    d = int(groups[1])
                    y = int(groups[2])
                    if mo:
                        dates.append(f"{y:04d}-{mo:02d}-{d:02d}")
                elif len(groups) == 2:
                    mo = MONTH_MAP.get(groups[0].lower(), 0)
                    y = int(groups[1])
                    if mo:
                        dates.append(f"{y:04d}-{mo:02d}")
            except (ValueError, IndexError):
                continue
    return dates


def is_current_year(iso_date):
    """Spec currency rule: retain only 2025 or 2026."""
    if not iso_date:
        return False
    return iso_date.startswith("2025") or iso_date.startswith("2026")


# -----------------------------------------------------------------------------
# Platform-specific extraction helpers
# -----------------------------------------------------------------------------


async def extract_totalcamps(page):
    """TotalCamps platform — camps listed in .event or [data-event] containers.

    Common pattern: a session list rendered after JS runs. We wait for network
    idle, then query for anchor/h2/h3 nodes containing "camp" or "clinic".
    """
    camps = []
    # TotalCamps renders a session grid after JS. Look for common selectors.
    selectors = [
        "div.event",
        "div.session",
        "div.camp-listing",
        "[data-event-id]",
        "a[href*='register']",
        ".event-card",
    ]
    for sel in selectors:
        try:
            elements = await page.query_selector_all(sel)
        except Exception:
            continue
        for el in elements:
            text = (await el.inner_text()).strip()
            if not text or len(text) < 5:
                continue
            camps.append(text)
        if camps:
            break
    # Fallback: grab whole body text if no structured hits
    if not camps:
        try:
            body_text = await page.inner_text("body")
            camps = [body_text]
        except Exception:
            pass
    return camps


async def extract_generic(page):
    """Generic extraction — pull full body text, section headers, and headings."""
    texts = []
    for sel in ["main", "article", "section", "body"]:
        try:
            el = await page.query_selector(sel)
            if el:
                t = (await el.inner_text()).strip()
                if t:
                    texts.append(t)
                    break
        except Exception:
            continue
    return texts


def detect_platform(url):
    """Classify a URL to choose the extraction path."""
    u = (url or "").lower()
    if "totalcamps.com" in u:
        return "totalcamps"
    if "sidearm" in u or ".aspx" in u:
        return "sidearm"
    if "abcsportscamps" in u:
        return "abc_sports_camps"
    if "wix.com" in u or "wixsite.com" in u:
        return "wix"
    if "express.adobe.com" in u:
        return "adobe_express"
    return "generic"


# -----------------------------------------------------------------------------
# Camp parsing from extracted text blobs
# -----------------------------------------------------------------------------

CAMP_KEYWORDS = re.compile(
    r"\b(camp|clinic|combine|showcase|prospect day|elite day|id day|junior day|skills day)\b",
    re.I,
)

TIME_RANGE_PATTERN = re.compile(
    r"(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))",
    re.I,
)

COST_PATTERN = re.compile(r"\$\s*(\d{1,4}(?:\.\d{2})?)")


def split_into_candidate_sections(text_blobs):
    """Split text into candidate camp sections — one section per heading or blank-line block."""
    sections = []
    for blob in text_blobs:
        # Split on double newline or single newline-with-heading pattern
        parts = re.split(r"\n\s*\n|\r\n\s*\r\n", blob)
        for p in parts:
            p = p.strip()
            if p and CAMP_KEYWORDS.search(p):
                sections.append(p)
    return sections


def parse_camp_section(section, source_url):
    """Parse a text section into a camp row dict. Returns None if no date present."""
    dates = extract_dates(section)
    full_dates = [d for d in dates if len(d) == 10]  # YYYY-MM-DD only
    if not full_dates:
        return None
    event_date = full_dates[0]
    if not is_current_year(event_date):
        return None  # fails currency rule

    # Event name — first line containing a camp keyword, or first non-empty line
    event_name = ""
    for line in section.split("\n"):
        line = line.strip()
        if line and CAMP_KEYWORDS.search(line) and len(line) < 200:
            event_name = line
            break
    if not event_name:
        first_line = section.split("\n")[0].strip()
        event_name = first_line[:200] if first_line else "Camp"

    # Cost
    cost = ""
    cost_match = COST_PATTERN.search(section)
    if cost_match:
        cost = cost_match.group(1).split(".")[0]  # integer dollars

    # Time range (attached to description)
    time_match = TIME_RANGE_PATTERN.search(section)
    time_str = f"{time_match.group(1)} - {time_match.group(2)}" if time_match else ""

    # Status — "Open" by default; mark Closed if page text indicates
    status = "Open"
    low = section.lower()
    if "registration closed" in low or "no longer accepting" in low or "sold out" in low:
        status = "Closed"
    elif "closed" in low and "register" in low:
        status = "Closed"

    description_parts = []
    if time_str:
        description_parts.append(time_str)
    # Include a short section excerpt as description context (cap at 400 chars)
    excerpt = " ".join(section.split())[:400]
    description_parts.append(excerpt)

    return {
        "event_type": "Camp",
        "event_name": event_name,
        "event_date": event_date,
        "end_date": event_date,  # single-day default; multi-day requires spec v2
        "cost_dollars": cost,
        "location": "",  # per spec: location NOT scraped
        "registration_url": source_url,
        "registration_deadline": "",
        "status": status,
        "description": " | ".join(description_parts),
    }


# -----------------------------------------------------------------------------
# Per-school scrape
# -----------------------------------------------------------------------------


async def scrape_school(page, row, dedup_keys):
    """Scrape a single school's prospect_camp_link. Returns (camps_written, failure_code_or_None)."""
    unitid = row["unitid"]
    school_name = row["school_name"]
    url = row.get("prospect_camp_link") or ""

    if not url:
        append_failure_row(unitid, school_name, url, "CAMP_URL_DEAD")
        return 0, "CAMP_URL_DEAD"

    platform = detect_platform(url)
    print(f"[scrape] {unitid} {school_name} — platform={platform} url={url}")

    # Navigation with retry
    last_error = None
    for attempt in range(1 + RETRY_ON_TIMEOUT):
        try:
            response = await page.goto(url, timeout=PAGE_TIMEOUT_MS, wait_until="domcontentloaded")
            if response is None:
                last_error = "null_response"
                continue
            if response.status >= 400:
                append_failure_row(unitid, school_name, url, "CAMP_URL_DEAD")
                return 0, "CAMP_URL_DEAD"
            # Wait for network idle for JS-rendered content
            try:
                await page.wait_for_load_state("networkidle", timeout=NETWORK_IDLE_TIMEOUT_MS)
            except Exception:
                # Network idle timeout is non-fatal — DOM may already be hydrated
                pass
            last_error = None
            break
        except Exception as e:
            last_error = str(e)
            if attempt < RETRY_ON_TIMEOUT:
                print(f"[retry] {unitid} attempt {attempt + 1} failed: {last_error[:100]}")
                continue

    if last_error is not None:
        code = "TIMEOUT" if "timeout" in last_error.lower() else "NAV_ERROR"
        append_failure_row(unitid, school_name, url, code)
        return 0, code

    # Platform-routed extraction
    try:
        if platform == "totalcamps":
            text_blobs = await extract_totalcamps(page)
        else:
            text_blobs = await extract_generic(page)
    except Exception as e:
        print(f"[extract error] {unitid}: {e}")
        append_failure_row(unitid, school_name, url, "UNKNOWN_ERROR")
        return 0, "UNKNOWN_ERROR"

    if not text_blobs:
        append_failure_row(unitid, school_name, url, "CAMP_DATA_ABSENT")
        return 0, "CAMP_DATA_ABSENT"

    # Parse sections into camp rows
    sections = split_into_candidate_sections(text_blobs)
    if not sections:
        append_failure_row(unitid, school_name, url, "NO_CAMPS_LISTED")
        return 0, "NO_CAMPS_LISTED"

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    written = 0
    for section in sections:
        camp = parse_camp_section(section, url)
        if not camp:
            continue
        dedup_key = (str(unitid), camp["event_type"], camp["event_date"])
        if dedup_key in dedup_keys:
            continue
        dedup_keys.add(dedup_key)
        camp_row = {
            "unitid": unitid,
            "school_name": school_name,
            **camp,
            "source_url": url,
            "scrape_timestamp": timestamp,
        }
        # Ensure only spec fields are written
        camp_row = {k: camp_row.get(k, "") for k in CAMP_FIELDS}
        append_camp_row(camp_row)
        written += 1

    if written == 0:
        # Sections existed but none passed currency rule or had dates
        append_failure_row(unitid, school_name, url, "CAMP_DATA_ABSENT")
        return 0, "CAMP_DATA_ABSENT"

    return written, None


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------


async def run(args):
    rows = fetch_pilot_rows()
    if args.school:
        rows = [r for r in rows if int(r["unitid"]) == args.school]
        if not rows:
            print(f"[error] unitid {args.school} not found in pilot fetch")
            return

    ensure_csv_headers()
    dedup_keys = load_existing_dedup_keys()
    print(f"[dedup] loaded {len(dedup_keys)} existing keys from camp_details_pilot.csv")

    if args.dry_run:
        print("\n[DRY RUN] Planned scrape targets:")
        for r in rows:
            print(f"  {r['unitid']:>6}  {r['school_name'][:40]:<40}  {detect_platform(r.get('prospect_camp_link', ''))}  {r.get('prospect_camp_link', '')}")
        print(f"\n[DRY RUN] {len(rows)} schools. No browser launched.")
        return

    # Lazy import so --dry-run works without playwright installed
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("ERROR: playwright not installed. Run: pip install playwright && python -m playwright install chromium")
        sys.exit(2)

    total_camps = 0
    failures = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=not args.headed)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1440, "height": 900},
        )
        page = await context.new_page()
        page.set_default_timeout(PAGE_TIMEOUT_MS)

        for row in rows:
            try:
                written, failure = await scrape_school(page, row, dedup_keys)
                total_camps += written
                if failure:
                    failures += 1
            except Exception as e:
                print(f"[fatal school error] {row.get('unitid')}: {e}")
                append_failure_row(row.get("unitid"), row.get("school_name", ""), row.get("prospect_camp_link", ""), "UNKNOWN_ERROR")
                failures += 1

        await context.close()
        await browser.close()

    print(f"\n[done] camps written: {total_camps} | failures: {failures} | schools processed: {len(rows)}")


def main():
    parser = argparse.ArgumentParser(description="Playwright camp details scraper (DEC-CFBRB-090)")
    parser.add_argument("--dry-run", action="store_true", help="List targets without launching browser")
    parser.add_argument("--school", type=int, help="Run for a single unitid only")
    parser.add_argument("--headed", action="store_true", help="Run with visible browser for debugging")
    args = parser.parse_args()

    import asyncio
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
