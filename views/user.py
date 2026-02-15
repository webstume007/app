import streamlit as st
import db_handler
import pandas as pd
from datetime import datetime

# Time slots for the grid (30 min intervals)
TIME_SLOTS = [
    "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
    "05:00 PM", "05:30 PM", "06:00 PM"
]
DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"]

def parse_time(t_str):
    try:
        return datetime.strptime(t_str.strip(), "%I:%M %p")
    except:
        return None

def generate_weekly_grid(df):
    # 1. Initialize Grid
    # Structure: grid[time][day] = {status, info}
    grid = {time: {day: {"status": "Free", "info": ""} for day in DAYS} for time in TIME_SLOTS}
    
    # 2. Populate Grid
    if not df.empty:
        for _, row in df.iterrows():
            day = row['day'].upper()
            if day not in DAYS: continue
            
            start = parse_time(row['start_time'])
            end = parse_time(row['end_time'])
            
            # Format the cell content
            # Showing: Course, Teacher, Section/Semester
            cell_content = f"""
            <div style="line-height:1.2;">
                <strong>{row['course_name']}</strong><br>
                <span style="font-size:0.9em;">👨‍🏫 {row['teacher']}</span><br>
                <span style="font-size:0.8em; color:#444;">🎓 {row['section_name']}</span>
                <br><span style="font-size:0.8em; color:#0056b3;">📍 {row.get('room', '')}</span>
            </div>
            """
            
            if start and end:
                for time_str in TIME_SLOTS:
                    slot_time = parse_time(time_str)
                    if start <= slot_time < end:
                        grid[time_str][day]["status"] = "Busy"
                        grid[time_str][day]["info"] = cell_content

    # 3. Build HTML Table
    html = """
    <table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif;">
        <thead>
            <tr style="background-color: #002147; color: #F2A900;">
                <th style="padding:10px; border:1px solid #ddd;">Time</th>
                """ + "".join([f"<th style='padding:10px; border:1px solid #ddd;'>{d}</th>" for d in DAYS]) + """
            </tr>
        </thead>
        <tbody>
    """

    for time in TIME_SLOTS:
        row_html = f"<tr><td style='background-color:#f8f9fa; font-weight:bold; border:1px solid #ddd; padding:8px; color:#333;'>{time}</td>"
        
        for day in DAYS:
            cell = grid[time][day]
            if cell["status"] == "Free":
                # GREEN FOR FREE
                row_html += "<td style='background-color:#d4edda; color:#155724; text-align:center; border:1px solid #ddd; font-weight:bold;'>FREE</td>"
            else:
                # BLUE FOR BUSY
                row_html += f"<td style='background-color:#e7f1ff; color:#000; border:1px solid #ddd; padding:5px; font-size:0.85em;'>{cell['info']}</td>"
        
        row_html += "</tr>"

    html += "</tbody></table>"
    return html

def show_user_page():
    st.markdown("## 🗓️ University Timetable Portal")
    
    col1, col2 = st.columns(2)
    with col1:
        mode = st.radio("Search Mode:", ["Find Teacher Schedule", "Check Room Availability"], horizontal=True)
    
    st.write("---")

    if mode == "Check Room Availability":
        st.subheader("🚪 Room Schedule")
        rooms = db_handler.get_unique_rooms()
        selected_room = st.selectbox("Select Room to Check:", [""] + rooms)
        
        if selected_room:
            df = db_handler.get_schedule_by_room(selected_room)
            st.markdown(generate_weekly_grid(df), unsafe_allow_html=True)

    elif mode == "Find Teacher Schedule":
        st.subheader("👨‍🏫 Teacher Timetable")
        teachers = db_handler.get_unique_teachers()
        selected_teacher = st.selectbox("Select Teacher:", [""] + teachers)
        
        if selected_teacher:
            df = db_handler.get_schedule_by_teacher(selected_teacher)
            st.markdown(generate_weekly_grid(df), unsafe_allow_html=True)
