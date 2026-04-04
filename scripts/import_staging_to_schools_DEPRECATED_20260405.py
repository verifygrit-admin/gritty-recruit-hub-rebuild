"""
DEPRECATED — 2026-04-05
========================
This script has been deprecated and must not be used for production writes.

Reason: Row-index collision bug (C-002). This script joined staging rows to the
production schools table via row_index, which is a staging-internal sequence number
unrelated to school identity. On any re-import or staging re-population, row_index
values will not align with the same schools, causing writes to land on wrong rows.

Replaced by: write_validated_links_to_schools.py
             Joins exclusively on confirmed_unitid (IPEDS UNITID) — a stable,
             authoritative school identity key.

Reference: DEC-CFBRB-082

Do not run this script. Do not restore it. Archive only.
========================

import_staging_to_schools.py

Four-step pipeline:
  1. Load extracted/manual_mapping_confirmed.csv and build a confirmed_unitid lookup.
  2. Update school_link_staging with confirmed unitids (match_status = 'manually_confirmed').
  3. Dedup: select one winning row per unitid; mark all losing rows 'dedup_excluded'.
  4. Export two CSVs:
       extracted/import_ready.csv  — winning rows (ready for production insert)
       extracted/dedup_review.csv  — excluded rows (for audit)

IMPORTANT — schema constraint note:
  The school_link_staging.match_status CHECK constraint (0028_school_link_staging.sql)
  currently allows: pending | auto_confirmed | manually_confirmed | unresolved
  'dedup_excluded' is not in the constraint. STEP 3 will fail at the DB level until
  the migration is updated to add 'dedup_excluded' to the CHECK constraint, e.g.:
      ALTER TABLE public.school_link_staging
          DROP CONSTRAINT school_link_staging_match_status_check,
          ADD CONSTRAINT school_link_staging_match_status_check CHECK (
              match_status IS NULL OR match_status IN (
                  'pending', 'auto_confirmed', 'manually_confirmed',
                  'unresolved', 'dedup_excluded'
              )
          );
  Update 0028_school_link_staging.sql and run the migration before running this script.

Scope:
  - Reads:  extracted/manual_mapping_confirmed.csv
  - Writes: school_link_staging (PATCH rows only — no INSERT, no DELETE)
  - Writes: extracted/import_ready.csv
  - Writes: extracted/dedup_review.csv
  - Does NOT touch: college_coaches, recruiting_events, schools

Auth: SUPABASE_SERVICE_ROLE_KEY from .env (service role for staging updates)

Usage:
  pip install python-dotenv requests
  python scripts/import_staging_to_schools.py
"""

import csv
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

# ============================================================
# Config
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent
EXTRACTED_DIR = PROJECT_ROOT / "extracted"

MANUAL_MAPPING_CSV = EXTRACTED_DIR / "manual_mapping_confirmed.csv"
IMPORT_READY_CSV   = EXTRACTED_DIR / "import_ready.csv"
DEDUP_REVIEW_CSV   = EXTRACTED_DIR / "dedup_review.csv"

# Tab priority for dedup tiebreaker (lower index = higher priority)
TAB_PRIORITY = ["D1-FBS", "D1-FCS", "D2", "D3"]

UPDATE_BATCH_SIZE = 50

# Load .env from project root
load_dotenv(PROJECT_ROOT / ".env")

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    sys.exit(1)


# ============================================================
# Shared helpers
# ============================================================

def supabase_headers(prefer="return=minimal"):
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }


def supabase_get(url):
    """GET request with error handling. Returns parsed JSON list."""
    try:
        resp = requests.get(url, headers=supabase_headers(prefer="return=representation"))
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        print(f"ERROR: GET failed ({url}): {e}")
        sys.exit(1)


def supabase_patch(url, payload):
    """PATCH request with error handling. Returns response."""
    try:
        resp = requests.patch(url, headers=supabase_headers(), json=payload)
        if resp.status_code not in (200, 204):
            print(f"ERROR: PATCH failed ({resp.status_code}): {resp.text[:500]}")
            sys.exit(1)
        return resp
    except requests.RequestException as e:
        print(f"ERROR: PATCH request failed: {e}")
        sys.exit(1)


