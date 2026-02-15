import pdfplumber
import json
import re
import os

PDF_FILE = "schedule.pdf" 
OUTPUT_FILE = "schedule_data.json"

def split_multiline(text):
    return [line.strip() for line in str(text).split('\n') if line.strip()]

def convert_pdf():
    if not os.path.exists(PDF_FILE): return
    
    all_entries = []
    with pdfplumber.open(PDF_FILE) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            # Capture Section e.g., BSARIN-1ST-1M [cite: 4]
            section_match = re.search(r"Section:\s*([A-Za-z0-9-]+)", text)
            section = section_match.group(1) if section_match else "Unknown"
            
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if not row or "COURSE CODE" in str(row[0]): continue
                    
                    # Columns: 0:Code, 1:Name, 3:Teacher, 4:Day, 5:Start, 6:End, 7:Room 
                    names = split_multiline(row[1])
                    teachers = split_multiline(row[3])
                    days = split_multiline(row[4])
                    starts = split_multiline(row[5])
                    ends = split_multiline(row[6])
                    rooms = split_multiline(row[7])

                    count = max(len(names), len(teachers), len(days))
                    for i in range(count):
                        try:
                            all_entries.append({
                                "section": section,
                                "course": names[i] if i < len(names) else names[0],
                                "teacher": teachers[i] if i < len(teachers) else (teachers[0] if teachers else "TBA"),
                                "day": days[i] if i < len(days) else days[0],
                                "start": starts[i] if i < len(starts) else starts[0],
                                "end": ends[i] if i < len(ends) else ends[0],
                                "room": rooms[i] if i < len(rooms) else rooms[0]
                            })
                        except: continue

    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_entries, f, indent=4)
    print("✅ JSON Generated")

if __name__ == "__main__":
    convert_pdf()
