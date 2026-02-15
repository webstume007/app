import streamlit as st
import processing
import db_handler
import sqlite3
import os

# --- CONFIGURATION ---
# strict: changing this password is highly recommended
ADMIN_PASSWORD = "admin123" 

def check_password():
    """Returns `True` if the user has the correct password."""

    def password_entered():
        """Checks whether a password entered by the user is correct."""
        if st.session_state["password"] == ADMIN_PASSWORD:
            st.session_state["password_correct"] = True
            del st.session_state["password"]  # Don't store the password
        else:
            st.session_state["password_correct"] = False

    if "password_correct" not in st.session_state:
        # First run, show input for password.
        st.text_input(
            "Enter Admin Password", type="password", on_change=password_entered, key="password"
        )
        return False
    elif not st.session_state["password_correct"]:
        # Password not correct, show input + error.
        st.text_input(
            "Enter Admin Password", type="password", on_change=password_entered, key="password"
        )
        st.error("😕 Password incorrect")
        return False
    else:
        # Password correct.
        return True

def show_admin_page():
    st.title("🔒 Admin Dashboard")

    # 1. SECURITY CHECK
    if not check_password():
        st.stop()  # Stop execution if not logged in

    # 2. LOGGED IN INTERFACE
    st.success("✅ Logged in as Administrator")
    
    st.markdown("### Upload Time Table")
    
    # Warning for Cloud Deployment
    st.info(
        "ℹ️ **NOTE:** If you are running this on Streamlit Cloud, uploading here will update the "
        "schedule for the *current session only*. If the app restarts, data may reset. "
        "For permanent updates, run locally and push the `.db` file to GitHub."
    )

    # File Uploader
    uploaded_file = st.file_uploader("Choose a PDF file (e.g., Spring-2026.pdf)", type="pdf")
    
    if uploaded_file is not None:
        col1, col2 = st.columns([1, 2])
        with col1:
            process_btn = st.button("🚀 Process PDF & Update DB", type="primary")
        
        if process_btn:
            progress_bar = st.progress(0)
            status_text = st.empty()
            
            status_text.text("Initializing database...")
            progress_bar.progress(10)
            
            try:
                # Run the processing logic
                status_text.text("Parsing PDF... please wait...")
                count = processing.process_pdf(uploaded_file)
                progress_bar.progress(100)
                
                st.balloons()
                st.success(f"🎉 Success! The database has been updated with {count} classes.")
                
                # Optional: Show a preview of data
                with st.expander("See Preview of Added Data"):
                    conn = sqlite3.connect(db_handler.DB_FILE)
                    import pandas as pd
                    df = pd.read_sql_query("SELECT * FROM classes LIMIT 5", conn)
                    st.dataframe(df)
                    conn.close()

            except Exception as e:
                progress_bar.empty()
                st.error(f"❌ An error occurred during processing: {e}")

    st.markdown("---")
    
    # Database Management Tools
    st.subheader("Database Management")
    col_a, col_b = st.columns(2)
    
    with col_a:
        if st.button("📊 Check Class Count"):
            try:
                conn = sqlite3.connect(db_handler.DB_FILE)
                c = conn.cursor()
                c.execute("SELECT COUNT(*) FROM classes")
                count = c.fetchone()[0]
                conn.close()
                st.info(f"Current Total Classes: **{count}**")
            except Exception as e:
                st.warning("Database not found or empty.")

    with col_b:
        if st.button("🗑️ Clear Database (Reset)"):
            try:
                db_handler.clear_db()
                st.warning("Database has been cleared!")
            except Exception as e:
                st.error(f"Error clearing DB: {e}")

    # Logout Button
    st.markdown("---")
    if st.button("Log Out"):
        st.session_state["password_correct"] = False
        st.rerun()
