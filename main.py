# main.py
import streamlit as st
import styles
import db_handler
from views import user, admin

# Page Config (Must be first)
st.set_page_config(
    page_title="IUB Schedule",
    page_icon="🎓",
    layout="centered" # Centered looks better for mobile/student view
)

# Initialize DB
if 'db_init' not in st.session_state:
    db_handler.init_db()
    st.session_state['db_init'] = True

# Apply IUB Styles
styles.apply_custom_css()

# --- STATE MANAGEMENT ---
if "admin_mode" not in st.session_state:
    st.session_state["admin_mode"] = False

if "show_login" not in st.session_state:
    st.session_state["show_login"] = False

# --- HEADER AREA ---
# We use columns to put the "Update" button discreetly at the top right
col_header, col_btn = st.columns([5, 2])

with col_header:
    # Empty because headers are handled in views, or you can put a logo here
    pass 

with col_btn:
    # This button toggles the login form visibility
    if not st.session_state["admin_mode"]:
        if st.button("⚙️ Update Schedule"):
            st.session_state["show_login"] = not st.session_state["show_login"]

# --- LOGIN LOGIC (Hidden by default) ---
if st.session_state["show_login"] and not st.session_state["admin_mode"]:
    st.markdown("### 🔐 Admin Access")
    with st.form("login_form"):
        username = st.text_input("Username")
        password = st.text_input("Password", type="password")
        submitted = st.form_submit_button("Login")
        
        if submitted:
            # Check secrets
            try:
                correct_user = st.secrets["admin"]["username"]
                correct_pass = st.secrets["admin"]["password"]
                
                if username == correct_user and password == correct_pass:
                    st.session_state["admin_mode"] = True
                    st.session_state["show_login"] = False
                    st.success("Login Successful!")
                    st.rerun()
                else:
                    st.error("Invalid Credentials")
            except Exception as e:
                st.error("Secrets not configured correctly on Cloud.")

# --- MAIN DISPLAY LOGIC ---
if st.session_state["admin_mode"]:
    # Show Admin View
    admin.show_admin_page()
    
    if st.button("⬅️ Log Out / Return to Student View"):
        st.session_state["admin_mode"] = False
        st.rerun()

else:
    # Show User View (Default)
    user.show_user_page()
