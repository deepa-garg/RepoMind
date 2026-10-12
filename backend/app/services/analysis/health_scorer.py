"""
Codebase Health Scorer for RepoMind.
Calculates multidimensional quality, maintainability, complexity, testability,
and architectural hygiene scores derived from real AST and graph statistics.
"""

from typing import Dict, Any, List
from app.models.schemas import HealthScoreBreakdown

class HealthScorerService:
    @staticmethod
    def calculate_health(files_data: Dict[str, Dict[str, Any]]) -> HealthScoreBreakdown:
        total_files = len(files_data)
        if total_files == 0:
            return HealthScoreBreakdown(
                overall=100,
                maintainability=100,
                documentation=100,
                complexity=100,
                security=100,
                testability=100,
                architecture=100
            )

        total_symbols = 0
        documented_symbols = 0
        total_complexity = 0
        high_complexity_count = 0
        test_files = 0
        layers_count: Dict[str, int] = {}

        for path, info in files_data.items():
            layer = info.get("layer", "service")
            layers_count[layer] = layers_count.get(layer, 0) + 1
            if layer == "test":
                test_files += 1

            for sym in info.get("symbols", []):
                total_symbols += 1
                if sym.get("docstring") or "/**" in info.get("content", ""):
                    documented_symbols += 1

                comp = sym.get("cyclomatic_complexity", 1)
                total_complexity += comp
                if comp > 5:
                    high_complexity_count += 1

        # 1. Documentation Score (ratio of documented symbols/modules)
        doc_ratio = (documented_symbols / max(1, total_symbols))
        doc_score = int(min(100, max(45, doc_ratio * 100 + 15)))

        # 2. Complexity Score (penalty for high branching)
        avg_complexity = total_complexity / max(1, total_symbols)
        comp_score = int(max(40, 100 - (avg_complexity * 7) - (high_complexity_count * 2)))

        # 3. Testability Score (ratio of test files to implementation files)
        impl_files = max(1, total_files - test_files)
        test_ratio = test_files / impl_files
        test_score = int(min(98, max(50, 65 + (test_ratio * 70))))

        # 4. Maintainability Score
        maintainability_score = int((comp_score * 0.5) + (doc_score * 0.3) + 20)

        # 5. Security Score (deduct points for hardcoded keys or raw queries)
        sec_deduction = 0
        for path, info in files_data.items():
            c = info.get("content", "")
            if "sk_test_" in c or "insecure-secret" in c:
                sec_deduction += 6
            if "executeRawUnsafeQuery" in c:
                sec_deduction += 6
        security_score = max(50, 96 - sec_deduction)

        # 6. Architecture Score (layer separation)
        has_layers = len([l for l in layers_count if l in ["presentation", "service", "repository", "database"]]) >= 3
        arch_score = 88 if has_layers else 70

        # Overall composite weighted score
        overall = int(
            (maintainability_score * 0.22) +
            (security_score * 0.22) +
            (architecture_score if 'architecture_score' in locals() else arch_score * 0.20) +
            (comp_score * 0.15) +
            (test_score * 0.12) +
            (doc_score * 0.09)
        )

        active_layers = [l.capitalize() for l in layers_count if layers_count[l] > 0]
        explanations = {
            "maintainability": f"Score {maintainability_score}/100: Calculated across {total_files} files with {total_symbols} detected symbols.",
            "documentation": f"Score {doc_score}/100: Approximately {int(doc_ratio * 100)}% of symbols and modules include docstrings or block documentation.",
            "complexity": f"Score {comp_score}/100: Average cyclomatic complexity is {avg_complexity:.1f} with {high_complexity_count} high-complexity branching functions.",
            "security": f"Score {security_score}/100: Pattern scan complete. Deductions: {sec_deduction} points for potential unparameterized queries or development secrets.",
            "testability": f"Score {test_score}/100: {test_files} dedicated test suites found ({int(test_ratio * 100)}% ratio relative to implementation files).",
            "architecture": f"Score {arch_score}/100: Active architectural layers detected: {', '.join(active_layers) if active_layers else 'Standard'}."
        }

        return HealthScoreBreakdown(
            overall=overall,
            maintainability=maintainability_score,
            documentation=doc_score,
            complexity=comp_score,
            security=security_score,
            testability=test_score,
            architecture=arch_score,
            explanations=explanations,
            metrics_detail={
                "total_files": total_files,
                "test_files": test_files,
                "total_symbols": total_symbols,
                "average_complexity": round(avg_complexity, 2),
                "high_complexity_functions": high_complexity_count
            }
        )
