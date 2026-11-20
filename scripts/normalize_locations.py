import json
import sqlite3
from pathlib import Path

def normalize_loc(city, raw):
    if not raw and (not city or city in ('Other-India', 'unknown', 'null', 'undefined')):
        return 'India'
    s = (raw or city or 'India').strip()
    s_low = s.lower()
    if 'bangalore' in s_low or 'bengaluru' in s_low:
        return 'Bengaluru'
    if 'hyderabad' in s_low:
        return 'Hyderabad'
    if 'pune' in s_low:
        return 'Pune'
    if 'gurgaon' in s_low or 'gurugram' in s_low or 'noida' in s_low or 'delhi' in s_low:
        return 'Delhi NCR'
    if 'mumbai' in s_low:
        return 'Mumbai'
    if 'chennai' in s_low:
        return 'Chennai'
    if 'remote' in s_low:
        return 'Remote'
    if s in ('Other-India', 'India', 'India, India', 'null', 'undefined'):
        return 'India'
    if len(s) > 30:
        parts = [p.strip() for p in s.split('•') if p.strip()]
        if parts:
            return parts[0][:30]
    return s[:30]

def main():
    json_path = Path("F:/Dev/JobOps/web/public/jobs.json")
    if json_path.exists():
        with open(json_path, "r", encoding="utf-8") as f:
            jobs = json.load(f)
        for j in jobs:
            j["city"] = normalize_loc(j.get("city"), j.get("location_raw"))
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(jobs, f, separators=(",", ":"))

    data_json = Path("F:/Dev/JobOps/data/jobs.json")
    if data_json.exists():
        with open(data_json, "r", encoding="utf-8") as f:
            jobs = json.load(f)
        for j in jobs:
            j["city"] = normalize_loc(j.get("city"), j.get("location_raw"))
        with open(data_json, "w", encoding="utf-8") as f:
            json.dump(jobs, f, indent=2)

    db_path = Path("F:/Dev/JobOps/data/jobops.db")
    if db_path.exists():
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT id, city, location_raw FROM jobs")
        rows = cur.fetchall()
        for j_id, city, raw in rows:
            clean_c = normalize_loc(city, raw)
            cur.execute("UPDATE jobs SET city = ? WHERE id = ?", (clean_c, j_id))
        conn.commit()
        conn.close()

    print("Location normalization finished! 'Other-India' has been eliminated.")

if __name__ == "__main__":
    main()
