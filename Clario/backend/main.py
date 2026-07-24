from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from services.ai import analyze_document, stream_chat_response
from services.extractor import extract_text_from_file

app = FastAPI(title="Clario API")

# Enable CORS for React frontend (Vite port 5173 / localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    document_text: str
    question: str


@app.get("/")
async def root():
    return {"status": "Clario API operational"}


@app.post("/api/analyze")
async def analyze_endpoint(
    file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None)
):
    doc_text = ""
    if file:
        contents = await file.read()
        doc_text = extract_text_from_file(contents, file.filename)
    elif raw_text:
        doc_text = raw_text.strip()
    else:
        raise HTTPException(status_code=400, detail="No file or raw text provided.")

    if not doc_text:
        raise HTTPException(status_code=400, detail="Could not extract readable text.")

    analysis = analyze_document(doc_text)
    return {
        "document_text": doc_text,
        "analysis": analysis
    }


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    if not request.question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    return StreamingResponse(
        stream_chat_response(request.document_text, request.question),
        media_type="text/event-stream"
    )