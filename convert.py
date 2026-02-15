import pdfplumber
import json
import re
import os

PDF_FILE = "schedule.pdf" 
OUTPUT_FILE = "schedule_data.json"

def split_lines(text):
    return [line.strip() for line in str(text).split('\n') if line.strip()]

def convert_pdf():
    if not os.path.exists(PDF_FILE): return
    
    all_entries = []
    with pdfplumber.open(PDF_FILE) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            # Associate tables with the correct section header [cite: 4, 7, 9]
            sections = re.findall(r"Section:\s*([A-Za-z0-9-]+)", text)
            section = sections[0] if sections else "Unknown"
            
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    # Column mapping based on IUB PDF structure [cite: 6]
                    if not row or "COURSE" in str(row[0]).upper(): continue
                    
                    # Split cells that contain multiple lines [cite: 12, 50]
                    names = split_lines(row[1])
                    teachers = split_lines(row[3])
                    days = split_lines(row[4])
                    starts = split_lines(row[5])
                    ends = split_lines(row[6])
                    rooms = split_lines(row[7])

                    # Create a clean entry for every line found in the row 
                    count = max(len(names), len(teachers), len(days))
                    for i in range(count):
                        try:
                            all_entries.append({
                                "section": section,
                                "course": names[i] if i < len(names) else names[0],
                                "teacher": teachers[i] if i < len(teachers) else (teachers[0] if teachers else "TBA"),
                                "day": (days[i] if i < len(days) else days[0]).upper(),
                                "start": starts[i] if i < len(starts) else starts[0],
                                "end": ends[i] if i < len(ends) else ends[0],
                                "room": rooms[i] if i < len(rooms) else rooms[0]
                            })
                        except: continue

    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_entries, f, indent=4)
    print("✅ JSON Generated Successfully")

if __name__ == "__main__":
    convert_pdf()
