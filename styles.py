import streamlit as st

def apply_custom_css():
    st.markdown("""
        <style>
        /* --- 1. FORCE VISIBILITY (The Nuclear Option) --- */
        /* Forces ALL text to be dark, overriding any dark mode settings */
        .stApp, .stMarkdown, .stText, h1, h2, h3, h4, p, div, span, label {
            color: #000000 !important;
            font-family: 'Arial', sans-serif;
        }
        
        /* Force Background to White */
        .stApp {
            background-color: #FFFFFF !important;
        }

        /* --- 2. TABLE STYLES (For the Room Grid) --- */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 12px;
        }
        
        th {
            background-color: #002147; /* IUB Blue */
            color: #F2A900 !important; /* IUB Gold */
            padding: 8px;
            text-align: center;
            border: 1px solid #ddd;
        }
        
        td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
            color: #000 !important;
        }

        /* --- 3. STATUS COLORS --- */
        .slot-free {
            background-color: #d4edda !important; /* Green */
            color: #155724 !important;
            font-weight: bold;
        }
        
        .slot-busy {
            background-color: #cfe2ff !important; /* Light Blue */
            color: #084298 !important;
        }

        /* --- 4. INPUT FIELDS --- */
        /* Fix for invisible text in dropdowns/inputs */
        .stSelectbox div[data-baseweb="select"] > div {
            background-color: #f0f2f6 !important;
            color: black !important;
        }
        </style>
    """, unsafe_allow_html=True)
