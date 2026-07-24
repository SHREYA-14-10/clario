import json
import os
import time
import re
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY is not set in your .env file or environment.")

client = genai.Client(api_key=api_key)

# Active production model fallback list
MODELS_TO_TRY = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"]


def sanitize_text(text: str) -> str:
    """Strips duplicate spaces, awkward line breaks, and stray markdown formatting."""
    if not text:
        return ""
    cleaned = re.sub(r'[ \t]+', ' ', text)
    cleaned = re.sub(r'\n\s*\n\s*\n+', '\n\n', cleaned)
    return cleaned.strip()


def sanitize_response_data(data: dict) -> dict:
    """Recursively cleans all string fields in the AI JSON output."""
    if isinstance(data, dict):
        return {k: sanitize_response_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_response_data(item) for item in data]
    elif isinstance(data, str):
        return sanitize_text(data)
    return data


def generate_content_with_fallback(contents, config=None):
    """Tries primary model, retries on transient errors, and falls back to alternate models."""
    last_exception = None

    for model_name in MODELS_TO_TRY:
        for attempt in range(3):
            try:
                return client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config
                )
            except Exception as e:
                last_exception = e
                err_str = str(e)
                print(f"[Analyze Error] {model_name} attempt {attempt+1}: {err_str}")
                if "503" in err_str or "429" in err_str or "UNAVAILABLE" in err_str:
                    time.sleep(1.5 * (attempt + 1))
                    continue
                else:
                    break

    raise last_exception if last_exception else RuntimeError("Failed to generate response after retries.")


def clean_and_parse_json(raw_text: str) -> dict:
    """Extracts and parses clean JSON from raw AI text."""
    cleaned = re.sub(r'```(?:json)?\s*', '', raw_text)
    cleaned = re.sub(r'```\s*$', '', cleaned).strip()

    try:
        data = json.loads(cleaned)
        return sanitize_response_data(data)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse AI response as valid JSON: {str(e)}")


def analyze_document(text: str) -> dict:
    """Audits contract text and returns structured JSON with plain-English breakdowns."""
    prompt = f"""
    You are Clario:AI Contract Guardian, an enterprise legal & compliance risk auditor. 
    Analyze the contract text below and extract ALL risky, unfair, or restrictive terms.

    Actively check across these categories:
    1. Automatic Renewal & Subscription Traps
    2. Hidden Fees, Penalties & Extra Costs
    3. Data Harvesting & Privacy Rights
    4. Excessive Liability Waivers & Forced Arbitration
    5. Unilateral Contract Changes

    Do not limit yourself to a small sample. Scan the ENTIRE document section by section
    and flag EVERY instance of risky, unfair, or restrictive language, even if multiple
    clauses fall into the same category. Continue until the full document has been
    reviewed to the end.

    It is better to over-flag a borderline clause than to miss a real one. If a clause
    fits more than one category, include it under its most relevant category rather
    than skipping it.

    Document Text:
    {text}
    """

    json_schema = {
        "type": "OBJECT",
        "properties": {
            "summary": {
                "type": "STRING",
                "description": "A concise executive legal summary under 120 words. Clean prose without extra line breaks."
            },
            "risk_level": {
                "type": "STRING",
                "enum": ["Low", "Medium", "High"],
                "description": "Overall contract risk level."
            },
            "risk_rationale": {
                "type": "STRING",
                "description": "A clear 2-sentence rationale explaining why this overall risk rating was assigned."
            },
            "flagged_clauses": {
                "type": "ARRAY",
                "description": "List of flagged risky terms found in the document.",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "type": {
                            "type": "STRING",
                            "description": "Plain-English category tag (e.g. 'Sneaky Auto-Renewal', 'Hidden Fee', 'Data Selling Clause', 'Liability Waiver')."
                        },
                        "excerpt": {
                            "type": "STRING",
                            "description": "Exact verbatim quote from the document text."
                        },
                        "explanation": {
                            "type": "STRING",
                            "description": "A 1 to 2 sentence plain-English 'What It Means For You' breakdown for a non-lawyer."
                        }
                    },
                    "required": ["type", "excerpt", "explanation"]
                }
            }
        },
        "required": ["summary", "risk_level", "risk_rationale", "flagged_clauses"]
    }

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=json_schema,
        temperature=0.1,
        max_output_tokens=8000
    )

    response = generate_content_with_fallback(prompt, config=config)
    return clean_and_parse_json(response.text.strip())


def stream_chat_response(text: str, question: str):
    """Streams token-by-token Q&A answers with simple, clean markdown formatting."""
    prompt = f"""
    You are Clario:AI Contract Guardian, an enterprise AI legal assistant. 
    Answer the user's question clearly, concisely, and simply based strictly on the document text.

    Formatting Guidelines:
    - Keep it short, readable, and well-spaced.
    - Start with a 1-sentence direct answer.
    - Use 2-3 clean bullet points for key details or exact figures.
    - End with a 1-sentence key takeaway or action item.
    - Avoid robotic headers, redundant quotes, or long walls of text.

    Document Text:
    {text}

    User Question: {question}
    """

    last_err_msg = ""
    success = False

    for model_name in MODELS_TO_TRY:
        try:
            response = client.models.generate_content_stream(
                model=model_name,
                contents=prompt
            )
            for chunk in response:
                if chunk.text:
                    # Replace actual line breaks with \\n token for safe SSE transmission
                    safe_text = chunk.text.replace("\n", "\\n")
                    yield f"data: {safe_text}\n\n"
            success = True
            break
        except Exception as e:
            last_err_msg = str(e)
            print(f"[Stream Exception] {model_name}: {last_err_msg}")
            continue

    if not success:
        yield f"data: ⚠️ Stream Error details: {last_err_msg}\n\n"

    yield "data: [DONE]\n\n"