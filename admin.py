# views/admin.py
import streamlit as st
import processing
import db_handler

def show_admin_page():
    st.header("Admin Dashboard")
    st.write("Upload the Time Table PDF to update the system.")
    
    uploaded_file = st.file_uploader("Choose a PDF file", type="pdf")
    
    if uploaded_file is not None:
        if st.button("Process PDF & Update Database"):
            with st.spinner("Parsing PDF... This might take a moment..."):
                try:
                    count = processing.process_pdf(uploaded_file)
                    st.success(f"Successfully processed! Added {count} classes to the database.")
                    st.balloons()
                except Exception as e:
                    st.error(f"An error occurred: {e}")
                    
    st.markdown("---")
    st.subheader("System Stats")
    # Quick check of DB size
    conn = db_handler.sqlite3.connect(db_handler.DB_FILE)
    c = conn.cursor()
    try:
        c.execute("SELECT COUNT(*) FROM classes")
        count = c.fetchone()[0]
        st.info(f"Total Classes in Database: {count}")
    except:
        st.warning("Database not initialized.")
    conn.close()
