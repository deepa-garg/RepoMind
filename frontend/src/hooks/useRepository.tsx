import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RepositorySummary, AnalysisProgress } from '../types';
import { api } from '../services/api';

function findFirstFileInTree(node: any): string | null {
  if (!node) return null;
  if (node.type === 'file' && node.path) return node.path;
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findFirstFileInTree(child);
      if (found) return found;
    }
  }
  return null;
}

interface RepositoryContextType {
  repository: RepositorySummary | null;
  repositories: RepositorySummary[];
  loading: boolean;
  analyzing: boolean;
  progress: AnalysisProgress | null;
  error: string | null;
  selectedFile: string;
  selectedLine: number | null;
  setSelectedFile: (file: string) => void;
  setSelectedLine: (line: number | null) => void;
  clearError: () => void;
  fetchRepositories: () => Promise<RepositorySummary[]>;
  switchRepository: (repoId: string) => Promise<void>;
  retryIndexing: (repoId: string) => Promise<void>;
  analyzeRepo: (repoUrl?: string, branch?: string, isDemo?: boolean, forceReindex?: boolean) => Promise<void>;
  uploadZip: (file: File) => Promise<void>;
  deleteRepo: (repoId: string) => Promise<void>;
  refreshRepo: () => Promise<void>;
  jumpToFileLine: (filePath: string, line: number) => void;
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);

