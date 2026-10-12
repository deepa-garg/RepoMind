import React, { useState } from 'react';
import { X, GitBranch, Cpu, Sparkles, Check, ArrowRight, ShieldCheck, AlertCircle, Upload, FileArchive } from 'lucide-react';
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
  'Connecting',
  'Cloning or Fetching',
  'Scanning',
  'Parsing',
  'Indexing',
  'Ready',
];

export const OnboardingModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { analyzeRepo, uploadZip, analyzing, progress, error, clearError } = useRepository();
  const [activeTab, setActiveTab] = useState<'github' | 'zip'>('github');
  const [repoUrl, setRepoUrl] = useState('https://github.com/repomind/ecommerce-platform');
  const [branch, setBranch] = useState('main');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (activeTab === 'github') {
        await analyzeRepo(repoUrl, branch, false);
      } else if (selectedFile) {
        await uploadZip(selectedFile);
      }
      onClose();
    } catch {
      // Error surfaced in UI state
    }
  };

  const handleDemoLoad = async () => {
    clearError();
    try {
      await analyzeRepo('https://github.com/repomind/ecommerce-platform', 'main', true);
      onClose();
    } catch {
      // Error handled
    }
  };

  const currentStageIndex = STAGES.findIndex((s) => s.toLowerCase() === (progress?.stage || '').toLowerCase());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(20,20,19,0.45)] dark:bg-[rgba(0,0,0,0.6)] backdrop-blur-[4px] animate-fade-in font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget && !analyzing) onClose();
      }}
    >
      <div className="w-[92vw] max-w-[560px] max-h-[90vh] overflow-y-auto relative z-[60] bg-theme-surface dark:bg-[#30302E] border border-theme-border dark:border-[#3E3D3A] rounded-[16px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-theme-border dark:border-[#3E3D3A] flex items-center justify-between bg-theme-surface dark:bg-[#30302E] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[8px] bg-theme-accent/10 border border-theme-accent/20 text-theme-accent">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-medium text-theme-primary dark:text-[#F0EEE6] tracking-tight">Connect Repository</h2>
              <p className="text-xs text-theme-secondary dark:text-[#C2C0B8] font-sans">Validated GitHub Ingestion & AST Indexing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={analyzing}
            className="p-1.5 rounded-[8px] text-theme-muted hover:text-theme-primary dark:text-[#A8A69E] dark:hover:text-[#F0EEE6] hover:bg-theme-subtle dark:hover:bg-[#3E3D3A] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        {!analyzing && (
          <div className="flex border-b border-theme-border dark:border-[#3E3D3A] bg-theme-subtle dark:bg-[#262624] px-6 pt-2 shrink-0">
            <button
              onClick={() => { setActiveTab('github'); clearError(); }}
              className={`pb-2.5 px-3.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'github'
                  ? 'border-theme-accent text-theme-primary dark:text-[#F0EEE6] font-semibold'
                  : 'border-transparent text-theme-muted dark:text-[#A8A69E] hover:text-theme-primary dark:hover:text-[#F0EEE6]'
              }`}
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>Public GitHub URL</span>
            </button>
            <button
              onClick={() => { setActiveTab('zip'); clearError(); }}
              className={`pb-2.5 px-3.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'zip'
                  ? 'border-theme-accent text-theme-primary dark:text-[#F0EEE6] font-semibold'
                  : 'border-transparent text-theme-muted dark:text-[#A8A69E] hover:text-theme-primary dark:hover:text-[#F0EEE6]'
              }`}
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>Upload ZIP Archive</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-5 bg-theme-surface dark:bg-[#30302E] flex-1">
          {error && (
            <div className="p-3.5 rounded-[10px] bg-theme-danger/10 border border-theme-danger/20 flex items-start gap-2.5 text-xs text-theme-danger">
              <AlertCircle className="w-4 h-4 text-theme-danger shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-theme-danger">Ingestion Notice</span>
                <p className="text-xs text-theme-danger leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {analyzing ? (
            /* Real Progress State */
            <div className="space-y-5 py-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-theme-accent font-medium">{progress?.stage}</span>
                  <span className="text-theme-primary dark:text-[#F0EEE6] font-semibold">{progress?.progress_pct}%</span>
                </div>
                <div className="h-2 w-full bg-theme-track rounded-full overflow-hidden block relative">
                  <div
                    className="h-full bg-theme-accent rounded-full transition-all duration-600"
                    style={{
                      width: `${progress?.progress_pct || 15}%`,
                      minWidth: (progress?.progress_pct || 15) > 0 ? '4px' : '0px',
                    }}
                  ></div>
                </div>
                <p className="text-xs text-theme-secondary dark:text-[#C2C0B8] pt-1 font-sans">{progress?.message}</p>
              </div>

              {/* Pipeline Stage Indicators */}
              <div className="space-y-2 pt-2 border-t border-theme-border dark:border-[#3E3D3A]">
                {STAGES.map((stage, idx) => {
                  const isDone = currentStageIndex > idx || progress?.is_complete;
                  const isCurrent = currentStageIndex === idx && !progress?.is_complete;
                  return (
                    <div
                      key={stage}
                      className={`flex items-center gap-3 text-xs transition-colors ${
                        isDone
                          ? 'text-theme-secondary dark:text-[#C2C0B8] font-medium'
                          : isCurrent
                          ? 'text-theme-accent font-semibold'
                          : 'text-theme-muted dark:text-[#A8A69E]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-sans ${
                          isDone
                            ? 'bg-theme-success/20 text-theme-success border border-theme-success/40'
                            : isCurrent
                            ? 'bg-theme-accent/20 text-theme-accent border border-theme-accent/50 animate-pulse'
                            : 'bg-theme-subtle dark:bg-[#262624] text-theme-muted dark:text-[#A8A69E] border border-theme-border dark:border-[#3E3D3A]'
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
          ) : activeTab === 'github' ? (
            /* Form Input: GitHub */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-theme-primary dark:text-[#F0EEE6] mb-1.5">
                  Public GitHub Repository URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-theme-muted dark:text-[#A8A69E]">
                    <GithubIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-theme-surface dark:bg-[#262624] border border-theme-border dark:border-[#3E3D3A] rounded-[10px] text-xs text-theme-primary dark:text-[#F0EEE6] placeholder-theme-muted dark:placeholder-[#A8A69E] focus:ring-2 focus:ring-theme-accent/40 focus:border-theme-accent focus:outline-none font-mono transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-theme-primary dark:text-[#F0EEE6] mb-1.5">
                  Target Branch
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-theme-muted dark:text-[#A8A69E]">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-theme-surface dark:bg-[#262624] border border-theme-border dark:border-[#3E3D3A] rounded-[10px] text-xs text-theme-primary dark:text-[#F0EEE6] placeholder-theme-muted dark:placeholder-[#A8A69E] focus:ring-2 focus:ring-theme-accent/40 focus:border-theme-accent focus:outline-none font-mono transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDemoLoad}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-theme-surface dark:bg-[#262624] hover:bg-theme-subtle dark:hover:bg-[#383835] border border-theme-border dark:border-[#3E3D3A] text-xs text-theme-primary dark:text-[#F0EEE6] font-medium transition-colors duration-150"
                >
                  <Sparkles className="w-3.5 h-3.5 text-theme-accent" />
                  <span>Load Demo Repository</span>
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-theme-accent hover:bg-theme-accent-hover text-xs text-white font-medium transition-colors duration-150 shadow-xs border-0"
                >
                  <span>Start Structural Analysis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            /* Form Input: ZIP Upload */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-theme-primary dark:text-[#F0EEE6] mb-1.5">
                  Select Repository ZIP File
                </label>
                <div className="border border-dashed border-theme-border dark:border-[#3E3D3A] hover:border-theme-accent/50 rounded-[12px] p-6 text-center cursor-pointer transition-colors bg-theme-subtle dark:bg-[#262624]">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="zip-upload"
                  />
                  <label htmlFor="zip-upload" className="cursor-pointer space-y-2 block">
                    <div className="inline-flex p-2.5 rounded-[10px] bg-theme-accent/10 text-theme-accent">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-medium text-theme-primary dark:text-[#F0EEE6]">
                      {selectedFile ? selectedFile.name : 'Click to select ZIP archive'}
                    </div>
                    <p className="text-xs text-theme-muted dark:text-[#A8A69E]">
                      ZIP file will be extracted safely without running scripts (max 100MB)
                    </p>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={!selectedFile}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-theme-accent hover:bg-theme-accent-hover disabled:opacity-40 text-xs text-white font-medium transition-colors duration-150 shadow-xs border-0"
                >
                  <span>Ingest ZIP Archive</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-theme-subtle dark:bg-[#262624] border-t border-theme-border dark:border-[#3E3D3A] flex items-center gap-2 text-xs text-theme-muted dark:text-[#C2C0B8] shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-theme-accent" />
          <span>Local AST parsing & vectorization with strict repository isolation.</span>
        </div>
      </div>
    </div>
  );
};
