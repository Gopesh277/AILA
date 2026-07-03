from flask import Flask, render_template, request, jsonify
from flask import send_from_directory
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import os
import uuid
import tempfile
from document_processor import extract_text
from ai_engine import (
    extract_clauses,
    score_risk,
    check_compliance,
    verify_citations,
    compare_documents
)

load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ---------- Pages ----------
@app.route('/')
def home():
    return render_template('index.html')


@app.route('/api/health')
def health():
    return jsonify({
        'status': 'ok',
        'gemini_key_loaded': bool(GEMINI_API_KEY)
    })

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('public/css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('public/js', filename)
# ---------- Upload ----------
@app.route('/api/upload', methods=['POST'])
def upload_document():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Unsupported file type. Use PDF, DOCX, or TXT'}), 400

    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
    file.save(filepath)

    try:
        text = extract_text(filepath)
    except Exception as e:
        return jsonify({'error': f'Failed to extract text: {str(e)}'}), 500
    finally:
        os.remove(filepath)

    if not text:
        return jsonify({'error': 'No readable text found in document'}), 400

    return jsonify({
        'filename': filename,
        'char_count': len(text),
        'text': text
    })


# ---------- Analysis routes ----------
@app.route('/api/analyze/clauses', methods=['POST'])
def analyze_clauses():
    data = request.get_json()
    text = data.get('text', '')
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    try:
        result = extract_clauses(text)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 503


@app.route('/api/analyze/risk', methods=['POST'])
def analyze_risk():
    data = request.get_json()
    text = data.get('text', '')
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    try:
        result = score_risk(text)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 503


@app.route('/api/analyze/compliance', methods=['POST'])
def analyze_compliance():
    data = request.get_json()
    text = data.get('text', '')
    framework = data.get('framework', 'general')
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    try:
        result = check_compliance(text, framework)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 503


@app.route('/api/analyze/citations', methods=['POST'])
def analyze_citations():
    data = request.get_json()
    text = data.get('text', '')
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    try:
        result = verify_citations(text)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 503


@app.route('/api/analyze/compare', methods=['POST'])
def analyze_compare():
    data = request.get_json()
    documents = data.get('documents', [])
    if len(documents) < 2:
        return jsonify({'error': 'Need at least 2 documents to compare'}), 400
    try:
        result = compare_documents(documents)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 503


if __name__ == '__main__':
    app.run(debug=True, port=3001)
