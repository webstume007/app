import pdfplumber
import json
import re
import os
import glob

OUTPUT_FILE = "schedule_data.json"

def clean_text(text):
    return str(text).replace('\n', ' ').strip() if text else ""

def convert_pdf():
    # 1. Find the first PDF file in the folder
    pdf_files = glob.glob("*.pdf")
    
    if not pdf_files:
        print("❌ No PDF file found in the repository.")
        return

    # Use the first PDF found (or you can add logic to pick the newest)
    pdf_path = pdf_files[0]
    print(f"🔄 Processing file: {pdf_path}...")
    
    data = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                tables = page.extract_tables()
                
                # Extract Section & Semester
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

                if tables:
                    schedule_table = max(tables, key=len)
                    for row in schedule_table:
                        if not row or row[0] == "COURSE CODE" or row[0] is None: continue
                        
                        try:
                            clean_row = [clean_text(cell) for cell in row]
                            if len(clean_row) < 8: clean_row += [''] * (8 - len(clean_row))
                            
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
                        except:
                            continue

        # Save to JSON
        with open(OUTPUT_FILE, "w") as f:
            json.dump(data, f)
        
        print(f"✅ Success! Generated '{OUTPUT_FILE}' with {len(data)} classes.")
        
    except Exception as e:
        print(f"❌ Error processing PDF: {e}")

if __name__ == "__main__":
    convert_pdf()
