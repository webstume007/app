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
            course_code TEXT,
            course_name TEXT,
            credit_hours TEXT,
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
        INSERT INTO classes (section_name, course_code, course_name, credit_hours, teacher, day, start_time, end_time, room)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', data)
    conn.commit()
    conn.close()

def get_unique_teachers():
    conn = sqlite3.connect(DB_FILE)
    try:
        df = pd.read_sql_query("SELECT DISTINCT teacher FROM classes WHERE teacher IS NOT NULL AND teacher != '' ORDER BY teacher", conn)
        return df['teacher'].tolist()
    except:
        return []
    finally:
        conn.close()

def get_unique_rooms():
    conn = sqlite3.connect(DB_FILE)
    try:
        df = pd.read_sql_query("SELECT DISTINCT room FROM classes WHERE room IS NOT NULL AND room != '' ORDER BY room", conn)
        return df['room'].tolist()
    except:
        return []
    finally:
        conn.close()

def get_schedule_by_teacher(teacher_name):
    conn = sqlite3.connect(DB_FILE)
    # ADDED 'teacher' to this query to fix the KeyError
    query = "SELECT day, start_time, end_time, course_name, room, section_name, teacher FROM classes WHERE teacher = ?"
    df = pd.read_sql_query(query, conn, params=(teacher_name,))
    conn.close()
    return df

def get_schedule_by_room(room_name):
    conn = sqlite3.connect(DB_FILE)
    # Added 'room' to this query for consistency
    query = "SELECT day, start_time, end_time, course_name, teacher, section_name, room FROM classes WHERE room = ?"
    df = pd.read_sql_query(query, conn, params=(room_name,))
    conn.close()
    return df
# db_handler.py modification:
def get_schedule_by_teacher(teacher_name):
    conn = sqlite3.connect(DB_FILE)
    # We fetch section_name as 'semester' for display purposes if semester col doesn't exist
    query = """
        SELECT day, start_time, end_time, course_name, room, section_name, teacher, 
        section_name as semester 
        FROM classes WHERE teacher = ?
    """
    df = pd.read_sql_query(query, conn, params=(teacher_name,))
    conn.close()
    return df

def get_schedule_by_room(room_name):
    conn = sqlite3.connect(DB_FILE)
    query = """
        SELECT day, start_time, end_time, course_name, teacher, section_name, room,
        section_name as semester
        FROM classes WHERE room = ?
    """
    df = pd.read_sql_query(query, conn, params=(room_name,))
    conn.close()
    return df