# ============================================================
# STEP 1 — Load manual_mapping_confirmed.csv
# ============================================================

def load_manual_mapping():
    """
    Read manual_mapping_confirmed.csv and return:
      - confirmed: dict keyed on row_index (int) -> {confirmed_unitid, notes}
      - skipped:   list of dicts with skip reason

    Skips rows where:
      - confirmed_unitid is blank
      - confirmed_unitid is non-numeric
      - notes == 'no db id'
    """
    if not MANUAL_MAPPING_CSV.exists():
        print(f"ERROR: {MANUAL_MAPPING_CSV} not found.")
        print("Run extract_and_stage.py first, then fill in manual_mapping_confirmed.csv.")
        sys.exit(1)

    confirmed = {}
    skipped = []

    with open(MANUAL_MAPPING_CSV, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)

        # Validate expected columns
        expected = {
            "row_index", "source_tab", "school_name_raw", "athletics_url_raw",
            "best_match_name", "best_match_id", "confidence",
            "confirmed_unitid", "notes",
        }
        missing = expected - set(reader.fieldnames or [])
        if missing:
            print(f"ERROR: manual_mapping_confirmed.csv is missing columns: {missing}")
            sys.exit(1)

        for raw_row in reader:
            notes        = (raw_row.get("notes") or "").strip()
            unitid_raw   = (raw_row.get("confirmed_unitid") or "").strip()
            row_index_raw = (raw_row.get("row_index") or "").strip()

            # Skip if no db id flag
            if notes.lower() == "no db id":
                skipped.append({
                    "row_index": row_index_raw,
                    "school_name_raw": raw_row.get("school_name_raw", ""),
                    "reason": "notes = 'no db id'",
                })
                continue

            # Skip if confirmed_unitid is blank
            if not unitid_raw:
                skipped.append({
                    "row_index": row_index_raw,
                    "school_name_raw": raw_row.get("school_name_raw", ""),
                    "reason": "confirmed_unitid blank",
                })
                continue

            # Skip if confirmed_unitid is non-numeric
            try:
                confirmed_unitid = int(unitid_raw)
            except ValueError:
                skipped.append({
                    "row_index": row_index_raw,
                    "school_name_raw": raw_row.get("school_name_raw", ""),
                    "reason": f"confirmed_unitid not numeric: '{unitid_raw}'",
                })
                continue

            # Skip if row_index is non-numeric (can't use for filter)
            try:
                row_index = int(row_index_raw)
            except ValueError:
                skipped.append({
                    "row_index": row_index_raw,
                    "school_name_raw": raw_row.get("school_name_raw", ""),
                    "reason": f"row_index not numeric: '{row_index_raw}'",
                })
                continue

            confirmed[row_index] = {
                "confirmed_unitid": confirmed_unitid,
                "notes": notes,
            }

    return confirmed, skipped


# ============================================================
# STEP 2 — Update school_link_staging with confirmed unitids
# ============================================================

def update_staging_confirmed(confirmed):
    """
    For each confirmed mapping, PATCH school_link_staging:
      SET matched_unitid, match_status, match_method, reviewed_by, reviewed_at
      WHERE row_index = N AND match_status = 'pending'

    Batches updates in groups of UPDATE_BATCH_SIZE.
    Returns count of rows updated.
    """
    row_indexes = list(confirmed.keys())
    updated_count = 0

    print(f"  Updating {len(row_indexes)} rows in batches of {UPDATE_BATCH_SIZE}...")

    for i in range(0, len(row_indexes), UPDATE_BATCH_SIZE):
        batch = row_indexes[i : i + UPDATE_BATCH_SIZE]

        for row_index in batch:
            entry = confirmed[row_index]
            confirmed_unitid = entry["confirmed_unitid"]

            # Filter: row_index = N AND match_status = 'pending'
            url = (
                f"{SUPABASE_URL}/rest/v1/school_link_staging"
                f"?row_index=eq.{row_index}"
                f"&match_status=eq.pending"
            )

            payload = {
                "matched_unitid":  confirmed_unitid,
                "match_status":    "manually_confirmed",
                "match_method":    "manual",
                "reviewed_by":     "chris",
                "reviewed_at":     datetime.now(timezone.utc).isoformat(),
            }

            supabase_patch(url, payload)
            updated_count += 1

        progress_end = min(i + UPDATE_BATCH_SIZE, len(row_indexes))
        print(f"  Batch complete: rows {i + 1}–{progress_end} ({updated_count} updated so far)")

    return updated_count


