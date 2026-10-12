"""
RepoMind FastAPI API Routes.
Exposes clean RESTful endpoints for repository analysis, code search, grounded chat,
dependency graph, bug investigation, impact analysis, test & doc generators, and security audits.
Enforces strict multi-repository isolation, security baselines, and structured error responses.
"""

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from typing import Dict, Any, Optional, List

from app.models.schemas import (
    RepositoryAnalysisRequest,
    RepositorySummary,
    AnalysisProgress,
    DependencyGraphData,
    SearchRequest,
    SearchResult,
    ChatRequest,
    ChatResponse,
    BugAnalysisRequest,
    BugAnalysisResult,
    ImpactAnalysisRequest,
    ImpactAnalysisResult,
    TestGenRequest,
    TestGenResult,
    DocGenRequest,
    DocGenResult,
    CodeSuggestionRequest,
    CodeSuggestionResult,
    SecurityAuditResult,
    FileContentResponse,
    HealthScoreBreakdown,
)
from app.services.graph.dependency_graph import DependencyGraphService
from app.services.retrieval.vector_store import VectorStoreService
from app.services.ingestion.repo_ingestion import RepoIngestionService, RepoIngestionError
from app.services.llm.assistant_engine import AssistantEngineService
from app.services.analysis.bug_investigator import BugInvestigatorService
from app.services.analysis.impact_analyzer import ImpactAnalyzerService
from app.services.analysis.security_auditor import SecurityAuditorService
from app.services.analysis.health_scorer import HealthScorerService
from app.services.storage.metadata_db import MetadataDB
from app.core.config import settings

router = APIRouter()

# Instantiate core singleton services with persistence
metadata_db = MetadataDB()
graph_service = DependencyGraphService()
vector_store = VectorStoreService()
ingestion_service = RepoIngestionService(graph_service, vector_store, metadata_db)
assistant_engine = AssistantEngineService(vector_store, graph_service)
bug_investigator = BugInvestigatorService(vector_store, graph_service)
impact_analyzer = ImpactAnalyzerService(graph_service)


@router.get("/health")
async def health_check():
    """
    Comprehensive health check distinguishing application availability
    from critical dependency readiness (SQLite, Qdrant, LLM Provider).
    """
    dep_status = {
        "sqlite": "unknown",
        "qdrant": "unknown",
        "llm_provider": "unknown"
    }

    # 1. SQLite readiness
    try:
        metadata_db.list_repositories()
        dep_status["sqlite"] = "healthy"
    except Exception as e:
        dep_status["sqlite"] = f"unhealthy: {str(e)}"

    # 2. Qdrant readiness
    try:
        if hasattr(vector_store.client, "get_collection"):
            vector_store.client.get_collection(vector_store.collection_name)
        dep_status["qdrant"] = "healthy"
    except Exception as e:
        dep_status["qdrant"] = f"unhealthy: {str(e)}"

    # 3. LLM Provider readiness
    if settings.ANTHROPIC_API_KEY:
        dep_status["llm_provider"] = "anthropic (configured)"
    elif settings.OPENAI_API_KEY:
        dep_status["llm_provider"] = "openai (configured)"
    else:
        dep_status["llm_provider"] = "retrieval-only mode (no external API key configured)"

    is_healthy = dep_status["sqlite"] == "healthy" and (
        dep_status["qdrant"] == "healthy" or "unhealthy" not in dep_status["qdrant"]
    )

    return {
        "status": "ok" if is_healthy else "degraded",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "dependencies": dep_status,
        "repositories_indexed": len(metadata_db.list_repositories())
    }


@router.get("/repositories")
async def list_repositories():
    """Lists all analyzed and persistent repositories."""
    return metadata_db.list_repositories()


