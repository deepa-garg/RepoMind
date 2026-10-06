import React, { useState } from 'react';
import { Folder, FolderOpen, FileCode, ChevronRight, ChevronDown } from 'lucide-react';

interface Props {
  tree: any;
  selectedFile: string;
  onSelectFile: (filePath: string) => void;
}

const TreeNode: React.FC<{
  node: any;
  selectedFile: string;
  onSelectFile: (filePath: string) => void;
  level?: number;
}> = ({ node, selectedFile, onSelectFile, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!node) return null;

  const isDirectory = node.type === 'directory';
  const isSelected = !isDirectory && node.path === selectedFile;

  return (
    <div>
      <div
        onClick={() => {
          if (isDirectory) {
            setIsOpen(!isOpen);
          } else {
            onSelectFile(node.path);
          }
        }}
        style={{ paddingLeft: `${Math.max(8, level * 14)}px` }}
        className={`flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer text-xs font-mono select-none transition-colors ${
          isSelected
            ? 'bg-brand-500/15 text-brand-300 font-semibold'
            : 'text-dark-300 hover:text-white hover:bg-dark-850'
        }`}
      >
        {isDirectory ? (
          <>
            {isOpen ? (
              <ChevronDown className="w-3 h-3 text-dark-500 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-dark-500 shrink-0" />
            )}
            {isOpen ? (
              <FolderOpen className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-dark-400 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            <FileCode
              className={`w-3.5 h-3.5 shrink-0 ${
                node.name.endsWith('.test.ts') || node.name.endsWith('.spec.ts')
                  ? 'text-rose-400'
                  : 'text-dark-400'
              }`}
            />
            <span className="truncate">{node.name}</span>
          </>
        )}
      </div>

      {isDirectory && isOpen && node.children && (
        <div className="space-y-0.5">
          {node.children.map((child: any) => (
            <TreeNode
              key={child.path || child.name}
              node={child}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<Props> = ({ tree, selectedFile, onSelectFile }) => {
  return (
    <div className="h-full w-full overflow-y-auto p-2 space-y-0.5">
      <div className="px-2 py-1 text-[10px] font-mono font-semibold uppercase text-dark-500 tracking-wider">
        Repository Files
      </div>
      {tree?.children?.map((child: any) => (
        <TreeNode
          key={child.path || child.name}
          node={child}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          level={0}
        />
      ))}
    </div>
  );
};
