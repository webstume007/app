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
    # Split by multiple newlines (separates distinct courses/teachers in one cell)
    parts = re.split(r'\n{2,}', str(text).strip())
    # Replace single newlines with a space to fix wrapped text (e.g., long names)
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
    # Remove all non-digit characters (spaces, +, -, etc.)
    clean = re.sub(r'\D', '', str(phone))
    
    # Format to 923...
    if clean.startswith('92'):
        return clean
    elif clean.startswith('03'):
        return '92' + clean[1:]
    elif clean.startswith('3') and len(clean) == 10:
        return '92' + clean
    return clean # Fallback

def convert_teachers_csv():
    """Reads the CSV and creates a contact JSON file."""
    if not os.path.exists(TEACHERS_CSV):
        print(f"⚠️ {TEACHERS_CSV} not found. Skipping contact update.")
        return

    contacts = []
    try:
        with open(TEACHERS_CSV, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if 'Name' in row and 'Phone Number' in row:
                    # Remove "AI IUB" suffix for better matching
                    raw_name = row['Name']
                    clean_name = re.sub(r'\s*AI IUB\s*', '', raw_name, flags=re.IGNORECASE).strip()
                    clean_phone = clean_phone_number(row['Phone Number'])
                    
                    contacts.append({
                        "name": clean_name,
                        "phone": clean_phone
                    })
        
        with open(TEACHERS_JSON, "w") as f:
            json.dump(contacts, f, indent=4)
        print(f"✅ SUCCESS: Processed {len(contacts)} teacher contacts.")
        
    except Exception as e:
        print(f"❌ Error processing CSV: {e}")

def convert_pdf():
    # 1. First process the Contact CSV if it exists
    convert_teachers_csv()

    # 2. Then process the Schedule PDF
    if not os.path.exists(PDF_FILE):
        print(f"❌ Error: {PDF_FILE} not found.")
        return
    
    all_entries = []
    current_section = "Unknown" # Moved outside the loop to carry over across pages

    with pdfplumber.open(PDF_FILE) as pdf:
        print(f"📂 Processing {len(pdf.pages)} pages from {PDF_FILE}...")
        for page in pdf.pages:
            page_text = page.extract_text()
            tables = page.extract_tables()
            
            # Updated Regex to capture the full section name, including + and spaces
            section_finder = list(re.finditer(r"Section:\s*([^\n]+)", page_text)) if page_text else []
            
            for i, table in enumerate(tables):
                # Fix for merging: If there's a spillover table from the previous page, keep the old section
                if len(tables) > len(section_finder) and i == 0:
                    pass # Keep current_section as is
                else:
                    # Map the remaining tables to the headers found on this page
                    idx = i - 1 if len(tables) > len(section_finder) else i
                    if 0 <= idx < len(section_finder):
                        current_section = section_finder[idx].group(1).strip()

                for row in table:
                    if not row or not row[0] or "COURSE CODE" in str(row[0]).upper():
                        continue
                    
                    r_names = clean_and_split(row[1])
                    r_teachers = clean_and_split(row[3])
                    r_days = clean_and_split(row[4])
                    r_starts = clean_and_split(row[5])
                    r_ends = clean_and_split(row[6])
                    r_rooms = clean_and_split(row[7])

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
