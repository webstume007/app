import streamlit as st
import db_handler
import pandas as pd
from datetime import datetime, timedelta

# Standard University Time Slots (30 min chunks for accuracy)
TIME_SLOTS = [
    "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
    "05:00 PM"
]
DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"]

def parse_time(t_str):
    """Converts '8:00 AM' to a comparable object."""
    try:
        return datetime.strptime(t_str, "%I:%M %p")
    except:
        return None

def generate_weekly_grid(df):
    """Creates a HTML table with Free/Busy slots."""
    
    # 1. Create a Base Matrix (Rows=Time, Cols=Days)
    grid = {time: {day: {"status": "Free", "info": ""} for day in DAYS} for time in TIME_SLOTS}
    
    # 2. Fill the Matrix with Class Data
    if not df.empty:
        for _, row in df.iterrows():
            day = row['day'].upper()
            if day not in DAYS: continue
            
            start = parse_time(row['start_time'])
            end = parse_time(row['end_time'])
            
            if start and end:
                # Find all 30-min slots this class covers
                for time_str in TIME_SLOTS:
                    slot_time = parse_time(time_str)
                    if start <= slot_time < end:
                        grid[time_str][day]["status"] = "Busy"
                        grid[time_str][day]["info"] = f"{row['course_name']}<br><span style='font-size:0.8em'>({row['teacher']})</span>"

    # 3. Build HTML Table
    html = "<table><thead><tr><th>Time</th>"
    for day in DAYS:
        html += f"<th>{day}</th>"
    html += "</tr></thead><tbody>"

    for time in TIME_SLOTS:
        html += f"<tr><td style='font-weight:bold; background:#eee;'>{time}</td>"
        for day in DAYS:
            cell = grid[time][day]
            if cell["status"] == "Free":
                # GREEN CELL
                html += "<td class='slot-free'>FREE</td>"
            else:
                # BUSY CELL
                html += f"<td class='slot-busy'>{cell['info']}</td>"
        html += "</tr>"
    
    html += "</tbody></table>"
    return html

def show_user_page():
    st.title("🎓 IUB Timetable Viewer")
    
    # --- SEARCH FILTERS ---
    col1, col2 = st.columns(2)
    with col1:
        mode = st.radio("Search By:", ["Teacher", "Room"], horizontal=True)
    
    # --- ROOM VIEW (THE GRID) ---
    if mode == "Room":
        st.subheader("🚪 Room Availability Grid")
        rooms = db_handler.get_unique_rooms()
        selected_room = st.selectbox("Select Room:", [""] + rooms)
        
        if selected_room:
            # Fetch Data
            df = db_handler.get_schedule_by_room(selected_room)
            
            # Generate the Green/Blue Grid
            table_html = generate_weekly_grid(df)
            
            # Render HTML
            st.markdown(table_html, unsafe_allow_html=True)
            
    # --- TEACHER VIEW ---
    elif mode == "Teacher":
        st.subheader("👨‍🏫 Teacher Schedule")
        teachers = db_handler.get_unique_teachers()
        selected_teacher = st.selectbox("Select Teacher:", [""] + teachers)
        
        if selected_teacher:
            df = db_handler.get_schedule_by_teacher(selected_teacher)
            if not df.empty:
                # Reuse the grid logic because it looks better!
                table_html = generate_weekly_grid(df)
                st.markdown(table_html, unsafe_allow_html=True)
            else:
                st.info("No schedule found.")
