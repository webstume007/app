import sqlite3
import pandas as pd

DB_FILE = "schedule.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_name TEXT,
            semester TEXT,
            course_name TEXT,
            teacher TEXT,
            day TEXT,
            start_time TEXT,
            end_time TEXT,
            room TEXT
        )
    ''')
    conn.commit()
    conn.close()

def clear_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("DELETE FROM classes")
    conn.commit()
    conn.close()

def insert_class(data):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO classes (section_name, semester, course_name, teacher, day, start_time, end_time, room)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', data)
    conn.commit()
    conn.close()

def get_all_data():
    conn = sqlite3.connect(DB_FILE)
    # Fetch all data to process in Python (faster for complex time logic)
    df = pd.read_sql_query("SELECT * FROM classes", conn)
    conn.close()
    return df.to_dict(orient='records')
