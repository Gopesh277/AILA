# AILA — AI Legal Assistant

AILA is a Flask-based web app that uses Google's Gemini API to analyze legal documents. Upload a PDF, DOCX, or TXT file and get clause extraction, risk scoring, compliance checks, citation verification, and side-by-side document comparison.

🔗 Live demo: [ai-legal-assistant-lilac.vercel.app](https://ai-legal-assistant-lilac.vercel.app)

## Features

- **Document upload** — accepts PDF, DOCX, and TXT files (up to 16 MB)
- **Clause extraction** — pulls out key clauses from a document
- **Risk scoring** — flags potentially risky language or terms
- **Compliance checking** — checks text against a selected compliance framework
- **Citation verification** — verifies legal citations referenced in the text
- **Document comparison** — compares two or more documents against each other
- **Health check endpoint** — quick way to confirm the API and Gemini key are configured

## Tech Stack

- **Backend:** Python, Flask
- **AI:** Google Gemini API (`google-genai`)
- **Document parsing:** PyPDF2, python-docx
- **Frontend:** HTML, CSS, JavaScript (served from `public/` and `templates/`)
- **Deployment:** Vercel

## Project Structure

```
AILA/
├── public/               # Static assets (CSS, JS)
├── templates/             # HTML templates
├── ai_engine.py            # Gemini-powered analysis functions
├── app.py                 # Flask app and API routes
├── document_processor.py  # Text extraction from PDF/DOCX/TXT
├── requirements.txt        # Python dependencies
├── vercel.json             # Vercel deployment config
└── .vercelignore
```

## Getting Started

### Prerequisites

- Python 3.9+
- A [Google Gemini API key](https://ai.google.dev/)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/Gopesh277/AILA.git
   cd AILA
   ```

2. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables

   Create a `.env` file in the project root:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Run the app
   ```bash
   python app.py
   ```

   The app will start on `http://localhost:3001`.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Check API status and whether the Gemini key is loaded |
| `POST` | `/api/upload` | Upload a document and extract its text |
| `POST` | `/api/analyze/clauses` | Extract key clauses from provided text |
| `POST` | `/api/analyze/risk` | Score risk level of provided text |
| `POST` | `/api/analyze/compliance` | Check text against a compliance framework |
| `POST` | `/api/analyze/citations` | Verify citations found in the text |
| `POST` | `/api/analyze/compare` | Compare two or more documents |

### Example: Uploading a document

```bash
curl -X POST http://localhost:3001/api/upload \
  -F "file=@/path/to/document.pdf"
```

### Example: Analyzing risk

```bash
curl -X POST http://localhost:3001/api/analyze/risk \
  -H "Content-Type: application/json" \
  -d '{"text": "The parties agree to indemnify..."}'
```

## Deployment

This project is configured for deployment on [Vercel](https://vercel.com) via `vercel.json`. Make sure to set the `GEMINI_API_KEY` environment variable in your Vercel project settings.

## Disclaimer

AILA is intended for informational and educational purposes only. It does not constitute legal advice, and outputs should be reviewed by a qualified legal professional before being relied upon.

## License

No license has been specified for this repository. Please contact the repository owner for usage terms.
