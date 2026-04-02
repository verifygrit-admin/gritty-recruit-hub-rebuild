"""
extract_and_stage.py

Three-step pipeline:
  1. Load extracted JSON files from extracted/ (output of extract_schools_with_links.py)
  2. Fuzzy match each school row against the live Supabase schools table
  3. Insert all rows into school_link_staging and export pending rows to CSV

Matching:
  100% name similarity (rapidfuzz token_sort_ratio on school_name_raw vs school_name)
  >= 0.90 → auto_confirmed
  <  0.90 → pending (needs manual review)

Auth: SUPABASE_SERVICE_ROLE_KEY from .env (service role for staging inserts)

Usage:
  pip install rapidfuzz python-dotenv requests
  python scripts/extract_and_stage.py
"""

import csv
import json
import os
import sys
from datetime import date
from pathlib import Path
import requests
from dotenv import load_dotenv
from rapidfuzz import fuzz

PROJECT_ROOT = Path(__file__).resolve().parent.parent
EXTRACTED_DIR = PROJECT_ROOT / "extracted"
TABS = ["D1-FBS", "D1-FCS", "D2", "D3"]
SOURCE_RUN = date.today().isoformat()
MATCH_THRESHOLD = 0.90

# Load .env from project root
load_dotenv(PROJECT_ROOT / ".env")

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    sys.exit(1)


def supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


# ============================================================
# STEP 1 — Load extracted JSON files
# ============================================================

def find_column_index(headers, candidates):
    """Find the best header index matching candidates in priority order.

    Iterates candidates most-specific-first. For each candidate, checks all
    headers for a match. Returns the first hit, so candidate order determines
    priority (put specific terms before broad ones like 'name').
    """
    for candidate in candidates:
        candidate_lower = candidate.lower()
        for i, header in enumerate(headers):
            text = header.get("text", "").strip().lower()
            if candidate_lower in text:
                return i
    return None


def load_all_tabs():
    """Load all four JSON files and return a list of row dicts with tab metadata."""
    all_rows = []

    for tab in TABS:
        json_path = EXTRACTED_DIR / f"{tab}.json"
        if not json_path.exists():
            print(f"WARNING: {json_path} not found — skipping tab {tab}")
            continue

        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            print(f"ERROR: Failed to load {json_path}: {e}")
            sys.exit(1)

        if len(data) < 2:
            print(f"WARNING: {tab} has no data rows — skipping")
            continue

        headers = data[0]

        # Identify columns by header text (most-specific candidates first)
        name_col = find_column_index(headers, ["institution", "school", "name"])
        athletics_col = find_column_index(headers, ["athletics", "athletic"])
        camp_col = find_column_index(headers, ["camp", "prospect camp"])
        coach_col = find_column_index(headers, ["coach", "coaching staff", "staff"])

        if name_col is None:
            print(f"WARNING: Could not find school name column in {tab} — skipping")
            continue

        for row_idx, row in enumerate(data[1:], start=1):
            def cell_text(col_idx):
                if col_idx is not None and col_idx < len(row):
                    return row[col_idx].get("text", "")
                return ""

            def cell_url(col_idx):
                if col_idx is not None and col_idx < len(row):
                    return row[col_idx].get("url", "")
                return ""

            school_name = cell_text(name_col)
            if not school_name.strip():
                continue

            all_rows.append({
                "source_tab": tab,
                "row_index": row_idx,
                "school_name_raw": school_name.strip(),
                "athletics_url_raw": cell_url(athletics_col) or cell_text(athletics_col),
                "camp_url": cell_url(camp_col) or cell_text(camp_col),
                "coach_url": cell_url(coach_col) or cell_text(coach_col),
            })

    return all_rows


# ============================================================
# STEP 2 — Fuzzy match against schools table
# ============================================================

def fetch_schools():
    """Fetch all schools from Supabase for matching."""
    url = f"{SUPABASE_URL}/rest/v1/schools?select=unitid,school_name"
    try:
        resp = requests.get(url, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        })
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        print(f"ERROR: Failed to fetch schools from Supabase: {e}")
        sys.exit(1)


def match_school(row, schools):
    """Find the best matching school for a row. Returns match dict."""
    raw_name = row["school_name_raw"]

    best_score = 0.0
    best_match = None

    for school in schools:
        db_name = school.get("school_name", "") or ""

        # Name similarity (0-100 from rapidfuzz, normalize to 0-1)
        score = fuzz.token_sort_ratio(raw_name.lower(), db_name.lower()) / 100.0

        if score > best_score:
            best_score = score
            best_match = school

    if best_match is None:
        return {
            "matched_unitid": None,
            "match_confidence": 0.0,
            "match_status": "unresolved",
            "match_method": "name_fuzzy",
            "best_match_name": "",
            "best_match_id": None,
        }

    status = "auto_confirmed" if best_score >= MATCH_THRESHOLD else "pending"

    return {
        "matched_unitid": best_match["unitid"],
        "match_confidence": round(best_score, 4),
        "match_status": status,
        "match_method": "name_fuzzy",
        "best_match_name": best_match.get("school_name", ""),
        "best_match_id": best_match["unitid"],
    }


