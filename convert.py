import pdfplumber
import json
import re
import os

# --- CONFIGURATION ---
PDF_FILE = "schedule.pdf" 
OUTPUT_FILE = "schedule_data.json"

def clean_and_split(text):
    """Splits by newline and removes empty strings/PDF artifacts."""
    if not text: return []
    # Removes the dots often found at the end of room numbers or names in IUB PDFs
    return [line.strip().rstrip('.') for line in str(text).split('\n') if line.strip()]

def smart_join(lines, target_count):
    """
    Joins wrapped text lines (like long teacher names) back into single strings
    based on the number of actual classes detected in a table row.
    """
    if not lines or target_count <= 0: return [""]
    if len(lines) <= target_count:
        # Pad with empty strings if there are fewer lines than records
        return lines + [""] * (target_count - len(lines))
    
    # Logic: If lines exceed target_count, they are likely wrapped names.
    # We merge them to maintain a clean 1-to-1 mapping.
    result = []
    chunk_size = len(lines) // target_count
    for i in range(target_count):
        start = i * chunk_size
        # The last record takes all remaining lines to catch any odd wrapping
        end = (i + 1) * chunk_size if i < target_count - 1 else len(lines)
        result.append(" ".join(lines[start:end]))
    return result

def convert_pdf():
    # 1. Check if the PDF exists
    if not os.path.exists(PDF_FILE):
        print(f"❌ Error: {PDF_FILE} not found in root directory.")
        return
    
    all_entries = []
    
    with pdfplumber.open(PDF_FILE) as pdf:
        print(f"📂 Processing {len(pdf.pages)} pages...")
        
        for page in pdf.pages:
            text = page.extract_text()
            
            # 2. Extract Section Header (Target: Section: BSARIN-1ST-1M)
            section_match = re.search(r"Section:\s*([A-Za-z0-9-]+)", text)
            section = section_match.group(1) if section_match else "Unknown Section"
            
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    # Skip rows that are empty, only headers, or footers
                    if not row or not row[0] or "COURSE CODE" in str(row[0]).upper():
                        continue
                    
                    # 3. Clean and split columns by newline
                    # IUB PDF Indices: 1:Name, 3:Teacher, 4:Day, 5:Start, 6:End, 7:Room
                    r_names    = clean_and_split(row[1])
                    r_teachers = clean_and_split(row[3])
                    r_days     = clean_and_split(row[4])
                    r_starts   = clean_and_split(row[5])
                    r_ends     = clean_and_split(row[6])
                    r_rooms    = clean_and_split(row[7])

                    # 4. Determine TRUE number of records in this row
                    # 'Day' and 'Time' columns are the most reliable indicators of unique classes
                    record_count = max(len(r_days), len(r_starts), len(r_ends))
                    if record_count == 0: continue

                    # 5. Apply Smart-Join to fix wrapping for long names
                    names    = smart_join(r_names, record_count)
                    teachers = smart_join(r_teachers, record_count)
                    rooms    = smart_join(r_rooms, record_count)
                    
                    # Ensure days/times lists match the record count
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

    # 6. OVERWRITE the JSON file with the new complete list
    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_entries, f, indent=4)
    
    print(f"✅ SUCCESS: {len(all_entries)} records written to {OUTPUT_FILE}.")

if __name__ == "__main__":
    convert_pdf()
