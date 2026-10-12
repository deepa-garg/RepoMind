import React, { useState, useEffect } from 'react';
import { useRepository } from '../hooks/useRepository';
import { api } from '../services/api';
import { FileTree } from '../components/explorer/FileTree';
import { MonacoCodeEditor } from '../components/editor/MonacoCodeEditor';
import { AstContextPanel } from '../components/explorer/AstContextPanel';
import { FileContentResponse } from '../types';
import { Sparkles, PanelLeftClose, PanelRightClose } from 'lucide-react';

export const ExplorerPage: React.FC = () => {
  const { repository, selectedFile, selectedLine, setSelectedFile, setSelectedLine } = useRepository();
  const [fileData, setFileData] = useState<FileContentResponse | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  useEffect(() => {
    const fetchFile = async () => {
      if (!repository || !selectedFile) return;
      try {
        setLoadingFile(true);
        const data = await api.getFileContent(repository.id, selectedFile);
        setFileData(data);
      } catch (err) {
        console.error('Failed to load file content:', err);
      } finally {
        setLoadingFile(false);
      }
    };

    fetchFile();
  }, [repository, selectedFile]);

  const handleSelectFile = (path: string) => {
    setSelectedFile(path);
    setSelectedLine(null);
  };

  const handleJumpToLine = (line: number) => {
    setSelectedLine(line);
  };

  return (
    <div className="h-full w-full flex overflow-hidden bg-theme-bg font-sans transition-colors">
      {/* Left Panel: File Tree Explorer */}
      {leftOpen && (
        <div className="w-64 h-full bg-theme-subtle border-r border-theme-border flex flex-col shrink-0">
          <div className="h-10 px-4 border-b border-theme-border flex items-center justify-between text-xs font-sans text-theme-muted">
            <span className="font-semibold uppercase tracking-[0.06em] text-[11px]">Files</span>
            <button
              onClick={() => setLeftOpen(false)}
              className="text-theme-muted hover:text-theme-primary p-1 rounded-[6px] hover:bg-theme-hover transition-colors"
              title="Collapse Tree"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <FileTree
              tree={repository?.tree}
              selectedFile={selectedFile}
              onSelectFile={handleSelectFile}
            />
          </div>
        </div>
      )}

      {/* Center Panel: Monaco Code Editor */}
      <div className="flex-1 h-full flex flex-col min-w-0 bg-theme-bg">
        {loadingFile ? (
          <div className="h-full flex items-center justify-center p-6 text-xs text-theme-muted">
            <Sparkles className="w-4 h-4 text-theme-accent animate-spin mr-2" />
            <span>Parsing file AST and syntax tokens...</span>
          </div>
        ) : fileData ? (
          <div className="h-full w-full p-2.5">
            <MonacoCodeEditor
              code={fileData.content}
              filePath={fileData.file_path}
              language={fileData.language}
              targetLine={selectedLine}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-6 text-xs text-theme-muted">
            Select a file from the repository tree to view code
          </div>
        )}
      </div>

      {/* Right Panel: AST Context & AI Actions */}
      {rightOpen && (
        <div className="w-80 h-full bg-theme-surface border-l border-theme-border flex flex-col shrink-0">
          <div className="h-10 px-4 border-b border-theme-border flex items-center justify-between text-xs font-sans text-theme-muted">
            <span className="font-semibold uppercase tracking-[0.06em] text-[11px]">AST Symbol Context</span>
            <button
              onClick={() => setRightOpen(false)}
              className="text-theme-muted hover:text-theme-primary p-1 rounded-[6px] hover:bg-theme-hover transition-colors"
              title="Collapse Panel"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <AstContextPanel fileInfo={fileData} onJumpToLine={handleJumpToLine} />
          </div>
        </div>
      )}
    </div>
  );
};
