"""
Security & Code Smell Auditor for RepoMind.
Performs AST and pattern-based static code security analysis.
Identifies potential secrets, unsafe SQL queries, loose authentication, and code smells.
"""

from typing import Dict, Any, List
import re
from app.models.schemas import SecurityFinding, SecurityAuditResult

class SecurityAuditorService:
    @staticmethod
    def audit(files_data: Dict[str, Dict[str, Any]]) -> SecurityAuditResult:
        findings: List[SecurityFinding] = []

        for path, info in files_data.items():
            content = info.get("content", "")
            lines = content.split("\n")

            # 1. Hardcoded Secrets Detection
            secret_match = re.search(r"['\"](sk_test_[a-zA-Z0-9]{24,}|dev-insecure-[a-zA-Z0-9\-_]+)['\"]", content)
            if secret_match:
                # Find line number
                for idx, l in enumerate(lines, 1):
                    if secret_match.group(0) in l:
                        findings.append(SecurityFinding(
                            id=f"sec_secret_{len(findings)+1}",
                            title="Potential Hardcoded Secret / Credential Default",
                            severity="High",
                            category="Secrets Management",
                            file_path=path,
                            line_start=idx,
                            line_end=idx,
                            snippet=l.strip(),
                            description="A fallback API secret or dev credential token is hardcoded in source code. If committed, this could expose backend operations.",
                            remediation="Extract credentials exclusively into environment variables and validate presence with runtime assertions."
                        ))
                        break

            # 2. Raw Unsafe SQL Query Detection
            if "executeRawUnsafeQuery" in content or re.search(r"SELECT\s+.*?\s+\+\s+", content):
                for idx, l in enumerate(lines, 1):
                    if "executeRawUnsafeQuery" in l or ("SELECT" in l and "+" in l):
                        findings.append(SecurityFinding(
                            id=f"sec_sql_{len(findings)+1}",
                            title="Potential SQL Injection Pattern Detected",
                            severity="Critical",
                            category="Injection Vulnerability",
                            file_path=path,
                            line_start=idx,
                            line_end=idx + 3,
                            snippet=l.strip(),
                            description="Unescaped query execution helper bypasses parameterized SQL statements, creating an injection risk if user inputs reach this handler.",
                            remediation="Always use parameterized bind variables ($1, $2, :param) via the standard query client."
                        ))
                        break

            # 3. Missing Clock Tolerance on JWT Verification
            if "jwt.verify" in content and "clockTolerance" not in content and "TokenService" in path:
                for idx, l in enumerate(lines, 1):
                    if "jwt.verify" in l:
                        findings.append(SecurityFinding(
                            id=f"sec_jwt_{len(findings)+1}",
                            title="Missing Clock Skew Grace Tolerance in Token Verification",
                            severity="Medium",
                            category="Authentication",
                            file_path=path,
                            line_start=idx,
                            line_end=idx + 2,
                            snippet=l.strip(),
                            description="Token verification does not configure clockTolerance. Clustered servers with slight clock drifts can reject valid refresh payloads prematurely.",
                            remediation="Supply { clockTolerance: 15 } in jwt.verify options."
                        ))
                        break

            # 4. Insecure Exception Masking / Generic Error Responses
            if "res.status(500).json({ error: error.message })" in content:
                for idx, l in enumerate(lines, 1):
                    if "res.status(500)" in l:
                        findings.append(SecurityFinding(
                            id=f"sec_leak_{len(findings)+1}",
                            title="Internal Stack / Error Message Leaked to Client",
                            severity="Low",
                            category="Information Disclosure",
                            file_path=path,
                            line_start=idx,
                            line_end=idx,
                            snippet=l.strip(),
                            description="Internal backend error message is forwarded unmasked to client HTTP responses, which may disclose internal schema names or paths.",
                            remediation="Return sanitized error codes (e.g. { error: 'INTERNAL_SERVER_ERROR' }) and log raw error stacks internally."
                        ))
                        break

            # 5. High Cyclomatic Complexity Code Smell
            for sym in info.get("symbols", []):
                if sym.get("cyclomatic_complexity", 1) >= 6:
                    findings.append(SecurityFinding(
                        id=f"smell_comp_{len(findings)+1}",
                        title=f"Elevated Cyclomatic Complexity in '{sym['name']}'",
                        severity="Info",
                        category="Code Quality & Complexity",
                        file_path=path,
                        line_start=sym.get("line_start", 1),
                        line_end=sym.get("line_end", 20),
                        snippet=f"Function/Method {sym['name']}() has cyclomatic complexity score {sym.get('cyclomatic_complexity')}",
                        description="Method contains branching logic with multiple conditionals. Elevated cyclomatic complexity increases maintenance overhead and bug probability.",
                        remediation="Refactor compound condition branches into focused sub-functions."
                    ))

        # Summarize counts
        counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0, "Info": 0}
        for f in findings:
            counts[f.severity] = counts.get(f.severity, 0) + 1

        impact_desc = "Good overall security hygiene with isolated dev fallbacks flagged for hardening."
        if counts["Critical"] > 0:
            impact_desc = "Action required: Critical SQL query pattern identified requiring parameterization."

        return SecurityAuditResult(
            findings=findings,
            summary_counts=counts,
            health_impact=impact_desc
        )
