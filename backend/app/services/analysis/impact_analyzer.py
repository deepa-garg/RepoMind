"""
Change Impact Analyzer for RepoMind.
Performs upstream and downstream traversal on the NetworkX architectural dependency graph
to determine blast radius, affected controllers, affected tests, and risk classification.
Derives all results strictly from actual repository data without fabricated mock callers.
"""

from typing import Dict, Any, List
from app.models.schemas import ImpactAnalysisResult
from app.services.graph.dependency_graph import DependencyGraphService


class ImpactAnalyzerService:
    def __init__(self, graph_service: DependencyGraphService):
        self.graph_service = graph_service

    def analyze(
        self,
        target: str,
        files_data: Dict[str, Dict[str, Any]],
        repository_id: str = "demo-ecommerce"
    ) -> ImpactAnalysisResult:
        direct, indirect = self.graph_service.get_upstream_impact(target, repo_id=repository_id)
        call_chain = self.graph_service.get_call_chain(target, repo_id=repository_id)

        all_affected = set(direct + indirect)

        # Categorize affected entities from graph
        affected_controllers: List[str] = []
        affected_tests: List[str] = []
        affected_modules: List[str] = []

        for item in all_affected:
            item_lower = item.lower()
            if "controller" in item_lower or "handler" in item_lower or "endpoint" in item_lower or "route" in item_lower:
                affected_controllers.append(item)
            elif "test" in item_lower or "spec" in item_lower:
                affected_tests.append(item)
            else:
                affected_modules.append(item)

        # Inspect real tests and callers in files_data that import the target file
        target_sym = target.split(".")[-1]
        target_class = target.split(".")[-2] if "." in target else target_sym
        target_file = None
        for path, info in files_data.items():
            if target == path or target in path or target_class in path or any(s["name"] in (target, target_sym) for s in info.get("symbols", [])):
                target_file = path
                break

        for path, info in files_data.items():
            is_caller = False
            deps = info.get("dependencies", [])
            if target_file and (target_file in deps or any(target_class in d or target_file.split("/")[-1].split(".")[0] in d for d in deps)):
                is_caller = True
            for sym in info.get("symbols", []):
                calls = sym.get("calls", [])
                if any(target in c or target_sym in c for c in calls):
                    is_caller = True

            if is_caller:
                name = path.split("/")[-1].replace(".ts", "").replace(".js", "").replace(".py", "")
                if info.get("layer") == "test":
                    if name not in affected_tests:
                        affected_tests.append(name)
                elif info.get("layer") == "presentation" or "controller" in path.lower() or "middleware" in path.lower():
                    if name not in affected_controllers:
                        affected_controllers.append(name)
                else:
                    if name not in affected_modules:
                        affected_modules.append(name)

        # Compute Blast Radius Score
        total_blast = len(direct) * 2 + len(indirect) + len(affected_controllers) * 3 + len(affected_tests)

        if len(affected_controllers) >= 2 or total_blast >= 8:
            risk_level = "HIGH"
            score = min(95, 70 + total_blast * 2)
            rationale = (
                f"Modifying '{target}' carries HIGH risk. It sits on a critical architectural path "
                f"consumed by {len(affected_controllers)} user-facing controller(s)/endpoint(s) "
                f"and {len(affected_tests)} test suite(s). "
                f"Changes may cascade across {len(direct) + len(indirect)} upstream module(s)."
            )
        elif len(affected_controllers) == 1 or total_blast >= 3:
            risk_level = "MEDIUM"
            score = min(65, 45 + total_blast * 3)
            rationale = (
                f"Modifying '{target}' carries MEDIUM risk. It impacts {len(direct)} direct caller(s) "
                f"and {len(affected_controllers)} entrypoint controller. Regression testing is recommended."
            )
        else:
            risk_level = "LOW"
            score = max(10, min(35, 15 + total_blast * 5))
            rationale = (
                f"Modifying '{target}' carries LOW risk. It has localized dependencies with minimal "
                f"downstream blast radius ({len(direct)} direct caller(s))."
            )

        return ImpactAnalysisResult(
            target=target,
            target_kind="symbol" if ("::" in target or "." in target) else "file",
            risk_level=risk_level,
            score=score,
            direct_callers=direct,
            indirect_callers=indirect,
            affected_controllers=list(set(affected_controllers)),
            affected_tests=list(set(affected_tests)),
            affected_modules=list(set(affected_modules)),
            rationale=rationale,
            call_chain=call_chain
        )
