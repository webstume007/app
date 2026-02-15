import streamlit as st

def apply_custom_css():
    st.markdown("""
        <style>
        /* --- RESET ALL TEXT TO BLACK --- */
        html, body, div, p, span, h1, h2, h3, h4, h5, h6 {
            color: #000000 !important;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        /* --- FORCE WHITE BACKGROUND --- */
        .stApp {
            background-color: #FFFFFF !important;
        }

        /* --- FIX DROPDOWN (SELECTBOX) --- */
        /* This targets the container of the selected option */
        div[data-baseweb="select"] > div {
            background-color: #FFFFFF !important;
            color: #000000 !important;
            border: 2px solid #002147 !important; /* IUB Blue Border */
        }
        
        /* This targets the dropdown list items */
        ul[data-baseweb="menu"] li {
            background-color: #FFFFFF !important;
            color: #000000 !important;
        }
        
        /* Hover effect for dropdown items */
        ul[data-baseweb="menu"] li:hover {
            background-color: #F2A900 !important; /* IUB Gold */
            color: #000000 !important;
        }
        
        /* Selected item text color */
        div[data-baseweb="select"] span {
            color: #000000 !important;
        }

        /* --- FIX BUTTONS --- */
        /* Normal State */
        .stButton > button {
            background-color: #002147 !important; /* Deep Blue */
            color: #FFFFFF !important; /* White Text */
            border: 2px solid #F2A900 !important; /* Gold Border */
            font-weight: bold !important;
            transition: all 0.3s ease;
        }
        
        /* Hover State */
        .stButton > button:hover {
            background-color: #F2A900 !important; /* Gold */
            color: #002147 !important; /* Blue Text */
            border-color: #002147 !important;
        }
        
        /* Active/Focus State (Clicking) */
        .stButton > button:active, .stButton > button:focus {
            background-color: #F2A900 !important;
            color: #000000 !important;
            box-shadow: none !important;
        }

        /* --- TABLE STYLING (For HTML Grid) --- */
        table {
            width: 100%;
            border-collapse: collapse;
            font-family: Arial, sans-serif;
            margin-top: 10px;
        }
        th {
            background-color: #002147;
            color: #FFFFFF !important;
            padding: 10px;
            border: 1px solid #ddd;
            text-align: center;
        }
        td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
            vertical-align: middle;
            color: #000000 !important;
        }
        
        /* Custom Classes for Logic */
        .slot-free {
            background-color: #d4edda;
            color: #155724 !important;
            font-weight: bold;
        }
        .slot-busy {
            background-color: #f8f9fa;
        }
        
        /* --- HIDE STREAMLIT BRANDING --- */
        #MainMenu {visibility: hidden;}
        footer {visibility: hidden;}
        header {visibility: hidden;}
        </style>
    """, unsafe_allow_html=True)