# ============================================================
# STEP 3 — Dedup: select winning row per unitid
# ============================================================

def count_non_null_urls(row):
    """Count how many of camp_url, coach_url, athletics_url_raw are non-null/non-empty."""
    return sum(
        1 for field in ("camp_url", "coach_url", "athletics_url_raw")
        if row.get(field)
    )


def tab_priority_index(source_tab):
    """Return sort key for tab priority. Lower is higher priority. Unknown tabs sort last."""
    try:
        return TAB_PRIORITY.index(source_tab)
    except ValueError:
        return len(TAB_PRIORITY)


def select_winner(rows_for_unitid):
    """
    Given a list of staging rows sharing the same unitid, select the winning row.

    Primary:    most non-null values across camp_url, coach_url, athletics_url_raw
    Tiebreaker: tab priority FBS > FCS > D2 > D3

    Returns (winner_row, list_of_losing_rows).
    """
    sorted_rows = sorted(
        rows_for_unitid,
        key=lambda r: (
            -count_non_null_urls(r),       # descending non-null count (negate for min-sort)
            tab_priority_index(r.get("source_tab", "")),  # ascending priority index
        )
    )
    winner = sorted_rows[0]
    losers = sorted_rows[1:]
    return winner, losers


def fetch_confirmed_staging_rows():
    """
    Fetch all rows from school_link_staging where match_status IN
    ('auto_confirmed', 'manually_confirmed').

    Supabase REST does not support IN directly in query params — use two separate
    queries and merge results.
    """
    all_rows = []

    for status in ("auto_confirmed", "manually_confirmed"):
        url = (
            f"{SUPABASE_URL}/rest/v1/school_link_staging"
            f"?match_status=eq.{status}"
            f"&select=id,row_index,source_tab,school_name_raw,"
            f"athletics_url_raw,camp_url,coach_url,matched_unitid,"
            f"match_status,match_method"
        )
        rows = supabase_get(url)
        all_rows.extend(rows)

    return all_rows


def mark_dedup_excluded(loser_ids):
    """
    Mark all losing rows as 'dedup_excluded' via PATCH.
    Batches by UPDATE_BATCH_SIZE.
    """
    if not loser_ids:
        return 0

    marked = 0

    for i in range(0, len(loser_ids), UPDATE_BATCH_SIZE):
        batch = loser_ids[i : i + UPDATE_BATCH_SIZE]

        # Build IN filter: id=in.(1,2,3)
        id_list = ",".join(str(rid) for rid in batch)
        url = (
            f"{SUPABASE_URL}/rest/v1/school_link_staging"
            f"?id=in.({id_list})"
        )

        payload = {"match_status": "dedup_excluded"}
        supabase_patch(url, payload)
        marked += len(batch)

    return marked


def run_dedup(confirmed_rows):
    """
    Group confirmed rows by matched_unitid. For each unitid, select winner and
    mark losers as dedup_excluded in staging.

    Returns (winners list, losers list).
    """
    # Group by unitid — skip rows with no matched_unitid
    by_unitid = {}
    for row in confirmed_rows:
        uid = row.get("matched_unitid")
        if uid is None:
            continue
        by_unitid.setdefault(uid, []).append(row)

    winners = []
    losers  = []

    for unitid, rows in by_unitid.items():
        if len(rows) == 1:
            winners.append(rows[0])
        else:
            winner, losing_rows = select_winner(rows)
            winners.append(winner)
            losers.extend(losing_rows)

    # Mark losers in DB
    loser_ids = [r["id"] for r in losers]
    marked = mark_dedup_excluded(loser_ids)
    print(f"  {marked} duplicate rows marked dedup_excluded")

    return winners, losers


# ============================================================
# STEP 4 — Export CSVs
# ============================================================

