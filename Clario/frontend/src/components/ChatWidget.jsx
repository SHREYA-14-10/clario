import React, { useState, useRef, useEffect } from 'react';

// Lightweight Markdown Renderer (No external npm packages needed)
const FormattedMarkdown = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 text-xs leading-relaxed">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // 1. Parse bold formatting (**text**)
        const parts = line.split(/(\*\*.*?\*\*)/g);
        const parsedLine = parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={partIdx} className="font-semibold text-indigo-300">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        // 2. Format Bullet Points (* or -)
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const cleanParts = parsedLine.map((p) =>
            typeof p === 'string' ? p.replace(/^[*|-]\s*/, '') : p
          );

          return (
            <div key={lineIdx} className="flex items-start gap-2 my-1 pl-1">
              <span className="text-indigo-400 font-bold leading-none mt-1">•</span>
              <div className="flex-1">{cleanParts}</div>
            </div>
          );
        }

        // 3. Render Empty Lines as Spacers
        if (trimmed === '') {
          return <div key={lineIdx} className="h-1.5" />;
        }

        // 4. Render Regular Paragraphs
        return (
          <p key={lineIdx} className="my-0.5">
            {parsedLine}
          </p>
        );
      })}
    </div>
  );
};

export default function ChatWidget({ documentText }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hello! I'm your AI Legal Assistant. Ask me anything about this contract, and I'll analyze the exact terms for you.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);

  const presetQuestions = [
    'Does this contract auto-renew?',
    'What data is collected about me?',
    'Are there hidden fees or penalties?',
    'How can I terminate this agreement?',
  ];

  // Auto-scroll inside the chat container only (prevents full webpage jumping)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (questionToSend) => {
    const query = (questionToSend || input).trim();
    if (!query || isLoading) return;

    if (!questionToSend) setInput('');

    // Add user message
    const newMessages = [...messages, { role: 'user', content: query }];
    setMessages(newMessages);
    setIsLoading(true);

    // Add placeholder assistant message
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('https://clario-1-tsp6.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_text: documentText || '',
          question: query,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch response from assistant.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value);
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6);

            if (rawData.trim() === '[DONE]') continue;

            const decodedChunk = rawData.replace(/\\n/g, '\n');
            accumulatedText += decodedChunk;

            setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                updated[lastIdx].content = accumulatedText;
              }
              return updated;
            });
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx].content =
            '⚠️ Sorry, I encountered an error retrieving answers for this document.';
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#1A2544] border border-[#2A3A66] rounded-2xl shadow-2xl flex flex-col h-[580px] w-full overflow-hidden">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="px-5 py-4 bg-[#141D36] border-b border-[#2A3A66] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#6366F1]/20 border border-[#6366F1]/40 flex items-center justify-center text-[#818CF8]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#EEF2FF] tracking-wide">Contract AI Assistant</h3>
            <span className="text-[11px] text-[#818CF8] flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Grounded in upload
            </span>
          </div>
        </div>
      </div>

      {/* ── Chat Messages Scroll Area ───────────────────────── */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Suggested Prompts Grid */}
        {messages.length <= 1 && (
          <div className="my-2 p-3 bg-[#0F1629]/60 border border-[#2A3A66] rounded-xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] block mb-2.5">
              Suggested Questions
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presetQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="text-left text-xs text-[#CBD5E1] bg-[#1F2D52] hover:bg-[#2A3A66] hover:text-[#EEF2FF] border border-[#334078] p-2.5 rounded-lg transition-all line-clamp-2 leading-relaxed"
                >
                  💬 {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation Bubbles */}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-[#6366F1]/20 border border-[#6366F1]/40 flex items-center justify-center text-[#818CF8] text-xs flex-shrink-0 mt-0.5">
                🤖
              </div>
            )}

            <div
              className={`max-w-[85%] p-3.5 rounded-2xl break-words ${
                msg.role === 'user'
                  ? 'bg-[#6366F1] text-white rounded-tr-none font-medium shadow-md text-xs'
                  : 'bg-[#0F1629] text-[#E2E8F0] border border-[#2A3A66] rounded-tl-none shadow-sm'
              }`}
            >
              {msg.role === 'user' ? (
                msg.content
              ) : msg.content ? (
                <FormattedMarkdown content={msg.content} />
              ) : (
                <span className="text-[#94A3B8] italic flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 bg-[#6366F1] rounded-full animate-ping"></span>
                  Analyzing document provisions...
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Input Area ───────────────────────────────────────── */}
      <div className="p-3 bg-[#141D36] border-t border-[#2A3A66]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask a question about this contract..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-[#0F1629] border border-[#2A3A66] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] rounded-xl px-4 py-2.5 text-xs text-[#EEF2FF] placeholder-[#64748B] outline-none transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-[#6366F1] hover:bg-[#4F46E5] disabled:bg-[#334078] text-white p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        <p className="text-[10px] text-[#64748B] text-center mt-2">
          Responses are grounded strictly in the parsed contract text.
        </p>
      </div>
    </div>
  );
}