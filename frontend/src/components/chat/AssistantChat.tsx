import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  RotateCcw,
  GitCommit,
  ArrowRight,
  FileCode,
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
  const [messagesByRepo, setMessagesByRepo] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeRepoId = repository?.id || 'demo-ecommerce';
  const messages = messagesByRepo[activeRepoId] || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const presetQueries = repository?.name?.toLowerCase().includes('resume')
    ? [
        'How does resume and job description matching work?',
        'Where is the Redis cache fallback implemented?',
        'Explain the skill extraction algorithm and taxonomy.',
        'Which endpoints handle file upload and analysis?',
      ]
    : PRESET_QUERIES;

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading || !repository) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessagesByRepo((prev) => ({
      ...prev,
      [activeRepoId]: [...(prev[activeRepoId] || []), userMsg],
    }));

    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await api.chat({
        message: textToSend,
        repository_id: repository.id,
      });

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessagesByRepo((prev) => ({
        ...prev,
        [activeRepoId]: [...(prev[activeRepoId] || []), assistantMsg],
      }));
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        response: {
          answer: 'Unable to connect to the reasoning engine. Please ensure backend services are running.',
          sources: [],
          flow_steps: [],
          confidence: 0,
          suggested_actions: ['Retry question'],
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessagesByRepo((prev) => ({
        ...prev,
        [activeRepoId]: [...(prev[activeRepoId] || []), errorMsg],
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessagesByRepo((prev) => ({
      ...prev,
      [activeRepoId]: [],
    }));
  };

  const handleCitationClick = (citation: ChatSourceCitation) => {
    jumpToFileLine(citation.file_path, citation.line_start);
    navigate('/explorer');
  };

  const getGithubPermalink = (citation: ChatSourceCitation) => {
    if (!repository?.repo_url || !repository?.commit_sha) return null;
    const cleanRepoUrl = repository.repo_url.replace(/\.git$/, '');
    return `${cleanRepoUrl}/blob/${repository.commit_sha}/${citation.file_path}#L${citation.line_start}-L${citation.line_end}`;
  };

  return (
    <div className="h-full w-full flex flex-col bg-theme-bg overflow-hidden font-sans">
      {/* Top Conversation Header */}
      <div className="h-12 px-6 border-b border-theme-border flex items-center justify-between shrink-0 bg-theme-surface">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-theme-primary uppercase tracking-[0.06em]">Architecture Assistant</span>
          <span className="text-theme-muted">•</span>
          <span className="text-theme-secondary font-mono text-[11px]">{repository?.name || 'Grounded Q&A'}</span>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs text-theme-muted hover:text-theme-primary px-2.5 py-1 rounded-[6px] hover:bg-theme-subtle transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto py-10 text-center space-y-6 animate-fade-in">
            <div className="inline-flex p-3 rounded-2xl bg-theme-accent/10 border border-theme-accent/20 text-theme-accent shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-medium text-theme-primary tracking-tight">
                Ask anything about {repository ? `${repository.name}` : 'the codebase architecture'}
              </h3>
              <p className="text-sm text-theme-secondary max-w-md mx-auto leading-relaxed">
                RepoMind traverses AST symbol graphs, import hierarchies, and runtime call flows
                to deliver verified source code answers with line citations.
              </p>
            </div>

            {/* Suggested Prompts */}
            <div className="space-y-2.5 max-w-lg mx-auto text-left pt-2">
              <div className="text-[11px] font-sans font-semibold uppercase text-theme-muted tracking-[0.06em]">
                Recommended Inquiries
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {presetQueries.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="p-3 rounded-card bg-theme-surface hover:bg-theme-subtle border border-theme-border text-xs text-left text-theme-primary transition-all flex items-center justify-between group shadow-card"
                  >
                    <span className="truncate">{q}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-theme-muted group-hover:text-theme-accent shrink-0 ml-1" />
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
              <div className="px-4 py-2.5 rounded-[12px] bg-theme-accent text-white text-xs font-sans max-w-lg shadow-xs leading-relaxed">
                {msg.content}
              </div>
            ) : (
              /* Structured Developer Assistant Response */
              <div className="w-full bg-theme-surface border border-theme-border rounded-card p-6 shadow-card space-y-5 animate-fade-in">
                {/* Architecture Context Banner */}
                {msg.response?.architecture_context && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-theme-subtle border border-theme-border text-[11px] font-mono text-theme-accent">
                    <Layers className="w-3.5 h-3.5 text-theme-accent" />
                    <span>Layer Context: {msg.response.architecture_context}</span>
                  </div>
                )}

                {/* Insufficient Evidence Notice */}
                {msg.response?.confidence === 0 && (
                  <div className="p-3.5 rounded-[10px] bg-theme-warning/10 border border-theme-warning/20 flex items-start gap-2.5 text-xs text-theme-warning leading-relaxed">
                    <Shield className="w-4 h-4 text-theme-warning shrink-0 mt-0.5" />
                    <span>Evidence Notice: Answer could not be fully verified from the indexed AST code chunks.</span>
                  </div>
                )}

                {/* Flow Timeline Card */}
                {msg.response?.flow_steps && msg.response.flow_steps.length > 0 && (
                  <div className="p-4 rounded-[10px] bg-theme-subtle border border-theme-border space-y-2.5">
                    <div className="text-[11px] font-sans font-semibold uppercase text-theme-muted tracking-[0.06em] flex items-center gap-2">
                      <GitCommit className="w-3.5 h-3.5 text-theme-accent" />
                      <span>Execution Call Flow</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                      {msg.response.flow_steps.map((step, idx) => (
                        <React.Fragment key={step}>
                          <span className="px-2.5 py-1 rounded-[6px] bg-theme-surface border border-theme-border text-theme-primary">
                            {step}
                          </span>
                          {idx < msg.response!.flow_steps.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-theme-muted shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounded Markdown Answer */}
                <div className="text-xs text-theme-primary leading-relaxed font-sans space-y-2 whitespace-pre-line">
                  {msg.response?.answer}
                </div>

                {/* Clickable Citations */}
                {msg.response?.sources && msg.response.sources.length > 0 && (
                  <div className="space-y-2.5 pt-3 border-t border-theme-border">
                    <div className="text-[11px] font-sans font-semibold uppercase text-theme-muted tracking-[0.06em] flex items-center justify-between">
                      <span>Verified Code References ({msg.response.sources.length})</span>
                      <span className="text-[10px] text-theme-muted font-normal lowercase">Click to open in editor</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {msg.response.sources.map((cit, idx) => {
                        const permalink = getGithubPermalink(cit);
                        return (
                          <div
                            key={idx}
                            onClick={() => handleCitationClick(cit)}
                            className="p-3 rounded-[10px] bg-theme-surface hover:bg-theme-subtle border border-theme-border cursor-pointer transition-all group relative shadow-subtle"
                          >
                            <div className="flex items-center justify-between text-xs font-mono text-theme-primary mb-1">
                              <div className="flex items-center gap-1.5 truncate">
                                <FileCode className="w-3.5 h-3.5 text-theme-accent shrink-0" />
                                <span className="truncate font-medium">{cit.file_path.split('/').pop()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-theme-muted font-mono">
                                  L{cit.line_start}–{cit.line_end}
                                </span>
                                {permalink && (
                                  <a
                                    href={permalink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Open commit-pinned file on GitHub"
                                    className="p-1 rounded text-theme-muted hover:text-theme-primary transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="text-[10px] text-theme-muted font-mono truncate">
                              {cit.file_path}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Suggested Next Actions */}
                {msg.response?.suggested_actions && (
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-theme-border">
                    <span className="text-[11px] font-sans font-semibold text-theme-muted uppercase tracking-[0.06em]">
                      Suggested Actions:
                    </span>
                    {msg.response.suggested_actions.map((act) => (
                      <button
                        key={act}
                        onClick={() => handleSend(act)}
                        className="px-3 py-1 rounded-full bg-theme-surface hover:bg-theme-subtle border border-theme-border text-xs text-theme-primary transition-colors"
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
          <div className="max-w-3xl mx-auto p-4 rounded-card bg-theme-surface border border-theme-border flex items-center gap-3 text-xs text-theme-muted font-sans animate-pulse shadow-card">
            <Sparkles className="w-4 h-4 text-theme-accent animate-spin" />
            <span>Reasoning across AST symbols and dependency paths...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-theme-surface border-t border-theme-border shrink-0">
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
            className="w-full pl-4 pr-12 py-3 bg-theme-surface border border-theme-border rounded-[10px] text-xs text-theme-primary placeholder-theme-muted font-sans shadow-card focus:ring-2 focus:ring-theme-accent/40 focus:border-theme-accent focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2 rounded-[8px] bg-theme-accent hover:bg-theme-accent-hover disabled:opacity-40 disabled:hover:bg-theme-accent text-white transition-colors duration-150 shadow-xs border-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
