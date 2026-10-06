import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Copy, Check, FileCode } from 'lucide-react';

interface Props {
  code: string;
  language?: string;
  filePath: string;
  targetLine?: number | null;
  readOnly?: boolean;
}

export const MonacoCodeEditor: React.FC<Props> = ({
  code,
  language = 'typescript',
  filePath,
  targetLine,
  readOnly = true,
}) => {
  const editorRef = useRef<any>(null);
  const [copied, setCopied] = React.useState(false);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    if (targetLine) {
      editor.revealLineInCenter(targetLine);
      editor.setPosition({ lineNumber: targetLine, column: 1 });
    }
  };

  useEffect(() => {
    if (editorRef.current && targetLine) {
      editorRef.current.revealLineInCenter(targetLine);
      editorRef.current.setPosition({ lineNumber: targetLine, column: 1 });
    }
  }, [targetLine, filePath]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Map file extension to monaco language
  const detectLang = () => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (ext === 'ts' || ext === 'tsx') return 'typescript';
    if (ext === 'js' || ext === 'jsx') return 'javascript';
    if (ext === 'py') return 'python';
    if (ext === 'sql') return 'sql';
    if (ext === 'json') return 'json';
    if (ext === 'md') return 'markdown';
    return language || 'typescript';
  };

  return (
    <div className="h-full w-full flex flex-col bg-dark-950 border border-dark-800 rounded-lg overflow-hidden">
      {/* Editor Top Bar */}
      <div className="h-9 px-4 bg-dark-900 border-b border-dark-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-dark-300">
          <FileCode className="w-3.5 h-3.5 text-brand-400" />
          <span>{filePath}</span>
          {targetLine && (
            <span className="px-1.5 py-0.5 rounded bg-brand-500/10 border border-brand-500/20 text-[10px] text-brand-400">
              Line {targetLine}
            </span>
          )}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-dark-800 hover:bg-dark-750 text-dark-300 hover:text-white transition-colors text-[11px]"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Monaco Container */}
      <div className="flex-1 w-full min-h-0">
        <Editor
          height="100%"
          language={detectLang()}
          theme="vs-dark"
          value={code}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "'JetBrains Mono', Consolas, monospace",
            minimap: { enabled: true, maxColumn: 80 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
          }}
        />
      </div>
    </div>
  );
};
