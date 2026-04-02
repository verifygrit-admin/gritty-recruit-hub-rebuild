"""
import_ready_to_production.py

Two-step production write from extracted/import_ready.csv:

  STEP 1 — Update schools table camp and coach links.
             For each row where camp_url or coach_url is not blank:
               PATCH schools SET prospect_camp_link, coach_link WHERE unitid = N
             Only columns with values are written — blank values are never sent.
             Batched in groups of 50.

  STEP 2 — Update school_link_staging final status.
             For each unitid successfully written to schools:
               PATCH school_link_staging
                 SET match_status = 'manually_confirmed',
                     reviewed_at  = <now ISO>
                 WHERE matched_unitid = N
                   AND match_status IN ('auto_confirmed', 'manually_confirmed')

  STEP 3 — Print summary.

Auth: SUPABASE_SERVICE_ROLE_KEY from .env (service role required for schools write)

Usage:
  pip install python-dotenv requests
  python scripts/import_ready_to_production.py
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
IMPORT_READY_CSV = EXTRACTED_DIR / "import_ready.csv"

UPDATE_BATCH_SIZE = 50

load_dotenv(PROJECT_ROOT / ".env")

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    sys.exit(1)


# ============================================================
# Shared helpers (match import_staging_to_schools.py patterns)
# ============================================================

def supabase_headers(prefer="return=minimal"):
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }


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
# Load CSV
# ============================================================

def load_import_ready():
    """
    Read import_ready.csv and return a list of dicts.
    Skips rows where both camp_url and coach_url are blank.
    """
    if not IMPORT_READY_CSV.exists():
        print(f"ERROR: {IMPORT_READY_CSV} not found.")
        print("Run import_staging_to_schools.py first to produce import_ready.csv.")
        sys.exit(1)

    rows = []
    skipped = 0

    with open(IMPORT_READY_CSV, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)

        expected = {"unitid", "camp_url", "coach_url"}
        missing = expected - set(reader.fieldnames or [])
        if missing:
            print(f"ERROR: import_ready.csv is missing columns: {missing}")
            sys.exit(1)

        for raw in reader:
            unitid_raw = (raw.get("unitid") or "").strip()
            camp_url   = (raw.get("camp_url") or "").strip()
            coach_url  = (raw.get("coach_url") or "").strip()

            if not unitid_raw:
                skipped += 1
                continue

            try:
                unitid = int(unitid_raw)
            except ValueError:
                print(f"  WARN: non-numeric unitid '{unitid_raw}' — skipping row")
                skipped += 1
                continue

            rows.append({
                "unitid":    unitid,
                "camp_url":  camp_url,
                "coach_url": coach_url,
                "school_name_raw": (raw.get("school_name_raw") or "").strip(),
            })

    return rows, skipped


# ============================================================
# STEP 1 — Update schools table
# ============================================================

def update_schools(rows):
    """
    For each row where camp_url or coach_url is not blank, PATCH schools.
    Only sends columns that have values — never overwrites with blank.
    Batched in groups of UPDATE_BATCH_SIZE.

    Returns:
      updated_camp    — count of schools updated with prospect_camp_link
      updated_coach   — count of schools updated with coach_link
      updated_both    — count of schools updated with both
      skipped_no_urls — count of rows skipped because both URLs were blank
      written_unitids — list of unitids successfully written
      errors          — list of (unitid, message) tuples
    """
    updated_camp    = 0
    updated_coach   = 0
    updated_both    = 0
    skipped_no_urls = 0
    written_unitids = []
    errors          = []

    # Filter to rows that have at least one URL
    actionable = [r for r in rows if r["camp_url"] or r["coach_url"]]
    skipped_no_urls = len(rows) - len(actionable)

    print(f"  Rows with at least one URL:  {len(actionable)}")
    print(f"  Rows skipped (no URLs):      {skipped_no_urls}")
    print(f"  Batching in groups of {UPDATE_BATCH_SIZE}...")
    print()

    for batch_start in range(0, len(actionable), UPDATE_BATCH_SIZE):
        batch = actionable[batch_start : batch_start + UPDATE_BATCH_SIZE]
        batch_written = 0

        for row in batch:
            unitid    = row["unitid"]
            camp_url  = row["camp_url"]
            coach_url = row["coach_url"]

            # Build payload — only include fields with values
            payload = {}
            if camp_url:
                payload["prospect_camp_link"] = camp_url
            if coach_url:
                payload["coach_link"] = coach_url

            # Payload must not be empty (guard — should not happen given filter above)
            if not payload:
                skipped_no_urls += 1
                continue

            url = (
                f"{SUPABASE_URL}/rest/v1/schools"
                f"?unitid=eq.{unitid}"
            )

            try:
                resp = requests.patch(url, headers=supabase_headers(), json=payload)
                if resp.status_code not in (200, 204):
                    errors.append((unitid, f"HTTP {resp.status_code}: {resp.text[:200]}"))
                    continue
            except requests.RequestException as e:
                errors.append((unitid, str(e)))
                continue

            # Track stats
            has_camp  = bool(camp_url)
            has_coach = bool(coach_url)
            if has_camp and has_coach:
                updated_both  += 1
                updated_camp  += 1
                updated_coach += 1
            elif has_camp:
                updated_camp  += 1
            else:
                updated_coach += 1

            written_unitids.append(unitid)
            batch_written += 1

        batch_end = min(batch_start + UPDATE_BATCH_SIZE, len(actionable))
        print(
            f"  Batch {batch_start + 1}–{batch_end}: "
            f"{batch_written} written, "
            f"{len(written_unitids)} total so far"
        )

    return updated_camp, updated_coach, updated_both, skipped_no_urls, written_unitids, errors


# ============================================================
# STEP 2 — Update school_link_staging final status
# ============================================================

def update_staging_final(written_unitids):
    """
    For each successfully written unitid, PATCH school_link_staging:
      SET match_status = 'manually_confirmed',
          reviewed_at  = <now ISO>
      WHERE matched_unitid = N
        AND match_status IN ('auto_confirmed', 'manually_confirmed')

    Two PATCH calls per unitid (one per status value, since Supabase REST
    does not support IN filters natively in query params without PostgREST
    range syntax).

    Batched in groups of UPDATE_BATCH_SIZE.
    Returns count of staging rows updated.
    """
    if not written_unitids:
        return 0

    now_iso = datetime.now(timezone.utc).isoformat()
    staging_updated = 0

    print(f"  Updating staging for {len(written_unitids)} unitids...")

    for batch_start in range(0, len(written_unitids), UPDATE_BATCH_SIZE):
        batch = written_unitids[batch_start : batch_start + UPDATE_BATCH_SIZE]

        for unitid in batch:
            payload = {
                "match_status": "manually_confirmed",
                "reviewed_at":  now_iso,
            }

            for status in ("auto_confirmed", "manually_confirmed"):
                url = (
                    f"{SUPABASE_URL}/rest/v1/school_link_staging"
                    f"?matched_unitid=eq.{unitid}"
                    f"&match_status=eq.{status}"
                )
                supabase_patch(url, payload)

            staging_updated += 1

        batch_end = min(batch_start + UPDATE_BATCH_SIZE, len(written_unitids))
        print(
            f"  Staging batch {batch_start + 1}–{batch_end}: "
            f"{staging_updated} unitids updated so far"
        )

    return staging_updated


# ============================================================
# Main
# ============================================================

def main():
    print("=" * 60)
    print("STEP 1 — Loading import_ready.csv")
    print("=" * 60)

    rows, load_skipped = load_import_ready()
    print(f"  Rows loaded from CSV:  {len(rows)}")
    if load_skipped:
        print(f"  Rows skipped on load:  {load_skipped} (blank or non-numeric unitid)")
    print()

    print("=" * 60)
    print("STEP 2 — Updating schools table")
    print("=" * 60)

    updated_camp, updated_coach, updated_both, skipped_no_urls, written_unitids, errors = (
        update_schools(rows)
    )
    print()

    if errors:
        print(f"  ERRORS ({len(errors)} total):")
        for unitid, msg in errors[:20]:
            print(f"    unitid {unitid}: {msg}")
        if len(errors) > 20:
            print(f"    ... and {len(errors) - 20} more")
        print()

    print("=" * 60)
    print("STEP 3 — Updating school_link_staging final status")
    print("=" * 60)

    staging_updated = update_staging_final(written_unitids)
    print()

    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Rows processed from CSV:              {len(rows)}")
    print(f"  Schools updated with camp_link:        {updated_camp}")
    print(f"  Schools updated with coach_link:       {updated_coach}")
    print(f"  Schools updated with both:             {updated_both}")
    print(f"  Schools skipped (no URLs):             {skipped_no_urls}")
    print(f"  Staging rows updated (manually_conf):  {staging_updated}")
    if errors:
        print(f"  Errors:                                {len(errors)}")
    else:
        print(f"  Errors:                                0")


if __name__ == "__main__":
    main()
