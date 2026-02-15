import pdfplumber
import re
import db_handler

def clean_text(text):
    return str(text).replace('\n', ' ').strip() if text else ""

def process_pdf(pdf_path):
    db_handler.init_db()
    db_handler.clear_db()
    
    count = 0
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            tables = page.extract_tables()
            
            # Extract Section & Semester from Header
            # Example: CLASS NAME: BS (AI) MORNING 1ST SEMESTER, Section: BSARIN-1ST-1M
            header_match = re.search(r"CLASS NAME:(.*?)Section:\s*([A-Za-z0-9-]+)", text)
            section = "Unknown"
            semester = "Unknown"
            
            if header_match:
                full_header = header_match.group(1)
                section = header_match.group(2).strip()
                if "1ST" in full_header: semester = "1st"
                elif "2ND" in full_header: semester = "2nd"
                elif "3RD" in full_header: semester = "3rd"
                elif "4TH" in full_header: semester = "4th"
                elif "5TH" in full_header: semester = "5th"
                elif "6TH" in full_header: semester = "6th"
                elif "7TH" in full_header: semester = "7th"
                elif "8TH" in full_header: semester = "8th"

            if tables:
                # Assume largest table is the schedule
                schedule_table = max(tables, key=len)
                for row in schedule_table:
                    # Skip headers
                    if not row or row[0] == "COURSE CODE" or row[0] is None: continue
                    
                    try:
                        clean_row = [clean_text(cell) for cell in row]
                        # Ensure row has enough columns (pad if needed)
                        if len(clean_row) < 8: clean_row += [''] * (8 - len(clean_row))
                        
                        # Indices based on your PDF: 
                        # 0:Code, 1:Name, 2:Credit, 3:Teacher, 4:Day, 5:Start, 6:End, 7:Room
                        if clean_row[3] and clean_row[4] and clean_row[7]:
                            db_handler.insert_class((
                                section,
                                semester,
                                clean_row[1], # Course Name
                                clean_row[3], # Teacher
                                clean_row[4], # Day
                                clean_row[5], # Start
                                clean_row[6], # End
                                clean_row[7]  # Room
                            ))
                            count += 1
                    except:
                        continue
    return count
