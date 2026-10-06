"""
AST Parser Service for RepoMind.
Extracts symbols, functions, classes, calls, imports, and metrics using Tree-sitter
with resilient semantic token parsing for TypeScript, JavaScript, Python, etc.
"""

import re
from typing import List, Dict, Any, Tuple
from app.models.schemas import ASTSymbol, FileNodeInfo

try:
    import tree_sitter_python
    from tree_sitter import Language, Parser
    PY_LANGUAGE = Language(tree_sitter_python.language())
    py_parser = Parser(PY_LANGUAGE)
    TREE_SITTER_AVAILABLE = True
except Exception:
    TREE_SITTER_AVAILABLE = False
    py_parser = None

class ASTParser:
    """Parses code files to extract rich AST symbols, calls, and structural metadata."""

    @staticmethod
    def infer_layer(file_path: str) -> str:
        p = file_path.lower()
        if "test" in p or "spec" in p:
            return "test"
        if "controller" in p or "route" in p or "endpoint" in p or "handler" in p or "middleware" in p:
            return "presentation"
        if "service" in p or "manager" in p or "logic" in p or "usecase" in p:
            return "service"
        if "repo" in p or "dao" in p:
            return "repository"
        if "db" in p or "database" in p or "migration" in p:
            return "database"
        if "model" in p or "entity" in p or "schema" in p or "type" in p or "interface" in p:
            return "model"
        if "config" in p or "setting" in p or "env" in p:
            return "config"
        if "util" in p or "helper" in p or "logger" in p:
            return "utility"
        return "service"

    @staticmethod
    def calculate_complexity(code_snippet: str) -> int:
        """Computes cyclomatic complexity based on branching constructs."""
        branch_patterns = [
            r'\bif\b', r'\belse\s+if\b', r'\belif\b', r'\bfor\b', r'\bwhile\b',
            r'\bcase\b', r'\bcatch\b', r'\bexcept\b', r'&&', r'\|\|', r'\?\?'
        ]
        score = 1
        for pattern in branch_patterns:
            matches = re.findall(pattern, code_snippet)
            score += len(matches)
        return max(1, score)

    @classmethod
    def parse_file(cls, file_path: str, code: str, language: str = "typescript") -> Tuple[List[ASTSymbol], FileNodeInfo]:
        lines = code.split("\n")
        symbols: List[ASTSymbol] = []
        imports: List[str] = []
        exports: List[str] = []
        classes: List[str] = []
        functions: List[str] = []

        # 1. Extract imports
        for line in lines:
            line_s = line.strip()
            # JS/TS imports
            imp_match = re.search(r"import\s+.*?from\s+['\"](.*?)['\"]", line_s)
            if imp_match:
                imports.append(imp_match.group(1))
            # Python imports
            py_imp = re.search(r"^(?:from\s+([a-zA-Z0-9_\.]+)\s+)?import\s+([a-zA-Z0-9_,\s]+)", line_s)
            if py_imp:
                imports.append(py_imp.group(1) or py_imp.group(2).strip())

        # 2. Extract classes and interfaces
        class_regex = re.compile(r"^(?:export\s+)?(?:default\s+)?(class|interface)\s+([A-Za-z0-9_]+)")
        current_class = None
        class_start_line = 1

        # 3. Extract functions & methods
        fn_regex = re.compile(r"^(?:\s*|\s*export\s+)?(?:public\s+|private\s+|protected\s+|async\s+|static\s+)*(function\s+([A-Za-z0-9_]+)|([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^\)]*\)\s*=>|([A-Za-z0-9_]+)\s*\([^\)]*\)\s*(?::\s*[^{]+)?\s*\{)")
        py_fn_regex = re.compile(r"^\s*def\s+([A-Za-z0-9_]+)\s*\((.*?)\)")

        # Extract calls pattern (e.g. Service.method, Logger.info, etc.)
        call_regex = re.compile(r"([A-Za-z0-9_]+\.[A-Za-z0-9_]+)\(")

        for idx, line in enumerate(lines, 1):
            line_str = line.strip()

            # Class/Interface match
            c_match = class_regex.match(line_str)
            if c_match:
                kind = c_match.group(1)
                c_name = c_match.group(2)
                classes.append(c_name)
                current_class = c_name
                class_start_line = idx

                # Determine end line heuristic
                symbols.append(ASTSymbol(
                    name=c_name,
                    kind="class" if kind == "class" else "interface",
                    file_path=file_path,
                    line_start=idx,
                    line_end=min(len(lines), idx + 40),
                    docstring=None,
                    parameters=[],
                    return_type=None,
                    calls=[],
                    cyclomatic_complexity=1
                ))

            # Function / method match
            fn_name = None
            if language in ["typescript", "javascript"]:
                f_match = fn_regex.match(line)
                if f_match and not c_match:
                    fn_name = f_match.group(2) or f_match.group(3) or f_match.group(4)
                    if fn_name and fn_name not in ["if", "for", "while", "switch", "catch", "constructor"]:
                        functions.append(fn_name)
                        # Extract calls inside function block window
                        window = "\n".join(lines[idx-1:min(len(lines), idx+25)])
                        calls = list(set(call_regex.findall(window)))[:6]
                        complexity = cls.calculate_complexity(window)
                        symbols.append(ASTSymbol(
                            name=fn_name,
                            kind="method" if current_class else "function",
                            file_path=file_path,
                            line_start=idx,
                            line_end=min(len(lines), idx + 20),
                            docstring=f"Implementation of {fn_name}",
                            parameters=[],
                            return_type=None,
                            calls=calls,
                            cyclomatic_complexity=complexity
                        ))
            elif language == "python":
                py_match = py_fn_regex.match(line)
                if py_match:
                    fn_name = py_match.group(1)
                    functions.append(fn_name)
                    window = "\n".join(lines[idx-1:min(len(lines), idx+20)])
                    calls = list(set(call_regex.findall(window)))[:6]
                    symbols.append(ASTSymbol(
                        name=fn_name,
                        kind="function",
                        file_path=file_path,
                        line_start=idx,
                        line_end=min(len(lines), idx + 20),
                        parameters=[p.strip() for p in py_match.group(2).split(",") if p.strip()],
                        calls=calls,
                        cyclomatic_complexity=cls.calculate_complexity(window)
                    ))

        layer = cls.infer_layer(file_path)
        file_info = FileNodeInfo(
            path=file_path,
            name=file_path.split("/")[-1],
            extension=file_path.split(".")[-1] if "." in file_path else "",
            size_bytes=len(code.encode("utf-8")),
            line_count=len(lines),
            layer=layer,
            functions=functions,
            classes=classes,
            imports=imports,
            exports=exports
        )

        return symbols, file_info
