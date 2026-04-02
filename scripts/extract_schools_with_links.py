"""
extract_schools_with_links.py

Extracts school data with hyperlinks from the GrittyOS Master DB Google Sheet.
Uses Google Sheets API with includeGridData=True to capture both cell text and
hyperlink URLs that are invisible to CSV exports.

Sheet ID: 1CaxWTE4qcaqNLGwzgYd0AzriECaMPWVsie0ZDdF5AGg
Tabs: D1-FBS, D1-FCS, D2, D3

Output:
  extracted/D1-FBS.json   (2D array of {text, url} objects)
  extracted/D1-FCS.json
  extracted/D2.json
  extracted/D3.json
  extracted/D1-FBS.html   (visual preview)
  extracted/D1-FCS.html
  extracted/D2.html
  extracted/D3.html

Auth: OAuth via credentials.json in project root. Caches token in token.pickle.

Usage:
  pip install google-auth google-auth-oauthlib google-api-python-client
  python scripts/extract_schools_with_links.py
"""

import json
import os
import pickle
import sys
from pathlib import Path

from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SHEET_ID = "1CaxWTE4qcaqNLGwzgYd0AzriECaMPWVsie0ZDdF5AGg"
TABS = ["D1-FBS", "D1-FCS", "D2", "D3"]
SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CREDENTIALS_PATH = PROJECT_ROOT / "credentials.json"
TOKEN_PATH = PROJECT_ROOT / "token.pickle"
OUTPUT_DIR = PROJECT_ROOT / "extracted"


def authenticate():
    """Authenticate via OAuth, caching token in token.pickle."""
    creds = None

    if TOKEN_PATH.exists():
        with open(TOKEN_PATH, "rb") as f:
            creds = pickle.load(f)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_PATH.exists():
                print(f"ERROR: credentials.json not found at {CREDENTIALS_PATH}")
                print("Download OAuth credentials from Google Cloud Console.")
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(
                str(CREDENTIALS_PATH), SCOPES
            )
            creds = flow.run_local_server(port=0)

        with open(TOKEN_PATH, "wb") as f:
            pickle.dump(creds, f)

    return creds


def extract_tab(service, tab_name):
    """Extract a single tab with hyperlink data using includeGridData."""
    result = (
        service.spreadsheets()
        .get(
            spreadsheetId=SHEET_ID,
            ranges=[f"'{tab_name}'"],
            includeGridData=True,
        )
        .execute()
    )

    sheets = result.get("sheets", [])
    if not sheets:
        print(f"  WARNING: No data found for tab '{tab_name}'")
        return []

    grid_data = sheets[0].get("data", [])
    if not grid_data:
        print(f"  WARNING: No grid data for tab '{tab_name}'")
        return []

    rows = []
    for row_data in grid_data[0].get("rowData", []):
        row = []
        for cell in row_data.get("values", []):
            text = cell.get("formattedValue", "")
            url = cell.get("hyperlink", "")
            row.append({"text": text or "", "url": url or ""})
        rows.append(row)

    return rows


def save_json(data, tab_name):
    """Save extracted data as JSON."""
    path = OUTPUT_DIR / f"{tab_name}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return path


def save_html_preview(data, tab_name):
    """Save an HTML preview table for visual verification."""
    if not data:
        return None

    path = OUTPUT_DIR / f"{tab_name}.html"
    html_parts = [
        "<!DOCTYPE html>",
        "<html><head>",
        f"<title>{tab_name} — Extracted Data Preview</title>",
        "<style>",
        "  body { font-family: monospace; background: #1a1a1a; color: #e0e0e0; margin: 20px; }",
        "  h1 { color: #6ed430; }",
        "  table { border-collapse: collapse; width: 100%; margin-top: 10px; }",
        "  th, td { border: 1px solid #444; padding: 4px 8px; text-align: left; ",
        "           max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
        "  th { background: #2e6b18; color: #c8f5a0; }",
        "  tr:nth-child(even) { background: #222; }",
        "  a { color: #4fc3f7; text-decoration: none; }",
        "  a:hover { text-decoration: underline; }",
        "  .stats { color: #999; margin-bottom: 10px; }",
        "</style>",
        "</head><body>",
        f"<h1>{tab_name}</h1>",
    ]

    total_links = sum(1 for row in data for cell in row if cell.get("url"))
    html_parts.append(
        f'<p class="stats">{len(data)} rows | {total_links} hyperlinks</p>'
    )

    html_parts.append("<table>")

    # Header row
    if data:
        html_parts.append("<tr>")
        for cell in data[0]:
            text = cell.get("text", "")
            html_parts.append(f"<th>{_escape(text)}</th>")
        html_parts.append("</tr>")

    # Data rows
    for row in data[1:]:
        html_parts.append("<tr>")
        for cell in row:
            text = cell.get("text", "")
            url = cell.get("url", "")
            if url:
                html_parts.append(
                    f'<td><a href="{_escape(url)}" title="{_escape(url)}">'
                    f"{_escape(text)}</a></td>"
                )
            else:
                html_parts.append(f"<td>{_escape(text)}</td>")
        html_parts.append("</tr>")

    html_parts.append("</table></body></html>")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(html_parts))

    return path


def _escape(text):
    """Escape HTML special characters."""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def main():
    print("Authenticating with Google Sheets API...")
    creds = authenticate()
    service = build("sheets", "v4", credentials=creds)

    OUTPUT_DIR.mkdir(exist_ok=True)

    print(f"\nSheet: {SHEET_ID}")
    print(f"Tabs:  {', '.join(TABS)}\n")

    summary = []

    for tab in TABS:
        print(f"Extracting: {tab}...")
        data = extract_tab(service, tab)

        row_count = len(data)
        link_count = sum(1 for row in data for cell in row if cell.get("url"))

        json_path = save_json(data, tab)
        html_path = save_html_preview(data, tab)

        print(f"  Rows: {row_count}")
        print(f"  Hyperlinks: {link_count}")
        print(f"  JSON: {json_path}")
        print(f"  HTML: {html_path}\n")

        summary.append(
            {"tab": tab, "rows": row_count, "links": link_count}
        )

    print("=" * 50)
    print("SUMMARY")
    print("=" * 50)
    for s in summary:
        print(f"  {s['tab']:12s}  {s['rows']:4d} rows  {s['links']:4d} links")
    print(f"\nOutput: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
