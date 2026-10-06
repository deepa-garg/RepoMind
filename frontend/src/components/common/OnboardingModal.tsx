import React, { useState } from 'react';
import { X, GitBranch, Cpu, Sparkles, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { useRepository } from '../../hooks/useRepository';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const STAGES = [
  'Fetching repository',
  'Scanning files',
  'Parsing AST',
  'Building dependency graph',
  'Generating embeddings',
  'Indexing repository',
  'Analysis complete',
];

export const OnboardingModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { analyzeRepo, analyzing, progress } = useRepository();
  const [repoUrl, setRepoUrl] = useState('https://github.com/repomind/ecommerce-platform');
  const [branch, setBranch] = useState('main');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await analyzeRepo(repoUrl, branch, false);
    onClose();
  };

  const handleDemoLoad = async () => {
    await analyzeRepo('https://github.com/repomind/ecommerce-platform', 'main', true);
    onClose();
  };

  const currentStageIndex = STAGES.findIndex((s) => s === progress?.stage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-dark-900 border border-dark-750 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">Connect Repository</h2>
              <p className="text-xs text-dark-400">Structural AST & dependency indexing pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={analyzing}
            className="p-1 rounded text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {analyzing ? (
            /* Progress State */
            <div className="space-y-5 py-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-brand-400 font-semibold">{progress?.stage}</span>
                  <span className="text-dark-400">{progress?.progress_pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress?.progress_pct || 15}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-dark-400 italic pt-1">{progress?.message}</p>
              </div>

              {/* Pipeline Stage Indicators */}
              <div className="space-y-2 pt-2 border-t border-dark-800">
                {STAGES.map((stage, idx) => {
                  const isDone = currentStageIndex > idx || progress?.is_complete;
                  const isCurrent = currentStageIndex === idx && !progress?.is_complete;
                  return (
                    <div
                      key={stage}
                      className={`flex items-center gap-3 text-xs transition-colors ${
                        isDone
                          ? 'text-dark-300'
                          : isCurrent
                          ? 'text-brand-300 font-medium'
                          : 'text-dark-600'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          isDone
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isCurrent
                            ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40 animate-pulse'
                            : 'bg-dark-800 text-dark-600 border border-dark-750'
                        }`}
                      >
                        {isDone ? <Check className="w-2.5 h-2.5" /> : idx + 1}
                      </div>
                      <span>{stage}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Form Input */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                  Public GitHub Repository URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-500">
                    <GithubIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-dark-850 border border-dark-750 rounded-lg text-xs text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                  Target Branch
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-500">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-dark-850 border border-dark-750 rounded-lg text-xs text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDemoLoad}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-dark-800 hover:bg-dark-750 border border-dark-700 text-xs text-brand-300 font-medium transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                  <span>Load Demo Repository</span>
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs text-white font-medium transition-colors shadow-sm"
                >
                  <span>Start Structural Analysis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-dark-950 border-t border-dark-800/80 flex items-center gap-2 text-[11px] text-dark-500">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
          <span>Local AST parsing & vectorization preserves codebase privacy.</span>
        </div>
      </div>
    </div>
  );
};
