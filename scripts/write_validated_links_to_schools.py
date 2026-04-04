"""
write_validated_links_to_schools.py

Writes coach_link and prospect_camp_link from a validated CSV directly to the
public.schools table, joining exclusively on confirmed_unitid (IPEDS UNITID).

Source:  extracted/manual_mapping_with_links_4_4_2026_3.csv
Target:  public.schools (Supabase)
Columns: confirmed_unitid, supabase_correct_school_name, coach_url, camp_url

VALIDATION GUARDS (run before any write):
  1. All confirmed_unitid values in the CSV must cast cleanly to int — abort on
     any failure.
  2. All confirmed_unitid values must exist in the production schools table —
     abort and list all missing unitids if any are not found.

WRITE LOGIC:
  - coach_link  is always written (from coach_url).
  - prospect_camp_link is written ONLY when camp_url is non-empty. Empty camp_url
    means "skip this field" — the existing production value is preserved. No NULL
    write, no empty-string write.
  - String sentinels are converted to None before write. Sentinel set:
    'NOT_FOUND', 'NEEDS_REVIEW', 'Football Camp Link', 'N/A', 'None', 'n/a',
    'none'.
  - 17 camp URLs with http:// protocol are written as-is per project ruling.
    No protocol normalization.

MODES:
  --dry-run  (default): validate and log everything; no DB writes.
             Output saved to extracted/dry_run_output_20260405.csv.
  --execute: live production write. Requires interactive confirmation.

Run log saved to extracted/import_run_log_20260405.txt on every run.

Auth: SUPABASE_SERVICE_ROLE_KEY from .env (service role required for schools write)

Reference: DEC-CFBRB-082

Usage:
  pip install python-dotenv requests
  python scripts/write_validated_links_to_schools.py             # dry run
  python scripts/write_validated_links_to_schools.py --execute   # production
"""

import argparse
import csv
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

# ============================================================
# Config
# ============================================================

PROJECT_ROOT  = Path(__file__).resolve().parent.parent
EXTRACTED_DIR = PROJECT_ROOT / "extracted"

SOURCE_CSV     = EXTRACTED_DIR / "manual_mapping_with_links_4_4_2026_3.csv"
DRY_RUN_OUTPUT = EXTRACTED_DIR / "dry_run_output_20260405.csv"
RUN_LOG        = EXTRACTED_DIR / "import_run_log_20260405.txt"

# Supabase pagination: fetch all schools in pages of this size
FETCH_PAGE_SIZE = 1000

load_dotenv(PROJECT_ROOT / ".env")

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    sys.exit(1)

# ============================================================
# Sentinel set (DEC-CFBRB-080 + extended per requirements)
# ============================================================

_URL_SENTINELS = {
    "NOT_FOUND",
    "NEEDS_REVIEW",
    "Football Camp Link",
    "N/A",
    "None",
    "n/a",
    "none",
}


# ============================================================
# Logging helpers
# ============================================================

_log_lines: list[str] = []


def _log(msg: str) -> None:
    """Print to stdout and buffer for run log file."""
    print(msg)
    _log_lines.append(msg)


def _flush_log() -> None:
    """Write buffered log lines to RUN_LOG."""
    try:
        with open(RUN_LOG, "w", encoding="utf-8") as f:
            f.write("\n".join(_log_lines) + "\n")
    except OSError as e:
        print(f"WARN: could not write run log to {RUN_LOG}: {e}")


# ============================================================
# Supabase helpers
# ============================================================

def _headers() -> dict:
    return {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }


def _get_headers() -> dict:
    h = _headers()
    h["Prefer"] = "return=representation"
    return h


def fetch_all_production_unitids() -> set[int]:
    """
    Fetch every unitid from public.schools, paginated.
    Returns a set of ints.
    Aborts on any HTTP error.
    """
    unitids: set[int] = set()
    offset = 0

    while True:
        url = (
            f"{SUPABASE_URL}/rest/v1/schools"
            f"?select=unitid"
            f"&limit={FETCH_PAGE_SIZE}"
            f"&offset={offset}"
        )
        try:
            resp = requests.get(url, headers=_get_headers(), timeout=30)
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"ERROR: failed to fetch production unitids (offset={offset}): {e}")
            sys.exit(1)

        page = resp.json()
        if not page:
            break

        for row in page:
            uid = row.get("unitid")
            if uid is not None:
                try:
                    unitids.add(int(uid))
                except (TypeError, ValueError):
                    pass  # skip malformed DB rows

        if len(page) < FETCH_PAGE_SIZE:
            break
        offset += FETCH_PAGE_SIZE

    return unitids


