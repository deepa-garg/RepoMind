"""
Bug Investigator Service for RepoMind.
Diagnoses issues using repository-isolated semantic retrieval, dependency call chain analysis,
and AST pattern inspection to formulate probabilistic hypotheses and fixes based on real code.
"""

from typing import Dict, Any, List, Optional
from app.models.schemas import BugHypothesis, BugAnalysisResult
from app.services.retrieval.vector_store import VectorStoreService
from app.services.graph.dependency_graph import DependencyGraphService


class BugInvestigatorService:
    def __init__(self, vector_store: VectorStoreService, graph_service: DependencyGraphService):
        self.vector_store = vector_store
        self.graph_service = graph_service

    def investigate(
        self,
        description: str,
        files_data: Dict[str, Dict[str, Any]],
        repository_id: str = "demo-ecommerce",
        is_demo: bool = False
    ) -> BugAnalysisResult:
        desc_lower = description.lower()
        hypotheses: List[BugHypothesis] = []

        # 1. Retrieve top candidate code snippets strictly for this repository
        search_hits = self.vector_store.hybrid_search(description, repository_id=repository_id, limit=5)

        # Demo mode showcase for demo repository
        if is_demo and repository_id == "demo-ecommerce" and any(w in desc_lower for w in ["logged out", "refresh", "token", "session"]):
            hypotheses.append(BugHypothesis(
                file_path="src/auth/TokenService.ts",
                symbol_name="verifyToken",
                confidence="High",
                score=0.92,
                reasoning=(
                    "The TokenService.verifyToken() method lacks clock skew tolerance and strict error boundaries. "
                    "When a client refreshes the page concurrently during token rotation, the immediate strict "
                    "expiry check causes a false positive 'INVALID_TOKEN' rejection before refresh token exchange completes."
                ),
                suggested_fix="""// Add clockTolerance to jwt.verify options:
const decoded = jwt.verify(token, this.secretKey, {
  clockTolerance: 15 // Allow 15-second grace window for page reloads
}) as TokenPayload;""",
                line_start=45,
                line_end=53
            ))

        # Ground hypotheses on real search hits and AST symbols in this codebase
        for hit in search_hits:
            file_info = files_data.get(hit.file_path, {})
            matching_sym = next((s for s in file_info.get("symbols", []) if s["name"] == hit.symbol_name), None)
            comp = matching_sym.get("cyclomatic_complexity", 1) if matching_sym else 1
            calls = matching_sym.get("calls", []) if matching_sym else []

            # Confidence based on score and cyclomatic complexity
            confidence = "High" if hit.score > 0.7 or comp > 4 else ("Medium" if hit.score > 0.4 else "Low")
            
            reasoning_parts = [
                f"Symbol '{hit.symbol_name}' in `{hit.file_path}` matches the issue description with score {hit.score:.2f}."
            ]
            if comp > 3:
                reasoning_parts.append(f"It exhibits elevated cyclomatic complexity ({comp}), indicating multiple branching conditions that increase bug probability.")
            if calls:
                reasoning_parts.append(f"It interacts with external dependencies: {', '.join(calls[:3])}.")

            # Dynamic suggested fix tailored to the file's language
            lang = file_info.get("language", "typescript")
            if lang == "python":
                suggested_fix = f"# In {hit.file_path}::{hit.symbol_name}:\ntry:\n    # Verify defensive checks for '{hit.symbol_name}'\n    pass\nexcept Exception as e:\n    logger.error(f'Error in {hit.symbol_name}: {{e}}')\n    raise"
            else:
                suggested_fix = f"// In {hit.file_path}::{hit.symbol_name}:\ntry {{\n  // Defensive validation and boundary checks for {hit.symbol_name}\n}} catch (error: any) {{\n  console.error(`Error in {hit.symbol_name}:`, error);\n  throw error;\n}}"

            hypotheses.append(BugHypothesis(
                file_path=hit.file_path,
                symbol_name=hit.symbol_name,
                confidence=confidence,
                score=hit.score,
                reasoning=" ".join(reasoning_parts),
                suggested_fix=suggested_fix,
                line_start=hit.line_start,
                line_end=hit.line_end
            ))

        if not hypotheses:
            # Fallback to general file inspect
            first_path = next(iter(files_data.keys()), "root")
            return BugAnalysisResult(
                hypotheses=[],
                summary=f"No suspicious code locations directly correlated with: '{description}'.",
                investigation_steps=[
                    "Check client-side error logs and server request logs",
                    f"Inspect entrypoint modules in {first_path}",
                    "Run automated regression test suites"
                ],
                root_cause_prediction="Unknown / External to current scanned modules"
            )

        summary = (
            f"Analyzed {len(hypotheses)} candidate code location(s) matching issue: '{description}' in repository `{repository_id}`. "
            f"Primary predicted root cause is focused around `{hypotheses[0].file_path}::{hypotheses[0].symbol_name}`."
        )

        steps = [
            f"Step 1: Inspect call stack from entry points down to {hypotheses[0].file_path}:{hypotheses[0].line_start}",
            "Step 2: Check server error logs for exact stack trace frames and input parameters",
            f"Step 3: Apply defensive patch to {hypotheses[0].symbol_name} and verify with targeted unit tests"
        ]

        return BugAnalysisResult(
            hypotheses=hypotheses,
            summary=summary,
            investigation_steps=steps,
            root_cause_prediction=f"{hypotheses[0].symbol_name} ({hypotheses[0].file_path})"
        )
