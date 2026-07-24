import { useState, useRef, useCallback } from "react";
import { UploadCloud, FileText, ClipboardPaste, X, Loader2 } from "lucide-react";

const ACCEPTED_TYPES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};
const MAX_SIZE_MB = 10;

export default function DocumentUpload({ onAnalyze, isAnalyzing }) {
  const [activeTab, setActiveTab] = useState("file"); // "file" | "paste"
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [pasteText, setPasteText] = useState("");
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!ACCEPTED_TYPES[file.type]) {
      return "Only PDF and DOCX files are supported.";
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File exceeds ${MAX_SIZE_MB}MB limit.`;
    }
    return null;
  };

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setFileError(err); return; }
    setFileError("");
    setSelectedFile(file);
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setFileError(err); return; }
    setFileError("");
    setSelectedFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSubmit = () => {
    if (isAnalyzing) return false;
    if (activeTab === "file") return !!selectedFile;
    if (activeTab === "paste") return pasteText.trim().length >= 20;
    return false;
  };

  const handleSubmit = () => {
    if (!canSubmit()) return;
    const formData = new FormData();
    if (activeTab === "file" && selectedFile) {
      formData.append("file", selectedFile);
      onAnalyze(formData, "");
    } else {
      formData.append("raw_text", pasteText.trim());
      onAnalyze(formData, pasteText.trim());
    }
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="upload-card">
      {/* ── Tab Switcher ── */}
      <div className="tab-bar" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "file"}
          className={`tab-btn ${activeTab === "file" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("file")}
        >
          <UploadCloud size={15} />
          Upload File
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "paste"}
          className={`tab-btn ${activeTab === "paste" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("paste")}
        >
          <ClipboardPaste size={15} />
          Paste Text
        </button>
      </div>

      {/* ── File Tab ── */}
      {activeTab === "file" && (
        <div className="tab-panel">
          {!selectedFile ? (
            <div
              className={`dropzone ${dragOver ? "dropzone-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Click or drag a file here to upload"
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            >
              <div className="dropzone-icon-wrap">
                <UploadCloud size={32} className="dropzone-icon" />
              </div>
              <p className="dropzone-headline">
                {dragOver ? "Release to upload" : "Drop your document here"}
              </p>
              <p className="dropzone-sub">PDF or DOCX · Max {MAX_SIZE_MB}MB</p>
              <span className="dropzone-browse">Browse files</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="sr-only"
                onChange={handleFileSelect}
                aria-hidden="true"
              />
            </div>
          ) : (
            <div className="file-preview">
              <div className="file-preview-icon">
                <FileText size={28} />
              </div>
              <div className="file-preview-info">
                <p className="file-name">{selectedFile.name}</p>
                <p className="file-meta">
                  {formatBytes(selectedFile.size)} ·{" "}
                  {selectedFile.type.includes("pdf") ? "PDF" : "DOCX"}
                </p>
              </div>
              <button
                className="file-remove-btn"
                onClick={clearFile}
                aria-label="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {fileError && (
            <p className="field-error" role="alert">⚠ {fileError}</p>
          )}
        </div>
      )}

      {/* ── Paste Tab ── */}
      {activeTab === "paste" && (
        <div className="tab-panel">
          <div className="paste-area-wrap">
            <textarea
              className="paste-textarea"
              placeholder="Paste your privacy policy, terms of service, or contract text here…"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={10}
              aria-label="Paste document text"
            />
            <div className="paste-meta">
              <span className={pasteText.trim().length < 20 ? "char-warn" : "char-ok"}>
                {pasteText.trim().length} characters
                {pasteText.trim().length < 20 && pasteText.length > 0
                  ? " (too short)"
                  : ""}
              </span>
              {pasteText.length > 0 && (
                <button
                  className="paste-clear-btn"
                  onClick={() => setPasteText("")}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Submit Button ── */}
      <button
        className={`btn-analyze ${!canSubmit() ? "btn-disabled" : ""}`}
        onClick={handleSubmit}
        disabled={!canSubmit()}
      >
        {isAnalyzing ? (
          <>
            <Loader2 size={18} className="spin-icon" />
            Analyzing document…
          </>
        ) : (
          <>
            <ShieldCheckIcon />
            Analyze Contract
          </>
        )}
      </button>

      {isAnalyzing && (
        <div className="analyzing-hint" role="status" aria-live="polite">
          <div className="scan-bar">
            <div className="scan-bar-fill" />
          </div>
          <p>Running AI risk audit — usually takes 5–15 seconds</p>
        </div>
      )}
    </div>
  );
}

/* Inline mini icon to avoid extra import hassle */
function ShieldCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  );
}
