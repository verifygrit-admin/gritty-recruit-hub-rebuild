"""
extract_and_stage.py

Three-step pipeline:
  1. Load extracted JSON files from extracted/ (output of extract_schools_with_links.py)
  2. Fuzzy match each school row against the live Supabase schools table
  3. Insert all rows into school_link_staging and export needs_review rows to CSV

Matching:
  70% name similarity (rapidfuzz token_sort_ratio on school_name_raw vs school_name)
  30% domain similarity (root domain comparison of athletics_url_raw vs athletics_url)
  >= 0.90 → auto_confirmed
  <  0.90 → needs_review

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
from urllib.parse import urlparse

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


def extract_domain(url):
    """Extract root domain from a URL, stripping www prefix."""
    if not url:
        return ""
    try:
        parsed = urlparse(url if "://" in url else f"https://{url}")
        domain = parsed.netloc or parsed.path.split("/")[0]
        domain = domain.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except Exception:
        return ""


# ============================================================
# STEP 1 — Load extracted JSON files
# ============================================================

def find_column_index(headers, candidates):
    """Find the first header index matching any candidate (case-insensitive)."""
    for i, header in enumerate(headers):
        text = header.get("text", "").strip().lower()
        for candidate in candidates:
            if candidate.lower() in text:
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

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if len(data) < 2:
            print(f"WARNING: {tab} has no data rows — skipping")
            continue

        headers = data[0]

        # Identify columns by header text
        name_col = find_column_index(headers, ["school", "institution", "name"])
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
    url = f"{SUPABASE_URL}/rest/v1/schools?select=unitid,school_name,athletics_url"
    resp = requests.get(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    resp.raise_for_status()
    return resp.json()


def match_school(row, schools):
    """Find the best matching school for a row. Returns match dict."""
    raw_name = row["school_name_raw"]
    raw_domain = extract_domain(row["athletics_url_raw"])

    best_score = 0.0
    best_match = None

    for school in schools:
        db_name = school.get("school_name", "") or ""
        db_domain = extract_domain(school.get("athletics_url", "") or "")

        # Name similarity (0-100 from rapidfuzz, normalize to 0-1)
        name_score = fuzz.token_sort_ratio(raw_name.lower(), db_name.lower()) / 100.0

        # Domain similarity
        if raw_domain and db_domain:
            domain_score = 1.0 if raw_domain == db_domain else fuzz.ratio(raw_domain, db_domain) / 100.0
        elif not raw_domain and not db_domain:
            domain_score = 0.5  # Both missing — neutral
        else:
            domain_score = 0.0

        # Weighted average
        score = (0.70 * name_score) + (0.30 * domain_score)

        if score > best_score:
            best_score = score
            best_match = school

    if best_match is None:
        return {
            "matched_unitid": None,
            "match_confidence": 0.0,
            "match_status": "unresolved",
            "match_method": "no_candidates",
            "best_match_name": "",
            "best_match_id": None,
        }

    status = "auto_confirmed" if best_score >= MATCH_THRESHOLD else "needs_review"

    return {
        "matched_unitid": best_match["unitid"],
        "match_confidence": round(best_score, 4),
        "match_status": status,
        "match_method": "fuzzy_name_domain",
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
            payload.append({
                "source_tab": row["source_tab"],
                "source_run": SOURCE_RUN,
                "data_type": "camp_link",
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
        if resp.status_code not in (200, 201):
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
    """Write needs_review rows to CSV for manual review."""
    review_rows = [r for r in rows if r["match_status"] == "needs_review"]

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

def main():
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
    needs_review = sum(1 for r in all_rows if r["match_status"] == "needs_review")
    unresolved = sum(1 for r in all_rows if r["match_status"] == "unresolved")

    print(f"  Auto confirmed: {auto_confirmed}")
    print(f"  Needs review:   {needs_review}")
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
    print(f"  Needs review:    {needs_review}")
    print(f"  Unresolved:      {unresolved}")
    print(f"  Staged in DB:    {inserted}")
    print(f"  Review CSV:      {csv_path}")


if __name__ == "__main__":
    main()
