"""
import_shortlist_bc_high.py
---------------------------
Reads Thomas Girmay and Ayden Watkins shortlist data from their Google Sheets
and inserts rows into Supabase short_list_items.

DATA SOURCES
  Thomas Girmay : 1MDi998V9BWp51aRQgTF-gkLSNETxRdUhdkSWRPYU9IA
  Ayden Watkins  : 1c7GNzuh3riV9sKVDp6WSGou4Rprtz4VgIuQ_szA0XX4

TABS USED
  "2. Short List"          — school name, unitid, conference, division, COA, LTDV
  "4. Pre-Offer Tracking"  — recruiting journey booleans (27 columns)
  "1. Target List"         — fallback source for Thomas's 3 overflow schools:
                             Gallaudet (131450), Bridgewater (231581),
                             Hampden-Sydney (232256)

DECISIONS APPLIED (locked by Chris, 2026-03-28)
  1.  Row excluded if UNITID is blank (AVERAGE/TOTALS row)
  2.  Include all 33 Thomas schools (including 3 overflow from Target List)
  3.  Currency strings ("$30,118") stripped to float
  4.  Percentage strings ("51%") converted to decimal (0.51)
  5.  net_cost, droi, break_even = NULL  (GRIT FIT recomputes from UNITID + EFC)
  6.  source = 'manual_add'
  7.  grit_fit_status = 'not_evaluated'  (NOT NULL constraint — never null/None)
  8.  match_rank, match_tier, state, dist, q_link, coach_link, grad_rate = NULL

COLUMNS SENT TO SUPABASE (only columns that exist in short_list_items)
  user_id, unitid, school_name, div, conference, state, match_rank, match_tier,
  net_cost, droi, break_even, adltv, grad_rate, coa, dist, q_link, coach_link,
  source, grit_fit_status, recruiting_journey_steps

COLUMNS NOT INCLUDED (do not exist in table)
  grit_fit_labels, coach_contact, camp_link

STEP MAPPING  (Pre-Offer Tracking 0-indexed column -> step_id : label)
  step 1  "Added to shortlist"                   — always TRUE
  step 2  "Completed recruiting questionnaire"   — col 10 (Recruiting Q Complete)
  step 3  "Completed admissions info form"        — col 11 (Adm. Form Complete)
  step 4  "Assistant coach contacted student"    — col 19 (Sucessful Hand-Off)
  step 5  "Contacted coach via email"             — col 12 (Follow Up Email Sent)
  step 6  "Contacted coach via social media"      — col 17 (X DM Sent)
  step 7  "Received junior day invite"            — col 20 (Jr Day Info)
  step 8  "Received visit invite"                 — col 21 (Campus Visit Invite)
  step 9  "Received prospect camp invite"         — col 22 (Camp Invite)
  step 10 "Coach contacted student via text"      — NO MATCH -> FALSE
  step 11 "Head coach contacted student"          — col 24 (HC Contact)
  step 12 "School requested transcript"           — NO MATCH -> FALSE
  step 13 "School requested financial info"       — col 25 (FA Info Submit)
  step 14 "Received verbal offer"                 — col 26 (Offer Made)
  step 15 "Received written offer"               — NO MATCH -> FALSE

RUN (dry run — prints rows, no writes)
  python scripts/import_shortlist_bc_high.py --dry-run

RUN (single student, live)
  python scripts/import_shortlist_bc_high.py --student thomas
  python scripts/import_shortlist_bc_high.py --student ayden

RUN (both students, live)
  python scripts/import_shortlist_bc_high.py --student both
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
if not SUPABASE_URL:
    raise ValueError("VITE_SUPABASE_URL not set in .env")

SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not SERVICE_ROLE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY not set in .env")

STUDENTS = [
    {
        "name": "Thomas Girmay",
        "user_id": "0cf42296-a1a8-43df-b6dd-c15ff7e0f353",
        "sheet_id": "1MDi998V9BWp51aRQgTF-gkLSNETxRdUhdkSWRPYU9IA",
        "expected_rows": 33,
        # These UNITIDs are Short List=TRUE in the Target List tab but not yet
        # present in the Short List tab — pull them from Target List instead.
        "target_list_overflow": {"131450", "231581", "232256"},
    },
    {
        "name": "Ayden Watkins",
        "user_id": "4effa4d5-a10f-487e-9e1d-b9e2e912c727",
        "sheet_id": "1c7GNzuh3riV9sKVDp6WSGou4Rprtz4VgIuQ_szA0XX4",
        "expected_rows": 41,
        "target_list_overflow": set(),
    },
]

# Sheet structure: header = row 8, data starts row 9
SHORT_LIST_HEADER_ROW  = 8
SHORT_LIST_DATA_END    = 60   # far enough to capture all rows + TOTALS row
POT_HEADER_ROW         = 8
POT_DATA_END           = 60
# Target List: row 8 = grouping row ("HC"), row 9 = column header, data row 10+
# We read from row 8 so build_target_list_index can skip both non-data rows.
TARGET_LIST_READ_START = 8
TARGET_LIST_DATA_END   = 60


# ---------------------------------------------------------------------------
# GWS HELPER
# ---------------------------------------------------------------------------

def gws_read(sheet_id: str, range_str: str) -> list[list[str]]:
    """
    Call gws CLI (default JSON output) and return the values array.
    Returns an empty list on error.
    """
    cmd = [
        "gws", "sheets", "+read",
        "--spreadsheet", sheet_id,
        "--range", range_str,
        # NOTE: no --format flag — default is JSON, which we parse below.
        # Using --format table would produce human-readable text that cannot
        # be parsed by json.loads.
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(
            f"  ERROR reading {range_str} from {sheet_id}: {result.stderr.strip()}",
            file=sys.stderr,
        )
        return []
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        print(
            f"  ERROR: gws output for {range_str} was not valid JSON: {exc}",
            file=sys.stderr,
        )
        print(f"  Raw output (first 200 chars): {result.stdout[:200]}", file=sys.stderr)
        return []
    return data.get("values", [])


# ---------------------------------------------------------------------------
# VALUE PARSERS
# ---------------------------------------------------------------------------

def parse_bool(val: str) -> bool:
    """Convert 'TRUE'/'FALSE'/'' to bool. Empty = False."""
    return str(val).strip().upper() == "TRUE"


def parse_currency(val: str) -> float | None:
    """
    Convert '$30,118' or '30118' to float.
    Returns None if the value is blank or unparseable.
    """
    if not val or str(val).strip() == "":
        return None
    cleaned = re.sub(r"[$,\s]", "", str(val))
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_percent(val: str) -> float | None:
    """
    Convert '51%' to 0.51.
    Returns None if the value is blank or unparseable.
    """
    if not val or str(val).strip() == "":
        return None
    cleaned = str(val).strip().rstrip("%")
    try:
        return float(cleaned) / 100.0
    except ValueError:
        return None


def safe_get(row: list, idx: int, default: str = "") -> str:
    """Get row[idx] safely, returning default if index is out of range."""
    try:
        return row[idx]
    except IndexError:
        return default


# ---------------------------------------------------------------------------
# RECRUITING JOURNEY BUILDER
# ---------------------------------------------------------------------------

STEP_DEFINITIONS = [
    {"step_id": 1,  "label": "Added to shortlist"},
    {"step_id": 2,  "label": "Completed recruiting questionnaire"},
    {"step_id": 3,  "label": "Completed admissions info form"},
    {"step_id": 4,  "label": "Assistant coach contacted student"},
    {"step_id": 5,  "label": "Contacted coach via email"},
    {"step_id": 6,  "label": "Contacted coach via social media"},
    {"step_id": 7,  "label": "Received junior day invite"},
    {"step_id": 8,  "label": "Received visit invite"},
    {"step_id": 9,  "label": "Received prospect camp invite"},
    {"step_id": 10, "label": "Coach contacted student via text"},
    {"step_id": 11, "label": "Head coach contacted student"},
    {"step_id": 12, "label": "School requested transcript"},
    {"step_id": 13, "label": "School requested financial info"},
    {"step_id": 14, "label": "Received verbal offer"},
    {"step_id": 15, "label": "Received written offer"},
]

# Pre-Offer Tracking column mappings (0-indexed)
# None = no sheet match, defaults to False
POT_STEP_COLUMN_MAP = {
    1:  None,   # always True
    2:  10,     # Recruiting Q Complete
    3:  11,     # Adm. Form Complete
    4:  19,     # Sucessful Hand-Off (Assistant coach contacted student)
    5:  12,     # Follow Up Email Sent
    6:  17,     # X DM Sent
    7:  20,     # Jr Day Info
    8:  21,     # Campus Visit Invite
    9:  22,     # Camp Invite
    10: None,   # no match -> False (Coach contacted student via text)
    11: 24,     # HC Contact
    12: None,   # no match -> False
    13: 25,     # FA Info Submit
    14: 26,     # Offer Made
    15: None,   # no match -> False
}


def build_journey_steps_from_pot(pot_row: list) -> list[dict]:
    """
    Map a Pre-Offer Tracking row (0-indexed) to the 15-step JSONB array.

    Pre-Offer Tracking column layout (0-indexed):
      0  Schools Engaged
      1  UNITID
      2  Conference
      3  Division
      4  Coach Name
      5  Coach Role
      6  Twitter Handle
      7  Coach Intro Type
      8  School on Short List
      9  HOLD Until Coach Interest
      10 Recruiting Q Complete       -> step 2
      11 Adm. Form Complete          -> step 3
      12 Follow Up Email Sent        -> step 5
      13 Coach Replied via Email
      14 Followed on X
      15 Follows You on X
      16 X DMs Open
      17 X DM Sent                   -> step 6
      18 Replied in X DM
      19 Sucessful Hand-Off          -> step 4
      20 Jr Day Info                 -> step 7
      21 Campus Visit Invite         -> step 8
      22 Camp Invite                 -> step 9
      23 Pre-Read Invite
      24 HC Contact                  -> step 11
      25 FA Info Submit              -> step 13
      26 Offer Made                  -> step 14
    """
    steps = []
    for defn in STEP_DEFINITIONS:
        sid = defn["step_id"]
        col_idx = POT_STEP_COLUMN_MAP[sid]

        if sid == 1:
            completed = True
        elif col_idx is None:
            completed = False
        else:
            completed = parse_bool(safe_get(pot_row, col_idx))

        steps.append({
            "step_id":      sid,
            "label":        defn["label"],
            "completed":    completed,
            "completed_at": None,
        })

    return steps


def build_journey_steps_default(rq_complete: bool = False, adm_complete: bool = False) -> list[dict]:
    """
    Build a 15-step array with all steps False except:
      step 1 = True (always on the list)
      step 2 = rq_complete  (from Short List boolean if available)
      step 3 = adm_complete (from Short List boolean if available)
    Used when there is no Pre-Offer Tracking row for this school.
    """
    steps = []
    for defn in STEP_DEFINITIONS:
        sid = defn["step_id"]
        if sid == 1:
            completed = True
        elif sid == 2:
            completed = rq_complete
        elif sid == 3:
            completed = adm_complete
        else:
            completed = False
        steps.append({
            "step_id":      sid,
            "label":        defn["label"],
            "completed":    completed,
            "completed_at": None,
        })
    return steps


# ---------------------------------------------------------------------------
# ROW VALIDATION
# ---------------------------------------------------------------------------

def validate_row(row: dict, school_label: str) -> list[str]:
    """
    Validate a built row before insert. Returns a list of warning strings.
    An empty list means the row is clean. Warnings do not block insert.
    Only a missing unitid or user_id is a hard error (returns None from builder).
    """
    warnings = []

    # These are checked in the builder and would return None there —
    # belt-and-suspenders check here.
    if not row.get("user_id"):
        warnings.append(f"[HARD] user_id is not set for {school_label}")
    if not row.get("unitid"):
        warnings.append(f"[HARD] unitid is missing for {school_label}")
    if not row.get("school_name"):
        warnings.append(f"[WARN] school_name is empty for unitid={row.get('unitid')}")

    # Numeric fields: warn if null, don't block
    if row.get("coa") is None:
        warnings.append(f"[WARN] coa is null for {school_label}")
    if row.get("adltv") is None:
        warnings.append(f"[WARN] adltv is null for {school_label}")

    # grit_fit_status must be 'not_evaluated' — never null
    valid_statuses = {
        "not_evaluated", "currently_recommended", "out_of_academic_reach",
        "below_academic_fit", "out_of_athletic_reach", "below_athletic_fit",
        "outside_geographic_reach",
    }
    if row.get("grit_fit_status") not in valid_statuses:
        warnings.append(
            f"[HARD] grit_fit_status='{row.get('grit_fit_status')}' is not a valid value "
            f"for {school_label} — will violate NOT NULL / CHECK constraint"
        )

    # source must be 'grit_fit' or 'manual_add'
    if row.get("source") not in ("grit_fit", "manual_add"):
        warnings.append(
            f"[HARD] source='{row.get('source')}' is not valid for {school_label}"
        )

    # Journey steps must be a 15-element list
    steps = row.get("recruiting_journey_steps")
    if not isinstance(steps, list):
        warnings.append(f"[HARD] recruiting_journey_steps is not a list for {school_label}")
    elif len(steps) != 15:
        warnings.append(
            f"[HARD] recruiting_journey_steps has {len(steps)} steps (expected 15) "
            f"for {school_label}"
        )
    else:
        # Step 1 must always be True
        if not steps[0].get("completed"):
            warnings.append(
                f"[WARN] step 1 (Added to shortlist) is not completed for {school_label}"
            )

    # Reject columns that do not exist in the table
    banned_cols = {"grit_fit_labels", "coach_contact", "camp_link"}
    present_banned = banned_cols & set(row.keys())
    if present_banned:
        warnings.append(
            f"[HARD] payload contains non-existent column(s): {present_banned} "
            f"for {school_label}"
        )

    return warnings


# ---------------------------------------------------------------------------
# ROW BUILDERS
# ---------------------------------------------------------------------------

def build_row_from_short_list(
    user_id: str,
    sl_row: list,
    pot_row: list | None,
) -> dict | None:
    """
    Build a short_list_items insert dict from one Short List tab row.
    Returns None if the row should be skipped (blank UNITID).

    Short List tab columns (0-indexed):
      0  School Name
      1  UNITID
      2  Conference
      3  Completed Recruit Questionnaire   (boolean fallback for step 2)
      4  Completed Admissions Info Request (boolean fallback for step 3)
      5  In Pre-Offer Phase
      6  NCAA Division
      7  Individual School Prospect Camp Link  (IGNORED — column not in table)
      8  Total Annual COA
      9  Total LTDV  (-> adltv)
      10 Years Before Degree Starts Paying You Back  (IGNORED per decision 5)
      11 Lifetime Return on Your Investment           (IGNORED per decision 5)
    """
    unitid_str = safe_get(sl_row, 1).strip()
    if not unitid_str:
        return None  # blank UNITID = AVERAGE/TOTALS row, skip

    try:
        unitid = int(unitid_str)
    except ValueError:
        print(
            f"  WARN: non-numeric UNITID '{unitid_str}' — skipping row",
            file=sys.stderr,
        )
        return None

    school_name = safe_get(sl_row, 0).strip()
    conference  = safe_get(sl_row, 2).strip() or None
    div         = safe_get(sl_row, 6).strip() or None
    coa         = parse_currency(safe_get(sl_row, 8))
    adltv       = parse_currency(safe_get(sl_row, 9))

    # Build journey steps
    if pot_row is not None:
        journey_steps = build_journey_steps_from_pot(pot_row)
    else:
        # Fall back to Short List boolean columns for steps 2 and 3
        rq_complete  = parse_bool(safe_get(sl_row, 3))
        adm_complete = parse_bool(safe_get(sl_row, 4))
        journey_steps = build_journey_steps_default(rq_complete, adm_complete)

    return {
        "user_id":                  user_id,
        "unitid":                   unitid,
        "school_name":              school_name,
        "div":                      div,
        "conference":               conference,
        "state":                    None,
        "match_rank":               None,
        "match_tier":               None,
        "net_cost":                 None,   # decision 5: GRIT FIT recomputes
        "droi":                     None,   # decision 5
        "break_even":               None,   # decision 5
        "adltv":                    adltv,
        "grad_rate":                None,
        "coa":                      coa,
        "dist":                     None,
        "q_link":                   None,
        "coach_link":               None,
        "source":                   "manual_add",
        "grit_fit_status":          "not_evaluated",
        "recruiting_journey_steps": journey_steps,
    }


def build_row_from_target_list(
    user_id: str,
    tl_row: list,
    pot_row: list | None,
) -> dict | None:
    """
    Build a short_list_items insert dict from a Target List tab row.
    Used for Thomas's 3 overflow schools that are Short List=TRUE in the Target
    List but not yet present in the Short List tab.

    Target List tab columns (0-indexed):
      0  School DB Names
      1  UNITID
      2  Target Schools
      3  NCAA Division
      4  Conference
      5  Short List
      6  In Pre-Offer Phase
      7  Sports Medicine
      8  COA
      ... (cols 9-22 are financial/stats fields)
      23 ADLTV
      24 DROI        (IGNORED per decision 5)
      25 Break-Even  (IGNORED per decision 5)
    """
    unitid_str = safe_get(tl_row, 1).strip()
    if not unitid_str:
        return None
    try:
        unitid = int(unitid_str)
    except ValueError:
        return None

    school_name = safe_get(tl_row, 0).strip()
    div         = safe_get(tl_row, 3).strip() or None
    conference  = safe_get(tl_row, 4).strip() or None
    coa         = parse_currency(safe_get(tl_row, 8))
    adltv       = parse_currency(safe_get(tl_row, 23))

    if pot_row is not None:
        journey_steps = build_journey_steps_from_pot(pot_row)
    else:
        journey_steps = build_journey_steps_default()

    return {
        "user_id":                  user_id,
        "unitid":                   unitid,
        "school_name":              school_name,
        "div":                      div,
        "conference":               conference,
        "state":                    None,
        "match_rank":               None,
        "match_tier":               None,
        "net_cost":                 None,
        "droi":                     None,
        "break_even":               None,
        "adltv":                    adltv,
        "grad_rate":                None,
        "coa":                      coa,
        "dist":                     None,
        "q_link":                   None,
        "coach_link":               None,
        "source":                   "manual_add",
        "grit_fit_status":          "not_evaluated",
        "recruiting_journey_steps": journey_steps,
    }


# ---------------------------------------------------------------------------
# INDEX BUILDERS
# ---------------------------------------------------------------------------

def build_pot_index(pot_rows: list[list]) -> dict[str, list]:
    """
    Build a UNITID -> row dict from Pre-Offer Tracking data rows.
    Skips the header row (pot_rows[0]) and any row where UNITID is not numeric.
    """
    index = {}
    for row in pot_rows[1:]:  # skip header
        unitid_str = safe_get(row, 1).strip()
        if unitid_str and unitid_str.isdigit():
            index[unitid_str] = row
    return index


def build_target_list_index(tl_rows: list[list]) -> dict[str, list]:
    """
    Build a UNITID -> row dict from Target List data rows.
    tl_rows[0] is the "HC" grouping row (sheet row 8),
    tl_rows[1] is the column header row (sheet row 9).
    Both are skipped because their UNITID cell is not numeric.
    Data rows start at tl_rows[2].
    """
    index = {}
    for row in tl_rows:
        unitid_str = safe_get(row, 1).strip()
        if unitid_str and unitid_str.isdigit():
            index[unitid_str] = row
    return index


# ---------------------------------------------------------------------------
# SUPABASE INSERT
# ---------------------------------------------------------------------------

def insert_row(row: dict, dry_run: bool) -> bool:
    """POST a single row to short_list_items. Returns True on success."""
    school_label = f"{row.get('school_name', 'unknown')} (unitid={row.get('unitid')})"

    # Validate before sending
    warnings = validate_row(row, school_label)
    hard_errors = [w for w in warnings if w.startswith("[HARD]")]
    soft_warns  = [w for w in warnings if w.startswith("[WARN]")]

    for warn in soft_warns:
        print(f"  {warn}")
    for err in hard_errors:
        print(f"  {err}", file=sys.stderr)

    if hard_errors:
        print(f"  BLOCKED {school_label} — hard validation errors above", file=sys.stderr)
        return False

    if dry_run:
        steps_true = sum(1 for s in row["recruiting_journey_steps"] if s["completed"])
        print(
            f"    [DRY RUN] Would insert: {school_label} | "
            f"coa={row.get('coa')} | adltv={row.get('adltv')} | "
            f"journey_steps_completed={steps_true}/15"
        )
        return True

    url = f"{SUPABASE_URL}/rest/v1/short_list_items"
    headers = {
        "apikey":        SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }
    try:
        resp = requests.post(url, headers=headers, json=row, timeout=15)
    except requests.RequestException as exc:
        print(f"  FAIL {school_label} -> network error: {exc}", file=sys.stderr)
        return False

    if resp.status_code in (200, 201):
        print(f"    OK  {school_label}")
        return True
    elif resp.status_code == 409:
        print(
            f"    SKIP {school_label} -> HTTP 409 (already exists — unique constraint on "
            f"user_id + unitid)"
        )
        # Treat as success to avoid inflating the failed count
        return True
    else:
        print(
            f"    FAIL {school_label} -> HTTP {resp.status_code}: {resp.text}",
            file=sys.stderr,
        )
        return False


# ---------------------------------------------------------------------------
# PER-STUDENT IMPORT
# ---------------------------------------------------------------------------

def import_student(student: dict, dry_run: bool) -> dict:
    """
    Reads all tabs for one student, builds rows, validates, inserts.
    Returns a summary dict.
    """
    name              = student["name"]
    user_id           = student["user_id"]
    sheet_id          = student["sheet_id"]
    expected          = student["expected_rows"]
    overflow_required = student.get("target_list_overflow", set())

    print(f"\n{'='*60}")
    print(f"Student : {name}")
    print(f"user_id : {user_id}")
    print(f"Sheet   : {sheet_id}")
    print(f"{'='*60}")

    # --- Read Short List tab ---
    sl_range = f"2. Short List!A{SHORT_LIST_HEADER_ROW}:L{SHORT_LIST_DATA_END}"
    print(f"  Reading Short List ({sl_range}) ...")
    sl_all = gws_read(sheet_id, sl_range)
    if not sl_all:
        print("  ERROR: No data returned from Short List tab — aborting student", file=sys.stderr)
        return {"name": name, "attempted": 0, "inserted": 0, "failed": 0, "skipped": 0}

    sl_header = sl_all[0]
    sl_data   = sl_all[1:]  # rows 9+ in the sheet

    print(f"  Short List header  : {sl_header}")
    print(f"  Short List data rows (incl. TOTALS): {len(sl_data)}")

    # --- Read Pre-Offer Tracking tab ---
    pot_range = f"4. Pre-Offer Tracking!A{POT_HEADER_ROW}:AA{POT_DATA_END}"
    print(f"  Reading Pre-Offer Tracking ({pot_range}) ...")
    pot_all = gws_read(sheet_id, pot_range)
    if not pot_all:
        print("  WARN: No data from Pre-Offer Tracking — journey steps will use Short List fallback")
    pot_index = build_pot_index(pot_all) if pot_all else {}
    print(f"  Pre-Offer Tracking rows indexed: {len(pot_index)}")

    # --- Read Target List tab (only for students with overflow schools) ---
    tl_index: dict[str, list] = {}
    if overflow_required:
        tl_range = f"1. Target List!A{TARGET_LIST_READ_START}:AH{TARGET_LIST_DATA_END}"
        print(
            f"  Reading Target List ({tl_range}) for "
            f"{len(overflow_required)} overflow school(s): {sorted(overflow_required)} ..."
        )
        tl_all = gws_read(sheet_id, tl_range)
        tl_index = build_target_list_index(tl_all) if tl_all else {}
        print(f"  Target List rows indexed: {len(tl_index)}")

    attempted = 0
    inserted  = 0
    failed    = 0
    skipped   = 0
    seen_unitids: set[str] = set()

    # --- Process Short List rows ---
    print(f"\n  Processing Short List rows ...")
    for sl_row in sl_data:
        unitid_str = safe_get(sl_row, 1).strip()

        if not unitid_str:
            skipped += 1
            continue  # AVERAGE/TOTALS row

        seen_unitids.add(unitid_str)
        pot_row = pot_index.get(unitid_str)

        if pot_row is None:
            school = safe_get(sl_row, 0).strip()
            print(
                f"  WARN: {school} (unitid={unitid_str}) not in Pre-Offer Tracking "
                f"— using Short List boolean fallback for journey steps"
            )

        row = build_row_from_short_list(user_id, sl_row, pot_row)
        if row is None:
            skipped += 1
            continue

        attempted += 1
        if insert_row(row, dry_run):
            inserted += 1
        else:
            failed += 1

        if not dry_run:
            time.sleep(0.1)  # avoid rate-limiting

    # --- Supplement with Target List overflow schools ---
    overflow_missing = overflow_required - seen_unitids
    if overflow_missing:
        print(
            f"\n  Supplementing from Target List: {len(overflow_missing)} school(s) "
            f"not found in Short List tab: {sorted(overflow_missing)}"
        )
        for unitid_str in sorted(overflow_missing):
            tl_row = tl_index.get(unitid_str)
            if tl_row is None:
                print(
                    f"  WARN: UNITID {unitid_str} not found in Target List — skipping",
                    file=sys.stderr,
                )
                skipped += 1
                continue

            pot_row = pot_index.get(unitid_str)
            row = build_row_from_target_list(user_id, tl_row, pot_row)
            if row is None:
                skipped += 1
                continue

            attempted += 1
            if insert_row(row, dry_run):
                inserted += 1
            else:
                failed += 1

            if not dry_run:
                time.sleep(0.1)

    # --- Summary ---
    print(f"\n  Summary for {name}:")
    print(f"    Attempted  : {attempted}")
    print(f"    Inserted   : {inserted}")
    print(f"    Failed     : {failed}")
    print(f"    Skipped    : {skipped} (blank UNITID / parse errors)")

    if attempted != expected:
        print(
            f"  WARN: Expected {expected} rows, attempted {attempted}. "
            f"Verify sheet for new or removed rows."
        )

    return {
        "name":      name,
        "attempted": attempted,
        "inserted":  inserted,
        "failed":    failed,
        "skipped":   skipped,
    }


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Import BC High shortlist data into Supabase short_list_items"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be inserted without writing to Supabase",
    )
    parser.add_argument(
        "--student",
        choices=["thomas", "ayden", "both"],
        default="both",
        help="Which student to import (default: both)",
    )
    args = parser.parse_args()

    students_to_run = []
    if args.student in ("thomas", "both"):
        students_to_run.append(STUDENTS[0])
    if args.student in ("ayden", "both"):
        students_to_run.append(STUDENTS[1])

    print(f"\nShortlist Import — BC High Class 2027")
    print(f"Mode    : {'DRY RUN (no writes)' if args.dry_run else 'LIVE WRITE'}")
    print(f"Target  : {SUPABASE_URL}")
    print(f"Started : {datetime.now(timezone.utc).isoformat()}")

    totals: dict[str, int] = {"attempted": 0, "inserted": 0, "failed": 0, "skipped": 0}

    for student in students_to_run:
        summary = import_student(student, dry_run=args.dry_run)
        for k in totals:
            totals[k] += summary[k]

    print(f"\n{'='*60}")
    print(f"TOTAL ACROSS ALL STUDENTS")
    print(f"  Attempted  : {totals['attempted']}")
    print(f"  Inserted   : {totals['inserted']}")
    print(f"  Failed     : {totals['failed']}")
    print(f"  Skipped    : {totals['skipped']}")
    print(f"Finished    : {datetime.now(timezone.utc).isoformat()}")

    if totals["failed"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
