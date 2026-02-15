from flask import Flask, render_template, jsonify
import json
import os

app = Flask(__name__)

# Load Data Once on Startup
DATA_FILE = 'schedule_data.json'

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return []

schedule_data = load_data()

@app.route('/')
def index():
    # This serves the HTML file in 'templates/'
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    # This sends the JSON data to your Javascript
    return jsonify(schedule_data)

if __name__ == '__main__':
    app.run(debug=True)