def insert_staging_rows(rows):
    """Insert matched rows into school_link_staging via Supabase REST API."""
    url = f"{SUPABASE_URL}/rest/v1/school_link_staging"

    # Batch in groups of 100
    batch_size = 100
    inserted = 0

    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        payload = []

        for row in batch:
            # Determine data_type based on which URLs are populated
            has_camp = bool(row.get("camp_url"))
            has_coach = bool(row.get("coach_url"))
            if has_camp:
                data_type = "camp_link"
            elif has_coach:
                data_type = "coach_link"
            else:
                data_type = "none"

            payload.append({
                "source_tab": row["source_tab"],
                "source_run": SOURCE_RUN,
                "data_type": data_type,
                "row_index": row["row_index"],
                "school_name_raw": row["school_name_raw"],
                "athletics_url_raw": row["athletics_url_raw"] or None,
                "camp_url": row["camp_url"] or None,
                "coach_url": row["coach_url"] or None,
                "matched_unitid": row["matched_unitid"],
                "match_confidence": row["match_confidence"],
                "match_status": row["match_status"],
                "match_method": row["match_method"],
            })

        resp = requests.post(url, headers=supabase_headers(), json=payload)
        if resp.status_code not in (200, 201, 204):
            print(f"ERROR inserting batch {i // batch_size + 1}: {resp.status_code}")
            print(resp.text[:500])
            sys.exit(1)

        inserted += len(batch)
        print(f"  Inserted {inserted}/{len(rows)} rows...")

    return inserted


# ============================================================
# STEP 3 — Export review CSV
# ============================================================

def export_review_csv(rows):
    """Write pending (needs review) rows to CSV for manual review."""
    review_rows = [r for r in rows if r["match_status"] == "pending"]

    csv_path = EXTRACTED_DIR / "match_review.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "row_index", "source_tab", "school_name_raw",
            "athletics_url_raw", "best_match_name",
            "best_match_id", "confidence",
        ])
        writer.writeheader()
        for row in review_rows:
            writer.writerow({
                "row_index": row["row_index"],
                "source_tab": row["source_tab"],
                "school_name_raw": row["school_name_raw"],
                "athletics_url_raw": row["athletics_url_raw"],
                "best_match_name": row["best_match_name"],
                "best_match_id": row["best_match_id"],
                "confidence": row["match_confidence"],
            })

    return csv_path, len(review_rows)


# ============================================================
# Main
# ============================================================

def check_dedup():
    """Check if staging rows already exist for today's source_run. Exit if so."""
    url = (
        f"{SUPABASE_URL}/rest/v1/school_link_staging"
        f"?source_run=eq.{SOURCE_RUN}&select=id&limit=1"
    )
    try:
        resp = requests.get(url, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        })
        resp.raise_for_status()
        rows = resp.json()
    except requests.RequestException as e:
        print(f"ERROR: Dedup check failed: {e}")
        sys.exit(1)

    if rows:
        print(f"ERROR: school_link_staging already has rows for source_run = '{SOURCE_RUN}'.")
        print("To re-run, first delete existing rows:")
        print(f"  DELETE FROM school_link_staging WHERE source_run = '{SOURCE_RUN}';")
        print("Or use a different source_run identifier.")
        sys.exit(1)


def main():
    # Dedup guard — prevent duplicate inserts on re-run
    print("Checking for existing staging rows...")
    check_dedup()
    print("No duplicates found — proceeding.\n")

    print("=" * 60)
    print("STEP 1 — Loading extracted JSON files")
    print("=" * 60)

    all_rows = load_all_tabs()
    print(f"Loaded {len(all_rows)} school rows from {len(TABS)} tabs\n")

    if not all_rows:
        print("ERROR: No rows loaded. Run extract_schools_with_links.py first.")
        sys.exit(1)

    print("=" * 60)
    print("STEP 2 — Fuzzy matching against schools table")
    print("=" * 60)

    print("Fetching schools from Supabase...")
    schools = fetch_schools()
    print(f"Loaded {len(schools)} schools from database\n")

    print("Matching...")
    for row in all_rows:
        match = match_school(row, schools)
        row.update(match)

    auto_confirmed = sum(1 for r in all_rows if r["match_status"] == "auto_confirmed")
    pending = sum(1 for r in all_rows if r["match_status"] == "pending")
    unresolved = sum(1 for r in all_rows if r["match_status"] == "unresolved")

    print(f"  Auto confirmed: {auto_confirmed}")
    print(f"  Pending review: {pending}")
    print(f"  Unresolved:     {unresolved}\n")

    print("Inserting into school_link_staging...")
    inserted = insert_staging_rows(all_rows)
    print(f"  {inserted} rows inserted\n")

    print("=" * 60)
    print("STEP 3 — Exporting review CSV")
    print("=" * 60)

    csv_path, review_count = export_review_csv(all_rows)
    print(f"  Review CSV: {csv_path}")
    print(f"  Rows needing review: {review_count}\n")

    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Total rows:      {len(all_rows)}")
    print(f"  Auto confirmed:  {auto_confirmed}")
    print(f"  Pending review:  {pending}")
    print(f"  Unresolved:      {unresolved}")
    print(f"  Staged in DB:    {inserted}")
    print(f"  Review CSV:      {csv_path}")


if __name__ == "__main__":
    main()
