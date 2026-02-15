# main.py
import streamlit as st
import styles
import db_handler
from views import user, admin

# Page Configuration
st.set_page_config(
    page_title="IUB Schedule App",
    page_icon="📅",
    layout="wide"
)

# Apply CSS
styles.apply_custom_css()

# Initialize DB on first load
if 'db_init' not in st.session_state:
    db_handler.init_db()
    st.session_state['db_init'] = True

# Sidebar Navigation
st.sidebar.title("Navigation")
page = st.sidebar.radio("Go to:", ["Student/Teacher View", "Admin Panel"])

if page == "Student/Teacher View":
    user.show_user_page()
elif page == "Admin Panel":
    # Optional: Add password protection here
    password = st.sidebar.text_input("Admin Password", type="password")
    if password == "admin123": # Change this!
        admin.show_admin_page()
    else:
        st.sidebar.warning("Enter password to access Admin Panel")
        st.info("Please navigate to the Student View if you are not an admin.")