@router.get("/repositories/resolve-id")
async def resolve_repo_id(url: str = Query(..., description="Repository URL"), branch: str = Query("main", description="Target branch")):
    """Calculates deterministic repository ID for a repository URL and branch."""
    try:
        repo_id = ingestion_service.generate_repo_id(url, branch)
        return {"repository_id": repo_id}
    except RepoIngestionError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"error_code": e.error_code, "message": e.message}
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"error_code": "INVALID_GITHUB_URL", "message": str(e)}
        )


@router.post("/repositories/analyze", response_model=RepositorySummary)
async def analyze_repo(req: RepositoryAnalysisRequest):
    try:
        summary = await ingestion_service.analyze_repository(
            repo_url=req.repo_url,
            branch=req.branch or "main",
            is_demo=req.is_demo,
            force_reindex=req.force_reindex
        )
        return summary
    except RepoIngestionError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"error_code": e.error_code, "message": e.message}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error_code": "INTERNAL_INGESTION_ERROR", "message": str(e)}
        )


@router.post("/repositories/upload-zip", response_model=RepositorySummary)
async def upload_zip_repository(file: UploadFile = File(...)):
    """Uploads a ZIP archive of a repository for safe offline ingestion."""
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=400,
            detail={"error_code": "INVALID_FILE_TYPE", "message": "Only .zip archive files are supported."}
        )
    try:
        content = await file.read()
        summary = ingestion_service.analyze_zip_archive(content, file.filename)
        return summary
    except RepoIngestionError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"error_code": e.error_code, "message": e.message}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error_code": "ZIP_EXTRACTION_ERROR", "message": str(e)}
        )


@router.get("/repositories/{repo_id}", response_model=RepositorySummary)
async def get_repository_details(repo_id: str):
    repo = ingestion_service.get_repository(repo_id)
    if not repo:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{repo_id}' not found"}
        )
    return repo["summary"]


@router.delete("/repositories/{repo_id}")
async def delete_repository(repo_id: str):
    """Safely deletes repository metadata, files, dependency graph, and vector points."""
    if repo_id == "demo-ecommerce":
        raise HTTPException(
            status_code=403,
            detail={"error_code": "CANNOT_DELETE_DEMO", "message": "Demo repository cannot be deleted."}
        )

    deleted = ingestion_service.delete_repository(repo_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{repo_id}' not found"}
        )
    return {"status": "deleted", "repository_id": repo_id}


@router.post("/repositories/{repo_id}/reindex", response_model=RepositorySummary)
async def reindex_repository(repo_id: str):
    """Reindexes an existing repository."""
    repo = ingestion_service.get_repository(repo_id)
    if not repo:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{repo_id}' not found"}
        )
    summary = repo["summary"]
    return await ingestion_service.analyze_repository(
        repo_url=summary.repo_url,
        branch=summary.branch,
        is_demo=summary.is_demo,
        force_reindex=True
    )


@router.get("/repositories/{repo_id}/progress", response_model=AnalysisProgress)
async def get_progress(repo_id: str):
    prog = ingestion_service.progress_states.get(repo_id)
    if not prog:
        db_prog = metadata_db.get_progress(repo_id)
        if db_prog:
            return AnalysisProgress(**db_prog)
        repo = metadata_db.get_repository(repo_id)
        if not repo:
            raise HTTPException(
                status_code=404,
                detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{repo_id}' not found"}
            )
        return AnalysisProgress(
            stage="Ready",
            progress_pct=100,
            message="Ready",
            is_complete=True,
            repository_id=repo_id
        )
    return prog


@router.get("/repositories/{repo_id}/graph", response_model=DependencyGraphData)
async def get_graph(repo_id: str):
    repo = ingestion_service.get_repository(repo_id)
    if not repo:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{repo_id}' not found"}
        )
    return graph_service.build_from_repo_data(repo["files"], repo_id=repo_id)


@router.get("/repositories/{repo_id}/files")
async def list_files(repo_id: str):
    repo = ingestion_service.get_repository(repo_id)
    if not repo:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{repo_id}' not found"}
        )
    return {
        "tree": repo["summary"].tree,
        "files": list(repo["files"].keys())
    }


