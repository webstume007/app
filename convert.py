import pdfplumber
import json
import re
import os

PDF_FILE = "schedule.pdf" 
OUTPUT_FILE = "schedule_data.json"

def clean_and_split(text):
    """Splits by newline and removes empty strings."""
    if not text: return []
    return [line.strip() for line in str(text).split('\n') if line.strip()]

def smart_join(lines, target_count):
    """
    If we have 4 lines of text but only 2 actual classes (target_count=2),
    this joins the extra lines back together.
    """
    if not lines or target_count <= 0: return [""]
    if len(lines) <= target_count:
        # Pad with empty strings if too few lines
        return lines + [""] * (target_count - len(lines))
    
    # If more lines than records, we must merge them
    # Simple logic: distribute lines as evenly as possible
    result = []
    chunk_size = len(lines) // target_count
    for i in range(target_count):
        start = i * chunk_size
        # For the last record, take all remaining lines
        end = (i + 1) * chunk_size if i < target_count - 1 else len(lines)
        result.append(" ".join(lines[start:end]))
    return result

def convert_pdf():
    if not os.path.exists(PDF_FILE): return
    
    all_entries = []
    with pdfplumber.open(PDF_FILE) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            # Capture Section e.g., BSARIN-1ST-1M
            section_match = re.search(r"Section:\s*([A-Za-z0-9-]+)", text)
            section = section_match.group(1) if section_match else "Unknown"
            
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    # Skip empty rows or header rows
                    if not row or not row[0] or "COURSE CODE" in str(row[0]): continue
                    
                    # 1. Split all columns by newline
                    r_codes    = clean_and_split(row[0])
                    r_names    = clean_and_split(row[1])
                    r_teachers = clean_and_split(row[3])
                    r_days     = clean_and_split(row[4])
                    r_starts   = clean_and_split(row[5])
                    r_ends     = clean_and_split(row[6])
                    r_rooms    = clean_and_split(row[7])

                    # 2. Determine the TRUE number of records in this row
                    # 'Day' and 'Time' columns almost never wrap, so they are the most reliable
                    record_count = max(len(r_days), len(r_starts), len(r_ends))
                    if record_count == 0: continue

                    # 3. Smart-join long names that wrapped
                    names    = smart_join(r_names, record_count)
                    teachers = smart_join(r_teachers, record_count)
                    rooms    = smart_join(r_rooms, record_count)
                    # For days/times, they are already correct length or need padding
                    days     = r_days + [""] * (record_count - len(r_days))
                    starts   = r_starts + [""] * (record_count - len(r_starts))
                    ends     = r_ends + [""] * (record_count - len(r_ends))

                    for i in range(record_count):
                        all_entries.append({
                            "section": section,
                            "course": names[i],
                            "teacher": teachers[i] if teachers[i] else "TBA",
                            "day": days[i].upper(),
                            "start": starts[i],
                            "end": ends[i],
                            "room": rooms[i]
                        })

    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_entries, f, indent=4)
    print(f"✅ JSON Generated with {len(all_entries)} clean records.")

if __name__ == "__main__":
    convert_pdf()
