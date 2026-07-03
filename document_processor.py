import PyPDF2
import docx
import os

def extract_text_from_pdf(filepath):
    text = ""
    with open(filepath, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()

def extract_text_from_docx(filepath):
    doc = docx.Document(filepath)
    text = "\n".join(para.text for para in doc.paragraphs if para.text.strip())
    return text.strip()

def extract_text(filepath):
    """Routes to the right extractor based on file extension."""
    ext = os.path.splitext(filepath)[1].lower()
    if ext == '.pdf':
        return extract_text_from_pdf(filepath)
    elif ext == '.docx':
        return extract_text_from_docx(filepath)
    elif ext == '.txt':
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read().strip()
    else:
        raise ValueError(f"Unsupported file type: {ext}")
