from dotenv import load_dotenv
load_dotenv()
from google import genai
from google.genai import types
import os
import json
import re
import time
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

MODEL_NAME = "gemini-2.5-flash"
def _call_gemini(prompt, temperature=0.2, max_retries=3):
    """Shared helper: sends a prompt, returns raw text response.
    Retries on transient 503 (server overload) errors with backoff."""
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    response_mime_type="application/json"
                )
            )
            return response.text
        except Exception as e:
            is_last_attempt = attempt == max_retries - 1
            if '503' in str(e) or 'UNAVAILABLE' in str(e):
                if is_last_attempt:
                    raise RuntimeError("Gemini is currently overloaded. Please try again in a moment.") from e
                time.sleep(2 ** attempt)  # 1s, 2s, 4s backoff
                continue
            raise  # non-503 errors fail immediately, no point retrying

def _safe_json_parse(raw_text):
    """Gemini sometimes wraps JSON in markdown fences - strip those if present."""
    cleaned = re.sub(r'^```json\s*|\s*```$', '', raw_text.strip())
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"error": "Failed to parse AI response", "raw": cleaned[:500]}


# ---------- FEATURE 1: Clause Extraction ----------
def extract_clauses(contract_text):
    prompt = f"""You are a legal document analyst. Extract the key clauses from this contract.

For each clause found, identify: the clause type (e.g. "Termination", "Confidentiality", "Indemnification", "Payment Terms", "Liability", "Governing Law", etc.), a short summary of what it says, and the exact section/paragraph it appears in.

Return ONLY valid JSON in this exact format:
{{
  "clauses": [
    {{"type": "string", "summary": "string", "location": "string"}}
  ]
}}

CONTRACT TEXT:
{contract_text[:15000]}
"""
    raw = _call_gemini(prompt)
    return _safe_json_parse(raw)


# ---------- FEATURE 2: Risk Scoring ----------
def score_risk(contract_text):
    prompt = f"""You are a legal risk analyst. Review this contract and identify risky clauses or missing protections.

For each risk found, provide: risk category, description, severity ("low", "medium", "high"), and a brief recommendation.
Also provide an overall_risk_score from 0-100 (100 = extremely risky) and a one-sentence overall_summary.

Return ONLY valid JSON in this exact format:
{{
  "overall_risk_score": number,
  "overall_summary": "string",
  "risks": [
    {{"category": "string", "description": "string", "severity": "low|medium|high", "recommendation": "string"}}
  ]
}}

CONTRACT TEXT:
{contract_text[:15000]}
"""
    raw = _call_gemini(prompt)
    return _safe_json_parse(raw)


# ---------- FEATURE 3: Compliance Checking ----------
def check_compliance(contract_text, framework="general"):
    prompt = f"""You are a compliance reviewer. Check this contract against standard legal and regulatory best practices (framework focus: {framework}).

Identify: missing standard clauses, non-standard/unusual language that could cause compliance issues, and any red flags relative to common regulations (e.g. data privacy, consumer protection, labor law - only if relevant to this document).

Return ONLY valid JSON in this exact format:
{{
  "compliance_score": number,
  "issues": [
    {{"issue": "string", "why_it_matters": "string", "severity": "low|medium|high"}}
  ],
  "missing_clauses": ["string"]
}}

CONTRACT TEXT:
{contract_text[:15000]}
"""
    raw = _call_gemini(prompt)
    return _safe_json_parse(raw)


# ---------- FEATURE 4: Citation Verification ----------
def verify_citations(contract_text):
    prompt = f"""You are a legal citation checker. Find any references to laws, statutes, regulations, or external agreements mentioned in this contract (e.g. "in accordance with GDPR", "per Section 230", "as defined in the Master Services Agreement").

For each citation found, note: the citation text, what it appears to reference, and whether it seems correctly used in context (plausible/questionable) based on the surrounding text alone. Be clear that you cannot verify against live legal databases - this is a plausibility check based on the text only.

Return ONLY valid JSON in this exact format:
{{
  "citations": [
    {{"citation": "string", "referenced_law_or_doc": "string", "context_assessment": "plausible|questionable", "note": "string"}}
  ]
}}

CONTRACT TEXT:
{contract_text[:15000]}
"""
    raw = _call_gemini(prompt)
    return _safe_json_parse(raw)


# ---------- FEATURE 5: Multi-Document Reasoning ----------
def compare_documents(doc_texts):
    """doc_texts: list of {'name': str, 'text': str}"""
    combined = "\n\n".join(
        f"=== DOCUMENT: {d['name']} ===\n{d['text'][:8000]}"
        for d in doc_texts
    )
    prompt = f"""You are a legal analyst comparing multiple documents. Identify: contradictions or conflicts between the documents, clauses that differ significantly between them, and clauses missing in one document but present in another.

Return ONLY valid JSON in this exact format:
{{
  "summary": "string",
  "conflicts": [
    {{"issue": "string", "documents_involved": ["string"], "details": "string"}}
  ]
}}

{combined}
"""
    raw = _call_gemini(prompt)
    return _safe_json_parse(raw)
