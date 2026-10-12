export interface ASTSymbol {
  name: string;
  kind: 'function' | 'method' | 'class' | 'interface' | 'endpoint' | 'variable' | string;
  file_path: string;
  line_start: number;
  line_end: number;
  docstring?: string;
  parameters: string[];
  return_type?: string;
  calls: string[];
  cyclomatic_complexity: number;
}

export interface FileNodeInfo {
  path: string;
  name: string;
  extension: string;
  size_bytes: number;
  line_count: number;
  layer: 'presentation' | 'service' | 'repository' | 'model' | 'database' | 'test' | 'config' | 'utility';
  functions: string[];
  classes: string[];
  imports: string[];
  exports: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  kind: string;
  file_path: string;
  layer: string;
  line?: number;
  metrics: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  label?: string;
}

export interface DependencyGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layers: string[];
  stats: {
    total_nodes: number;
    total_edges: number;
    density: number;
    is_dag: boolean;
  };
}

export interface HealthScoreBreakdown {
  overall: number;
  maintainability: number;
  documentation: number;
  complexity: number;
  security: number;
  testability: number;
  architecture: number;
  explanations: Record<string, string>;
  metrics_detail: {
    total_files: number;
    test_files: number;
    total_symbols: number;
    average_complexity: number;
    high_complexity_functions: number;
  };
}

export interface RepositorySummary {
  id: string;
  name: string;
  owner: string;
  branch: string;
  commit_sha?: string;
  repo_url?: string | null;
  description: string;
  languages: Record<string, number>;
  file_count: number;
  function_count: number;
  class_count: number;
  dependency_count: number;
  test_file_count: number;
  doc_percentage: number;
  codebase_health: HealthScoreBreakdown;
  is_demo: boolean;
  indexing_status?: string;
  error_message?: string | null;
  analysis_time: string;
  tree: Record<string, any>;
}

export interface AnalysisProgress {
  stage: string;
  progress_pct: number;
  message: string;
  is_complete: boolean;
  repository_id?: string;
  error_code?: string | null;
  error_detail?: string | null;
}

export interface SearchResult {
  file_path: string;
  symbol_name: string;
  symbol_kind: string;
  snippet: string;
  line_start: number;
  line_end: number;
  score: number;
  explanation: string;
}

export interface ChatSourceCitation {
  file_path: string;
  line_start: number;
  line_end: number;
  symbol_name: string;
  snippet: string;
  snippet_type: string;
  repository_id?: string;
  commit_sha?: string;
  branch?: string;
}

export interface ChatResponse {
  answer: string;
  flow_steps: string[];
  sources: ChatSourceCitation[];
  confidence: number;
  suggested_actions: string[];
  architecture_context?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  dependencies: {
    sqlite: string;
    qdrant: string;
    llm_provider: string;
  };
  repositories_indexed: number;
}

export interface BugHypothesis {
  file_path: string;
  symbol_name: string;
  confidence: 'High' | 'Medium' | 'Low';
  score: number;
  reasoning: string;
  suggested_fix: string;
  line_start: number;
  line_end: number;
}

export interface BugAnalysisResult {
  hypotheses: BugHypothesis[];
  summary: string;
  investigation_steps: string[];
  root_cause_prediction: string;
}

export interface ImpactAnalysisResult {
  target: string;
  target_kind: string;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;
  direct_callers: string[];
  indirect_callers: string[];
  affected_controllers: string[];
  affected_tests: string[];
  affected_modules: string[];
  rationale: string;
  call_chain: Array<{
    type: string;
    source: string;
    target: string;
    relationship: string;
  }>;
}

export interface SecurityFinding {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  category: string;
  file_path: string;
  line_start: number;
  line_end: number;
  snippet: string;
  description: string;
  remediation: string;
}

export interface SecurityAuditResult {
  findings: SecurityFinding[];
  summary_counts: Record<string, number>;
  health_impact: string;
}

export interface FileContentResponse {
  file_path: string;
  content: string;
  language: string;
  symbols: ASTSymbol[];
  dependencies: string[];
  dependents: string[];
  layer: string;
}
