import React, { useState, useRef, useEffect } from 'react';
import { GitBranch, Search, CheckCircle2, RefreshCw, FolderGit2, ChevronDown, Plus, AlertCircle, Check, Sun, Moon } from 'lucide-react';
import { useRepository } from '../../hooks/useRepository';
import { OnboardingModal } from './OnboardingModal';
import { useNavigate } from 'react-router-dom';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

export const Navbar: React.FC = () => {
  const { repository, repositories, switchRepository, retryIndexing, analyzing } = useRepository();
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('repomind-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('repomind-theme', 'light');
    }
  };

  const isFailed = repository?.indexing_status === 'Failed';
  const isReady = repository?.indexing_status === 'Ready' || !repository?.indexing_status;

  return (
    <>
      <header className="h-14 border-b border-theme-border bg-theme-surface px-5 flex items-center justify-between z-20 sticky top-0 transition-colors font-sans">
        {/* Left: Current Repository Selector Dropdown & Branch */}
        <div className="flex items-center gap-2.5">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-theme-surface hover:bg-theme-subtle border border-theme-border text-sm transition-colors text-left"
              title="Select active repository"
            >
              <FolderGit2 className="w-4 h-4 text-theme-accent shrink-0" />
              <div className="flex items-center gap-1">
                <span className="text-theme-muted font-mono text-xs">{repository?.owner || 'repomind'} /</span>
                <span className="font-medium text-theme-primary tracking-tight">{repository?.name || 'ecommerce-platform'}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-theme-muted ml-0.5" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-80 rounded-[12px] bg-[#FFFFFF] dark:bg-[#30302E] border border-theme-border shadow-[0_20px_60px_rgba(0,0,0,0.25)] z-50 overflow-hidden animate-fade-in">
                <div className="px-3.5 py-2.5 border-b border-theme-border text-[11px] font-sans font-semibold uppercase text-theme-muted tracking-wider flex items-center justify-between bg-theme-subtle">
                  <span>Indexed Repositories ({repositories.length})</span>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {repositories.map((repo) => {
                    const isSelected = repo.id === repository?.id;
                    return (
                      <button
                        key={repo.id}
                        onClick={() => {
                          switchRepository(repo.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between hover:bg-theme-subtle transition-colors ${
                          isSelected ? 'bg-theme-accent/10 text-theme-accent font-medium' : 'text-theme-secondary'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate font-medium flex items-center gap-1.5 text-theme-primary">
                            <span className="text-theme-muted font-mono text-[11px]">{repo.owner}/</span>
                            <span>{repo.name}</span>
                          </div>
                          <div className="text-[10px] text-theme-muted font-mono flex items-center gap-2 mt-0.5">
                            <span>branch: {repo.branch}</span>
                            {repo.commit_sha && <span>• {repo.commit_sha.slice(0, 7)}</span>}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-theme-accent shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="p-2 border-t border-theme-border bg-theme-subtle">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-[10px] bg-theme-surface hover:bg-theme-subtle border border-theme-border text-xs font-medium text-theme-accent transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect New Repository</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-theme-subtle border border-theme-border text-xs text-theme-secondary">
            <GitBranch className="w-3.5 h-3.5 text-theme-muted" />
            <span className="font-mono text-[11px] text-theme-primary">{repository?.branch || 'main'}</span>
          </div>

          {repository?.commit_sha && (
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full bg-theme-subtle border border-theme-border text-[11px] font-mono text-theme-muted">
              <span>SHA:</span>
              <span className="text-theme-primary font-medium">{repository.commit_sha.slice(0, 7)}</span>
            </div>
          )}

          {repository?.is_demo && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium tracking-wide bg-theme-accent/10 text-theme-accent border border-theme-accent/20">
              Demo Repo
            </span>
          )}

          {isReady && !repository?.is_demo && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-theme-success font-sans ml-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-theme-success"></span>
              <span className="text-[11px] tracking-wide uppercase">Indexed</span>
            </div>
          )}

          {isFailed && (
            <div className="flex items-center gap-2 ml-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium bg-theme-danger/10 text-theme-danger border border-theme-danger/20">
                <AlertCircle className="w-3 h-3" />
                <span>Indexing Failed</span>
              </span>
              <button
                onClick={() => repository && retryIndexing(repository.id)}
                disabled={analyzing}
                className="px-2.5 py-0.5 rounded-[10px] bg-theme-danger/10 hover:bg-theme-danger/20 border border-theme-danger/30 text-[11px] text-theme-danger font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Center: Quick Search Trigger */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <button
            onClick={() => navigate('/search')}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-[10px] bg-theme-subtle border border-theme-border text-xs text-theme-muted hover:text-theme-primary hover:border-theme-border transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-theme-muted" />
              <span>Search AST symbols, functions, files...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded-[6px] bg-theme-surface border border-theme-border text-[10px] text-theme-muted font-mono shadow-xs">
              /
            </kbd>
          </button>
        </div>

        {/* Right: Actions & Theme Toggle */}
        <div className="flex items-center gap-2">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-[10px] bg-theme-surface hover:bg-theme-subtle border border-theme-border text-theme-primary transition-colors"
            title={isDark ? 'Switch to warm light theme' : 'Switch to soft dark theme'}
            aria-label="Toggle visual theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-theme-warning" /> : <Moon className="w-4 h-4 text-theme-secondary" />}
          </button>

          <button
            onClick={() => setModalOpen(true)}
            disabled={analyzing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] bg-theme-accent hover:bg-theme-accent-hover text-xs text-white font-medium transition-colors duration-150 shadow-xs border-0"
          >
            {analyzing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            )}
            <span>Connect Repo</span>
          </button>

          {repository?.repo_url && (
            <a
              href={repository.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-[10px] text-theme-muted hover:text-theme-primary hover:bg-theme-subtle border border-transparent hover:border-theme-border transition-colors"
              title="Open Repository on GitHub"
            >
              <GithubIcon className="w-4 h-4" />
            </a>
          )}
        </div>
      </header>

      <OnboardingModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
