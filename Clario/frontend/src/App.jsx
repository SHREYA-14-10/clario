import React, { useState, useEffect } from 'react';
import AnalysisDashboard from './components/AnalysisDashboard';
import ChatWidget from './components/ChatWidget';
import HistoryDrawer from './components/HistoryDrawer';
import HighlightedView from './components/HighlightedView';

// Derives a short, human-readable title from raw pasted text by taking the first
// non-empty line or sentence (whichever comes first) and truncating it.
const deriveTitleFromText = (text) => {
  if (!text) return '';

  const trimmedInput = text.trim();
  if (!trimmedInput) return '';

  const newlineIndex = trimmedInput.indexOf('\n');
  const sentenceMatch = trimmedInput.match(/[.!?](\s|$)/);
  const sentenceIndex = sentenceMatch ? sentenceMatch.index + 1 : -1;

  let candidates = [newlineIndex, sentenceIndex].filter((i) => i !== -1 && i > 0);
  let cutoff = candidates.length ? Math.min(...candidates) : -1;

  let firstChunk = cutoff !== -1 ? trimmedInput.slice(0, cutoff) : trimmedInput;
  firstChunk = firstChunk.trim();

  if (firstChunk.length > 60) {
    firstChunk = firstChunk.slice(0, 60).trim() + '…';
  }

  return firstChunk;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste'
  const [resultsTab, setResultsTab] = useState('dashboard'); // 'dashboard' | 'reader'
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // State for analysis results
  const [analysisData, setAnalysisData] = useState(null);
  const [extractedDocumentText, setExtractedDocumentText] = useState('');

  // History Drawer State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);

  // Load History on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('clario_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to load audit history:", e);
    }
  }, []);

  // Save Audit Item to History
  const saveToHistory = (analysis, docText, docTitle) => {
    const newItem = {
      id: Date.now().toString(),
      title: docTitle || 'Contract Audit Record',
      timestamp: new Date().toISOString(),
      risk_level: analysis.risk_level || 'Medium',
      summary: analysis.summary,
      analysis: analysis,
      document_text: docText,
    };

    const updated = [newItem, ...history.filter(h => h.id !== newItem.id)].slice(0, 20); // Keep last 20
    setHistory(updated);
    try {
      localStorage.setItem('clario_history', JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save audit history:", e);
    }
  };

  const handleDeleteHistoryItem = (id) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    localStorage.setItem('clario_history', JSON.stringify(updated));
  };

  const handleClearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem('clario_history');
  };

  const handleSelectHistoryItem = (item) => {
    setAnalysisData(item.analysis);
    setExtractedDocumentText(item.document_text);
    setResultsTab('dashboard');
  };

  // Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setFieldError('');
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(pdf|docx|txt)$/i)) {
      setFieldError('Please upload a valid PDF, DOCX, or TXT document.');
      return;
    }
    setFile(selectedFile);
  };

  // Submit Analysis
  const handleAnalyze = async () => {
    setFieldError('');
    setErrorMessage('');

    if (activeTab === 'upload' && !file) {
      setFieldError('Please select or drop a contract file to analyze.');
      return;
    }
    if (activeTab === 'paste' && (!pastedText || pastedText.trim().length < 20)) {
      setFieldError('Please paste at least 20 characters of legal text.');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      let docTitle = 'Contract Audit Record';

      if (activeTab === 'upload' && file) {
        formData.append('file', file);
        docTitle = file.name;
      } else {
        formData.append('raw_text', pastedText);
        const derivedTitle = deriveTitleFromText(pastedText);
        if (derivedTitle && derivedTitle.trim().length >= 3) {
          docTitle = derivedTitle;
        }
      }

      const response = await fetch('https://clario-1-tsp6.onrender.com/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.detail || 'Failed to analyze document.');
      }

      setAnalysisData(resData.analysis);
      setExtractedDocumentText(resData.document_text);

      // Save record to local audit history
      saveToHistory(resData.analysis, resData.document_text, docTitle);
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred during audit.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysisData(null);
    setExtractedDocumentText('');
    setFile(null);
    setPastedText('');
    setFieldError('');
    setErrorMessage('');
  };

  return (
    <div className="app-shell">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="brand-icon-wrap">
              <svg className="w-5 h-5 brand-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="brand-title">Clario</h1>
              <p className="brand-sub">Your AI-Powered Contract Guardian</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="btn-reset flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Audit History ({history.length})
            </button>

            {analysisData && (
              <button className="btn-reset" onClick={handleReset}>
                Audit New Contract
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main App View ────────────────────────────────────── */}
      <main className="app-main">
        {!analysisData ? (
          /* ── UPLOAD / PASTE PHASE ───────────────────────────── */
          <div className="upload-phase">
            <div className="hero-text">
              <h2 className="hero-headline">
                Automated Contract Risk & Compliance Audit
              </h2>
              <p className="hero-body">
                Instantly audit agreements, terms of service, and NDAs for predatory auto-renewals, hidden liabilities, and privacy vulnerabilities.
              </p>
            </div>

            <div className="upload-card">
              {/* Tab Switcher */}
              <div className="tab-bar">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'upload' ? 'tab-active' : ''}`}
                  onClick={() => { setActiveTab('upload'); setFieldError(''); }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Document
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'paste' ? 'tab-active' : ''}`}
                  onClick={() => { setActiveTab('paste'); setFieldError(''); }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Paste Contract Text
                </button>
              </div>

              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div className="tab-panel">
                  {!file ? (
                    <label
                      htmlFor="file-upload"
                      className={`dropzone ${isDragOver ? 'dropzone-over' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        id="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileInput}
                      />
                      <div className="dropzone-icon-wrap">
                        <svg className="w-8 h-8 dropzone-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="dropzone-headline">
                        Drag & drop document here or <span className="dropzone-browse">browse files</span>
                      </p>
                      <p className="dropzone-sub">Supports PDF, DOCX, or TXT (Max 10MB)</p>
                    </label>
                  ) : (
                    <div className="file-preview">
                      <div className="file-preview-icon">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="file-preview-info">
                        <p className="file-name">{file.name}</p>
                        <p className="file-meta">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button type="button" className="file-remove-btn" onClick={() => setFile(null)}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Paste Tab */}
              {activeTab === 'paste' && (
                <div className="tab-panel">
                  <div className="paste-area-wrap">
                    <textarea
                      className="paste-textarea"
                      placeholder="Paste contract provisions, privacy policy, or legal clauses here..."
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                    />
                    <div className="paste-meta">
                      <span className={pastedText.length > 0 ? 'char-ok' : 'char-warn'}>
                        {pastedText.length} characters
                      </span>
                      {pastedText && (
                        <button type="button" className="paste-clear-btn" onClick={() => setPastedText('')}>
                          Clear input
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {fieldError && <div className="field-error">{fieldError}</div>}

              {/* Action Button & Animated Bar */}
              {!isLoading ? (
                <button
                  type="button"
                  className={`btn-analyze ${(activeTab === 'upload' && !file) || (activeTab === 'paste' && !pastedText) ? 'btn-disabled' : ''}`}
                  onClick={handleAnalyze}
                >
                  Analyze Contract Now
                </button>
              ) : (
                <div className="analyzing-hint">
                  <div className="scan-bar">
                    <div className="scan-bar-fill" />
                  </div>
                  <p>Executing compliance audit & risk evaluation...</p>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="error-banner">
                <span className="error-icon">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        ) : (
          /* ── RESULTS VIEW ────────────────────────────────────── */
          <div className="results-phase">
            
            {/* View Switcher Tabs */}
            <div className="flex items-center gap-2 mb-6 bg-[#1A2544] p-1.5 rounded-xl border border-[#2A3A66] max-w-md">
              <button
                onClick={() => setResultsTab('dashboard')}
                className={`flex-1 text-xs font-semibold py-2 px-3 rounded-lg transition-all ${
                  resultsTab === 'dashboard'
                    ? 'bg-[#6366F1] text-white shadow-md'
                    : 'text-[#94A3B8] hover:text-[#EEF2FF]'
                }`}
              >
                Executive Risk Dashboard
              </button>
              <button
                onClick={() => setResultsTab('reader')}
                className={`flex-1 text-xs font-semibold py-2 px-3 rounded-lg transition-all ${
                  resultsTab === 'reader'
                    ? 'bg-[#6366F1] text-white shadow-md'
                    : 'text-[#94A3B8] hover:text-[#EEF2FF]'
                }`}
              >
                Highlighted Contract Reader
              </button>
            </div>

            <div className="results-grid">
              {resultsTab === 'dashboard' ? (
                <AnalysisDashboard data={analysisData} />
              ) : (
                <HighlightedView
                  documentText={extractedDocumentText}
                  flaggedClauses={analysisData.flagged_clauses}
                />
              )}
              <ChatWidget documentText={extractedDocumentText} />
            </div>
          </div>
        )}
      </main>

      {/* History Drawer Panel */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={handleSelectHistoryItem}
        onDelete={handleDeleteHistoryItem}
        onClearAll={handleClearAllHistory}
      />

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="app-footer">
        <p>Clario &copy; {new Date().getFullYear()} — AI-Powered Contract Guardian</p>
      </footer>
    </div>
  );
}