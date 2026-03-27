"""
sync_schools.py
Seeds the schools table in Supabase from the GrittyOS Master DB Google Sheet.

Source:  Google Sheet ID 1Pc4LOnD1fhQz-9pI_CUEDaAMDfTkUXcCRTVDfoDWvqo, tab "GrittyOS DB"
Target:  Supabase project xyudnajzhuwdauwkwsbh, table public.schools

Usage:
    SUPABASE_SERVICE_ROLE_KEY=<key> python scripts/sync_schools.py

Optional env vars:
    SUPABASE_URL  (default: https://xyudnajzhuwdauwkwsbh.supabase.co)
    DRY_RUN=1     print rows instead of inserting

PROTO-GLOBAL-010 compliance:
    Source artifact named above. All rows read directly from the canonical
    Google Sheet — not a local CSV derivative.

G5->G6 normalization (DQ-002, confirmed 2026-03-26):
    Any row where the 'type' field reads "G5" is normalized to "G6" at
    insert time. The canonical Sheet is not modified.

Schema: supabase/migrations/0008_schools.sql
Authored by: Patch (GAS Engineer) 2026-03-26
"""

import json
import math
import os
import sys
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SHEET_ID   = "1Pc4LOnD1fhQz-9pI_CUEDaAMDfTkUXcCRTVDfoDWvqo"
SHEET_TAB  = "GrittyOS DB"
# Columns A through BK (63 columns covers all header fields)
SHEET_RANGE = f"'{SHEET_TAB}'!A1:BK"