export const RepositoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [repository, setRepository] = useState<RepositorySummary | null>(null);
  const [repositories, setRepositories] = useState<RepositorySummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('src/auth/AuthService.ts');
  const [selectedLine, setSelectedLine] = useState<number | null>(18);

  const fetchRepositories = async () => {
    try {
      const list = await api.listRepositories();
      setRepositories(list);
      return list;
    } catch (e) {
      console.error('Failed to list repositories:', e);
      return [];
    }
  };

  const loadInitialRepo = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await fetchRepositories();
      
      // Determine which repository to load: saved preference or first available
      const savedRepoId = localStorage.getItem('repomind_active_repo');
      const targetRepo = list.find((r) => r.id === savedRepoId) || list[0];

      if (targetRepo) {
        const fullRepo = await api.getRepository(targetRepo.id);
        setRepository(fullRepo);
        const firstFile = findFirstFileInTree(fullRepo.tree) || 'src/auth/AuthService.ts';
        setSelectedFile(firstFile);
      } else {
        const data = await api.getRepository('demo-ecommerce');
        setRepository(data);
        const firstFile = findFirstFileInTree(data.tree) || 'src/auth/AuthService.ts';
        setSelectedFile(firstFile);
      }
    } catch (err: any) {
      try {
        const demo = await api.analyzeRepository({ is_demo: true });
        setRepository(demo);
        const firstFile = findFirstFileInTree(demo.tree) || 'src/auth/AuthService.ts';
        setSelectedFile(firstFile);
        await fetchRepositories();
      } catch (e: any) {
        setError(e.message || 'Failed to initialize repository');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialRepo();
  }, []);

  const switchRepository = async (repoId: string) => {
    if (repository?.id === repoId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getRepository(repoId);
      setRepository(data);
      localStorage.setItem('repomind_active_repo', repoId);
      const firstFile = findFirstFileInTree(data.tree) || '';
      setSelectedFile(firstFile);
      setSelectedLine(1);
    } catch (err: any) {
      setError(err?.message || `Failed to switch to repository '${repoId}'`);
    } finally {
      setLoading(false);
    }
  };

  const retryIndexing = async (repoId: string) => {
    try {
      setAnalyzing(true);
      setError(null);
      setProgress({
        stage: 'Indexing',
        progress_pct: 10,
        message: 'Re-indexing repository from source...',
        is_complete: false,
        repository_id: repoId,
      });
      const res = await api.reindexRepository(repoId);
      setRepository(res);
      await fetchRepositories();
      setProgress({
        stage: 'Ready',
        progress_pct: 100,
        message: 'Repository re-indexed and ready',
        is_complete: true,
        repository_id: res.id,
      });
    } catch (err: any) {
      setError(err?.message || 'Re-indexing failed');
      throw err;
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeRepo = async (
    repoUrl?: string,
    branch: string = 'main',
    isDemo: boolean = false,
    forceReindex: boolean = false
  ) => {
    let pollInterval: any = null;
    try {
      setAnalyzing(true);
      setError(null);
      setProgress({
        stage: 'Connecting',
        progress_pct: 10,
        message: 'Resolving repository target...',
        is_complete: false,
      });

      // Pre-resolve target repository ID to enable live progress polling
      let targetRepoId = isDemo ? 'demo-ecommerce' : '';
      if (!isDemo && repoUrl) {
        try {
          const resId = await api.resolveRepoId(repoUrl, branch);
          targetRepoId = resId.repository_id;
        } catch {
          // If pre-resolution fails, continue to analyzeRepository which validates strictly
        }
      }

      // Start live progress polling if targetRepoId is known
      if (targetRepoId) {
        pollInterval = setInterval(async () => {
          try {
            const p = await api.getProgress(targetRepoId);
            if (p) {
              setProgress(p);
            }
          } catch {
            // Suppress background poll errors
          }
        }, 700);
      }

      const res = await api.analyzeRepository({
        repo_url: repoUrl,
        branch,
        is_demo: isDemo,
        force_reindex: forceReindex,
      });

      if (pollInterval) clearInterval(pollInterval);

      setProgress({
        stage: 'Ready',
        progress_pct: 100,
        message: 'Repository indexed and ready',
        is_complete: true,
        repository_id: res.id,
      });

      setRepository(res);
      localStorage.setItem('repomind_active_repo', res.id);
      const firstFile = findFirstFileInTree(res.tree) || 'src/auth/AuthService.ts';
      setSelectedFile(firstFile);
      setSelectedLine(1);
      await fetchRepositories();
    } catch (err: any) {
      if (pollInterval) clearInterval(pollInterval);
      const errMsg = err?.message || 'Repository analysis failed';
      setError(errMsg);
      setProgress({
        stage: 'Failed',
        progress_pct: 0,
        message: errMsg,
        is_complete: false,
        error_code: err?.errorCode || 'ANALYSIS_FAILED',
        error_detail: errMsg,
      });
      throw err;
    } finally {
      if (pollInterval) clearInterval(pollInterval);
      setAnalyzing(false);
    }
  };

  const uploadZip = async (file: File) => {
    try {
      setAnalyzing(true);
      setError(null);
      setProgress({
        stage: 'Scanning files',
        progress_pct: 30,
        message: 'Extracting and verifying archive contents...',
        is_complete: false,
      });

      const res = await api.uploadZipRepository(file);

      setProgress({
        stage: 'Ready',
        progress_pct: 100,
        message: 'Archive indexed and ready',
        is_complete: true,
        repository_id: res.id,
      });

      setRepository(res);
      const firstFile = findFirstFileInTree(res.tree) || 'src/auth/AuthService.ts';
      setSelectedFile(firstFile);
      setSelectedLine(1);
    } catch (err: any) {
      const errMsg = err?.message || 'ZIP upload failed';
      setError(errMsg);
      setProgress({
        stage: 'Failed',
        progress_pct: 0,
        message: errMsg,
        is_complete: false,
        error_code: 'ZIP_UPLOAD_FAILED',
        error_detail: errMsg,
      });
      throw err;
    } finally {
      setAnalyzing(false);
    }
  };

  const deleteRepo = async (repoId: string) => {
    try {
      await api.deleteRepository(repoId);
      // If active repository was deleted, reset to demo
      if (repository?.id === repoId) {
        await loadInitialRepo();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete repository');
      throw err;
    }
  };

  const refreshRepo = async () => {
    if (repository) {
      try {
        const data = await api.getRepository(repository.id);
        setRepository(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to refresh repository');
      }
    }
  };

  const jumpToFileLine = (filePath: string, line: number) => {
    setSelectedFile(filePath);
    setSelectedLine(line);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <RepositoryContext.Provider
      value={{
        repository,
        repositories,
        loading,
        analyzing,
        progress,
        error,
        selectedFile,
        selectedLine,
        setSelectedFile,
        setSelectedLine,
        clearError,
        fetchRepositories,
        switchRepository,
        retryIndexing,
        analyzeRepo,
        uploadZip,
        deleteRepo,
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
