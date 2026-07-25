Clario — AI-Powered Contract Guardian

"Know what you're signing before you sign it."

Clario lets you upload or paste a contract and instantly get a plain-English AI risk audit — flagging auto-renewal traps, hidden fees, data-harvesting clauses, liability waivers, and unilateral change terms.


Tech Stack
Backend: FastAPI (Python) + Google Gemini API (gemini-2.5-flash, with fallback models)
Frontend: React + Vite + Tailwind CSS
Features
Upload PDF/DOCX/TXT or paste text
Executive Risk Dashboard (Low/Medium/High rating + flagged clauses)
Highlighted Contract Reader
Streaming AI chat assistant grounded in your document
Local audit history (last 20 audits)
Setup

Backend

bash
cd Clario/backend
pip install -r requirements.txt
echo "GEMINI_API_KEY=your_key_here" > .env
uvicorn main:app --reload --port 8000

Frontend

bash
cd Clario/frontend
npm install
npm run dev

App runs at http://localhost:5173, API at http://localhost:8000.

API
POST /api/analyze — upload a file or raw_text, returns structured risk audit JSON
POST /api/chat — streams a grounded Q&A answer (SSE)
