"""
Dependency Graph Engine for RepoMind.
Builds and queries multi-layer software architecture graphs using NetworkX.
Supports file, class, and function-level granularity, call chain tracing, and impact paths.
"""

from typing import Dict, List, Any, Set, Tuple
import networkx as nx
from app.models.schemas import GraphNode, GraphEdge, DependencyGraphData

class DependencyGraphService:
    def __init__(self):
        self.graph = nx.DiGraph()
        self.files_map: Dict[str, Any] = {}

    def build_from_repo_data(self, files_data: Dict[str, Dict[str, Any]]) -> DependencyGraphData:
        """Constructs an architectural directed dependency graph from repository files and AST symbols."""
        self.graph.clear()
        self.files_map = files_data

        # 1. Add File Nodes
        for path, info in files_data.items():
            layer = info.get("layer", "service")
            self.graph.add_node(
                path,
                label=path.split("/")[-1],
                kind="file",
                file_path=path,
                layer=layer,
                line=1,
                metrics={
                    "lines": len(info.get("content", "").split("\n")),
                    "symbols": len(info.get("symbols", [])),
                    "layer": layer
                }
            )

            # Add Class & Function sub-nodes for key architectural components
            for sym in info.get("symbols", []):
                sym_name = sym["name"]
                sym_id = f"{path}::{sym_name}"
                sym_kind = sym.get("kind", "function")
                if sym_kind in ["class", "method", "function"]:
                    self.graph.add_node(
                        sym_id,
                        label=sym_name,
                        kind=sym_kind,
                        file_path=path,
                        layer=layer,
                        line=sym.get("line_start", 1),
                        metrics={
                            "complexity": sym.get("cyclomatic_complexity", 1),
                            "calls_count": len(sym.get("calls", []))
                        }
                    )
                    # Connect symbol to its containing file
                    self.graph.add_edge(sym_id, path, relationship="defined_in")

        # 2. Add Edges based on Dependencies & Calls
        for path, info in files_data.items():
            deps = info.get("dependencies", [])
            for dep in deps:
                if dep in files_data:
                    self.graph.add_edge(path, dep, relationship="imports", label="imports")

            # Symbol call edges
            for sym in info.get("symbols", []):
                sym_id = f"{path}::{sym['name']}"
                for call_str in sym.get("calls", []):
                    # Search for matching target symbol across files
                    target_symbol_name = call_str.split(".")[-1]
                    for other_path, other_info in files_data.items():
                        for other_sym in other_info.get("symbols", []):
                            if other_sym["name"] == target_symbol_name or other_sym["name"] == call_str.split(".")[0]:
                                target_id = f"{other_path}::{other_sym['name']}"
                                if self.graph.has_node(sym_id) and self.graph.has_node(target_id):
                                    self.graph.add_edge(sym_id, target_id, relationship="calls", label="calls")
                                elif self.graph.has_node(path) and self.graph.has_node(other_path):
                                    if path != other_path:
                                        self.graph.add_edge(path, other_path, relationship="calls", label="invokes")

        # Compile Pydantic response
        nodes: List[GraphNode] = []
        for n_id, attrs in self.graph.nodes(data=True):
            nodes.append(GraphNode(
                id=n_id,
                label=attrs.get("label", n_id),
                kind=attrs.get("kind", "file"),
                file_path=attrs.get("file_path", ""),
                layer=attrs.get("layer", "service"),
                line=attrs.get("line", 1),
                metrics=attrs.get("metrics", {})
            ))

        edges: List[GraphEdge] = []
        edge_idx = 0
        for src, dst, attrs in self.graph.edges(data=True):
            edge_idx += 1
            edges.append(GraphEdge(
                id=f"e_{src}_{dst}_{edge_idx}",
                source=src,
                target=dst,
                relationship=attrs.get("relationship", "depends_on"),
                label=attrs.get("label", attrs.get("relationship"))
            ))

        layers = ["presentation", "service", "repository", "database", "model", "test", "utility"]
        stats = {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "density": float(nx.density(self.graph)) if len(nodes) > 0 else 0.0,
            "is_dag": nx.is_directed_acyclic_graph(self.graph)
        }

        return DependencyGraphData(
            nodes=nodes,
            edges=edges,
            layers=layers,
            stats=stats
        )

    def get_call_chain(self, target: str) -> List[Dict[str, Any]]:
        """Traces incoming and outgoing call paths for a target node."""
        chain = []
        if not self.graph.has_node(target):
            # Try fuzzy match on symbol or file
            for node in self.graph.nodes:
                if target in node:
                    target = node
                    break

        if not self.graph.has_node(target):
            return []

        # Find callers (predecessors)
        predecessors = list(self.graph.predecessors(target))
        for pred in predecessors:
            chain.append({
                "type": "caller",
                "source": pred,
                "target": target,
                "relationship": self.graph.get_edge_data(pred, target).get("relationship", "calls")
            })

        # Find callees (successors)
        successors = list(self.graph.successors(target))
        for succ in successors:
            chain.append({
                "type": "callee",
                "source": target,
                "target": succ,
                "relationship": self.graph.get_edge_data(target, succ).get("relationship", "calls")
            })

        return chain

    def get_upstream_impact(self, target: str) -> Tuple[List[str], List[str]]:
        """Finds direct and indirect upstream nodes that depend on target."""
        direct = []
        indirect = []
        
        target_node = None
        for node in self.graph.nodes:
            if target == node or node.endswith(f"::{target}") or target in node:
                target_node = node
                break

        if not target_node:
            return [], []

        # Direct callers
        direct_callers = list(self.graph.predecessors(target_node))
        direct = [d.split("::")[-1] for d in direct_callers]

        # Multi-hop upstream ancestors
        visited: Set[str] = set(direct_callers)
        queue = list(direct_callers)
        while queue:
            curr = queue.pop(0)
            for pred in self.graph.predecessors(curr):
                if pred not in visited and pred != target_node:
                    visited.add(pred)
                    queue.append(pred)
                    indirect.append(pred.split("::")[-1])

        return direct, list(set(indirect))
