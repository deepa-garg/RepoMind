import React from 'react';
import {
  FileCode,
  Zap,
  TestTube2,
  Bug,
  HelpCircle,
  Code2,
  Sparkles,
  ArrowRight,
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
      <div className="h-full flex items-center justify-center p-6 text-center text-xs text-dark-500">
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
    <div className="h-full w-full overflow-y-auto p-4 space-y-5 text-xs font-mono">
      {/* File Overview */}
      <div className="space-y-2 pb-3 border-b border-dark-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-brand-500/15 text-brand-400 border border-brand-500/20">
            {fileInfo.layer} Layer
          </span>
          <span className="text-[11px] text-dark-400 font-mono">{fileInfo.language}</span>
        </div>
        <h4 className="text-white font-semibold break-all text-xs">
          {fileInfo.file_path.split('/').pop()}
        </h4>
        <p className="text-[11px] text-dark-400 font-sans break-all">
          {fileInfo.file_path}
        </p>
      </div>

      {/* AI Quick Actions */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase font-semibold text-dark-400 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-brand-400" />
          <span>AI Intelligence Actions</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={handleExplainAI}
            className="flex items-center gap-1.5 p-2 rounded bg-dark-850 hover:bg-dark-800 border border-dark-750 text-dark-200 text-[11px] text-left transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            <span className="truncate">Explain File</span>
          </button>

          <button
            onClick={() => handleImpact()}
            className="flex items-center gap-1.5 p-2 rounded bg-dark-850 hover:bg-dark-800 border border-dark-750 text-dark-200 text-[11px] text-left transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Impact Analysis</span>
          </button>

          <button
            onClick={() => handleGenerateTests()}
            className="flex items-center gap-1.5 p-2 rounded bg-dark-850 hover:bg-dark-800 border border-dark-750 text-dark-200 text-[11px] text-left transition-colors"
          >
            <TestTube2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Generate Tests</span>
          </button>

          <button
            onClick={() => navigate(`/bugs?query=${encodeURIComponent(fileInfo.file_path)}`)}
            className="flex items-center gap-1.5 p-2 rounded bg-dark-850 hover:bg-dark-800 border border-dark-750 text-dark-200 text-[11px] text-left transition-colors"
          >
            <Bug className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">Find Bugs</span>
          </button>
        </div>
      </div>

      {/* AST Functions & Methods */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase font-semibold text-dark-400 flex items-center justify-between">
          <span>AST Functions & Methods</span>
          <span className="text-dark-500">{fileInfo.symbols.length}</span>
        </div>
        <div className="space-y-1">
          {fileInfo.symbols.map((sym) => (
            <div
              key={sym.name}
              className="p-2 rounded bg-dark-850 border border-dark-750/70 hover:border-dark-600 transition-colors flex items-center justify-between gap-2"
            >
              <div
                onClick={() => onJumpToLine(sym.line_start)}
                className="cursor-pointer truncate flex-1"
                title={`Jump to line ${sym.line_start}`}
              >
                <div className="flex items-center gap-1.5 text-white font-medium truncate">
                  <Code2 className="w-3 h-3 text-brand-400 shrink-0" />
                  <span className="truncate">{sym.name}()</span>
                </div>
                <div className="text-[10px] text-dark-400 flex items-center gap-2 mt-0.5">
                  <span>Lines {sym.line_start}–{sym.line_end}</span>
                  <span className="text-dark-600">•</span>
                  <span className={sym.cyclomatic_complexity > 4 ? 'text-amber-400' : 'text-dark-400'}>
                    Complexity: {sym.cyclomatic_complexity}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleImpact(sym.name)}
                title="Analyze impact of modifying this function"
                className="p-1 rounded text-dark-400 hover:text-white hover:bg-dark-750"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ))}
          {fileInfo.symbols.length === 0 && (
            <p className="text-dark-500 text-[11px] italic">No top-level functions defined.</p>
          )}
        </div>
      </div>

      {/* Dependencies */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase font-semibold text-dark-400">
          Module Dependencies ({fileInfo.dependencies.length})
        </div>
        <div className="space-y-1">
          {fileInfo.dependencies.map((dep) => (
            <div
              key={dep}
              className="px-2 py-1.5 rounded bg-dark-900 border border-dark-800 text-[11px] text-dark-300 truncate"
            >
              {dep}
            </div>
          ))}
          {fileInfo.dependencies.length === 0 && (
            <p className="text-dark-500 text-[11px] italic">Self-contained module.</p>
          )}
        </div>
      </div>
    </div>
  );
};
