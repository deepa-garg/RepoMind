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
} from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  async analyzeRepository(payload: {
    repo_url?: string;
    branch?: string;
    is_demo?: boolean;
  }): Promise<RepositorySummary> {
    const res = await fetch(`${API_BASE}/repositories/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Analysis failed');
    return res.json();
  },

  async getRepository(repoId: string): Promise<RepositorySummary> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}`);
    if (!res.ok) throw new Error('Failed to fetch repository');
    return res.json();
  },

  async getProgress(repoId: string): Promise<AnalysisProgress> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}/progress`);
    if (!res.ok) throw new Error('Failed to fetch progress');
    return res.json();
  },

  async getGraph(repoId: string): Promise<DependencyGraphData> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}/graph`);
    if (!res.ok) throw new Error('Failed to fetch dependency graph');
    return res.json();
  },

  async getFiles(repoId: string): Promise<{ tree: any; files: string[] }> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}/files`);
    if (!res.ok) throw new Error('Failed to fetch files');
    return res.json();
  },

  async getFileContent(repoId: string, path: string): Promise<FileContentResponse> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}/file-content?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`Failed to load file content for ${path}`);
    return res.json();
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
    if (!res.ok) throw new Error('Search failed');
    return res.json();
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
    if (!res.ok) throw new Error('Chat failed');
    return res.json();
  },

  async clearChat(sessionId: string = 'default'): Promise<void> {
    await fetch(`${API_BASE}/chat/clear?session_id=${sessionId}`, { method: 'POST' });
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
    if (!res.ok) throw new Error('Bug investigation failed');
    return res.json();
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
    if (!res.ok) throw new Error('Impact analysis failed');
    return res.json();
  },

  async getSecurityAudit(repoId: string): Promise<SecurityAuditResult> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}/security`);
    if (!res.ok) throw new Error('Failed to fetch security audit');
    return res.json();
  },

  async getCodebaseHealth(repoId: string): Promise<HealthScoreBreakdown> {
    const res = await fetch(`${API_BASE}/repositories/${repoId}/health`);
    if (!res.ok) throw new Error('Failed to fetch codebase health');
    return res.json();
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
    if (!res.ok) throw new Error('Test generation failed');
    return res.json();
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
    if (!res.ok) throw new Error('Doc generation failed');
    return res.json();
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
    if (!res.ok) throw new Error('Code suggestion failed');
    return res.json();
  },
};
