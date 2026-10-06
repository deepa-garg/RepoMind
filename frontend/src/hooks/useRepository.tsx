import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RepositorySummary, AnalysisProgress } from '../types';
import { api } from '../services/api';

interface RepositoryContextType {
  repository: RepositorySummary | null;
  loading: boolean;
  analyzing: boolean;
  progress: AnalysisProgress | null;
  selectedFile: string;
  selectedLine: number | null;
  setSelectedFile: (file: string) => void;
  setSelectedLine: (line: number | null) => void;
  analyzeRepo: (repoUrl?: string, branch?: string, isDemo?: boolean) => Promise<void>;
  refreshRepo: () => Promise<void>;
  jumpToFileLine: (filePath: string, line: number) => void;
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);

export const RepositoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [repository, setRepository] = useState<RepositorySummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('src/auth/AuthService.ts');
  const [selectedLine, setSelectedLine] = useState<number | null>(18);

  const loadInitialRepo = async () => {
    try {
      setLoading(true);
      const data = await api.getRepository('demo-ecommerce');
      setRepository(data);
    } catch (err) {
      // In case server is starting up, retry once
      try {
        const demo = await api.analyzeRepository({ is_demo: true });
        setRepository(demo);
      } catch (e) {
        console.error('Failed to load demo repository', e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialRepo();
  }, []);

  const analyzeRepo = async (repoUrl?: string, branch: string = 'main', isDemo: boolean = false) => {
    try {
      setAnalyzing(true);
      setProgress({
        stage: 'Fetching repository',
        progress_pct: 15,
        message: 'Cloning repository metadata...',
        is_complete: false,
      });

      // Simulated progressive stages for responsive developer feedback
      setTimeout(() => setProgress({ stage: 'Scanning files', progress_pct: 35, message: 'Filtering source modules and test assets...', is_complete: false }), 400);
      setTimeout(() => setProgress({ stage: 'Parsing AST', progress_pct: 55, message: 'Extracting functions, classes, and calls with Tree-sitter...', is_complete: false }), 800);
      setTimeout(() => setProgress({ stage: 'Building dependency graph', progress_pct: 75, message: 'Constructing NetworkX architectural graph...', is_complete: false }), 1200);
      setTimeout(() => setProgress({ stage: 'Indexing repository', progress_pct: 90, message: 'Upserting vectors into Qdrant collection...', is_complete: false }), 1600);

      const res = await api.analyzeRepository({
        repo_url: repoUrl,
        branch,
        is_demo: isDemo,
      });

      setProgress({
        stage: 'Analysis complete',
        progress_pct: 100,
        message: 'Structural code analysis complete',
        is_complete: true,
        repository_id: res.id,
      });

      setRepository(res);
      setSelectedFile(Object.keys(res.tree).length > 0 ? 'src/auth/AuthService.ts' : 'src/auth/AuthService.ts');
    } catch (err) {
      console.error('Repository analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const refreshRepo = async () => {
    if (repository) {
      const data = await api.getRepository(repository.id);
      setRepository(data);
    }
  };

  const jumpToFileLine = (filePath: string, line: number) => {
    setSelectedFile(filePath);
    setSelectedLine(line);
  };

  return (
    <RepositoryContext.Provider
      value={{
        repository,
        loading,
        analyzing,
        progress,
        selectedFile,
        selectedLine,
        setSelectedFile,
        setSelectedLine,
        analyzeRepo,
        refreshRepo,
        jumpToFileLine,
      }}
    >
      {children}
    </RepositoryContext.Provider>
  );
};

export const useRepository = () => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return context;
};
