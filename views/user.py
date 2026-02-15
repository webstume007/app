# views/user.py
import streamlit as st
import db_handler
import pandas as pd
from datetime import datetime

# Helper to order days correctly
DAYS_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

def show_user_page():
    st.title("🎓 University Time Table")
    
    tab1, tab2, tab3 = st.tabs(["👨‍🏫 Find Teacher", "🚪 Find Room", "📊 Dashboard"])
    
    # --- TAB 1: TEACHER SCHEDULE ---
    with tab1:
        st.subheader("Teacher Schedule")
        teachers = db_handler.get_unique_teachers()
        selected_teacher = st.selectbox("Select Teacher:", [""] + teachers)
        
        if selected_teacher:
            df = db_handler.get_schedule_by_teacher(selected_teacher)
            
            if not df.empty:
                # Add a 'Day Order' column for sorting
                df['Day_Index'] = df['day'].apply(lambda x: DAYS_ORDER.index(x.upper()) if x.upper() in DAYS_ORDER else 9)
                df = df.sort_values(by=['Day_Index', 'start_time'])
                
                # Display nicely
                for day in DAYS_ORDER:
                    day_classes = df[df['day'].str.upper() == day]
                    if not day_classes.empty:
                        st.markdown(f"### {day}")
                        for index, row in day_classes.iterrows():
                            st.markdown(f"""
                            <div class="class-card">
                                <strong>{row['start_time']} - {row['end_time']}</strong> | 📍 {row['room']}<br>
                                <span style="color: #555;">{row['course_name']}</span><br>
                                <small>Section: {row['section_name']}</small>
                            </div>
                            """, unsafe_allow_html=True)
            else:
                st.info("No classes found for this teacher.")

    # --- TAB 2: ROOM CHECKER ---
    with tab2:
        st.subheader("Room Availability")
        rooms = db_handler.get_unique_rooms()
        selected_room = st.selectbox("Select Room:", [""] + rooms)
        
        if selected_room:
            df = db_handler.get_schedule_by_room(selected_room)
            
            # Create a pivot table for visual representation
            if not df.empty:
                st.write(f"Schedule for **{selected_room}**")
                
                # Simple List View
                df['Day_Index'] = df['day'].apply(lambda x: DAYS_ORDER.index(x.upper()) if x.upper() in DAYS_ORDER else 9)
                df = df.sort_values(by=['Day_Index', 'start_time'])
                
                # Styled Table
                st.dataframe(
                    df[['day', 'start_time', 'end_time', 'course_name', 'teacher']],
                    use_container_width=True,
                    hide_index=True
                )
                
                st.info("💡 Tip: If a time slot is NOT listed above, the room is likely FREE.")
            else:
                st.success(f"Room {selected_room} appears to be completely free this week!")

    # --- TAB 3: CURRENT STATUS ---
    with tab3:
        st.subheader("Live Status")
        # Get current day and time
        now = datetime.now()
        current_day = now.strftime("%a").upper() # e.g., "MON"
        current_time_str = now.strftime("%I:%M %p") # e.g., "02:30 PM"
        
        st.write(f"Current Time: **{current_day} {current_time_str}**")
        
        # This requires Python filtering on the full dataset
        # (Simplified implementation - just showing logic)
        st.write("Select a room to see if it is currently occupied:")
        check_room = st.selectbox("Check Room:", rooms, key="live_room")
        
        if check_room:
            # We fetch schedule for this room on the current day
            conn = db_handler.sqlite3.connect(db_handler.DB_FILE)
            query = "SELECT * FROM classes WHERE room = ? AND day = ?"
            schedule = pd.read_sql_query(query, conn, params=(check_room, current_day))
            conn.close()
            
            if schedule.empty:
                st.markdown(f'<div class="badge-free">✅ Room {check_room} is Free Today</div>', unsafe_allow_html=True)
            else:
                # Logic to check time overlap would go here
                # For now, we show the day's schedule so user can check
                st.write("Today's Classes in this room:")
                st.table(schedule[['start_time', 'end_time', 'course_name']])
