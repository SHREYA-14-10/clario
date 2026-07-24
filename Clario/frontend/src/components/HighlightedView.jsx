import React, { useState } from 'react';

export default function HighlightedView({ documentText, flaggedClauses = [] }) {
  const [selectedClause, setSelectedClause] = useState(null);

  if (!documentText) {
    return (
      <div className="bg-[#1A2544] border border-[#2A3A66] rounded-xl p-8 text-center text-[#94A3B8]">
        No document text available for highlighting.
      </div>
    );
  }

  // Normalize a string by collapsing all whitespace runs (including newlines) into a
  // single space, while recording where each normalized character came from in the
  // original string. This lets us match against normalized text but still highlight
  // against the original, unnormalized text so on-screen formatting is preserved.
  const normalizeForMatch = (str) => {
    let normalized = '';
    const origStart = [];
    const origEnd = [];
    let i = 0;
    const n = str.length;
    while (i < n) {
      const ch = str[i];
      if (/\s/.test(ch)) {
        const start = i;
        while (i < n && /\s/.test(str[i])) i++;
        normalized += ' ';
        origStart.push(start);
        origEnd.push(i);
      } else {
        normalized += ch;
        origStart.push(i);
        origEnd.push(i + 1);
        i++;
      }
    }
    return { normalized, origStart, origEnd };
  };

  // Find where `excerpt` occurs inside `text`, tolerating whitespace/line-break
  // differences (e.g. PDF-extracted hyphenated line breaks vs. the AI's flattened
  // quote). Falls back to fuzzy-matching just the first 8-10 words of the excerpt
  // if an exact (whitespace-normalized) match isn't found. Returns original-text
  // character offsets, or null if nothing could be matched.
  const findMatchInText = (text, excerpt) => {
    if (!excerpt) return null;
    const { normalized, origStart, origEnd } = normalizeForMatch(text);
    const normExcerpt = excerpt.replace(/\s+/g, ' ').trim();
    if (!normExcerpt) return null;

    const lowerNormalized = normalized.toLowerCase();
    const lowerExcerpt = normExcerpt.toLowerCase();

    let idx = lowerNormalized.indexOf(lowerExcerpt);
    let matchLen = normExcerpt.length;

    if (idx === -1) {
      // Fuzzy fallback: try matching just the first 8-10 words of the excerpt so
      // partial or paraphrased quotes still highlight something.
      const words = normExcerpt.split(' ').filter(Boolean);
      const wordCounts = [10, 9, 8].filter((c) => c <= words.length);
      for (const count of wordCounts) {
        const fuzzyExcerpt = words.slice(0, count).join(' ').toLowerCase();
        if (fuzzyExcerpt.length < 5) continue;
        idx = lowerNormalized.indexOf(fuzzyExcerpt);
        if (idx !== -1) {
          matchLen = fuzzyExcerpt.length;
          break;
        }
      }
    }

    if (idx === -1) return null;

    const start = origStart[idx];
    const end = origEnd[idx + matchLen - 1];
    if (start === undefined || end === undefined) return null;
    return { start, end };
  };

  // Highlight matches inside document text
  const renderHighlightedText = () => {
    let parts = [{ text: documentText, isMatch: false }];

    flaggedClauses.forEach((clause) => {
      if (!clause.excerpt || clause.excerpt.trim().length < 5) return;

      const newParts = [];
      parts.forEach((part) => {
        if (part.isMatch) {
          newParts.push(part);
          return;
        }

        const match = findMatchInText(part.text, clause.excerpt);
        if (match) {
          const before = part.text.substring(0, match.start);
          const matchedText = part.text.substring(match.start, match.end);
          const after = part.text.substring(match.end);

          if (before) newParts.push({ text: before, isMatch: false });
          newParts.push({ text: matchedText, isMatch: true, clause });
          if (after) newParts.push({ text: after, isMatch: false });
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });

    return parts.map((part, idx) => {
      if (!part.isMatch) {
        return <span key={idx}>{part.text}</span>;
      }

      const typeLower = (part.clause.type || '').toLowerCase();
      let colorClass = 'bg-amber-500/20 text-amber-200 border-amber-500/50 hover:bg-amber-500/30';
      if (typeLower.includes('renew') || typeLower.includes('fee')) {
        colorClass = 'bg-red-500/20 text-red-200 border-red-500/50 hover:bg-red-500/30';
      } else if (typeLower.includes('data') || typeLower.includes('privacy')) {
        colorClass = 'bg-purple-500/20 text-purple-200 border-purple-500/50 hover:bg-purple-500/30';
      }

      return (
        <mark
          key={idx}
          onClick={() => setSelectedClause(part.clause)}
          className={`cursor-pointer rounded border px-1 py-0.5 transition-all font-mono text-xs ${colorClass}`}
          title="Click to view risk explanation"
        >
          {part.text}
        </mark>
      );
    });
  };

  return (
    <div className="bg-[#1A2544] border border-[#2A3A66] rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#2A3A66]">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <h3 className="font-semibold text-[#EEF2FF]">Interactive Contract Reader</h3>
        </div>
        <span className="text-xs text-[#94A3B8]">Click highlighted text to view risk explanation</span>
      </div>

      {/* Selected Clause Popover */}
      {selectedClause && (
        <div className="bg-[#0F1629] border border-[#F59E0B] rounded-lg p-4 animate-in fade-in duration-150 relative">
          <button
            onClick={() => setSelectedClause(null)}
            className="absolute top-2 right-2 text-[#64748B] hover:text-[#EEF2FF]"
          >
            ✕
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#F59E0B] block mb-1">
            {selectedClause.type}
          </span>
          <p className="text-sm font-semibold text-[#EEF2FF] mb-2">
            What It Means For You:
          </p>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            {selectedClause.explanation}
          </p>
        </div>
      )}

      {/* Contract Text Body */}
      <div className="bg-[#0F1629] border border-[#2A3A66] rounded-lg p-5 font-mono text-xs text-[#94A3B8] leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre-wrap">
        {renderHighlightedText()}
      </div>
    </div>
  );
}