# ============================================================
# URL cleaning
# ============================================================

def _clean_url(raw: str | None) -> str | None:
    """
    Strip whitespace. Return None if blank or a known sentinel.
    Also catches float NaN that pandas-style readers produce.
    """
    if raw is None:
        return None

    # Guard against float NaN that may survive CSV read edge cases
    if isinstance(raw, float) and math.isnan(raw):
        return None

    val = str(raw).strip()
    if not val:
        return None

    if val in _URL_SENTINELS:
        return None

    return val


# ============================================================
# CSV loading
# ============================================================

def load_source_csv() -> list[dict]:
    """
    Read SOURCE_CSV. Returns a list of validated row dicts with keys:
      unitid (int), school_name (str), coach_url (str|None), camp_url (str|None)

    Aborts the entire script if:
      - file not found
      - required columns missing
      - ANY unitid fails to cast to int
    """
    if not SOURCE_CSV.exists():
        print(f"ERROR: source CSV not found: {SOURCE_CSV}")
        sys.exit(1)

    rows: list[dict] = []
    cast_errors: list[str] = []

    with open(SOURCE_CSV, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        # Column validation
        required = {"confirmed_unitid", "supabase_correct_school_name", "coach_url", "camp_url"}
        actual   = set(reader.fieldnames or [])
        missing  = required - actual
        if missing:
            print(f"ERROR: source CSV is missing required columns: {missing}")
            print(f"  Found columns: {sorted(actual)}")
            sys.exit(1)

        for line_num, raw in enumerate(reader, start=2):  # 2 = first data row
            unitid_raw  = (raw.get("confirmed_unitid") or "").strip()
            school_name = (raw.get("supabase_correct_school_name") or "").strip()
            coach_raw   = raw.get("coach_url", "")
            camp_raw    = raw.get("camp_url", "")

            # Conservative unitid cast: whitespace -> float -> int -> validate
            try:
                # float() first handles values like "123456.0"
                unitid = int(float(unitid_raw))
                # Confirm round-trip: no fractional part should survive
                if abs(float(unitid_raw) - unitid) > 1e-9:
                    raise ValueError(f"fractional unitid: '{unitid_raw}'")
            except (ValueError, TypeError):
                cast_errors.append(
                    f"  Row {line_num}: confirmed_unitid='{unitid_raw}' "
                    f"school='{school_name}' — cannot cast to int"
                )
                continue

            rows.append({
                "unitid":      unitid,
                "school_name": school_name,
                "coach_url":   coach_raw,
                "camp_url":    camp_raw,
            })

    if cast_errors:
        print("ABORT — unitid cast failure(s) detected. No writes will occur.")
        print(f"  {len(cast_errors)} failing row(s):")
        for err in cast_errors:
            print(err)
        sys.exit(1)

    return rows


# ============================================================
# Sentinel check
# ============================================================

def _apply_sentinels(
    unitid: int,
    school_name: str,
    coach_raw: str | None,
    camp_raw: str | None,
) -> tuple[str | None, str | None]:
    """
    Apply sentinel cleaning to both URL fields.
    Logs a WARNING for each sentinel hit.
    Returns (coach_url_clean, camp_url_clean).
    """
    coach_cleaned = _clean_url(coach_raw)
    camp_cleaned  = _clean_url(camp_raw)

    if coach_raw and coach_cleaned is None:
        _log(f"  WARN  sentinel detected — unitid={unitid} ({school_name}) "
             f"coach_url='{coach_raw}' -> None")

    if camp_raw and camp_cleaned is None:
        _log(f"  WARN  sentinel detected — unitid={unitid} ({school_name}) "
             f"camp_url='{camp_raw}' -> None")

    return coach_cleaned, camp_cleaned


# ============================================================
# Production write
# ============================================================

def patch_school(unitid: int, payload: dict) -> tuple[bool, str]:
    """
    PATCH public.schools WHERE unitid = {unitid}.
    Returns (success: bool, message: str).
    Does NOT abort on failure — caller logs and continues.
    """
    url = f"{SUPABASE_URL}/rest/v1/schools?unitid=eq.{unitid}"
    try:
        resp = requests.patch(url, headers=_headers(), json=payload, timeout=30)
        if resp.status_code in (200, 204):
            return True, f"HTTP {resp.status_code}"
        else:
            return False, f"HTTP {resp.status_code}: {resp.text[:300]}"
    except requests.RequestException as e:
        return False, f"RequestException: {e}"


# ============================================================
# Main pipeline
# ============================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Write coach_link and prospect_camp_link to public.schools from validated CSV."
    )
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Validate and log without writing to DB (implied default if --execute not given)",
    )
    mode_group.add_argument(
        "--execute",
        action="store_true",
        default=False,
        help="Perform live production writes. Requires interactive confirmation.",
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        default=False,
        help="Skip interactive y/N prompt in --execute mode. For automated/scripted runs only. "
             "Added 2026-04-04 to support non-interactive execution (Patch).",
    )
    args = parser.parse_args()

    # Default to dry-run if neither flag given
    dry_run = not args.execute

    run_ts = datetime.now(timezone.utc).isoformat()
    mode_label = "DRY RUN" if dry_run else "EXECUTE (PRODUCTION)"

    _log("=" * 60)
    _log(f"write_validated_links_to_schools.py — {mode_label}")
    _log(f"Started: {run_ts}")
    _log("=" * 60)
    _log("")

    # ----------------------------------------------------------
    # STEP 1 — Load and cast-validate CSV
    # ----------------------------------------------------------
    _log("STEP 1 — Loading source CSV")
    _log(f"  Source: {SOURCE_CSV}")
    rows = load_source_csv()
    _log(f"  Rows loaded: {len(rows)}")
    _log("")

    # ----------------------------------------------------------
    # STEP 2 — Production unitid index + validation guard
    # ----------------------------------------------------------
    _log("STEP 2 — Fetching production unitid index from schools table")
    prod_unitids = fetch_all_production_unitids()
    _log(f"  Production schools found: {len(prod_unitids)}")

    csv_unitids   = {r["unitid"] for r in rows}
    missing_uids  = sorted(csv_unitids - prod_unitids)

    if missing_uids:
        _log("")
        _log(f"ABORT — {len(missing_uids)} CSV unitid(s) not found in production schools table.")
        _log("  Missing unitids:")
        for uid in missing_uids:
            # Try to find the school name for context
            name = next((r["school_name"] for r in rows if r["unitid"] == uid), "unknown")
            _log(f"    {uid}  ({name})")
        _log("No writes performed.")
        _flush_log()
        sys.exit(1)

    _log(f"  Validation passed — all {len(csv_unitids)} CSV unitids present in production.")
    _log("")

    # ----------------------------------------------------------
    # STEP 3 — Build payloads + sentinel pass
    # ----------------------------------------------------------
    _log("STEP 3 — Building write payloads")

    payloads: list[dict] = []   # {unitid, school_name, coach_link, camp_link_or_skip}

    camp_skip_count  = 0
    camp_write_count = 0
    sentinel_count   = 0

    for row in rows:
        unitid      = row["unitid"]
        school_name = row["school_name"]
        coach_raw   = row["coach_url"]
        camp_raw    = row["camp_url"]

        coach_clean, camp_clean = _apply_sentinels(unitid, school_name, coach_raw, camp_raw)

        if coach_raw and coach_clean is None:
            sentinel_count += 1
        if camp_raw and camp_clean is None:
            sentinel_count += 1

        # Build payload
        payload: dict = {}

        # coach_link: always written (even if None — this clears a stale value)
        # Per spec: "ALWAYS include: coach_link = coach_url value"
        payload["coach_link"] = coach_clean

        # prospect_camp_link: only written when non-empty
        if camp_clean:
            payload["prospect_camp_link"] = camp_clean
            camp_write_count += 1
        else:
            camp_skip_count += 1

        payloads.append({
            "unitid":             unitid,
            "school_name":        school_name,
            "coach_link":         coach_clean,
            "prospect_camp_link": camp_clean,  # None means skip
        })

    _log(f"  Total rows:                  {len(payloads)}")
    _log(f"  coach_link writes:           {len(payloads)}")
    _log(f"  prospect_camp_link writes:   {camp_write_count}")
    _log(f"  prospect_camp_link skipped:  {camp_skip_count} (empty — preserving production value)")
    if sentinel_count:
        _log(f"  Sentinel conversions:        {sentinel_count} (see WARN lines above)")
    _log("")

    # ----------------------------------------------------------
    # STEP 4 — Dry run output or production write
    # ----------------------------------------------------------

    if dry_run:
        _log("STEP 4 — DRY RUN: logging what would be written")
        _log(f"  Output CSV: {DRY_RUN_OUTPUT}")
        _log("")

        dry_fieldnames = [
            "unitid", "school_name",
            "coach_link_value",
            "prospect_camp_link_value",
            "action",
        ]

        with open(DRY_RUN_OUTPUT, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=dry_fieldnames)
            writer.writeheader()

            for p in payloads:
                camp_display = p["prospect_camp_link"] if p["prospect_camp_link"] else "SKIP"
                writer.writerow({
                    "unitid":                  p["unitid"],
                    "school_name":             p["school_name"],
                    "coach_link_value":        p["coach_link"] or "(None — will clear field)",
                    "prospect_camp_link_value": camp_display,
                    "action":                  "would_update",
                })
                _log(
                    f"  DRY RUN  unitid={p['unitid']:>7}  "
                    f"coach={'SET' if p['coach_link'] else 'CLEAR'}  "
                    f"camp={'SET' if p['prospect_camp_link'] else 'SKIP'}  "
                    f"({p['school_name']})"
                )

        _log("")
        _log("=" * 60)
        _log("DRY RUN SUMMARY")
        _log("=" * 60)
        _log(f"  Rows that would be updated:       {len(payloads)}")
        _log(f"  coach_link updates:               {len(payloads)}")
        _log(f"  prospect_camp_link updates:       {camp_write_count}")
        _log(f"  prospect_camp_link skipped:       {camp_skip_count}")
        _log(f"  Dry run output saved to:          {DRY_RUN_OUTPUT}")
        _log(f"  Run log saved to:                 {RUN_LOG}")
        _log("")
        _log("To execute production writes, run with --execute flag.")

    else:
        # ---- PRODUCTION MODE ----
        _log("STEP 4 — PRODUCTION WRITE")
        _log("")
        _log("=" * 60)
        print(
            f"About to update {len(payloads)} rows in production.\n"
            f"  Coach_link: {len(payloads)} updates.\n"
            f"  Prospect_camp_link: {camp_write_count} updates "
            f"({camp_skip_count} skipped).\n"
        )
        if args.confirm:
            _log("--confirm flag present — skipping interactive prompt.")
            confirm = "y"
        else:
            confirm = input("Proceed? [y/N] ").strip().lower()
        if confirm != "y":
            _log("Aborted by user.")
            _flush_log()
            sys.exit(0)

        _log("")
        _log("Writing to production...")
        _log("")

        succeeded      = 0
        failed         = 0
        failed_unitids: list[tuple[int, str]] = []

        for p in payloads:
            unitid      = p["unitid"]
            school_name = p["school_name"]

            # Build actual DB payload
            db_payload: dict = {"coach_link": p["coach_link"]}
            if p["prospect_camp_link"] is not None:
                db_payload["prospect_camp_link"] = p["prospect_camp_link"]

            success, msg = patch_school(unitid, db_payload)

            if success:
                succeeded += 1
                _log(
                    f"  OK    unitid={unitid:>7}  "
                    f"coach={'SET' if p['coach_link'] else 'CLEAR'}  "
                    f"camp={'SET' if p['prospect_camp_link'] else 'SKIP'}  "
                    f"({school_name})"
                )
            else:
                failed += 1
                failed_unitids.append((unitid, msg))
                _log(
                    f"  FAIL  unitid={unitid:>7}  "
                    f"({school_name})  ERROR: {msg}"
                )

        _log("")
        _log("=" * 60)
        _log("PRODUCTION RUN SUMMARY")
        _log("=" * 60)
        _log(f"  Total attempted:            {len(payloads)}")
        _log(f"  Succeeded:                  {succeeded}")
        _log(f"  Failed:                     {failed}")
        if failed_unitids:
            _log("  Failed unitids:")
            for uid, err_msg in failed_unitids:
                _log(f"    {uid}: {err_msg}")
        _log(f"  Run log saved to:           {RUN_LOG}")

    _flush_log()


if __name__ == "__main__":
    main()
