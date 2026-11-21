import json
import re
import html
import sqlite3
from pathlib import Path

def sanitize_text(text: str) -> str:
    if not text:
        return ""
    # Loop unescape until string stops changing
    prev = ""
    curr = text
    for _ in range(5):
        prev = curr
        curr = html.unescape(curr)
        if curr == prev:
            break
    # Strip any complete HTML tags
    curr = re.sub(r"<[^>]+>", " ", curr)
    # Strip any broken or unclosed HTML tag (e.g. <span data-..., <div style=...)
    curr = re.sub(r"<[a-zA-Z/][^>]*", " ", curr)
    # Strip any remaining HTML entities
    curr = re.sub(r"&[a-zA-Z0-9#]+;?", " ", curr)
    # Strip any remaining angle brackets
    curr = re.sub(r"[<>]", " ", curr)
    # Strip common boilerplate
    curr = re.sub(
        r"^[\s\S]*?(?:content-intro|company-intro)[\s\S]*?(?:Summary|Overview|Role|Responsibilities|About the Role|About the Job|Position Overview|Job Description):?\s*",
        "",
        curr,
        flags=re.I,
    )
    # Collapse whitespace
    curr = re.sub(r"\s+", " ", curr).strip()
    return curr

def main():
    json_path = Path("F:/Dev/JobOps/web/public/jobs.json")
    if json_path.exists():
        with open(json_path, "r", encoding="utf-8") as f:
            jobs = json.load(f)

        for j in jobs:
            s = sanitize_text(j.get("summary", ""))
            t = sanitize_text(j.get("title", ""))
            if t:
                j["title"] = t
            if not s:
                s = f"{j.get('title')} at {j.get('company_name')}"
            j["summary"] = s[:320]

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(jobs, f, separators=(",", ":"))

    db_path = Path("F:/Dev/JobOps/data/jobops.db")
    if db_path.exists():
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, summary, title, company_name FROM jobs")
        rows = cursor.fetchall()
        for j_id, summary, title, company_name in rows:
            s = sanitize_text(summary or "")
            t = sanitize_text(title or "")
            if not s:
                s = f"{t} at {company_name}"
            cursor.execute("UPDATE jobs SET summary = ?, title = ? WHERE id = ?", (s[:320], t, j_id))
        conn.commit()
        conn.close()

    # Also clean data/jobs.json
    data_json = Path("F:/Dev/JobOps/data/jobs.json")
    if data_json.exists():
        with open(data_json, "r", encoding="utf-8") as f:
            djobs = json.load(f)
        for j in djobs:
            s = sanitize_text(j.get("summary", ""))
            t = sanitize_text(j.get("title", ""))
            if t:
                j["title"] = t
            if not s:
                s = f"{t} at {j.get('company_name')}"
            j["summary"] = s[:320]
        with open(data_json, "w", encoding="utf-8") as f:
            json.dump(djobs, f, indent=2)

    # Re-verify
    with open(json_path, "r", encoding="utf-8") as f:
        jobs = json.load(f)
    bad = sum(1 for j in jobs if "<div" in j.get("summary", "") or "&lt;" in j.get("summary", "") or "<p" in j.get("summary", ""))
    print(f"Sanitization complete! Remaining bad summaries: {bad}")

if __name__ == "__main__":
    main()