SUPABASE_URL              = os.environ.get("SUPABASE_URL",
                                "https://xyudnajzhuwdauwkwsbh.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
DRY_RUN                   = os.environ.get("DRY_RUN", "").strip() == "1"

# Batch size for Supabase REST inserts (PostgREST handles up to 1000/call)
BATCH_SIZE = 200

if not SUPABASE_SERVICE_ROLE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required.")
    print("Usage: SUPABASE_SERVICE_ROLE_KEY=<key> python scripts/sync_schools.py")
    sys.exit(1)

SUPABASE_HEADERS = {
    "apikey":        SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type":  "application/json",
    # resolution=merge-duplicates turns POST into an upsert on the unitid
    # unique constraint — existing rows are updated in place, new rows are
    # inserted. The table does not need to be cleared before running.
    "Prefer":        "resolution=merge-duplicates",
}

# ---------------------------------------------------------------------------
# GWS — read sheet via Sheets API v4
# ---------------------------------------------------------------------------

def read_sheet_range(sheet_id, range_str):
    """Return (headers, data_rows) from a Google Sheets range via gws auth."""
    # Build the URL. gws wraps Google credentials — we shell out to gws CLI.
    import subprocess
    cmd = [
        "gws", "sheets", "+read",
        "--spreadsheet", sheet_id,
        "--range", range_str,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERROR: gws read failed:\n{result.stderr}")
        sys.exit(1)
    data = json.loads(result.stdout)
    rows = data.get("values", [])
    if not rows:
        print("ERROR: Sheet returned no data.")
        sys.exit(1)
    headers = rows[0]
    data_rows = rows[1:]
    return headers, data_rows

# ---------------------------------------------------------------------------
# Type coercion helpers
# ---------------------------------------------------------------------------

def to_numeric(val):
    """Strip currency/percent formatting and return float or None."""
    if val is None or str(val).strip() == "":
        return None
    s = str(val).strip().replace("$", "").replace(",", "").replace("%", "")
    s = s.replace("#REF!", "").strip()
    if s == "":
        return None
    try:
        return float(s)
    except ValueError:
        return None

def to_int(val):
    f = to_numeric(val)
    if f is None:
        return None
    try:
        return int(f)
    except (ValueError, OverflowError):
        return None

def to_bool(val):
    if val is None:
        return None
    s = str(val).strip().upper()
    if s == "TRUE":
        return True
    if s == "FALSE":
        return False
    return None

def to_text(val):
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None

def normalize_type(val):
    """
    Normalize sheet Type values to app tier labels.

    All values pass through unchanged except:
        "G5" -> "G6"  (DQ-002, confirmed 2026-03-26)

    The sheet already stores clean strings for all other tiers
    (e.g. "FCS", "D2", "D3", "Power 4") — no short-code mapping needed.
    """
    s = to_text(val)
    _MAP = {
        "G5": "G6",
    }
    return _MAP.get(s, s)

# ---------------------------------------------------------------------------
# Row mapping: sheet headers -> schools table columns
# ---------------------------------------------------------------------------

# Canonical header names from GrittyOS DB tab (read 2026-03-26):
# UNITID, School Name, unitid2, NCAA Division, Conference, Type,
# City/Location, State, LATITUDE, LONGITUDE, Admissions Rate, Avg GPA,
# Avg SAT, Is_Test_Optional, Control, COA (In-State), COA (Out-of-State),
# Need-Blind School, School Type, Err Margin COA, % Meeting Fin Need,
# Avg Merit Award, Share_Stu_Any_Aid, Share_Stu_Need_Aid,
# Est_Avg_Merit_Aid_All, Est_Avg_NeedGrants_0-100K, Graduation Rate,
# DLTV, ADLTV, ADLTV Rank, Total_Mens_Recruiting_Budget,
# Football_Roster_Size, Original_Roster_Size, Adjusted_Roster_Size,
# Est_Football_Budget_Share_Pct, Est_Football_Budget,
# Est_Football_Budget_High, Est_Football_Budget_Low,
# Est_Spend_Per_Player, Est_Ath_Aid, Est_Max_Merit, Est_Avg_Merit,
# UG_Enrollment, Recruiting Q Link, Coach Page, Field Level Questionnaire,
# Prospect Camp Link, Net Calculator, Adm Info List Link,
# Acad_Rigor_Freshman, Acad_Rigor_Test_Opt_Freshman, Acad_Rigor_Soph,
# Acad_Rigor_Test_Opt_Soph, Acad_Rigor_Junior, Acad_Rigor_Test_Opt_Junior,
# Acad_Rigor_Senior, Acad_Rigor_Test_Opt_Senior,
# Distance_Miles, Academic_Match_Score, Matches_Criteria

def map_row(headers, raw_row):
    """Map a sheet row to a schools table dict. Returns None to skip the row."""
    # Pad short rows to full header length
    row = list(raw_row) + [""] * (len(headers) - len(raw_row))
    h = {name: row[i] for i, name in enumerate(headers)}

    unitid = to_int(h.get("UNITID"))
    if not unitid:
        return None   # Skip rows with no UNITID

    school_name = to_text(h.get("School Name"))
    if not school_name:
        return None   # Skip rows with no school name

    return {
        "unitid":                       unitid,
        "school_name":                  school_name,
        "state":                        to_text(h.get("State")),
        "city":                         to_text(h.get("City/Location")),
        "control":                      to_text(h.get("Control")),
        "school_type":                  to_text(h.get("School Type")),
        # type: G5->G6 normalization applied here
        "type":                         normalize_type(h.get("Type")),
        "ncaa_division":                to_text(h.get("NCAA Division")),
        "conference":                   to_text(h.get("Conference")),
        "latitude":                     to_numeric(h.get("LATITUDE")),
        "longitude":                    to_numeric(h.get("LONGITUDE")),
        "coa_out_of_state":             to_numeric(h.get("COA (Out-of-State)")),
        "est_avg_merit":                to_numeric(h.get("Est_Avg_Merit")),
        "avg_merit_award":              to_numeric(h.get("Avg Merit Award")),
        "share_stu_any_aid":            to_numeric(h.get("Share_Stu_Any_Aid")),
        "share_stu_need_aid":           to_numeric(h.get("Share_Stu_Need_Aid")),
        "need_blind_school":            to_bool(h.get("Need-Blind School")),
        "dltv":                         to_numeric(h.get("DLTV")),
        "acad_rigor_senior":            to_numeric(h.get("Acad_Rigor_Senior")),
        "acad_rigor_junior":            to_numeric(h.get("Acad_Rigor_Junior")),
        "acad_rigor_soph":              to_numeric(h.get("Acad_Rigor_Soph")),
        "acad_rigor_freshman":          to_numeric(h.get("Acad_Rigor_Freshman")),
        "acad_rigor_test_opt_senior":   to_numeric(h.get("Acad_Rigor_Test_Opt_Senior")),
        "acad_rigor_test_opt_junior":   to_numeric(h.get("Acad_Rigor_Test_Opt_Junior")),
        "acad_rigor_test_opt_soph":     to_numeric(h.get("Acad_Rigor_Test_Opt_Soph")),
        "acad_rigor_test_opt_freshman": to_numeric(h.get("Acad_Rigor_Test_Opt_Freshman")),
        "is_test_optional":             to_bool(h.get("Is_Test_Optional")),
        "graduation_rate":              to_numeric(h.get("Graduation Rate")),
        "recruiting_q_link":            to_text(h.get("Recruiting Q Link")),
        "coach_link":                   to_text(h.get("Coach Page")),
        "prospect_camp_link":           to_text(h.get("Prospect Camp Link")),
        "field_level_questionnaire":    to_text(h.get("Field Level Questionnaire")),
        "avg_gpa":                      to_numeric(h.get("Avg GPA")),
        "avg_sat":                      to_numeric(h.get("Avg SAT")),
        "adltv":                        to_numeric(h.get("ADLTV")),
        "adltv_rank":                   to_int(h.get("ADLTV Rank")),
        "admissions_rate":              to_numeric(h.get("Admissions Rate")),
    }

# ---------------------------------------------------------------------------
# Supabase insert
# ---------------------------------------------------------------------------

def supabase_upsert_batch(rows):
    """Upsert a list of row dicts into public.schools. Returns upserted count.

    Uses PostgREST resolution=merge-duplicates — existing rows matched by
    the unitid unique constraint are updated; new rows are inserted. Safe
    to run repeatedly without clearing the table first.
    """
    url = f"{SUPABASE_URL}/rest/v1/schools"
    data = json.dumps(rows).encode()
    req = urllib.request.Request(url, data=data, headers=SUPABASE_HEADERS,
                                 method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            resp.read()
            return len(rows)
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  UPSERT failed: HTTP {e.code} — {body[:500]}")
        raise

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("sync_schools.py")
    print(f"Source: Google Sheet {SHEET_ID}, tab '{SHEET_TAB}'")
    print(f"Target: Supabase {SUPABASE_URL}, table public.schools")
    if DRY_RUN:
        print("MODE: DRY RUN — no data will be inserted")
    print("=" * 60)

    # 1. Read sheet
    print(f"\nReading sheet range {SHEET_RANGE}1000 ...")
    # Use a high row ceiling — sheet has ~662 rows
    range_with_ceiling = SHEET_RANGE + "1000"
    headers, data_rows = read_sheet_range(SHEET_ID, range_with_ceiling)
    print(f"  Headers ({len(headers)}): {headers[:6]} ...")
    print(f"  Raw data rows: {len(data_rows)}")

    # 2. Map rows
    mapped = []
    skipped = 0
    g5_normalized = 0
    for i, raw in enumerate(data_rows, start=2):
        row = map_row(headers, raw)
        if row is None:
            skipped += 1
            continue
        # Track G5->G6 normalization count
        raw_type = to_text(raw[headers.index("Type")] if "Type" in headers else "")
        if raw_type == "G5":
            g5_normalized += 1
        mapped.append(row)

    print(f"\nRow mapping:")
    print(f"  Mapped:         {len(mapped)}")
    print(f"  Skipped (no UNITID/name): {skipped}")
    print(f"  G5->G6 normalized: {g5_normalized}")

    if DRY_RUN:
        print("\nDRY RUN — sample of first 3 rows:")
        for r in mapped[:3]:
            print(f"  unitid={r['unitid']}, school_name={r['school_name']!r}, "
                  f"type={r['type']!r}, ncaa_division={r['ncaa_division']!r}")
        print(f"\nDRY RUN complete. Would insert {len(mapped)} rows.")
        return

    # 3. Insert in batches
    print(f"\nInserting {len(mapped)} rows in batches of {BATCH_SIZE} ...")
    total_inserted = 0
    n_batches = math.ceil(len(mapped) / BATCH_SIZE)
    for i in range(n_batches):
        batch = mapped[i * BATCH_SIZE : (i + 1) * BATCH_SIZE]
        count = supabase_upsert_batch(batch)
        total_inserted += count
        print(f"  Batch {i+1}/{n_batches}: inserted {count} rows "
              f"(running total: {total_inserted})")

    print(f"\n{'='*60}")
    print(f"COMPLETE")
    print(f"  Rows inserted: {total_inserted}")
    print(f"  G5->G6 normalized at insert: {g5_normalized}")
    print(f"  Source: Sheet {SHEET_ID}, tab '{SHEET_TAB}'")
    print(f"  Target: {SUPABASE_URL}/rest/v1/schools")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
