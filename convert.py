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

def clean_cell(text):
    if not text: 
        return []
    parts = re.split(r'\n\s*\n', str(text).strip())
    return [re.sub(r'\s+', ' ', p).strip() for p in parts if p.strip()]

def pad_list(lst, target_count):
    if not lst: 
        return [""] * target_count
    if len(lst) >= target_count: 
        return lst[:target_count]
    return lst + [""] * (target_count - len(lst))

def clean_phone_number(phone):
    clean = re.sub(r'\D', '', str(phone))
    if clean.startswith('92'):
        return clean
    elif clean.startswith('03'):
        return '92' + clean[1:]
    elif clean.startswith('3') and len(clean) == 10:
        return '92' + clean
    return clean

def convert_teachers_csv():
    if not os.path.exists(TEACHERS_CSV):
        print(f"⚠️ {TEACHERS_CSV} not found. Skipping contact update.")
        return

    contacts = []
    try:
        with open(TEACHERS_CSV, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if 'Name' in row and 'Phone Number' in row:
                    raw_name = row['Name']
                    clean_name = re.sub(r'\s*AI IUB\s*', '', raw_name, flags=re.IGNORECASE).strip()
                    clean_phone = clean_phone_number(row['Phone Number'])
                    
                    contacts.append({
                        "name": clean_name,
                        "phone": clean_phone
                    })
        
        with open(TEACHERS_JSON, "w") as f:
            json.dump(contacts, f, indent=4)
    except Exception as e:
        print(f"❌ Error processing CSV: {e}")

def process_table(table_data, section, all_entries):
    for row in table_data:
        if not row or not row[0] or "COURSE CODE" in str(row[0]).upper():
            continue
        
        r_names = clean_cell(row[1]) if len(row) > 1 else []
        r_teachers = clean_cell(row[3]) if len(row) > 3 else []
        r_days = clean_cell(row[4]) if len(row) > 4 else []
        r_starts = clean_cell(row[5]) if len(row) > 5 else []
        r_ends = clean_cell(row[6]) if len(row) > 6 else []
        r_rooms = clean_cell(row[7]) if len(row) > 7 else []

        record_count = max(len(r_names), len(r_teachers), len(r_days), len(r_starts), len(r_ends))
        if record_count == 0: 
            continue

        names = pad_list(r_names, record_count)
        teachers = pad_list(r_teachers, record_count)
        days = pad_list(r_days, record_count)
        starts = pad_list(r_starts, record_count)
        ends = pad_list(r_ends, record_count)
        rooms = pad_list(r_rooms, record_count)
        
        for j in range(record_count):
            if not names[j] and not days[j]:
                continue
                
            entry = {
                "section": section,
                "course": names[j],
                "teacher": teachers[j] if teachers[j] else "TBA",
                "day": days[j].upper(),
                "start": starts[j],
                "end": ends[j],
                "room": rooms[j]
            }
            if entry not in all_entries:
                all_entries.append(entry)

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
            tables = page.find_tables()
            last_bottom = 0
            
            for table in tables:
                table_top = table.bbox[1]
                table_bottom = table.bbox[3]
                
                # Visually crop the space between the previous table and this one
                if table_top > last_bottom + 1:
                    try:
                        crop_box = (0, last_bottom, page.width, table_top)
                        cropped_page = page.crop(crop_box)
                        text = cropped_page.extract_text() or ""
                        
                        # Search only in this tiny visual slice for the header
                        match = re.search(r"Section:\s*([A-Za-z0-9\-+\s]+?)(?=\n|$)", text)
                        if match:
                            current_section = match.group(1).strip()
                    except Exception:
                        pass # If cropping fails, keep the previous current_section
                
                last_bottom = table_bottom
                
                # Extract and process the table rows
                table_data = table.extract()
                process_table(table_data, current_section, all_entries)

    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_entries, f, indent=4)
    print(f"✅ SUCCESS: {len(all_entries)} unique records written to {OUTPUT_FILE}.")

if __name__ == "__main__":
    convert_pdf()
