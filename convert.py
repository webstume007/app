import pdfplumber
import json
import re
import os

# --- CONFIGURATION ---
PDF_FILE = "schedule.pdf" 
OUTPUT_FILE = "schedule_data.json"

def clean_text(text):
    """Cleans up newline characters and extra spaces."""
    return str(text).strip() if text else ""

def split_multiline_cell(cell_text):
    """Splits text by newlines and returns a list of cleaned strings."""
    if not cell_text:
        return [""]
    return [line.strip() for line in cell_text.split('\n') if line.strip()]

def convert_pdf():
    if not os.path.exists(PDF_FILE):
        print(f"❌ Error: {PDF_FILE} not found.")
        return

    all_data = []
    
    with pdfplumber.open(PDF_FILE) as pdf:
        current_section = "Unknown"
        current_semester = "Unknown"

        for page in pdf.pages:
            text = page.extract_text()
            tables = page.extract_tables()
            
            # 1. Improved Header Extraction
            # Target: CLASS NAME: BS (AI) MORNING 1ST SEMESTER, Section: BSARIN-1ST-1M
            header_pattern = r"CLASS NAME:.*?(\d(?:ST|ND|RD|TH)).*?Section:\s*([A-Za-z0-9-]+)"
            headers = re.findall(header_pattern, text)
            
            # Since a page might contain multiple sections, we track them as we go
            # This logic assumes tables follow their respective section headers
            
            if tables:
                table_idx = 0
                # Split page text by section headers to associate tables with the right section
                parts = re.split(r"CLASS NAME:", text)
                
                for part in parts[1:]: # Skip text before the first section
                    # Re-extract info for this specific part
                    info = re.search(r".*?(\d(?:ST|ND|RD|TH)).*?Section:\s*([A-Za-z0-9-]+)", part)
                    if info:
                        current_semester = info.group(1).lower()
                        current_section = info.group(2).strip()

                    # Process the next table found in this section area
                    if table_idx < len(tables):
                        rows = tables[table_idx]
                        table_idx += 1
                        
                        for row in rows:
                            # Skip headers
                            if not row or "COURSE CODE" in str(row[0]).upper():
                                continue
                            
                            # Standardizing columns based on your extraction:
                            # 0:Code, 1:Name, 2:Hours, 3:Teacher, 4:Day, 5:Start, 6:End, 7:Room
                            
                            # Handle multiline entries (multiple classes in one row)
                            codes = split_multiline_cell(row[0])
                            names = split_multiline_cell(row[1])
                            teachers = split_multiline_cell(row[3])
                            days = split_multiline_cell(row[4])
                            starts = split_multiline_cell(row[5])
                            ends = split_multiline_cell(row[6])
                            rooms = split_multiline_cell(row[7])

                            # Zip them together. We use 'codes' as the driver.
                            # If a cell has 1 line but others have 3, we repeat the 1 line.
                            max_len = max(len(codes), len(names), len(teachers), len(days), len(starts), len(ends), len(rooms))
                            
                            for i in range(max_len):
                                try:
                                    entry = {
                                        "section": current_section,
                                        "semester": current_semester,
                                        "course": names[i] if i < len(names) else names[0],
                                        "teacher": teachers[i] if i < len(teachers) else (teachers[0] if teachers else "TBA"),
                                        "day": days[i] if i < len(days) else days[0],
                                        "start": starts[i] if i < len(starts) else starts[0],
                                        "end": ends[i] if i < len(ends) else ends[0],
                                        "room": rooms[i] if i < len(rooms) else rooms[0]
                                    }
                                    all_data.append(entry)
                                except Exception as e:
                                    continue

    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_data, f, indent=4)
    
    print(f"✅ Success! Processed {len(all_data)} class slots into {OUTPUT_FILE}")

if __name__ == "__main__":
    convert_pdf()
