import React, { useState } from 'react';
import { GitBranch, Search, CheckCircle2, RefreshCw, FolderGit2 } from 'lucide-react';
import { useRepository } from '../../hooks/useRepository';
import { OnboardingModal } from './OnboardingModal';
import { useNavigate } from 'react-router-dom';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

export const Navbar: React.FC = () => {
  const { repository, analyzing } = useRepository();
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="h-14 border-b border-dark-800 bg-dark-900/90 backdrop-blur-md px-5 flex items-center justify-between z-20 sticky top-0">
        {/* Left: Current Repository & Branch */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-dark-850 border border-dark-750 text-sm">
            <FolderGit2 className="w-4 h-4 text-brand-400" />
            <span className="text-dark-400 font-mono text-xs">{repository?.owner || 'repomind'} /</span>
            <span className="font-semibold text-white tracking-tight">{repository?.name || 'ecommerce-platform'}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-dark-800/80 border border-dark-700/60 text-xs text-dark-300">
            <GitBranch className="w-3.5 h-3.5 text-dark-400" />
            <span className="font-mono">{repository?.branch || 'main'}</span>
          </div>

          {repository?.is_demo && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/30">
              DEMO REPOSITORY
            </span>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-mono ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>INDEXED</span>
          </div>
        </div>

        {/* Center: Quick Search Trigger */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <button
            onClick={() => navigate('/search')}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-md bg-dark-850 border border-dark-750 text-xs text-dark-400 hover:text-dark-200 hover:border-dark-600 transition-colors shadow-inner"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-dark-400" />
              <span>Search AST symbols, functions, files...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-dark-750 border border-dark-700 text-[10px] text-dark-300 font-mono">
              /
            </kbd>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setModalOpen(true)}
            disabled={analyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-dark-800 hover:bg-dark-750 border border-dark-700 text-xs text-dark-200 font-medium transition-colors shadow-sm"
          >
            {analyzing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
            )}
            <span>Connect Repo</span>
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
            title="GitHub Repository"
          >
            <GithubIcon className="w-4 h-4" />
          </a>
        </div>
      </header>

      <OnboardingModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};


