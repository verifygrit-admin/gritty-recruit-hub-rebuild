"""
import_shortlist_belmont_hill.py
--------------------------------
Sprint 019 — Seed short_list_items rows for the three Belmont Hill students
(Monteiro, Kromah, Copeland) from the operator-curated CSV.

Forked from scripts/import_shortlist_bc_high.py with the following deltas:
  - Source is a flat CSV (not Google Sheets via gws CLI). 54 rows total.
  - Each row already carries user_id and unitid (resolved upstream).
  - Journey steps come from 14 CSV boolean columns (added_to_shortlist plus 13
    progression flags). Step 10 (Coach contacted student via text) has no CSV
    column and remains False.
  - Denorm fields (school_name from CSV, div/conference/state plus
    recruiting_q_link/coach_link from a single bulk lookup against
    public.schools, populating short_list_items.q_link and coach_link).
  - Upsert (Prefer: resolution=merge-duplicates) on the (user_id, unitid)
    unique constraint. Columns not in the payload are untouched on conflict,
    preserving any GRIT-FIT-derived values populated by a future GRIT FIT run.

DATA SOURCE
  src/assets/Belmont Hill_Recruit Journey Seeding - RecruitJourneySteps.csv

CSV COLUMN -> step_id MAPPING (verified against migrations 0009/0024/0037 and
the live public.short_list_items.recruiting_journey_steps DEFAULT, project
xyudnajzhuwdauwkwsbh, 2026-05-08):

  added_to_shortlist        -> step 1   Added to shortlist
  complete_recruit_q        -> step 2   Completed recruiting questionnaire
  complete_admiss_form      -> step 3   Completed admissions info form
  asst_coach_contact        -> step 4   Assistant coach contacted student
  contact_email             -> step 5   Contacted coach via email
  contact_social_media      -> step 6   Contacted coach via social media
  junior_day_invite         -> step 7   Received junior day invite
  visit_tour_confirmed      -> step 8   Tour / Visit Confirmed
  prospect_camp_invite      -> step 9   Received prospect camp invite
  (no CSV column)           -> step 10  Coach contacted student via text  [always False]
  contact_head_coach        -> step 11  Head coach contacted student
  preread_request           -> step 12  Admissions Pre-Read Requested
  fin_aid_submit            -> step 13  Financial Aid Pre-Read Submitted
  verbal_offer              -> step 14  Received verbal offer
  written_offer             -> step 15  Received written offer

UPSERT BEHAVIOR
  Payload columns (sent on every write):
    user_id, unitid, school_name, div, conference, state, q_link, coach_link,
    source, recruiting_journey_steps, updated_at
  Omitted on payload (DEFAULT on insert, UNTOUCHED on conflict):
    id, match_rank, match_tier, net_cost, droi, break_even, adltv, grad_rate,
    coa, dist, grit_fit_status, added_at

EXPECTED ROW COUNTS (verified against CSV, 2026-05-08):
  Ky-Mani Monteiro : 15
  Ajani Kromah     : 11
  Ricky Copeland   : 28
  Total            : 54

RUN (dry-run, single student)
  python scripts/import_shortlist_belmont_hill.py --dry-run --student monteiro

RUN (live, all students)
  python scripts/import_shortlist_belmont_hill.py --student all
"""

import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

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

REPO_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = REPO_ROOT / "src" / "assets" / "Belmont Hill_Recruit Journey Seeding - RecruitJourneySteps.csv"

STUDENT_KEYS = {
    "monteiro": "d892c717-214a-4117-9c54-2ba8aebca533",
    "kromah":   "99942a06-44ff-4f78-ba6c-2f31edfa9c6a",
    "copeland": "799b483a-97ed-49e2-8f4d-aac8c803c8ad",
}
STUDENT_LABELS = {
    "monteiro": "Ky-Mani Monteiro",
    "kromah":   "Ajani Kromah",
    "copeland": "Ricky Copeland",
}
EXPECTED_COUNTS = {
    "monteiro": 15,
    "kromah":   11,
    "copeland": 28,
}

VALID_GRIT_FIT_STATUSES = {
    "not_evaluated", "currently_recommended", "out_of_academic_reach",
    "below_academic_fit", "out_of_athletic_reach", "below_athletic_fit",
    "outside_geographic_reach",
}


# ---------------------------------------------------------------------------
# JOURNEY STEP DEFINITIONS  (must match live DB DEFAULT, post-0037)
# ---------------------------------------------------------------------------

