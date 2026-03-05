import pdfplumber
import json
import re
import os
import sys
import csv

# --- CONFIGURATION ---
if len(sys.argv) > 1:
    PDF_FILE = sys.argv[1]
else:
    PDF_FILE = "schedule.pdf"

TEACHERS_CSV = "AI IUB - Teachers.csv"
OUTPUT_FILE = "schedule_data.json"
TEACHERS_JSON = "teachers_data.json"

def clean_and_split(text):
    if not text: return []
    # Split by multiple newlines (separates completely different courses in the same cell)
    parts = re.split(r'\n{2,}', str(text).strip())
    # Replace single newlines with a space to fix text that just wrapped to two lines
    return [re.sub(r'\n', ' ', p).strip().rstrip('.') for p in parts if p.strip()]

def smart_join(lines, target_count):
    if not lines or target_count <= 0: return [""]
    if len(lines) <= target_count:
        return lines + [""] * (target_count - len(lines))
    
    result = []
    chunk_size = len(lines) // target_count
    for i in range(target_count):
        start = i * chunk_size
        end = (i + 1) * chunk_size if i < target_count - 1 else len(lines)
        result.append(" ".join(lines[start:end]))
    return result

def clean_phone_number(phone):
    clean = re.sub(r'\D', '', str(phone))
    if clean.startswith('92'): return clean
    elif clean.startswith('03'): return '92' + clean[1:]
    elif clean.startswith('3') and len(clean) == 10: return '92' + clean
    return clean

def convert_teachers_csv():
    if not os.path.exists(TEACHERS_CSV): return
    contacts = []
    try:
        with open(TEACHERS_CSV, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if 'Name' in row and 'Phone Number' in row:
                    raw_name = row['Name']
                    clean_name = re.sub(r'\s*AI IUB\s*', '', raw_name, flags=re.IGNORECASE).strip()
                    contacts.append({
                        "name": clean_name,
                        "phone": clean_phone_number(row['Phone Number'])
                    })
        with open(TEACHERS_JSON, "w") as f:
            json.dump(contacts, f, indent=4)
    except Exception:
        pass

def convert_pdf():
    convert_teachers_csv()

    if not os.path.exists(PDF_FILE):
        print(f"❌ Error: {PDF_FILE} not found.")
        return
    
    all_entries = []
    current_section = "Unknown" 

    with pdfplumber.open(PDF_FILE) as pdf:
        print(f"📂 Processing {len(pdf.pages)} pages from {PDF_FILE}...")
        
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            
            # Find all sections listed on this specific page
            sections_on_page = [m.group(1).strip() for m in re.finditer(r"Section:\s*([^\n]+)", page_text)]
            section_idx = 0
            
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    # Skip completely empty rows
                    if not row or not row[0]:
                        continue
                        
                    # THE FIX: Use the "COURSE CODE" header row as the trigger to switch to the next section
                    if "COURSE" in str(row[0]).upper() and "CODE" in str(row[0]).upper():
                        if section_idx < len(sections_on_page):
                            current_section = sections_on_page[section_idx]
                            section_idx += 1
                        continue # Skip processing the header row itself
                        
                    # Process normal rows
                    r_names = clean_and_split(row[1]) if len(row) > 1 else []
                    r_teachers = clean_and_split(row[3]) if len(row) > 3 else []
                    r_days = clean_and_split(row[4]) if len(row) > 4 else []
                    r_starts = clean_and_split(row[5]) if len(row) > 5 else []
                    r_ends = clean_and_split(row[6]) if len(row) > 6 else []
                    r_rooms = clean_and_split(row[7]) if len(row) > 7 else []

                    record_count = max(len(r_days), len(r_starts), len(r_ends))
                    if record_count == 0: continue

                    names = smart_join(r_names, record_count)
                    teachers = smart_join(r_teachers, record_count)
                    rooms = smart_join(r_rooms, record_count)
                    
                    days = r_days + [""] * (record_count - len(r_days))
                    starts = r_starts + [""] * (record_count - len(r_starts))
                    ends = r_ends + [""] * (record_count - len(r_ends))

                    for j in range(record_count):
                        entry = {
                            "section": current_section,
                            "course": names[j],
                            "teacher": teachers[j] if teachers[j] else "TBA",
                            "day": days[j].upper(),
                            "start": starts[j],
                            "end": ends[j],
                            "room": rooms[j]
                        }
                        if entry not in all_entries:
                            all_entries.append(entry)

    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_entries, f, indent=4)
    print(f"✅ SUCCESS: {len(all_entries)} unique records written to {OUTPUT_FILE}.")

if __name__ == "__main__":
    convert_pdf()
