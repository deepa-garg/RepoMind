"""
AST Parser & Syntax-Aware Chunking Service for RepoMind.
Utilizes Tree-sitter for Python, TypeScript, and JavaScript with robust fallback.
Extracts functions, classes, methods, interfaces, imports, and calls.
Produces syntax-aware, verified CodeChunk entities with line-boundary validation.
"""

import ast
import re
import hashlib
from typing import List, Dict, Any, Tuple, Optional
from app.models.schemas import ASTSymbol, FileNodeInfo, CodeChunk
from app.core.config import settings

# Tree-sitter language parsers initialization
TREE_SITTER_PARSERS: Dict[str, Any] = {}

try:
    from tree_sitter import Language, Parser
    import tree_sitter_python
    import tree_sitter_javascript
    import tree_sitter_typescript

    py_lang = Language(tree_sitter_python.language())
    js_lang = Language(tree_sitter_javascript.language())
    ts_lang = Language(tree_sitter_typescript.language_typescript())
    tsx_lang = Language(tree_sitter_typescript.language_tsx())

    TREE_SITTER_PARSERS["python"] = Parser(py_lang)
    TREE_SITTER_PARSERS["javascript"] = Parser(js_lang)
    TREE_SITTER_PARSERS["typescript"] = Parser(ts_lang)
    TREE_SITTER_PARSERS["tsx"] = Parser(tsx_lang)
    TREE_SITTER_AVAILABLE = True
except Exception:
    TREE_SITTER_AVAILABLE = False