def export_import_ready(winners):
    """
    Write import_ready.csv from the winning rows.
    Columns: unitid, school_name_raw, source_tab, camp_url, coach_url,
             match_status, match_method
    """
    fieldnames = [
        "unitid", "school_name_raw", "source_tab",
        "camp_url", "coach_url", "match_status", "match_method",
    ]

    with open(IMPORT_READY_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in winners:
            writer.writerow({
                "unitid":          row.get("matched_unitid"),
                "school_name_raw": row.get("school_name_raw"),
                "source_tab":      row.get("source_tab"),
                "camp_url":        row.get("camp_url") or "",
                "coach_url":       row.get("coach_url") or "",
                "match_status":    row.get("match_status"),
                "match_method":    row.get("match_method"),
            })

    return len(winners)


def export_dedup_review(losers, winner_by_unitid):
    """
    Write dedup_review.csv from the excluded rows.
    Columns: unitid, school_name_raw, source_tab, camp_url, coach_url,
             winning_row_source_tab, reason
    """
    fieldnames = [
        "unitid", "school_name_raw", "source_tab",
        "camp_url", "coach_url", "winning_row_source_tab", "reason",
    ]

    with open(DEDUP_REVIEW_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in losers:
            uid = row.get("matched_unitid")
            winning_tab = winner_by_unitid.get(uid, {}).get("source_tab", "")
            writer.writerow({
                "unitid":                uid,
                "school_name_raw":       row.get("school_name_raw"),
                "source_tab":            row.get("source_tab"),
                "camp_url":              row.get("camp_url") or "",
                "coach_url":             row.get("coach_url") or "",
                "winning_row_source_tab": winning_tab,
                "reason":                (
                    f"dedup — winner from {winning_tab} "
                    f"(non-null URLs: {count_non_null_urls(winner_by_unitid.get(uid, {}))})"
                ),
            })

    return len(losers)


# ============================================================
# Main
# ============================================================

def main():
    print("=" * 60)
    print("STEP 1 — Loading manual_mapping_confirmed.csv")
    print("=" * 60)

    confirmed, skipped = load_manual_mapping()
    print(f"  Confirmed mappings loaded: {len(confirmed)}")
    print(f"  Rows skipped:              {len(skipped)}")
    if skipped:
        for s in skipped[:10]:
            print(f"    row {s['row_index']} ({s['school_name_raw']}): {s['reason']}")
        if len(skipped) > 10:
            print(f"    ... and {len(skipped) - 10} more")
    print()

    print("=" * 60)
    print("STEP 2 — Updating school_link_staging with confirmed unitids")
    print("=" * 60)

    updated_count = update_staging_confirmed(confirmed)
    print(f"  Rows updated to manually_confirmed: {updated_count}")
    print()

    print("=" * 60)
    print("STEP 3 — Dedup: selecting winning row per unitid")
    print("=" * 60)

    print("  Fetching auto_confirmed + manually_confirmed rows from staging...")
    confirmed_rows = fetch_confirmed_staging_rows()
    print(f"  Fetched {len(confirmed_rows)} confirmed rows")

    winners, losers = run_dedup(confirmed_rows)
    print(f"  Winning rows:    {len(winners)}")
    print(f"  Excluded (dups): {len(losers)}")
    print()

    print("=" * 60)
    print("STEP 4 — Exporting CSVs")
    print("=" * 60)

    winner_by_unitid = {w.get("matched_unitid"): w for w in winners}

    ready_count  = export_import_ready(winners)
    review_count = export_dedup_review(losers, winner_by_unitid)

    print(f"  import_ready.csv:  {IMPORT_READY_CSV} ({ready_count} rows)")
    print(f"  dedup_review.csv:  {DEDUP_REVIEW_CSV} ({review_count} rows)")
    print()

    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Rows updated to manually_confirmed: {updated_count}")
    print(f"  Rows skipped (no db id or blank):   {len(skipped)}")
    print(f"  Winning rows -> import_ready.csv:   {ready_count}")
    print(f"  Duplicate rows -> dedup_review.csv: {review_count}")


if __name__ == "__main__":
    main()