STEP_DEFINITIONS = [
    {"step_id": 1,  "label": "Added to shortlist"},
    {"step_id": 2,  "label": "Completed recruiting questionnaire"},
    {"step_id": 3,  "label": "Completed admissions info form"},
    {"step_id": 4,  "label": "Assistant coach contacted student"},
    {"step_id": 5,  "label": "Contacted coach via email"},
    {"step_id": 6,  "label": "Contacted coach via social media"},
    {"step_id": 7,  "label": "Received junior day invite"},
    {"step_id": 8,  "label": "Tour / Visit Confirmed"},
    {"step_id": 9,  "label": "Received prospect camp invite"},
    {"step_id": 10, "label": "Coach contacted student via text"},
    {"step_id": 11, "label": "Head coach contacted student"},
    {"step_id": 12, "label": "Admissions Pre-Read Requested"},
    {"step_id": 13, "label": "Financial Aid Pre-Read Submitted"},
    {"step_id": 14, "label": "Received verbal offer"},
    {"step_id": 15, "label": "Received written offer"},
]

# CSV column -> step_id (None means no CSV column for that step)
CSV_STEP_COLUMN_MAP = {
    1:  "added_to_shortlist",
    2:  "complete_recruit_q",
    3:  "complete_admiss_form",
    4:  "asst_coach_contact",
    5:  "contact_email",
    6:  "contact_social_media",
    7:  "junior_day_invite",
    8:  "visit_tour_confirmed",
    9:  "prospect_camp_invite",
    10: None,                       # no CSV column -> always False
    11: "contact_head_coach",
    12: "preread_request",
    13: "fin_aid_submit",
    14: "verbal_offer",
    15: "written_offer",
}


# ---------------------------------------------------------------------------
# PARSERS / BUILDERS
# ---------------------------------------------------------------------------

def parse_bool(val) -> bool:
    """Convert 'TRUE' / '' / None to bool. Empty or missing = False."""
    return str(val or "").strip().upper() == "TRUE"


def build_journey_steps(row: dict) -> list[dict]:
    """Build the 15-step JSONB array from one CSV row."""
    steps = []
    for defn in STEP_DEFINITIONS:
        sid = defn["step_id"]
        col = CSV_STEP_COLUMN_MAP[sid]
        completed = parse_bool(row.get(col)) if col else False
        steps.append({
            "step_id":      sid,
            "label":        defn["label"],
            "completed":    completed,
            "completed_at": None,
        })
    return steps


# ---------------------------------------------------------------------------
# SCHOOLS INDEX (single bulk fetch)
# ---------------------------------------------------------------------------

def fetch_schools_index(unitids: list[int]) -> dict[int, dict]:
    """
    GET public.schools rows for the given unitids in a single call. Returns a
    dict keyed by unitid with keys (div, conference, state, q_link, coach_link).
    Missing unitids are simply absent from the dict.
    """
    if not unitids:
        return {}
    unitid_csv = ",".join(str(u) for u in sorted(set(unitids)))
    url = (
        f"{SUPABASE_URL}/rest/v1/schools"
        f"?unitid=in.({unitid_csv})"
        f"&select=unitid,ncaa_division,conference,state,recruiting_q_link,coach_link"
    )
    headers = {
        "apikey":        SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Accept":        "application/json",
    }
    resp = requests.get(url, headers=headers, timeout=20)
    if resp.status_code != 200:
        print(
            f"  ERROR: schools lookup failed -> HTTP {resp.status_code}: {resp.text}",
            file=sys.stderr,
        )
        return {}
    rows = resp.json()
    return {
        int(r["unitid"]): {
            "div":        r.get("ncaa_division"),
            "conference": r.get("conference"),
            "state":      r.get("state"),
            "q_link":     r.get("recruiting_q_link"),
            "coach_link": r.get("coach_link"),
        }
        for r in rows
    }


# ---------------------------------------------------------------------------
# ROW BUILDER + VALIDATION
# ---------------------------------------------------------------------------

