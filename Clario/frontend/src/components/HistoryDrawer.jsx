import React, { useState } from 'react';

export default function HistoryDrawer({ isOpen, onClose, history, onSelect, onDelete, onClearAll }) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredHistory = history.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(term) ||
      (item.summary && item.summary.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md h-full bg-[#1A2544] border-l border-[#2A3A66] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#2A3A66] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-bold text-lg text-[#EEF2FF]">Audit History</h3>
            <span className="text-xs bg-[#1F2D52] text-[#94A3B8] px-2 py-0.5 rounded-full border border-[#2A3A66]">
              {history.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#EEF2FF] p-1.5 rounded-lg hover:bg-[#1F2D52] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-[#2A3A66]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search past audits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0F1629] border border-[#2A3A66] rounded-lg pl-9 pr-3 py-2 text-sm text-[#EEF2FF] placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
            />
            <svg className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item) => {
              const riskColor = 
                item.risk_level?.toLowerCase() === 'high' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                item.risk_level?.toLowerCase() === 'low' ? 'text-green-400 bg-green-500/10 border-green-500/30' :
                'text-amber-400 bg-amber-500/10 border-amber-500/30';

              return (
                <div
                  key={item.id}
                  className="group relative bg-[#0F1629] border border-[#2A3A66] hover:border-[#6366F1] rounded-xl p-4 transition-all cursor-pointer flex flex-col gap-2"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-[#EEF2FF] line-clamp-1 group-hover:text-[#6366F1] transition-colors">
                      {item.title}
                    </h4>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${riskColor}`}>
                      {item.risk_level} Risk
                    </span>
                  </div>

                  <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1">
                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      className="text-[#64748B] hover:text-red-400 transition-colors p-1"
                      title="Delete record"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-[#64748B]">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No contract audits found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-4 border-t border-[#2A3A66] bg-[#1F2D52]/50">
            <button
              onClick={onClearAll}
              className="w-full text-xs font-semibold text-red-400 hover:text-red-300 py-2 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-colors"
            >
              Clear All Audit History
            </button>
          </div>
        )}
      </div>
    </div>
  );
}