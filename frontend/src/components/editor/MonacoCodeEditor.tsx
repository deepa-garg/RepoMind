import React, { useRef, useEffect, useState } from 'react';
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
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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
    <div className="h-full w-full flex flex-col bg-theme-surface border border-theme-border rounded-card overflow-hidden shadow-card">
      {/* Editor Top Bar */}
      <div className="h-10 px-4 bg-theme-surface border-b border-theme-border flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-theme-primary">
          <FileCode className="w-3.5 h-3.5 text-theme-accent" />
          <span className="font-medium">{filePath}</span>
          {targetLine && (
            <span className="px-2 py-0.5 rounded-full bg-theme-accent/10 border border-theme-accent/20 text-[10px] text-theme-accent font-medium">
              Line {targetLine}
            </span>
          )}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1 rounded-[10px] bg-theme-surface hover:bg-theme-subtle border border-theme-border text-theme-primary transition-colors text-xs font-sans"
        >
          {copied ? <Check className="w-3 h-3 text-theme-success" /> : <Copy className="w-3 h-3 text-theme-muted" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Monaco Container */}
      <div className="flex-1 w-full min-h-0 bg-theme-surface">
        <Editor
          height="100%"
          language={detectLang()}
          theme={isDark ? 'vs-dark' : 'light'}
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