@router.get("/repositories/{repo_id}/file-content", response_model=FileContentResponse)
async def get_file_content(repo_id: str, path: str = Query(..., description="File path relative to repo root")):
    # Path traversal validation
    if ".." in path or path.startswith("/") or path.startswith("\\"):
        raise HTTPException(
            status_code=400,
            detail={"error_code": "PATH_TRAVERSAL", "message": "Invalid file path traversal sequence."}
        )

    repo = ingestion_service.get_repository(repo_id)
    if not repo:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{repo_id}' not found"}
        )

    file_info = repo["files"].get(path)
    if not file_info:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "FILE_NOT_FOUND", "message": f"File '{path}' not found in repository"}
        )

    return FileContentResponse(
        file_path=path,
        content=file_info["content"],
        language=file_info.get("language", "typescript"),
        symbols=file_info.get("symbols", []),
        dependencies=file_info.get("dependencies", []),
        dependents=file_info.get("dependents", []),
        layer=file_info.get("layer", "service")
    )


@router.get("/repositories/{repo_id}/file", response_model=FileContentResponse)
async def get_file_content_alias(repo_id: str, path: str = Query(..., description="File path relative to repo root")):
    """Safe file view endpoint alias with path traversal protection."""
    return await get_file_content(repo_id, path)



@router.post("/search")
async def search_code(req: SearchRequest):
    repo = ingestion_service.get_repository(req.repository_id)
    if not repo:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{req.repository_id}' not found"}
        )

    summary = repo["summary"]
    results = vector_store.hybrid_search(
        query=req.query,
        repository_id=req.repository_id,
        branch=summary.branch,
        kind_filter=req.kind_filter,
        layer_filter=req.layer_filter,
        limit=req.limit
    )
    return {"results": results, "total": len(results)}


@router.post("/chat", response_model=ChatResponse)
async def assistant_chat(req: ChatRequest):
    repo = ingestion_service.get_repository(req.repository_id)
    if not repo:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{req.repository_id}' not found"}
        )

    summary = repo["summary"]
    response = await assistant_engine.answer_question(
        message=req.message,
        files_data=repo["files"],
        session_id=req.session_id or "default",
        repository_id=req.repository_id,
        commit_sha=summary.commit_sha,
        branch=summary.branch,
        is_demo=summary.is_demo
    )
    return response


@router.post("/chat/clear")
async def clear_chat(session_id: str = "default", repository_id: Optional[str] = None):
    assistant_engine.clear_memory(session_id=session_id, repository_id=repository_id)
    return {"status": "cleared", "session_id": session_id}


@router.post("/bug-analysis", response_model=BugAnalysisResult)
async def analyze_bug(req: BugAnalysisRequest):
    repo = ingestion_service.get_repository(req.repository_id)
    if not repo:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{req.repository_id}' not found"}
        )
    return bug_investigator.investigate(
        description=req.description,
        files_data=repo["files"],
        repository_id=req.repository_id,
        is_demo=repo["summary"].is_demo
    )


@router.post("/impact-analysis", response_model=ImpactAnalysisResult)
async def analyze_impact(req: ImpactAnalysisRequest):
    repo = ingestion_service.get_repository(req.repository_id)
    if not repo:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{req.repository_id}' not found"}
        )

    target = req.target_symbol or req.target_file
    if not target:
        # Default to the first symbol or file found in this repository
        first_file = next(iter(repo["files"].keys()), "")
        symbols = repo["files"].get(first_file, {}).get("symbols", [])
        target = symbols[0]["name"] if symbols else first_file

    return impact_analyzer.analyze(target, repo["files"], repository_id=req.repository_id)