def build_row(csv_row: dict, schools_index: dict[int, dict]) -> dict | None:
    """
    Build one short_list_items upsert payload from one CSV row.
    Returns None if the CSV row is unusable (missing user_id or unitid).
    """
    user_id = csv_row.get("user_id", "").strip()
    unitid_str = csv_row.get("unitid", "").strip()
    if not user_id or not unitid_str:
        return None
    try:
        unitid = int(unitid_str)
    except ValueError:
        print(
            f"  WARN: non-numeric unitid '{unitid_str}' for "
            f"{csv_row.get('name', '?')} / {csv_row.get('college', '?')} -- skipping",
            file=sys.stderr,
        )
        return None

    school_name = (csv_row.get("college") or "").strip() or None
    denorm = schools_index.get(unitid)
    if denorm is None:
        print(
            f"  [WARN] unitid {unitid} ({school_name}) not found in public.schools "
            f"-- denorm fields left null"
        )
        denorm = {
            "div": None, "conference": None, "state": None,
            "q_link": None, "coach_link": None,
        }

    return {
        "user_id":                  user_id,
        "unitid":                   unitid,
        "school_name":              school_name,
        "div":                      denorm["div"],
        "conference":               denorm["conference"],
        "state":                    denorm["state"],
        "q_link":                   denorm["q_link"],
        "coach_link":               denorm["coach_link"],
        "source":                   "manual_add",
        "recruiting_journey_steps": build_journey_steps(csv_row),
        "updated_at":               datetime.now(timezone.utc).isoformat(),
    }


def validate_row(row: dict, label: str) -> list[str]:
    """Return a list of warning strings. [HARD] entries block the write."""
    warnings: list[str] = []

    if not row.get("user_id"):
        warnings.append(f"[HARD] user_id missing for {label}")
    if not row.get("unitid"):
        warnings.append(f"[HARD] unitid missing for {label}")
    if not row.get("school_name"):
        warnings.append(f"[WARN] school_name empty for unitid={row.get('unitid')}")
    if row.get("source") not in ("grit_fit", "manual_add"):
        warnings.append(
            f"[HARD] source='{row.get('source')}' is not valid for {label}"
        )

    steps = row.get("recruiting_journey_steps")
    if not isinstance(steps, list):
        warnings.append(f"[HARD] recruiting_journey_steps not a list for {label}")
    elif len(steps) != 15:
        warnings.append(
            f"[HARD] recruiting_journey_steps has {len(steps)} steps "
            f"(expected 15) for {label}"
        )
    else:
        for i, step in enumerate(steps):
            expected_sid = i + 1
            if step.get("step_id") != expected_sid:
                warnings.append(
                    f"[HARD] step at index {i} has step_id={step.get('step_id')} "
                    f"(expected {expected_sid}) for {label}"
                )
                break
        if not steps[0].get("completed"):
            warnings.append(
                f"[WARN] step 1 (Added to shortlist) is not completed for {label}"
            )

    return warnings


# ---------------------------------------------------------------------------
# UPSERT
# ---------------------------------------------------------------------------

