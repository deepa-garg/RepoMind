import {
  RepositorySummary,
  AnalysisProgress,
  DependencyGraphData,
  SearchResult,
  ChatResponse,
  BugAnalysisResult,
  ImpactAnalysisResult,
  SecurityAuditResult,
  HealthScoreBreakdown,
  FileContentResponse,
  HealthCheckResponse,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '/api';

export class ApiError extends Error {
  statusCode: number;
  errorCode?: string;

  constructor(message: string, statusCode: number, errorCode?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

async function handleResponse<T>(res: Response, fallbackError: string): Promise<T> {
  if (!res.ok) {
    let errorDetail = fallbackError;
    let errorCode: string | undefined = undefined;
    try {
      const data = await res.json();
      if (data?.detail) {
        if (typeof data.detail === 'object') {
          errorDetail = data.detail.message || fallbackError;
          errorCode = data.detail.error_code;
        } else if (typeof data.detail === 'string') {
          errorDetail = data.detail;
        }
      }
    } catch {
      // Use fallback
    }
    throw new ApiError(errorDetail, res.status, errorCode);
  }
  return res.json();
}

export const api = {
  async getHealth(): Promise<HealthCheckResponse> {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res, 'Health check failed');
  },

  async listRepositories(): Promise<RepositorySummary[]> {
    const res = await fetch(`${API_BASE}/repositories`);
    return handleResponse(res, 'Failed to fetch repositories list');
  },

  async resolveRepoId(url: string, branch: string = 'main'): Promise<{ repository_id: string }> {
    const res = await fetch(`${API_BASE}/repositories/resolve-id?url=${encodeURIComponent(url)}&branch=${encodeURIComponent(branch)}`);
    return handleResponse(res, 'Failed to resolve repository ID');
  },

  async analyzeRepository(payload: {
    repo_url?: string;
    branch?: string;
    is_demo?: boolean;
    force_reindex?: boolean;
  }): Promise<RepositorySummary> {
    const res = await fetch(`${API_BASE}/repositories/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res, 'Repository analysis failed');
  },

  async uploadZipRepository(file: File): Promise<RepositorySummary> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/repositories/upload-zip`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res, 'ZIP archive upload and analysis failed');
  },

  async getRepository(repoId: string): Promise<RepositorySummary> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}`);
    return handleResponse(res, 'Failed to fetch repository');
  },

  async deleteRepository(repoId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}`, {
      method: 'DELETE',
    });
    return handleResponse(res, 'Failed to delete repository');
  },

  async reindexRepository(repoId: string): Promise<RepositorySummary> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}/reindex`, {
      method: 'POST',
    });
    return handleResponse(res, 'Failed to reindex repository');
  },

  async getProgress(repoId: string): Promise<AnalysisProgress> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}/progress`);
    return handleResponse(res, 'Failed to fetch progress');
  },

  async getGraph(repoId: string): Promise<DependencyGraphData> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}/graph`);
    return handleResponse(res, 'Failed to fetch dependency graph');
  },

  async getFiles(repoId: string): Promise<{ tree: any; files: string[] }> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}/files`);
    return handleResponse(res, 'Failed to fetch files');
  },

  async getFileContent(repoId: string, path: string): Promise<FileContentResponse> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}/file-content?path=${encodeURIComponent(path)}`);
    return handleResponse(res, `Failed to load file content for ${path}`);
  },

  async searchCode(payload: {
    query: string;
    repository_id: string;
    kind_filter?: string;
    layer_filter?: string;
    limit?: number;
  }): Promise<{ results: SearchResult[]; total: number }> {
    const res = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res, 'Search failed');
  },

  async chat(payload: {
    message: string;
    repository_id: string;
    session_id?: string;
  }): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res, 'Chat reasoning failed');
  },

  async clearChat(sessionId: string = 'default', repositoryId?: string): Promise<void> {
    const url = repositoryId
      ? `${API_BASE}/chat/clear?session_id=${sessionId}&repository_id=${repositoryId}`
      : `${API_BASE}/chat/clear?session_id=${sessionId}`;
    await fetch(url, { method: 'POST' });
  },

  async investigateBug(payload: {
    description: string;
    repository_id: string;
  }): Promise<BugAnalysisResult> {
    const res = await fetch(`${API_BASE}/bug-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res, 'Bug investigation failed');
  },

  async analyzeImpact(payload: {
    repository_id: string;
    target_symbol?: string;
    target_file?: string;
  }): Promise<ImpactAnalysisResult> {
    const res = await fetch(`${API_BASE}/impact-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res, 'Impact analysis failed');
  },

  async getSecurityAudit(repoId: string): Promise<SecurityAuditResult> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}/security`);
    return handleResponse(res, 'Failed to fetch security audit');
  },

  async getCodebaseHealth(repoId: string): Promise<HealthScoreBreakdown> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}/health`);
    return handleResponse(res, 'Failed to fetch codebase health');
  },

  async generateTests(payload: {
    repository_id: string;
    file_path: string;
    symbol_name: string;
    framework?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/generate-tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res, 'Test generation failed');
  },

  async generateDocs(payload: {
    repository_id: string;
    file_path: string;
    symbol_name?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/generate-documentation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res, 'Doc generation failed');
  },

  async suggestCode(payload: {
    repository_id: string;
    file_path: string;
    symbol_name: string;
    prompt_type: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/code-suggestion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res, 'Code suggestion failed');
  },
};