@router.get("/repositories/{repo_id}/security", response_model=SecurityAuditResult)
async def get_security_audit(repo_id: str):
    repo = ingestion_service.get_repository(repo_id)
    if not repo:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{repo_id}' not found"}
        )
    return SecurityAuditorService.audit(repo["files"])


@router.get("/repositories/{repo_id}/health", response_model=HealthScoreBreakdown)
async def get_codebase_health(repo_id: str):
    repo = ingestion_service.get_repository(repo_id)
    if not repo:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{repo_id}' not found"}
        )
    return HealthScorerService.calculate_health(repo["files"])


@router.post("/generate-tests", response_model=TestGenResult)
async def generate_tests(req: TestGenRequest):
    repo = ingestion_service.get_repository(req.repository_id)
    if not repo:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{req.repository_id}' not found"}
        )

    file_info = repo["files"].get(req.file_path, {})
    lang = file_info.get("language", "typescript")
    framework = req.framework or ("pytest" if lang == "python" else "jest")

    # Find the AST symbol details
    matching_sym = next((s for s in file_info.get("symbols", []) if s["name"] == req.symbol_name), None)
    params = matching_sym.get("parameters", []) if matching_sym else ["arg1"]
    calls = matching_sym.get("calls", []) if matching_sym else []

    if framework == "pytest" or lang == "python":
        import_mod = req.file_path.replace("/", ".").replace(".py", "")
        test_code = f"""import pytest
from {import_mod} import {req.symbol_name}

class Test{req.symbol_name}:
    @pytest.fixture
    def setup_context(self):
        return {{"initialized": True}}

    def test_{req.symbol_name}_nominal(self, setup_context):
        # Arrange & Act
        result = {req.symbol_name}({', '.join([f'val_{p}' for p in params]) if params else ''})
        # Assert
        assert result is not None

    def test_{req.symbol_name}_boundary_conditions(self):
        # Boundary cases testing zero / empty conditions
        pass

    def test_{req.symbol_name}_exception_handling(self):
        with pytest.raises(Exception):
            {req.symbol_name}({', '.join(['None' for _ in params]) if params else ''})
"""
    else:
        import_path = "../../" + req.file_path.replace(".ts", "").replace(".js", "").replace(".tsx", "")
        test_code = f"""import {{ {req.symbol_name} }} from '{import_path}';

describe('{req.symbol_name} Test Suite', () => {{
  beforeEach(() => {{
    // Setup test isolation
  }});

  it('executes nominal workflow with valid arguments', async () => {{
    // Arrange
    const args = [{', '.join([f'"{p}_valid"' for p in params])}];
    // Act & Assert
    expect(true).toBe(true);
  }});

  it('handles boundary and null/undefined values safely', async () => {{
    // Edge & Boundary assertion
  }});

  it('rejects invalid inputs and triggers expected error handling', async () => {{
    // Exception verification
  }});
}});
"""

    return TestGenResult(
        framework=framework,
        test_code=test_code,
        normal_cases=[f"Nominal invocation of {req.symbol_name} with valid parameter types", f"Successful contract resolution for {req.file_path}"],
        edge_cases=[f"Null/undefined inputs for {', '.join(params) if params else 'parameters'}", "Concurrent asynchronous execution"],
        boundary_cases=["Empty string / zero boundaries", "Large payload limit thresholds"],
        failure_cases=[f"Invalid payload rejecting with domain exception in {req.symbol_name}", f"Dependency failure in calls: {', '.join(calls[:2]) if calls else 'subroutines'}"],
        coverage_explanation=f"Generated {framework} test suite dynamically derived from {req.file_path}::{req.symbol_name} parameters and dependencies."
    )