def upsert_row(row: dict, dry_run: bool) -> bool:
    """
    Upsert one row via PostgREST with Prefer: resolution=merge-duplicates.
    On conflict the unique constraint (user_id, unitid) fires and only the
    columns in the payload are updated; omitted columns are untouched.
    Returns True on success.
    """
    label = f"{row.get('school_name', '?')} (unitid={row.get('unitid')})"

    warnings = validate_row(row, label)
    hard = [w for w in warnings if w.startswith("[HARD]")]
    soft = [w for w in warnings if w.startswith("[WARN]")]
    for w in soft:
        print(f"  {w}")
    for w in hard:
        print(f"  {w}", file=sys.stderr)
    if hard:
        print(f"  BLOCKED {label} -- hard validation errors above", file=sys.stderr)
        return False

    if dry_run:
        steps_true = sum(1 for s in row["recruiting_journey_steps"] if s["completed"])
        print(
            f"    [DRY RUN] Would upsert: {label} | "
            f"div={row.get('div')!r} | conf={row.get('conference')!r} | "
            f"state={row.get('state')!r} | journey={steps_true}/15 completed"
        )
        return True

    url = f"{SUPABASE_URL}/rest/v1/short_list_items?on_conflict=user_id,unitid"
    headers = {
        "apikey":        SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "resolution=merge-duplicates,return=minimal",
    }
    try:
        resp = requests.post(url, headers=headers, json=row, timeout=15)
    except requests.RequestException as exc:
        print(f"  FAIL {label} -> network error: {exc}", file=sys.stderr)
        return False

    if resp.status_code in (200, 201, 204):
        print(f"    OK  {label}")
        return True
    print(
        f"    FAIL {label} -> HTTP {resp.status_code}: {resp.text}",
        file=sys.stderr,
    )
    return False


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def load_csv() -> list[dict]:
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV not found at {CSV_PATH}")
    with CSV_PATH.open(newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def filter_rows(rows: list[dict], student_arg: str) -> list[dict]:
    if student_arg == "all":
        keep = set(STUDENT_KEYS.values())
    else:
        keep = {STUDENT_KEYS[student_arg]}
    return [r for r in rows if r.get("user_id", "").strip() in keep]


def print_dry_run_detail(row: dict, schools_index: dict[int, dict]):
    """Print full resolved JSONB + denorm for a single row, for eyeball-check."""
    label = f"{row.get('school_name', '?')} (unitid={row.get('unitid')})"
    print(f"\n  --- DRY RUN DETAIL: {label} ---")
    print(f"    user_id:    {row['user_id']}")
    print(f"    unitid:     {row['unitid']}")
    print(f"    school_name:{row['school_name']!r}")
    print(f"    div:        {row['div']!r}")
    print(f"    conference: {row['conference']!r}")
    print(f"    state:      {row['state']!r}")
    print(f"    q_link:     {row['q_link']!r}")
    print(f"    coach_link: {row['coach_link']!r}")
    print(f"    source:     {row['source']!r}")
    print(f"    updated_at: {row['updated_at']}")
    print(f"    recruiting_journey_steps:")
    for step in row["recruiting_journey_steps"]:
        flag = "X" if step["completed"] else " "
        print(f"      [{flag}] step {step['step_id']:>2}  {step['label']}")
    print(f"  --- END DETAIL ---\n")


def main():
    parser = argparse.ArgumentParser(
        description="Import Belmont Hill shortlist CSV into Supabase short_list_items"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Print intended writes without hitting the DB")
    parser.add_argument("--student",
                        choices=["monteiro", "kromah", "copeland", "all"],
                        default="all",
                        help="Which student to process (default: all)")
    parser.add_argument("--detail-unitid", type=int, action="append", default=[],
                        help="In dry-run, print full resolved row for this unitid "
                             "(repeatable)")
    args = parser.parse_args()

    print(f"\nShortlist Import -- Belmont Hill (Sprint 019)")
    print(f"Mode    : {'DRY RUN (no writes)' if args.dry_run else 'LIVE WRITE'}")
    print(f"Student : {args.student}")
    print(f"CSV     : {CSV_PATH}")
    print(f"Target  : {SUPABASE_URL}")
    print(f"Started : {datetime.now(timezone.utc).isoformat()}")

    csv_rows = load_csv()
    print(f"  CSV rows: {len(csv_rows)} (expected 54)")

    rows_for_run = filter_rows(csv_rows, args.student)
    print(f"  Rows for this run: {len(rows_for_run)}")

    if args.student != "all":
        expected = EXPECTED_COUNTS[args.student]
        if len(rows_for_run) != expected:
            print(
                f"  WARN: expected {expected} rows for {args.student}, "
                f"got {len(rows_for_run)}"
            )

    unitids = [int(r["unitid"]) for r in rows_for_run if r.get("unitid", "").strip().isdigit()]
    print(f"  Unique unitids to look up: {len(set(unitids))}")
    schools_index = fetch_schools_index(unitids)
    missing_in_schools = sorted(set(unitids) - set(schools_index.keys()))
    if missing_in_schools:
        print(f"  WARN: {len(missing_in_schools)} unitid(s) not in public.schools: "
              f"{missing_in_schools}")
    else:
        print(f"  All unitids resolved in public.schools.")

    totals = {"attempted": 0, "succeeded": 0, "failed": 0, "skipped": 0}
    detail_targets = set(args.detail_unitid)

    by_student: dict[str, dict[str, int]] = {}

    for csv_row in rows_for_run:
        student_name = csv_row.get("name", "?")
        bucket = by_student.setdefault(student_name, {"a": 0, "s": 0, "f": 0})

        row = build_row(csv_row, schools_index)
        if row is None:
            totals["skipped"] += 1
            continue

        if args.dry_run and row["unitid"] in detail_targets:
            print_dry_run_detail(row, schools_index)

        totals["attempted"] += 1
        bucket["a"] += 1
        if upsert_row(row, args.dry_run):
            totals["succeeded"] += 1
            bucket["s"] += 1
        else:
            totals["failed"] += 1
            bucket["f"] += 1

        if not args.dry_run:
            time.sleep(0.05)

    print(f"\n{'='*60}")
    print(f"PER-STUDENT")
    for name, b in by_student.items():
        print(f"  {name:25s}  attempted={b['a']:>3}  ok={b['s']:>3}  fail={b['f']:>3}")
    print(f"\nTOTAL")
    print(f"  Attempted : {totals['attempted']}")
    print(f"  Succeeded : {totals['succeeded']}")
    print(f"  Failed    : {totals['failed']}")
    print(f"  Skipped   : {totals['skipped']}")
    print(f"Finished : {datetime.now(timezone.utc).isoformat()}")

    if totals["failed"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
