"""
Dependency Graph Engine for RepoMind.
Builds and queries multi-layer software architecture graphs using NetworkX.
Supports repository-isolated graphs, call chain tracing, and upstream/downstream impact analysis.
"""

from typing import Dict, List, Any, Set, Tuple, Optional
import networkx as nx
from app.models.schemas import GraphNode, GraphEdge, DependencyGraphData


class DependencyGraphService:
    def __init__(self):
        self.graphs: Dict[str, nx.DiGraph] = {}
        self.files_maps: Dict[str, Dict[str, Any]] = {}

    @property
    def graph(self) -> nx.DiGraph:
        """Fallback property for backwards compatibility with legacy callers."""
        return self.graphs.get("demo-ecommerce", nx.DiGraph())

    def _get_or_create_graph(self, repo_id: str) -> nx.DiGraph:
        if repo_id not in self.graphs:
            self.graphs[repo_id] = nx.DiGraph()
        return self.graphs[repo_id]

    def build_from_repo_data(
        self,
        files_data: Dict[str, Dict[str, Any]],
        repo_id: str = "demo-ecommerce"
    ) -> DependencyGraphData:
        """Constructs an architectural directed dependency graph strictly isolated for repo_id."""
        g = nx.DiGraph()
        self.graphs[repo_id] = g
        self.files_maps[repo_id] = files_data

        # 1. Add File Nodes
        for path, info in files_data.items():
            layer = info.get("layer", "service")
            g.add_node(
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
                if sym_kind in ["class", "method", "function", "interface"]:
                    g.add_node(
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
                    g.add_edge(sym_id, path, relationship="defined_in")

        # 2. Add Edges based on Dependencies & Calls
        for path, info in files_data.items():
            deps = info.get("dependencies", [])
            for dep in deps:
                if dep in files_data:
                    g.add_edge(path, dep, relationship="imports", label="imports")

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
                                if g.has_node(sym_id) and g.has_node(target_id):
                                    g.add_edge(sym_id, target_id, relationship="calls", label="calls")
                                elif g.has_node(path) and g.has_node(other_path):
                                    if path != other_path:
                                        g.add_edge(path, other_path, relationship="calls", label="invokes")

        # Compile Pydantic response
        nodes: List[GraphNode] = []
        for n_id, attrs in g.nodes(data=True):
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
        for src, dst, attrs in g.edges(data=True):
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
            "density": float(nx.density(g)) if len(nodes) > 0 else 0.0,
            "is_dag": nx.is_directed_acyclic_graph(g)
        }

        return DependencyGraphData(
            nodes=nodes,
            edges=edges,
            layers=layers,
            stats=stats
        )

    def get_call_chain(self, target: str, repo_id: str = "demo-ecommerce") -> List[Dict[str, Any]]:
        """Traces incoming and outgoing call paths for a target node within repo_id."""
        g = self.graphs.get(repo_id)
        if not g:
            # Fallback to the first available graph if repo_id not explicitly given
            g = next(iter(self.graphs.values()), None) if self.graphs else None
            if not g:
                return []

        chain = []
        target_node = target
        if not g.has_node(target_node):
            clean_sym = target.split(".")[-1]
            for node in g.nodes:
                if target == node or node.endswith(f"::{target}") or node.endswith(f"::{clean_sym}"):
                    target_node = node
                    break
            if not g.has_node(target_node):
                for node in g.nodes:
                    if target in node or clean_sym in node:
                        target_node = node
                        break

        if not g.has_node(target_node):
            return []

        # Find callers (predecessors)
        for pred in g.predecessors(target_node):
            chain.append({
                "type": "caller",
                "source": pred,
                "target": target_node,
                "relationship": g.get_edge_data(pred, target_node).get("relationship", "calls")
            })

        # Find callees (successors)
        for succ in g.successors(target_node):
            chain.append({
                "type": "callee",
                "source": target_node,
                "target": succ,
                "relationship": g.get_edge_data(target_node, succ).get("relationship", "calls")
            })

        return chain

    def get_upstream_impact(self, target: str, repo_id: str = "demo-ecommerce") -> Tuple[List[str], List[str]]:
        """Finds direct and indirect upstream nodes that depend on target within repo_id."""
        g = self.graphs.get(repo_id)
        if not g:
            g = next(iter(self.graphs.values()), None) if self.graphs else None
            if not g:
                return [], []

        target_node = None
        clean_sym = target.split(".")[-1]
        for node in g.nodes:
            if target == node or node.endswith(f"::{target}") or node.endswith(f"::{clean_sym}"):
                target_node = node
                break
        if not target_node:
            for node in g.nodes:
                if target in node or clean_sym in node:
                    target_node = node
                    break

        if not target_node:
            return [], []

        # Direct callers
        direct_callers = list(g.predecessors(target_node))
        direct = [d.split("::")[-1] for d in direct_callers]

        # Multi-hop upstream ancestors
        visited: Set[str] = set(direct_callers)
        queue = list(direct_callers)
        indirect: List[str] = []
        while queue:
            curr = queue.pop(0)
            for pred in g.predecessors(curr):
                if pred not in visited and pred != target_node:
                    visited.add(pred)
                    queue.append(pred)
                    indirect.append(pred.split("::")[-1])

        return direct, list(set(indirect))

    def delete_repository_graph(self, repo_id: str) -> None:
        """Removes graph for repo_id."""
        self.graphs.pop(repo_id, None)
        self.files_maps.pop(repo_id, None)
