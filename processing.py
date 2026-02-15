# processing.py
import pdfplumber
import pandas as pd
import re
import db_handler

def clean_text(text):
    """Removes newlines and extra spaces from extracted text."""
    if text:
        return text.replace('\n', ' ').strip()
    return ""

def process_pdf(uploaded_file):
    """Parses the uploaded PDF and populates the database."""
    db_handler.init_db()
    db_handler.clear_db()
    
    total_classes = 0
    
    with pdfplumber.open(uploaded_file) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            tables = page.extract_tables()
            
            # Logic: We need to associate tables with their Section Name (Header)
            # This is tricky because extract_tables() returns data, not position relative to text.
            # improved strategy: We iterate through the raw text to find "CLASS NAME" headers
            # and map them sequentially to the tables found on that page.
            
            # 1. Find all Section Headers on this page
            section_headers = re.findall(r"CLASS NAME:.*?(?=,|$|\n)", text)
            
            # 2. Iterate through tables
            # Note: This is a simplified assumption that 1 Header = 1 Table below it.
            # In complex PDFs, we might need coordinate matching, but for this specific layout,
            # sequential mapping usually works if the table follows the header immediately.
            
            for i, table in enumerate(tables):
                if i < len(section_headers):
                    current_section = section_headers[i].replace("CLASS NAME:", "").strip()
                else:
                    current_section = "Unknown Section" 

                # Skip header row (index 0)
                for row in table[1:]:
                    # Check if row is valid (has enough columns)
                    if not row or all(cell is None for cell in row):
                        continue
                        
                    # Extract Data (Handling None values)
                    # Based on your PDF columns: Code, Name, Credit, Teacher, Day, Start, End, Room
                    # Note: Sometimes pdfplumber merges columns if lines are faint.
                    # We assume standard 8 columns based on your description.
                    
                    try:
                        # Basic cleaning to handle None
                        clean_row = [clean_text(cell) for cell in row]
                        
                        # Fix for jagged rows (sometimes empty cells at end)
                        if len(clean_row) < 8:
                            clean_row += [''] * (8 - len(clean_row))
                            
                        course_code = clean_row[0]
                        course_name = clean_row[1]
                        credit_hours = clean_row[2]
                        teacher = clean_row[3]
                        day = clean_row[4]
                        start_time = clean_row[5]
                        end_time = clean_row[6]
                        room = clean_row[7]
                        
                        if course_code and day: # Basic validation
                            db_handler.insert_class((
                                current_section, course_code, course_name, 
                                credit_hours, teacher, day, start_time, end_time, room
                            ))
                            total_classes += 1
                            
                    except Exception as e:
                        print(f"Error parsing row: {row} - {e}")
                        continue
                        
    return total_classes
