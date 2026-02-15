from flask import Flask, render_template, jsonify, request
import db_handler
import processing
import os

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Secrets (Configure these in Render Environment Variables later)
ADMIN_USER = os.environ.get("ADMIN_USER", "S25BARIN1M01118")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "556655")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    data = db_handler.get_all_data()
    return jsonify(data)

@app.route('/api/admin/login', methods=['POST'])
def login():
    data = request.json
    if data.get('username') == ADMIN_USER and data.get('password') == ADMIN_PASS:
        return jsonify({"success": True})
    return jsonify({"success": False}), 401

@app.route('/api/admin/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file:
        filepath = os.path.join(UPLOAD_FOLDER, "schedule.pdf")
        file.save(filepath)
        try:
            count = processing.process_pdf(filepath)
            return jsonify({"success": True, "count": count})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    db_handler.init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
