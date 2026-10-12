import React from 'react';
import {
  FileCode,
  Zap,
  TestTube2,
  Bug,
  HelpCircle,
  Code2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { FileContentResponse } from '../../types';
import { useNavigate } from 'react-router-dom';

interface Props {
  fileInfo: FileContentResponse | null;
  onJumpToLine: (line: number) => void;
}

export const AstContextPanel: React.FC<Props> = ({ fileInfo, onJumpToLine }) => {
  const navigate = useNavigate();

  if (!fileInfo) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center text-xs text-theme-muted font-sans">
        Select a file to inspect AST context
      </div>
    );
  }

  const handleExplainAI = () => {
    navigate(`/assistant?q=${encodeURIComponent(`Explain the purpose and architecture of ${fileInfo.file_path}`)}`);
  };

  const handleImpact = (symbolName?: string) => {
    navigate(`/impact?target=${encodeURIComponent(symbolName || fileInfo.file_path)}`);
  };

  const handleGenerateTests = (symbolName?: string) => {
    navigate(`/tests?file=${encodeURIComponent(fileInfo.file_path)}&symbol=${encodeURIComponent(symbolName || 'default')}`);
  };

  return (
    <div className="h-full w-full overflow-y-auto p-4 space-y-5 text-xs font-sans transition-colors bg-theme-surface">
      {/* File Overview */}
      <div className="space-y-2 pb-3 border-b border-theme-border">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-theme-accent/10 text-theme-accent border border-theme-accent/20">
            {fileInfo.layer} Layer
          </span>
          <span className="text-[11px] text-theme-muted font-mono">{fileInfo.language}</span>
        </div>
        <h4 className="text-theme-primary font-medium break-all text-xs font-mono">
          {fileInfo.file_path.split('/').pop()}
        </h4>
        <p className="text-[11px] text-theme-muted font-mono break-all">
          {fileInfo.file_path}
        </p>
      </div>

      {/* AI Quick Actions */}
      <div className="space-y-2">
        <div className="text-[11px] uppercase font-semibold text-theme-muted tracking-[0.06em] flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-theme-accent" />
          <span>AI Intelligence Actions</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={handleExplainAI}
            className="flex items-center gap-1.5 p-2 rounded-[10px] bg-theme-surface hover:bg-theme-subtle border border-theme-border text-theme-primary text-[11px] text-left transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-theme-accent shrink-0" />
            <span className="truncate">Explain File</span>
          </button>

          <button
            onClick={() => handleImpact()}
            className="flex items-center gap-1.5 p-2 rounded-[10px] bg-theme-surface hover:bg-theme-subtle border border-theme-border text-theme-primary text-[11px] text-left transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-theme-warning shrink-0" />
            <span className="truncate">Impact Analysis</span>
          </button>

          <button
            onClick={() => handleGenerateTests()}
            className="flex items-center gap-1.5 p-2 rounded-[10px] bg-theme-surface hover:bg-theme-subtle border border-theme-border text-theme-primary text-[11px] text-left transition-colors"
          >
            <TestTube2 className="w-3.5 h-3.5 text-theme-success shrink-0" />
            <span className="truncate">Generate Tests</span>
          </button>

          <button
            onClick={() => navigate(`/bugs?query=${encodeURIComponent(fileInfo.file_path)}`)}
            className="flex items-center gap-1.5 p-2 rounded-[10px] bg-theme-surface hover:bg-theme-subtle border border-theme-border text-theme-primary text-[11px] text-left transition-colors"
          >
            <Bug className="w-3.5 h-3.5 text-theme-danger shrink-0" />
            <span className="truncate">Find Bugs</span>
          </button>
        </div>
      </div>

      {/* AST Functions & Methods */}
      <div className="space-y-2">
        <div className="text-[11px] uppercase font-semibold text-theme-muted tracking-[0.06em] flex items-center justify-between">
          <span>AST Functions & Methods</span>
          <span className="text-theme-muted font-mono">{fileInfo.symbols.length}</span>
        </div>
        <div className="space-y-1">
          {fileInfo.symbols.map((sym) => (
            <div
              key={sym.name}
              className="p-2.5 rounded-[10px] bg-theme-surface border border-theme-border hover:border-theme-border transition-colors flex items-center justify-between gap-2 shadow-xs"
            >
              <div
                onClick={() => onJumpToLine(sym.line_start)}
                className="cursor-pointer truncate flex-1"
                title={`Jump to line ${sym.line_start}`}
              >
                <div className="flex items-center gap-1.5 text-theme-primary font-medium truncate font-mono text-xs">
                  <Code2 className="w-3 h-3 text-theme-accent shrink-0" />
                  <span className="truncate">{sym.name}()</span>
                </div>
                <div className="text-[10px] text-theme-muted font-mono flex items-center gap-2 mt-0.5">
                  <span>Lines {sym.line_start}–{sym.line_end}</span>
                  <span>•</span>
                  <span className={sym.cyclomatic_complexity > 4 ? 'text-theme-warning font-semibold' : 'text-theme-muted'}>
                    Complexity: {sym.cyclomatic_complexity}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleImpact(sym.name)}
                title="Analyze impact of modifying this function"
                className="p-1 rounded text-theme-muted hover:text-theme-primary hover:bg-theme-subtle"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ))}
          {fileInfo.symbols.length === 0 && (
            <p className="text-theme-muted text-[11px]">No top-level functions defined.</p>
          )}
        </div>
      </div>

      {/* Dependencies */}
      <div className="space-y-2">
        <div className="text-[11px] uppercase font-semibold text-theme-muted tracking-[0.06em]">
          Module Dependencies ({fileInfo.dependencies.length})
        </div>
        <div className="space-y-1">
          {fileInfo.dependencies.map((dep) => (
            <div
              key={dep}
              className="px-2.5 py-1.5 rounded-[8px] bg-theme-surface border border-theme-border text-[11px] text-theme-primary font-mono truncate"
            >
              {dep}
            </div>
          ))}
          {fileInfo.dependencies.length === 0 && (
            <p className="text-theme-muted text-[11px]">Self-contained module.</p>
          )}
        </div>
      </div>
    </div>
  );
};