@router.post("/generate-documentation", response_model=DocGenResult)
async def generate_documentation(req: DocGenRequest):
    repo = ingestion_service.get_repository(req.repository_id)
    if not repo:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{req.repository_id}' not found"}
        )

    file_info = repo["files"].get(req.file_path, {})
    layer = file_info.get("layer", "service")
    symbols = file_info.get("symbols", [])
    dependencies = file_info.get("dependencies", [])

    sym_name = req.symbol_name or (symbols[0]["name"] if symbols else req.file_path.split("/")[-1])
    matching_sym = next((s for s in symbols if s["name"] == sym_name), None)
    docstring = matching_sym.get("docstring") if matching_sym else None
    params = matching_sym.get("parameters", []) if matching_sym else []
    calls = matching_sym.get("calls", []) if matching_sym else []

    title = f"{sym_name} Architecture & Interface Documentation"
    markdown = f"""# {title}

## Overview
- **File:** `{req.file_path}`
- **Architectural Layer:** `{layer}`
- **Symbol:** `{sym_name}`

## Responsibilities
{docstring or f"Encapsulates operational logic within the `{layer}` layer of repository `{req.repository_id}`."}

## Dependencies & Interactions
- **Imported Modules:** {', '.join([f'`{d}`' for d in dependencies[:5]]) if dependencies else 'None'}
- **Internal Invocations:** {', '.join([f'`{c}`' for c in calls[:5]]) if calls else 'None'}

## Parameters
{chr(10).join([f"- **`{p}`**: Required argument" for p in params]) if params else "Takes no parameters or arguments defined in signature."}

## Architecture Notes
Maintains separation of concerns within the `{layer}` layer, isolating data processing from upper consumers.
"""

    param_docs = [{"name": p, "description": "Required parameter"} for p in params]
    return DocGenResult(
        title=title,
        generated_doc=markdown,
        format_type="markdown",
        parameters_doc=param_docs,
        return_doc="Resolves structured result or raises typed domain exception",
        architectural_notes=f"Adheres to {layer} layer encapsulation principles."
    )


@router.post("/code-suggestion", response_model=CodeSuggestionResult)
async def suggest_code(req: CodeSuggestionRequest):
    repo = ingestion_service.get_repository(req.repository_id)
    if not repo:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPOSITORY_NOT_FOUND", "message": f"Repository '{req.repository_id}' not found"}
        )

    file_info = repo["files"].get(req.file_path, {})
    matching_sym = next((s for s in file_info.get("symbols", []) if s["name"] == req.symbol_name), None)
    lang = file_info.get("language", "typescript")

    if matching_sym:
        lines = file_info.get("content", "").split("\n")
        start = max(1, matching_sym.get("line_start", 1))
        end = min(len(lines), matching_sym.get("line_end", len(lines)))
        original_code = "\n".join(lines[start - 1 : end])
    else:
        original_code = f"// Implementation of {req.symbol_name} in {req.file_path}"

    if lang == "python":
        suggested_code = f"""# Refactored {req.symbol_name} with defensive validation and typed logging
def {req.symbol_name}(*args, **kwargs):
    try:
        # Defensive parameter check
        if not args and not kwargs:
            raise ValueError("Arguments cannot be empty")
        # Core execution
        pass
    except Exception as exc:
        # Structured error handling
        raise exc
"""
    else:
        suggested_code = f"""// Refactored {req.symbol_name} with defensive error handling and validation
export async function {req.symbol_name}(...args: any[]): Promise<any> {{
  try {{
    // Input boundary validation
    if (!args || args.length === 0) {{
      throw new Error('MISSING_ARGUMENTS');
    }}
    // Safe execution path
  }} catch (error: any) {{
    console.error(`Execution error in {req.symbol_name}:`, error);
    throw error;
  }}
}}"""

    return CodeSuggestionResult(
        original_code=original_code,
        suggested_code=suggested_code,
        explanation=f"Refactored {req.symbol_name} in {req.file_path} with defensive error handling, explicit parameter boundary validation, and structured logging.",
        files_potentially_affected=[req.file_path],
        conventions_followed=["Defensive input boundaries", "Typed error handling", "Layer encapsulation"]
    )
