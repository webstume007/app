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
    """
    Splits grouped entries (separated by multiple newlines) and 
    joins text that merely wrapped onto two lines.
    """
    if not text: 
        return []
    # Split by 2 or more newlines (handles grouped courses in a single cell)
    parts = re.split(r'\n\s*\n', str(text).strip())
    # For each part, replace single newlines with a space to fix wrapped text
    return [re.sub(r'\s+', ' ', p).strip() for p in parts if p.strip()]

def pad_list(lst, target_count):
    """Ensures arrays are the same length to prevent index errors."""
    if not lst: 
        return [""] * target_count
    if len(lst) >= target_count: 
        return lst[:target_count]
    return lst + [""] * (target_count - len(lst))

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

def process_table(table, section, all_entries):
    """Processes a single table's rows and appends to all_entries."""
    for row in table:
        # Skip empty rows or header rows
        if not row or not row[0] or "COURSE CODE" in str(row[0]).upper():
            continue
        
        # Columns based on your PDF: 1: Name, 3: Teacher, 4: Day, 5: Start, 6: End, 7: Room
        r_names = clean_cell(row[1]) if len(row) > 1 else []
        r_teachers = clean_cell(row[3]) if len(row) > 3 else []
        r_days = clean_cell(row[4]) if len(row) > 4 else []
        r_starts = clean_cell(row[5]) if len(row) > 5 else []
        r_ends = clean_cell(row[6]) if len(row) > 6 else []
        r_rooms = clean_cell(row[7]) if len(row) > 7 else []

        # Find how many entries this specific row holds
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
            if not names[j] and not days[j]: # Skip empty ghosts
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
    # 1. First process the Contact CSV if it exists
    convert_teachers_csv()

    # 2. Then process the Schedule PDF
    if not os.path.exists(PDF_FILE):
        print(f"❌ Error: {PDF_FILE} not found.")
        return
    
    all_entries = []
    current_section = "Unknown" # Carry section over if table wraps onto the next page

    with pdfplumber.open(PDF_FILE) as pdf:
        print(f"📂 Processing {len(pdf.pages)} pages from {PDF_FILE}...")
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            tables = page.extract_tables()
            
            # Find all sections on the page. Updated regex to capture + and spaces.
            section_matches = list(re.finditer(r"Section:\s*([A-Za-z0-9\-+\s]+?)(?=\n|$)", page_text))
            sections_on_page = [m.group(1).strip() for m in section_matches]
            
            table_idx = 0
            
            # If there are more tables than headers, the first table belongs to the previous page's section
            if len(tables) > len(sections_on_page) and len(sections_on_page) > 0:
                process_table(tables[table_idx], current_section, all_entries)
                table_idx += 1
            
            for sec in sections_on_page:
                current_section = sec
                if table_idx < len(tables):
                    process_table(tables[table_idx], current_section, all_entries)
                    table_idx += 1
                    
            # Process any remaining tables with the last known section
            while table_idx < len(tables):
                process_table(tables[table_idx], current_section, all_entries)
                table_idx += 1

    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_entries, f, indent=4)
    print(f"✅ SUCCESS: {len(all_entries)} unique records written to {OUTPUT_FILE}.")

if __name__ == "__main__":
    convert_pdf()
