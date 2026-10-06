import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  RotateCcw,
  GitCommit,
  ArrowRight,
  FileCode,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { ChatResponse, ChatSourceCitation } from '../../types';
import { api } from '../../services/api';
import { useRepository } from '../../hooks/useRepository';
import { useNavigate } from 'react-router-dom';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  response?: ChatResponse;
  timestamp: string;
}

const PRESET_QUERIES = [
  'How does authentication work?',
  'Where is the payment logic implemented?',
  'Explain the database architecture.',
  'Which files handle user registration?',
  'What happens when a user places an order?',
  'Why could this token verification function fail?',
];

export const AssistantChat: React.FC = () => {
  const { repository, jumpToFileLine } = useRepository();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading || !repository) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chat({
        message: textToSend,
        repository_id: repository.id,
        session_id: 'repomind-session',
      });

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    await api.clearChat('repomind-session');
    setMessages([]);
  };

  const handleCitationClick = (citation: ChatSourceCitation) => {
    jumpToFileLine(citation.file_path, citation.line_start);
    navigate('/explorer');
  };

  return (
    <div className="h-full w-full flex flex-col bg-dark-950 overflow-hidden">
      {/* Top Controls Bar */}
      <div className="h-12 px-6 bg-dark-900 border-b border-dark-800 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <span className="text-xs font-semibold text-white tracking-tight">
            Repository Intelligence Assistant
          </span>
          <span className="text-[11px] text-dark-400 font-mono">
            • Grounded AST & Dependency Reasoning
          </span>
        </div>

        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs text-dark-300 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear Context</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto py-8 text-center space-y-6 animate-fade-in">
            <div className="inline-flex p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-semibold text-white tracking-tight">
                Ask anything about the codebase architecture
              </h3>
              <p className="text-xs text-dark-400 max-w-md mx-auto">
                RepoMind traverses AST symbol graphs, import hierarchies, and runtime call flows
                to deliver verified source code answers with line citations.
              </p>
            </div>

            {/* Suggested Prompts */}
            <div className="space-y-2 max-w-lg mx-auto text-left">
              <div className="text-[10px] font-mono uppercase text-dark-500 tracking-wider">
                Recommended Inquiries
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="p-2.5 rounded-lg bg-dark-900 hover:bg-dark-850 border border-dark-800 hover:border-dark-700 text-xs text-left text-dark-200 hover:text-white transition-all flex items-center justify-between group"
                  >
                    <span className="truncate">{q}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-dark-500 group-hover:text-brand-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-3xl mx-auto space-y-3 ${
              msg.role === 'user' ? 'flex justify-end' : ''
            }`}
          >
            {msg.role === 'user' ? (
              /* User Bubble */
              <div className="px-4 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-sans max-w-lg shadow-md">
                {msg.content}
              </div>
            ) : (
              /* Structured Developer Assistant Response */
              <div className="w-full bg-dark-900 border border-dark-800 rounded-xl p-5 shadow-xl space-y-5 animate-fade-in">
                {/* Architecture Context Banner */}
                {msg.response?.architecture_context && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-850 border border-dark-750 text-[11px] font-mono text-brand-300">
                    <Layers className="w-3.5 h-3.5 text-brand-400" />
                    <span>Layer Context: {msg.response.architecture_context}</span>
                  </div>
                )}

                {/* Flow Timeline Card */}
                {msg.response?.flow_steps && msg.response.flow_steps.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-dark-950 border border-dark-800 space-y-2">
                    <div className="text-[11px] font-mono font-semibold uppercase text-dark-400 tracking-wider flex items-center gap-2">
                      <GitCommit className="w-3.5 h-3.5 text-brand-400" />
                      <span>Execution Call Flow</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                      {msg.response.flow_steps.map((step, idx) => (
                        <React.Fragment key={step}>
                          <span className="px-2 py-1 rounded bg-dark-850 border border-dark-750 text-dark-200">
                            {step}
                          </span>
                          {idx < msg.response!.flow_steps.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-dark-500 shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounded Markdown Answer */}
                <div className="text-xs text-dark-200 leading-relaxed font-sans prose prose-invert max-w-none space-y-2 whitespace-pre-line">
                  {msg.response?.answer}
                </div>

                {/* Clickable Citations */}
                {msg.response?.sources && msg.response.sources.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-dark-800">
                    <div className="text-[11px] font-mono font-semibold uppercase text-dark-400 tracking-wider">
                      Verified Code References (Click to open at line)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.response.sources.map((cit, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleCitationClick(cit)}
                          className="p-2.5 rounded-lg bg-dark-950 hover:bg-dark-850 border border-dark-800 hover:border-brand-500/40 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-xs font-mono text-white mb-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <FileCode className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                              <span className="truncate">{cit.file_path.split('/').pop()}</span>
                            </div>
                            <span className="text-[10px] text-dark-400 font-mono">
                              L{cit.line_start}–{cit.line_end}
                            </span>
                          </div>
                          <div className="text-[10px] text-dark-400 font-mono truncate">
                            {cit.file_path}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Next Actions */}
                {msg.response?.suggested_actions && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dark-800">
                    <span className="text-[10px] font-mono text-dark-500 uppercase tracking-wider">
                      Suggested Actions:
                    </span>
                    {msg.response.suggested_actions.map((act) => (
                      <button
                        key={act}
                        onClick={() => handleSend(act)}
                        className="px-2.5 py-1 rounded-full bg-dark-850 hover:bg-dark-800 border border-dark-750 text-[11px] text-dark-300 hover:text-white transition-colors"
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="max-w-3xl mx-auto p-4 rounded-xl bg-dark-900 border border-dark-800 flex items-center gap-3 text-xs text-dark-400 font-mono animate-pulse">
            <Sparkles className="w-4 h-4 text-brand-400 animate-spin" />
            <span>Reasoning across AST symbols and dependency paths...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-dark-900 border-t border-dark-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-3xl mx-auto relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a technical codebase question (e.g. 'How does authentication work?')..."
            className="w-full pl-4 pr-12 py-3 bg-dark-950 border border-dark-750 rounded-xl text-xs text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-sans shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:hover:bg-brand-600 text-white transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
