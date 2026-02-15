import pdfplumber
import json
import re
import os

# --- CONFIGURATION ---
PDF_FILE = "Spring-2026.pdf"  # RENAME YOUR PDF TO THIS
OUTPUT_FILE = "schedule_data.json"

def clean_text(text):
    return str(text).replace('\n', ' ').strip() if text else ""

def convert_pdf():
    if not os.path.exists(PDF_FILE):
        print(f"❌ Error: {PDF_FILE} not found. Please put the PDF in this folder.")
        return

    data = []
    print(f"🔄 Reading {PDF_FILE}...")
    
    with pdfplumber.open(PDF_FILE) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            tables = page.extract_tables()
            
            # 1. Extract Section & Semester from Header
            # Pattern matches: CLASS NAME: BS (AI)... Section: BSARIN-1ST-1M
            header_match = re.search(r"CLASS NAME:(.*?)Section:\s*([A-Za-z0-9-]+)", text)
            section = "Unknown"
            semester = "Unknown"
            
            if header_match:
                section = header_match.group(2).strip()
                full_header = header_match.group(1).upper()
                
                if "1ST" in full_header: semester = "1st"
                elif "2ND" in full_header: semester = "2nd"
                elif "3RD" in full_header: semester = "3rd"
                elif "4TH" in full_header: semester = "4th"
                elif "5TH" in full_header: semester = "5th"
                elif "6TH" in full_header: semester = "6th"
                elif "7TH" in full_header: semester = "7th"
                elif "8TH" in full_header: semester = "8th"

            # 2. Process Table
            if tables:
                # Assume the largest table is the schedule
                schedule_table = max(tables, key=len)
                for row in schedule_table:
                    # Skip headers and empty rows
                    if not row or row[0] == "COURSE CODE" or row[0] is None: continue
                    
                    try:
                        clean_row = [clean_text(cell) for cell in row]
                        # Pad row if incomplete
                        if len(clean_row) < 8: clean_row += [''] * (8 - len(clean_row))
                        
                        # Check required fields: Teacher(3), Day(4), Room(7)
                        if clean_row[3] and clean_row[4] and clean_row[7]:
                            entry = {
                                "section": section,
                                "semester": semester,
                                "course": clean_row[1],
                                "teacher": clean_row[3],
                                "day": clean_row[4],
                                "start": clean_row[5],
                                "end": clean_row[6],
                                "room": clean_row[7]
                            }
                            data.append(entry)
                    except Exception as e:
                        continue

    # Save to JSON
    with open(OUTPUT_FILE, "w") as f:
        json.dump(data, f)
    
    print(f"✅ Success! Generated '{OUTPUT_FILE}' with {len(data)} classes.")
    print("👉 Now upload 'schedule_data.json' to GitHub.")

if __name__ == "__main__":
    convert_pdf()
