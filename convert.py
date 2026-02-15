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
    # Removes the dots often found at the end of room numbers or names
    return [line.strip().rstrip('.') for line in str(text).split('\n') if line.strip()]

def smart_join(lines, target_count):
    """
    Joins wrapped text lines (like long teacher names) back into single strings
    based on the number of actual classes detected in a table row.
    """
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

def convert_pdf():
    if not os.path.exists(PDF_FILE):
        print(f"❌ Error: {PDF_FILE} not found.")
        return
    
    all_entries = []
    
    with pdfplumber.open(PDF_FILE) as pdf:
        print(f"📂 Processing {len(pdf.pages)} pages...")
        
        for page in pdf.pages:
            page_text = page.extract_text()
            tables = page.extract_tables()
            
            # Find all section headers on this page (e.g., Section: BSARIN-3RD-3M)
            # This ensures each table gets its own correct section [cite: 4, 7, 9, 11]
            section_finder = list(re.finditer(r"Section:\s*([A-Za-z0-9-]+)", page_text))
            
            for i, table in enumerate(tables):
                # Match the table to the correct section found on the page
                current_section = "Unknown"
                if section_finder:
                    if i < len(section_finder):
                        current_section = section_finder[i].group(1)
                    else:
                        current_section = section_finder[-1].group(1)

                for row in table:
                    # Skip rows that are empty or header rows [cite: 6, 8, 10]
                    if not row or not row[0] or "COURSE CODE" in str(row[0]).upper():
                        continue
                    
                    # IUB PDF Column Mapping[cite: 6]:
                    # 1:Name, 3:Teacher, 4:Day, 5:Start, 6:End, 7:Room
                    r_names    = clean_and_split(row[1])
                    r_teachers = clean_and_split(row[3])
                    r_days     = clean_and_split(row[4])
                    r_starts   = clean_and_split(row[5])
                    r_ends     = clean_and_split(row[6])
                    r_rooms    = clean_and_split(row[7])

                    # Determine TRUE number of records in this row using reliable time columns
                    record_count = max(len(r_days), len(r_starts), len(r_ends))
                    if record_count == 0: continue

                    # Smart-join logic to fix wrapping for long names (e.g., Mobeen Shahroz)
                    names    = smart_join(r_names, record_count)
                    teachers = smart_join(r_teachers, record_count)
                    rooms    = smart_join(r_rooms, record_count)
                    
                    days     = r_days + [""] * (record_count - len(r_days))
                    starts   = r_starts + [""] * (record_count - len(r_starts))
                    ends     = r_ends + [""] * (record_count - len(r_ends))

                    for j in range(record_count):
                        all_entries.append({
                            "section": current_section,
                            "course": names[j],
                            "teacher": teachers[j] if teachers[j] else "TBA",
                            "day": days[j].upper(),
                            "start": starts[j],
                            "end": ends[j],
                            "room": rooms[j]
                        })

    # OVERWRITE the JSON file with the complete new list
    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_entries, f, indent=4)
    
    print(f"✅ SUCCESS: {len(all_entries)} records written to {OUTPUT_FILE}.")

if __name__ == "__main__":
    convert_pdf()
