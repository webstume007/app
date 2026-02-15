import streamlit as st
import db_handler
import pandas as pd
from datetime import datetime

# --- CONFIGURATION ---
TIME_SLOTS = [
    "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", 
    "05:00 PM"
]
DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"]

def parse_time(t_str):
    try:
        return datetime.strptime(t_str.strip(), "%I:%M %p")
    except:
        return None

def generate_html_grid(df, title_text):
    """Generates a raw HTML table with inline CSS for 100% styling control."""
    
    # 1. Initialize empty grid structure
    # grid[time][day] = HTML_CONTENT
    grid = {time: {day: "" for day in DAYS} for time in TIME_SLOTS}
    
    # 2. Fill Grid
    if not df.empty:
        for _, row in df.iterrows():
            day = row['day'].upper()
            if day not in DAYS: continue
            
            start = parse_time(row['start_time'])
            end = parse_time(row['end_time'])
            
            # Create the card content
            card_html = f"""
            <div style="background-color: #E3F2FD; border-left: 4px solid #002147; padding: 4px; margin-bottom: 2px; text-align: left; border-radius: 4px;">
                <div style="font-weight: bold; color: #002147; font-size: 0.9em;">{row['course_name']}</div>
                <div style="color: #333; font-size: 0.8em;">👨‍🏫 {row['teacher']}</div>
                <div style="color: #555; font-size: 0.75em; font-style: italic;">{row['section_name']} ({row['semester']})</div>
                <div style="color: #0056b3; font-size: 0.8em; font-weight: bold;">📍 {row['room']}</div>
            </div>
            """
            
            if start and end:
                for time_str in TIME_SLOTS:
                    slot_time = parse_time(time_str)
                    if start <= slot_time < end:
                        # Append content (in case of overlap/clash)
                        grid[time_str][day] += card_html

    # 3. Build HTML Table String
    html = f"""
    <h3 style="color: #002147; border-bottom: 2px solid #F2A900; padding-bottom: 10px;">{title_text}</h3>
    <div style="overflow-x: auto;">
    <table style="width:100%; border-collapse: collapse; min-width: 800px;">
        <thead>
            <tr style="background-color: #002147; color: white;">
                <th style="padding: 10px; border: 1px solid #444; width: 100px;">Time</th>
                {''.join([f'<th style="padding: 10px; border: 1px solid #444;">{d}</th>' for d in DAYS])}
            </tr>
        </thead>
        <tbody>
    """

    for time in TIME_SLOTS:
        row_html = f"<tr><td style='background-color: #f0f0f0; font-weight: bold; border: 1px solid #ccc; padding: 8px;'>{time}</td>"
        
        for day in DAYS:
            content = grid[time][day]
            if content == "":
                # Free Slot
                row_html += "<td style='background-color: #ffffff; border: 1px solid #ccc; text-align: center; color: #ccc;'>-</td>"
            else:
                # Busy Slot
                row_html += f"<td style='background-color: #ffffff; border: 1px solid #ccc; vertical-align: top; padding: 5px;'>{content}</td>"
        
        row_html += "</tr>"

    html += "</tbody></table></div>"
    return html

def show_user_page():
    st.markdown("## 🗓️ IUB Timetable Portal")
    
    # We use columns to organize the inputs neatly
    col1, col2 = st.columns([1, 2])
    
    with col1:
        st.markdown("### 🔍 Filter")
        mode = st.radio("Select View:", ["Find Teacher", "Find Room"], label_visibility="collapsed")
        
        if mode == "Find Teacher":
            teachers = db_handler.get_unique_teachers()
            selection = st.selectbox("Select Teacher:", [""] + teachers)
        else:
            rooms = db_handler.get_unique_rooms()
            selection = st.selectbox("Select Room:", [""] + rooms)

    # Main Display Area
    st.write("---")
    
    if selection:
        if mode == "Find Teacher":
            df = db_handler.get_schedule_by_teacher(selection)
            if not df.empty:
                st.markdown(generate_html_grid(df, f"Schedule for {selection}"), unsafe_allow_html=True)
            else:
                st.warning("No schedule found.")
        
        elif mode == "Find Room":
            df = db_handler.get_schedule_by_room(selection)
            if not df.empty:
                st.markdown(generate_html_grid(df, f"Room Occupancy: {selection}"), unsafe_allow_html=True)
            else:
                st.success(f"Room {selection} is completely free this week!")
