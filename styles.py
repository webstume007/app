# styles.py
import streamlit as st

def apply_custom_css():
    st.markdown("""
        <style>
        /* --- GLOBAL TEXT VISIBILITY FIX --- */
        /* Forces all main text to be IUB Blue, ensuring readability on white backgrounds */
        html, body, [class*="css"], .stMarkdown, .stText, p, div {
            color: #002147 !important; /* IUB Deep Blue */
            font-family: 'Segoe UI', sans-serif;
        }

        /* Background */
        .stApp {
            background-color: #FFFFFF; /* Clean White Background */
        }
        
        /* --- IUB THEMED HEADERS --- */
        h1, h2, h3 {
            color: #F2A900 !important; /* IUB Gold */
            background-color: #002147; /* Blue Background for headers */
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            font-weight: bold;
            margin-bottom: 20px;
        }
        
        /* --- CARDS FOR CLASSES --- */
        .class-card {
            background-color: #F9F9F9; /* Very light grey */
            color: #002147 !important; /* Force Blue Text */
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 12px;
            border-left: 6px solid #F2A900; /* Gold Accent */
            border-right: 1px solid #ddd;
            border-top: 1px solid #ddd;
            border-bottom: 1px solid #ddd;
        }
        
        /* --- BUTTONS (IUB STYLE) --- */
        div.stButton > button {
            background-color: #002147;
            color: #F2A900 !important;
            border: 2px solid #F2A900;
            font-weight: bold;
            border-radius: 5px;
            width: 100%;
        }
        div.stButton > button:hover {
            background-color: #F2A900;
            color: #002147 !important;
            border-color: #002147;
        }

        /* --- INPUT FIELDS --- */
        /* Ensures typed text is visible */
        .stTextInput > div > div > input {
            color: #002147;
            background-color: #F0F2F6;
        }
        
        /* --- BADGES --- */
        .badge-free {
            background-color: #28a745;
            color: white !important;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        </style>
    """, unsafe_allow_html=True)
