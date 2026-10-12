from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class RepositoryAnalysisRequest(BaseModel):
    repo_url: Optional[str] = "https://github.com/repomind/ecommerce-platform"
    repo_name: Optional[str] = "ecommerce-platform"
    owner: Optional[str] = "repomind"
    branch: Optional[str] = "main"
    is_demo: bool = False
    force_reindex: bool = False

class AnalysisProgress(BaseModel):
    stage: str
    progress_pct: int
    message: str
    is_complete: bool = False
    repository_id: Optional[str] = None
    error_code: Optional[str] = None
    error_detail: Optional[str] = None

class ASTSymbol(BaseModel):
    name: str
    kind: str  # function, class, method, endpoint, interface, import, variable
    file_path: str
    line_start: int
    line_end: int
    docstring: Optional[str] = None
    parameters: List[str] = []
    return_type: Optional[str] = None
    calls: List[str] = []
    cyclomatic_complexity: int = 1

class FileNodeInfo(BaseModel):
    path: str
    name: str
    extension: str
    size_bytes: int
    line_count: int
    layer: str  # presentation, service, repository, model, database, test, config, utility
    functions: List[str] = []
    classes: List[str] = []
    imports: List[str] = []
    exports: List[str] = []

class GraphNode(BaseModel):
    id: str
    label: str
    kind: str  # file, class, function, database
    file_path: str
    layer: str
    line: Optional[int] = 1
    metrics: Dict[str, Any] = {}

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship: str  # imports, calls, inherits, depends_on
    label: Optional[str] = None

class DependencyGraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    layers: List[str]
    stats: Dict[str, Any]

class HealthScoreBreakdown(BaseModel):
    overall: int
    maintainability: int
    documentation: int
    complexity: int
    security: int
    testability: int
    architecture: int
    explanations: Dict[str, str] = {}
    metrics_detail: Dict[str, Any] = {}

class RepositorySummary(BaseModel):
    id: str
    name: str
    owner: str
    branch: str
    commit_sha: Optional[str] = ""
    repo_url: Optional[str] = None
    description: str
    languages: Dict[str, int]  # e.g. {"TypeScript": 65, "Python": 25, "SQL": 10}
    file_count: int
    function_count: int
    class_count: int
    dependency_count: int
    test_file_count: int
    doc_percentage: int
    codebase_health: HealthScoreBreakdown
    is_demo: bool = False
    indexing_status: str = "Ready"  # Ready, Indexing, Failed
    error_message: Optional[str] = None
    analysis_time: str
    tree: Dict[str, Any] = {}

class SearchRequest(BaseModel):
    query: str
    repository_id: str
    kind_filter: Optional[str] = "all"  # all, function, class, endpoint, file
    layer_filter: Optional[str] = "all"
    limit: int = 10

class CodeChunk(BaseModel):
    chunk_id: str
    repository_id: str
    repo_url: Optional[str] = None
    branch: Optional[str] = None
    commit_sha: Optional[str] = None
    file_path: str
    language: str
    symbol_name: Optional[str] = None
    symbol_kind: Optional[str] = None
    snippet: str
    line_start: int
    line_end: int
    calls: List[str] = []
    layer: str = "service"
    index_version: str = "v2.0"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    search_text: Optional[str] = None

class SearchResult(BaseModel):
    file_path: str
    symbol_name: str
    symbol_kind: str
    snippet: str
    line_start: int
    line_end: int
    score: float
    explanation: str
    chunk_id: Optional[str] = None
    repository_id: Optional[str] = None
    branch: Optional[str] = None
    commit_sha: Optional[str] = None

class ChatSourceCitation(BaseModel):
    file_path: str
    line_start: int
    line_end: int
    symbol_name: str
    snippet: str
    snippet_type: str = "code"
    repository_id: Optional[str] = None
    commit_sha: Optional[str] = None
    branch: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    repository_id: str
    session_id: Optional[str] = "default"
    history: List[Dict[str, str]] = []

class ChatResponse(BaseModel):
    answer: str
    flow_steps: List[str] = []
    sources: List[ChatSourceCitation] = []
    confidence: float = 0.95
    suggested_actions: List[str] = []
    architecture_context: Optional[str] = None

class BugHypothesis(BaseModel):
    file_path: str
    symbol_name: str
    confidence: str  # High, Medium, Low
    score: float
    reasoning: str
    suggested_fix: str
    line_start: int
    line_end: int

class BugAnalysisRequest(BaseModel):
    description: str
    repository_id: str
    error_log: Optional[str] = None

class BugAnalysisResult(BaseModel):
    hypotheses: List[BugHypothesis]
    summary: str
    investigation_steps: List[str]
    root_cause_prediction: str

class ImpactAnalysisRequest(BaseModel):
    repository_id: str
    target_symbol: Optional[str] = None
    target_file: Optional[str] = None

class ImpactAnalysisResult(BaseModel):
    target: str
    target_kind: str
    risk_level: str  # HIGH, MEDIUM, LOW
    score: int
    direct_callers: List[str]
    indirect_callers: List[str]
    affected_controllers: List[str]
    affected_tests: List[str]
    affected_modules: List[str]
    rationale: str
    call_chain: List[Dict[str, Any]]

class TestGenRequest(BaseModel):
    repository_id: str
    file_path: str
    symbol_name: str
    framework: Optional[str] = "jest"

class TestGenResult(BaseModel):
    framework: str
    test_code: str
    normal_cases: List[str]
    edge_cases: List[str]
    boundary_cases: List[str]
    failure_cases: List[str]
    coverage_explanation: str

class DocGenRequest(BaseModel):
    repository_id: str
    file_path: str
    symbol_name: Optional[str] = None

class DocGenResult(BaseModel):
    title: str
    generated_doc: str
    format_type: str
    parameters_doc: List[Dict[str, str]] = []
    return_doc: str = ""
    architectural_notes: str = ""

class CodeSuggestionRequest(BaseModel):
    repository_id: str
    file_path: str
    symbol_name: str
    prompt_type: str  # optimize, error_handling, async, validation, refactor

class CodeSuggestionResult(BaseModel):
    original_code: str
    suggested_code: str
    explanation: str
    files_potentially_affected: List[str]
    conventions_followed: List[str]

class SecurityFinding(BaseModel):
    id: str
    title: str
    severity: str  # Critical, High, Medium, Low, Info
    category: str
    file_path: str
    line_start: int
    line_end: int
    snippet: str
    description: str
    remediation: str

class SecurityAuditResult(BaseModel):
    findings: List[SecurityFinding]
    summary_counts: Dict[str, int]
    health_impact: str

class FileContentResponse(BaseModel):
    file_path: str
    content: str
    language: str
    symbols: List[ASTSymbol] = []
    dependencies: List[str] = []
    dependents: List[str] = []
    layer: str = "service"
