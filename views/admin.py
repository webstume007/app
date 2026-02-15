import streamlit as st
import processing
import db_handler
import sqlite3
import os
from git import Repo, Actor

# --- GITHUB SYNC FUNCTION ---
def push_to_github():
    try:
        GITHUB_TOKEN = st.secrets["github"]["token"]
        USERNAME = st.secrets["github"]["username"]
        REPO_NAME = st.secrets["github"]["repo_name"]
        EMAIL = st.secrets["github"]["email"]
        repo_dir = os.getcwd() 
        repo = Repo(repo_dir)
        author = Actor(USERNAME, EMAIL)
        file_path = os.path.join(repo_dir, "schedule.db")
        repo.index.add([file_path])
        repo.index.commit("Auto-update schedule", author=author, committer=author)
        remote_url = f"https://{USERNAME}:{GITHUB_TOKEN}@github.com/{USERNAME}/{REPO_NAME}.git"
        origin = repo.remote(name='origin')
        origin.set_url(remote_url)
        origin.push()
        return True, "Synced to GitHub!"
    except Exception as e:
        return False, f"GitHub Sync Failed: {str(e)}"

# --- MAIN PAGE ---
def show_admin_page():
    st.markdown("## 🛠️ Admin Dashboard")
    st.info("Upload the PDF here. The system will process it and update the GitHub database automatically.")

    uploaded_file = st.file_uploader("Choose PDF", type="pdf")
    
    if uploaded_file is not None:
        if st.button("🚀 Process & Update Live Site"):
            progress = st.progress(0)
            status = st.empty()
            
            # 1. Process
            status.text("Parsing PDF...")
            progress.progress(25)
            try:
                count = processing.process_pdf(uploaded_file)
                progress.progress(50)
                st.success(f"✅ Local DB updated: {count} classes.")
            except Exception as e:
                st.error(f"❌ Error: {e}")
                st.stop()

            # 2. Sync
            status.text("Pushing to GitHub...")
            progress.progress(75)
            if "github" in st.secrets:
                success, message = push_to_github()
                if success:
                    progress.progress(100)
                    st.success(f"☁️ {message}")
                    st.balloons()
                else:
                    st.error(message)
            else:
                st.warning("GitHub secrets missing.")

    st.markdown("---")
    if st.button("🗑️ Reset Database"):
        db_handler.clear_db()
        st.warning("Database Cleared.")
