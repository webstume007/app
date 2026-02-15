import streamlit as st
import processing
import db_handler
import sqlite3
import os
from git import Repo, Actor

# --- CONFIGURATION ---
ADMIN_PASSWORD = "admin123"  # Change this!
DB_FILE = "schedule.db"

# --- GITHUB SYNC FUNCTION ---
def push_to_github():
    """Commits and pushes the database to GitHub."""
    try:
        # 1. Load Secrets
        GITHUB_TOKEN = st.secrets["github"]["token"]
        USERNAME = st.secrets["github"]["username"]
        REPO_NAME = st.secrets["github"]["repo_name"]
        EMAIL = st.secrets["github"]["email"]

        # 2. Setup Repo Path
        # Streamlit Cloud clones the repo to current directory
        repo_dir = os.getcwd() 
        repo = Repo(repo_dir)

        # 3. Configure Git User (Required for commit)
        author = Actor(USERNAME, EMAIL)
        repo.config_writer().set_value("user", "name", USERNAME).release()
        repo.config_writer().set_value("user", "email", EMAIL).release()

        # 4. Add Database File
        file_path = os.path.join(repo_dir, DB_FILE)
        repo.index.add([file_path])

        # 5. Commit
        commit_message = "Auto-update: Schedule database updated via Admin Panel"
        repo.index.commit(commit_message, author=author, committer=author)

        # 6. Push with Token Authentication
        # We construct the remote URL with the token embedded
        remote_url = f"https://{USERNAME}:{GITHUB_TOKEN}@github.com/{USERNAME}/{REPO_NAME}.git"
        origin = repo.remote(name='origin')
        origin.set_url(remote_url)
        
        origin.push()
        return True, "Synced to GitHub successfully!"

    except Exception as e:
        return False, f"GitHub Sync Failed: {str(e)}"

# --- AUTHENTICATION ---
def check_password():
    """Returns `True` if the user has the correct password."""
    def password_entered():
        if st.session_state["password"] == ADMIN_PASSWORD:
            st.session_state["password_correct"] = True
            del st.session_state["password"]
        else:
            st.session_state["password_correct"] = False

    if "password_correct" not in st.session_state:
        st.text_input("Enter Admin Password", type="password", on_change=password_entered, key="password")
        return False
    elif not st.session_state["password_correct"]:
        st.text_input("Enter Admin Password", type="password", on_change=password_entered, key="password")
        st.error("😕 Password incorrect")
        return False
    else:
        return True

# --- MAIN PAGE ---
def show_admin_page():
    st.title("🔒 Admin Dashboard")

    if not check_password():
        st.stop()

    st.success("✅ Logged in as Administrator")
    st.markdown("### Upload Time Table")

    uploaded_file = st.file_uploader("Choose a PDF file (e.g., Spring-2026.pdf)", type="pdf")
    
    if uploaded_file is not None:
        if st.button("🚀 Process PDF & Update DB", type="primary"):
            progress = st.progress(0)
            status = st.empty()
            
            # 1. Process PDF
            status.text("Parsing PDF...")
            progress.progress(20)
            try:
                count = processing.process_pdf(uploaded_file)
                progress.progress(50)
                st.success(f"✅ Database updated locally with {count} classes.")
            except Exception as e:
                st.error(f"❌ Processing Error: {e}")
                st.stop()

            # 2. Sync to GitHub
            status.text("Syncing to GitHub (Saving permanently)...")
            progress.progress(70)
            
            # Only run sync if we are on the cloud (or have secrets set locally)
            if "github" in st.secrets:
                success, message = push_to_github()
                if success:
                    progress.progress(100)
                    st.success(f"☁️ {message}")
                    st.balloons()
                else:
                    st.error(message)
            else:
                st.warning("⚠️ GitHub secrets not found. Data saved locally but will be lost on reboot.")

    st.markdown("---")
    
    # Database Management Tools
    col_a, col_b = st.columns(2)
    with col_a:
        if st.button("📊 Check Class Count"):
            conn = sqlite3.connect(db_handler.DB_FILE)
            c = conn.cursor()
            try:
                c.execute("SELECT COUNT(*) FROM classes")
                st.info(f"Total Classes: **{c.fetchone()[0]}**")
            except:
                st.warning("Empty DB")
            conn.close()

    with col_b:
        if st.button("Logout"):
            st.session_state["password_correct"] = False
            st.rerun()
