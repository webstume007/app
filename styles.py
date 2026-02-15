# styles.py
import streamlit as st

def apply_custom_css():
    st.markdown("""
        <style>
        /* Main Container */
        .stApp {
            background-color: #f8f9fa;
        }
        
        /* Headers */
        h1, h2, h3 {
            color: #0e1117;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        /* Cards for Classes */
        .class-card {
            background-color: white;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            margin-bottom: 10px;
            border-left: 5px solid #0068c9;
        }
        
        /* Status Badges */
        .badge-free {
            background-color: #d4edda;
            color: #155724;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .badge-busy {
            background-color: #f8d7da;
            color: #721c24;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.8em;
            font-weight: bold;
        }
        </style>
    """, unsafe_allow_html=True)