class ASTParser:
    """Parses code files using Tree-sitter with robust fallback to extract symbols and syntax chunks."""

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
    def _parse_python_tree_sitter(cls, code: str, file_path: str) -> List[ASTSymbol]:
        lines = code.split("\n")
        symbols: List[ASTSymbol] = []

        # 1. Primary Python Parser: Standard Library ast (robust across all Python versions, 100% memory-safe)
        try:
            py_tree = ast.parse(code)

            def get_calls(node) -> List[str]:
                calls = []
                for n in ast.walk(node):
                    if isinstance(n, ast.Call):
                        if isinstance(n.func, ast.Name):
                            calls.append(n.func.id)
                        elif isinstance(n.func, ast.Attribute):
                            calls.append(n.func.attr)
                return list(dict.fromkeys(calls))[:8]

            for node in py_tree.body:
                if isinstance(node, ast.ClassDef):
                    start_l = node.decorator_list[0].lineno if node.decorator_list else node.lineno
                    end_l = getattr(node, "end_lineno", node.lineno)
                    symbols.append(ASTSymbol(
                        name=node.name,
                        kind="class",
                        file_path=file_path,
                        line_start=start_l,
                        line_end=end_l,
                        docstring=ast.get_docstring(node),
                        parameters=[],
                        return_type=None,
                        calls=[],
                        cyclomatic_complexity=1
                    ))
                    for m in node.body:
                        if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            m_start = m.decorator_list[0].lineno if m.decorator_list else m.lineno
                            m_end = getattr(m, "end_lineno", m.lineno)
                            params = [arg.arg for arg in m.args.args if arg.arg != "self"]
                            ret_type = ast.unparse(m.returns) if getattr(m, "returns", None) else None
                            snippet = "\n".join(lines[m_start - 1:m_end])
                            symbols.append(ASTSymbol(
                                name=m.name,
                                kind="method",
                                file_path=file_path,
                                line_start=m_start,
                                line_end=m_end,
                                docstring=ast.get_docstring(m),
                                parameters=params,
                                return_type=ret_type,
                                calls=get_calls(m),
                                cyclomatic_complexity=cls.calculate_complexity(snippet)
                            ))
                elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    f_start = node.decorator_list[0].lineno if node.decorator_list else node.lineno
                    f_end = getattr(node, "end_lineno", node.lineno)
                    params = [arg.arg for arg in node.args.args]
                    ret_type = ast.unparse(node.returns) if getattr(node, "returns", None) else None
                    snippet = "\n".join(lines[f_start - 1:f_end])
                    symbols.append(ASTSymbol(
                        name=node.name,
                        kind="function",
                        file_path=file_path,
                        line_start=f_start,
                        line_end=f_end,
                        docstring=ast.get_docstring(node),
                        parameters=params,
                        return_type=ret_type,
                        calls=get_calls(node),
                        cyclomatic_complexity=cls.calculate_complexity(snippet)
                    ))
            if symbols:
                return symbols
        except Exception:
            pass

        # 2. Secondary fallback: Tree-sitter if available
        parser = TREE_SITTER_PARSERS.get("python")
        if not parser:
            return []

        code_bytes = bytes(code, "utf-8")
        try:
            tree = parser.parse(code_bytes)
        except Exception:
            return []

        call_regex = re.compile(r"([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)\(")

        def extract_calls(snippet: str) -> List[str]:
            return list(dict.fromkeys(call_regex.findall(snippet)))[:8]

        def get_docstring(node) -> Optional[str]:
            body = node.child_by_field_name("body")
            if body and body.children:
                first_stmt = body.children[0]
                if first_stmt.type == "expression_statement":
                    str_child = first_stmt.children[0] if first_stmt.children else None
                    if str_child and str_child.type == "string":
                        raw = code_bytes[str_child.start_byte:str_child.end_byte].decode("utf-8", errors="ignore")
                        return raw.strip('"""').strip("'''").strip()
            return None

        def visit(node, current_class: Optional[str] = None, depth: int = 0):
            if depth > 40:
                return

            if node.type == "class_definition":
                name_node = node.child_by_field_name("name")
                if name_node:
                    c_name = code_bytes[name_node.start_byte:name_node.end_byte].decode("utf-8", errors="ignore")
                    start_l = node.start_point.row + 1
                    end_l = min(len(lines), node.end_point.row + 1)
                    symbols.append(ASTSymbol(
                        name=c_name,
                        kind="class",
                        file_path=file_path,
                        line_start=start_l,
                        line_end=end_l,
                        docstring=get_docstring(node),
                        parameters=[],
                        return_type=None,
                        calls=[],
                        cyclomatic_complexity=1
                    ))
                    body = node.child_by_field_name("body")
                    if body:
                        for child in body.children:
                            visit(child, current_class=c_name, depth=depth + 1)
                    return

            elif node.type == "function_definition":
                name_node = node.child_by_field_name("name")
                if name_node:
                    f_name = code_bytes[name_node.start_byte:name_node.end_byte].decode("utf-8", errors="ignore")
                    start_l = node.start_point.row + 1
                    end_l = min(len(lines), node.end_point.row + 1)
                    if start_l > end_l:
                        start_l, end_l = end_l, start_l
                    params = []
                    params_node = node.child_by_field_name("parameters")
                    if params_node:
                        for p in params_node.children:
                            if p.type in ["identifier", "typed_parameter", "default_parameter"]:
                                p_text = code_bytes[p.start_byte:p.end_byte].decode("utf-8", errors="ignore")
                                params.append(p_text.split(":")[0].strip())

                    ret_type = None
                    ret_node = node.child_by_field_name("return_type")
                    if ret_node:
                        ret_type = code_bytes[ret_node.start_byte:ret_node.end_byte].decode("utf-8", errors="ignore")

                    snippet = "\n".join(lines[start_l - 1:end_l])
                    calls = extract_calls(snippet)
                    complexity = cls.calculate_complexity(snippet)

                    symbols.append(ASTSymbol(
                        name=f_name,
                        kind="method" if current_class else "function",
                        file_path=file_path,
                        line_start=start_l,
                        line_end=end_l,
                        docstring=get_docstring(node),
                        parameters=params,
                        return_type=ret_type,
                        calls=calls,
                        cyclomatic_complexity=complexity
                    ))
                    return

            elif node.type == "decorated_definition":
                for child in node.children:
                    if child.type in ["function_definition", "class_definition"]:
                        visit(child, current_class=current_class, depth=depth + 1)
                return

            for child in node.children:
                visit(child, current_class=current_class, depth=depth + 1)

        try:
            visit(tree.root_node, depth=0)
        except Exception:
            pass
        return symbols

    @classmethod
    def _parse_ts_js_tree_sitter(cls, code: str, file_path: str, language: str) -> List[ASTSymbol]:
        lang_key = "typescript" if "ts" in language or file_path.endswith(".ts") else "javascript"
        if file_path.endswith(".tsx"):
            lang_key = "tsx"
        parser = TREE_SITTER_PARSERS.get(lang_key) or TREE_SITTER_PARSERS.get("javascript")
        if not parser:
            return []

        code_bytes = bytes(code, "utf-8")
        try:
            tree = parser.parse(code_bytes)
        except Exception:
            return []

        symbols: List[ASTSymbol] = []
        lines = code.split("\n")

        call_regex = re.compile(r"([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)\(")

        def extract_calls(snippet: str) -> List[str]:
            return list(dict.fromkeys(call_regex.findall(snippet)))[:8]

        def visit(node, current_class: Optional[str] = None, depth: int = 0):
            if depth > 40:
                return

            if node.type in ["class_declaration", "interface_declaration"]:
                name_node = node.child_by_field_name("name")
                if name_node:
                    c_name = code_bytes[name_node.start_byte:name_node.end_byte].decode("utf-8", errors="ignore")
                    start_l = node.start_point.row + 1
                    end_l = min(len(lines), node.end_point.row + 1)
                    kind = "class" if node.type == "class_declaration" else "interface"
                    symbols.append(ASTSymbol(
                        name=c_name,
                        kind=kind,
                        file_path=file_path,
                        line_start=start_l,
                        line_end=end_l,
                        docstring=None,
                        parameters=[],
                        return_type=None,
                        calls=[],
                        cyclomatic_complexity=1
                    ))
                    body = node.child_by_field_name("body")
                    if body:
                        for child in body.children:
                            visit(child, current_class=c_name, depth=depth + 1)
                    return

            elif node.type == "method_definition":
                name_node = node.child_by_field_name("name")
                if name_node:
                    m_name = code_bytes[name_node.start_byte:name_node.end_byte].decode("utf-8", errors="ignore")
                    start_l = node.start_point.row + 1
                    end_l = min(len(lines), node.end_point.row + 1)
                    snippet = "\n".join(lines[start_l - 1:end_l])
                    symbols.append(ASTSymbol(
                        name=m_name,
                        kind="method",
                        file_path=file_path,
                        line_start=start_l,
                        line_end=end_l,
                        docstring=None,
                        parameters=[],
                        return_type=None,
                        calls=extract_calls(snippet),
                        cyclomatic_complexity=cls.calculate_complexity(snippet)
                    ))
                    return

            elif node.type == "function_declaration":
                name_node = node.child_by_field_name("name")
                if name_node:
                    f_name = code_bytes[name_node.start_byte:name_node.end_byte].decode("utf-8", errors="ignore")
                    start_l = node.start_point.row + 1
                    end_l = min(len(lines), node.end_point.row + 1)
                    if start_l > end_l:
                        start_l, end_l = end_l, start_l
                    snippet = "\n".join(lines[start_l - 1:end_l])
                    symbols.append(ASTSymbol(
                        name=f_name,
                        kind="function",
                        file_path=file_path,
                        line_start=start_l,
                        line_end=end_l,
                        docstring=None,
                        parameters=[],
                        return_type=None,
                        calls=extract_calls(snippet),
                        cyclomatic_complexity=cls.calculate_complexity(snippet)
                    ))
                    return

            elif node.type == "export_statement":
                for child in node.children:
                    visit(child, current_class=current_class, depth=depth + 1)
                return

            for child in node.children:
                visit(child, current_class=current_class, depth=depth + 1)

        try:
            visit(tree.root_node, depth=0)
        except Exception:
            pass
        return symbols

    @classmethod
    def _parse_fallback_regex(cls, code: str, file_path: str, language: str) -> List[ASTSymbol]:
        """Safe fallback symbol extractor using regular expressions."""
        lines = code.split("\n")
        symbols: List[ASTSymbol] = []
        class_regex = re.compile(r"^(?:export\s+)?(?:default\s+)?(class|interface)\s+([A-Za-z0-9_]+)")
        fn_regex = re.compile(r"^(?:\s*|\s*export\s+)?(?:public\s+|private\s+|protected\s+|async\s+|static\s+)*(function\s+([A-Za-z0-9_]+)|([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^\)]*\)\s*=>|([A-Za-z0-9_]+)\s*\([^\)]*\)\s*(?::\s*[^{]+)?\s*\{)")
        py_fn_regex = re.compile(r"^\s*def\s+([A-Za-z0-9_]+)\s*\((.*?)\)")
        call_regex = re.compile(r"([A-Za-z0-9_]+\.[A-Za-z0-9_]+)\(")

        current_class = None

        for idx, line in enumerate(lines, 1):
            line_str = line.strip()

            c_match = class_regex.match(line_str)
            if c_match:
                kind = c_match.group(1)
                c_name = c_match.group(2)
                current_class = c_name
                symbols.append(ASTSymbol(
                    name=c_name,
                    kind="class" if kind == "class" else "interface",
                    file_path=file_path,
                    line_start=idx,
                    line_end=min(len(lines), idx + 35),
                    docstring=None,
                    parameters=[],
                    return_type=None,
                    calls=[],
                    cyclomatic_complexity=1
                ))

            if language in ["typescript", "javascript"]:
                f_match = fn_regex.match(line)
                if f_match and not c_match:
                    fn_name = f_match.group(2) or f_match.group(3) or f_match.group(4)
                    if fn_name and fn_name not in ["if", "for", "while", "switch", "catch", "constructor"]:
                        window = "\n".join(lines[idx - 1:min(len(lines), idx + 25)])
                        calls = list(set(call_regex.findall(window)))[:6]
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
                            cyclomatic_complexity=cls.calculate_complexity(window)
                        ))
            elif language == "python":
                py_match = py_fn_regex.match(line)
                if py_match:
                    fn_name = py_match.group(1)
                    window = "\n".join(lines[idx - 1:min(len(lines), idx + 20)])
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

        return symbols

    @classmethod
    def parse_file(cls, file_path: str, code: str, language: str = "typescript") -> Tuple[List[ASTSymbol], FileNodeInfo]:
        lines = code.split("\n")
        symbols: List[ASTSymbol] = []
        imports: List[str] = []
        exports: List[str] = []
        classes: List[str] = []
        functions: List[str] = []

        # Extract imports and exports
        for line in lines:
            line_s = line.strip()
            imp_match = re.search(r"import\s+.*?from\s+['\"](.*?)['\"]", line_s)
            if imp_match:
                imports.append(imp_match.group(1))
            py_imp = re.search(r"^(?:from\s+([a-zA-Z0-9_\.]+)\s+)?import\s+([a-zA-Z0-9_,\s]+)", line_s)
            if py_imp:
                imports.append(py_imp.group(1) or py_imp.group(2).strip())
            exp_match = re.search(r"export\s+(?:default\s+)?(?:class|interface|function|const|let|var)\s+([A-Za-z0-9_]+)", line_s)
            if exp_match:
                exports.append(exp_match.group(1))

        # Check if language is a supported code language
        norm_lang = (language or "").lower()
        if norm_lang not in ["python", "typescript", "javascript", "tsx", "jsx", "js", "ts", "py"]:
            symbols = []
        else:
            # Attempt Tree-sitter parsing first
            ts_symbols: List[ASTSymbol] = []
            if norm_lang in ["python", "py"] and "python" in TREE_SITTER_PARSERS:
                ts_symbols = cls._parse_python_tree_sitter(code, file_path)
            elif norm_lang in ["typescript", "javascript", "tsx", "jsx", "js", "ts"] and ("typescript" in TREE_SITTER_PARSERS or "javascript" in TREE_SITTER_PARSERS):
                ts_symbols = cls._parse_ts_js_tree_sitter(code, file_path, norm_lang)

            # Fallback or augment if Tree-sitter found nothing or incomplete syntax
            fallback_symbols = cls._parse_fallback_regex(code, file_path, norm_lang)
            if ts_symbols:
                seen_names = {s.name for s in ts_symbols}
                symbols = list(ts_symbols)
                for fs in fallback_symbols:
                    if fs.name not in seen_names:
                        symbols.append(fs)
            else:
                symbols = fallback_symbols

        for sym in symbols:
            if sym.kind in ["class", "interface"]:
                if sym.name not in classes:
                    classes.append(sym.name)
            elif sym.kind in ["function", "method"]:
                if sym.name not in functions:
                    functions.append(sym.name)

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

    @classmethod
    def chunk_file(
        cls,
        file_path: str,
        code: str,
        language: str = "typescript",
        repo_id: str = "demo-ecommerce",
        repo_url: Optional[str] = None,
        branch: Optional[str] = "main",
        commit_sha: Optional[str] = None
    ) -> List[CodeChunk]:
        """
        Produces validated, syntax-aware CodeChunks preserving repository provenance,
        exact symbol spans, calls, and line ranges.
        Handles oversized functions and fallback chunking gracefully.
        """
        lines = code.split("\n")
        total_lines = len(lines)
        if total_lines == 0 or not code.strip():
            return []

        symbols, file_info = cls.parse_file(file_path, code, language)
        chunks: List[CodeChunk] = []
        covered_ranges: List[Tuple[int, int]] = []
        max_chunk_lines = settings.MAX_CHUNK_LINES
        overlap = settings.CHUNK_OVERLAP_LINES

        def make_chunk_id(start: int, end: int, sym_name: Optional[str] = None, part: int = 1) -> str:
            raw = f"{repo_id}:{file_path}:{start}:{end}:{sym_name or ''}:{part}"
            return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

        # 1. Syntax-aware Chunks for each extracted AST Symbol
        for sym in symbols:
            start = max(1, min(sym.line_start, total_lines))
            end = max(start, min(sym.line_end, total_lines))
            covered_ranges.append((start, end))

            snippet = "\n".join(lines[start - 1:end])
            span_len = end - start + 1

            # Oversized symbol: split into sub-chunks
            if span_len > max_chunk_lines:
                curr = start
                part_idx = 1
                total_parts = ((span_len - 1) // (max_chunk_lines - overlap)) + 1
                while curr <= end:
                    part_end = min(end, curr + max_chunk_lines - 1)
                    sub_snippet = "\n".join(lines[curr - 1:part_end])
                    part_sym_name = f"{sym.name} (part {part_idx}/{total_parts})"
                    search_text = (
                        f"Repository {repo_id} file {file_path} {sym.kind} {part_sym_name}. "
                        f"Calls: {' '.join(sym.calls)}. Implementation:\n{sub_snippet}"
                    )
                    chunks.append(CodeChunk(
                        chunk_id=make_chunk_id(curr, part_end, sym.name, part_idx),
                        repository_id=repo_id,
                        repo_url=repo_url,
                        branch=branch,
                        commit_sha=commit_sha,
                        file_path=file_path,
                        language=language,
                        symbol_name=part_sym_name,
                        symbol_kind=sym.kind,
                        snippet=sub_snippet,
                        line_start=curr,
                        line_end=part_end,
                        calls=sym.calls,
                        layer=file_info.layer,
                        index_version=settings.INDEX_VERSION,
                        embedding_model=settings.EMBEDDING_MODEL,
                        search_text=search_text
                    ))
                    if part_end >= end:
                        break
                    curr = part_end - overlap + 1
                    part_idx += 1
            else:
                search_text = (
                    f"Repository {repo_id} file {file_path} {sym.kind} {sym.name}. "
                    f"Calls: {' '.join(sym.calls)}. Implementation:\n{snippet}"
                )
                chunks.append(CodeChunk(
                    chunk_id=make_chunk_id(start, end, sym.name, 1),
                    repository_id=repo_id,
                    repo_url=repo_url,
                    branch=branch,
                    commit_sha=commit_sha,
                    file_path=file_path,
                    language=language,
                    symbol_name=sym.name,
                    symbol_kind=sym.kind,
                    snippet=snippet,
                    line_start=start,
                    line_end=end,
                    calls=sym.calls,
                    layer=file_info.layer,
                    index_version=settings.INDEX_VERSION,
                    embedding_model=settings.EMBEDDING_MODEL,
                    search_text=search_text
                ))

        # 2. File Overview Chunk
        overview_end = min(35, total_lines)
        overview_snippet = "\n".join(lines[:overview_end])
        sym_summary = ", ".join([s.name for s in symbols[:6]])
        overview_search_text = (
            f"File overview {file_path} in repository {repo_id} layer {file_info.layer}. "
            f"Contains symbols: {sym_summary}.\n{overview_snippet}"
        )
        chunks.append(CodeChunk(
            chunk_id=make_chunk_id(1, overview_end, f"file_overview_{file_info.name}", 1),
            repository_id=repo_id,
            repo_url=repo_url,
            branch=branch,
            commit_sha=commit_sha,
            file_path=file_path,
            language=language,
            symbol_name=file_info.name,
            symbol_kind="file",
            snippet=overview_snippet,
            line_start=1,
            line_end=overview_end,
            calls=[],
            layer=file_info.layer,
            index_version=settings.INDEX_VERSION,
            embedding_model=settings.EMBEDDING_MODEL,
            search_text=overview_search_text
        ))

        # 3. Fallback Sliding Window Chunking for any gaps or files without symbols
        if not symbols and total_lines > overview_end:
            step = max_chunk_lines - overlap
            curr = overview_end + 1
            part_idx = 1
            while curr <= total_lines:
                chunk_end = min(total_lines, curr + max_chunk_lines - 1)
                gap_snippet = "\n".join(lines[curr - 1:chunk_end])
                search_text = f"File {file_path} lines {curr}-{chunk_end}:\n{gap_snippet}"
                chunks.append(CodeChunk(
                    chunk_id=make_chunk_id(curr, chunk_end, None, part_idx),
                    repository_id=repo_id,
                    repo_url=repo_url,
                    branch=branch,
                    commit_sha=commit_sha,
                    file_path=file_path,
                    language=language,
                    symbol_name=None,
                    symbol_kind="chunk",
                    snippet=gap_snippet,
                    line_start=curr,
                    line_end=chunk_end,
                    calls=[],
                    layer=file_info.layer,
                    index_version=settings.INDEX_VERSION,
                    embedding_model=settings.EMBEDDING_MODEL,
                    search_text=search_text
                ))
                if chunk_end >= total_lines:
                    break
                curr = chunk_end - overlap + 1
                part_idx += 1

        # Final verification: validate line bounds against file
        validated_chunks: List[CodeChunk] = []
        for c in chunks:
            if 1 <= c.line_start <= c.line_end <= total_lines:
                validated_chunks.append(c)

        return validated_chunks
