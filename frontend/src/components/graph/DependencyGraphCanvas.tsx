import React, { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Search, Filter, Layers, ArrowUpRight, Zap } from 'lucide-react';
import { DependencyGraphData, GraphNode as ApiGraphNode } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useRepository } from '../../hooks/useRepository';

interface Props {
  data: DependencyGraphData;
}

const LAYER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  presentation: { bg: 'rgba(63, 108, 168, 0.12)', border: '#3F6CA8', text: '#3F6CA8' },
  service: { bg: 'rgba(27, 94, 63, 0.12)', border: '#1B5E3F', text: '#1B5E3F' },
  repository: { bg: 'rgba(47, 122, 89, 0.12)', border: '#2F7A59', text: '#2F7A59' },
  database: { bg: 'rgba(107, 91, 168, 0.12)', border: '#6B5BA8', text: '#6B5BA8' },
  model: { bg: 'rgba(184, 130, 31, 0.12)', border: '#B8821F', text: '#B8821F' },
  test: { bg: 'rgba(181, 65, 47, 0.12)', border: '#B5412F', text: '#B5412F' },
  utility: { bg: 'rgba(61, 60, 57, 0.12)', border: '#3D3C39', text: '#1F1E1D' },
};

// Custom Node Component
const CustomArchNode = ({ data, selected }: any) => {
  const layerStyle = LAYER_COLORS[data.layer] || LAYER_COLORS.service;
  return (
    <div
      className={`px-3.5 py-2.5 rounded-card border bg-theme-surface transition-all duration-200 cursor-pointer shadow-card min-w-[160px] ${
        selected ? 'ring-2 ring-theme-accent scale-105' : 'hover:border-theme-border'
      }`}
      style={{
        borderColor: selected ? 'var(--accent)' : 'var(--border)',
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span
          className="text-[9px] font-sans uppercase px-2 py-0.5 rounded-full font-semibold tracking-wider"
          style={{ backgroundColor: layerStyle.bg, color: layerStyle.text }}
        >
          {data.layer}
        </span>
        <span className="text-[10px] text-theme-muted font-sans font-medium">{data.kind}</span>
      </div>
      <div className="text-xs font-semibold text-theme-primary tracking-tight truncate font-mono">
        {data.label}
      </div>
      <div className="text-[10px] text-theme-muted truncate mt-0.5 font-mono">
        {data.filePath.split('/').pop()}
      </div>
    </div>
  );
};

const nodeTypes = {
  custom: CustomArchNode,
};

export const DependencyGraphCanvas: React.FC<Props> = ({ data }) => {
  const navigate = useNavigate();
  const { jumpToFileLine } = useRepository();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLayer, setSelectedLayer] = useState<string>('all');
  const [selectedNodeData, setSelectedNodeData] = useState<ApiGraphNode | null>(null);

  // Compute Layout Positions by Architectural Layer (columns)
  const layerColumns: Record<string, number> = {
    presentation: 50,
    service: 320,
    repository: 590,
    database: 860,
    model: 860,
    test: 50,
    utility: 590,
  };

  const initialNodes: Node[] = useMemo(() => {
    const layerRowCounters: Record<string, number> = {};

    return data.nodes
      .filter((n) => {
        if (selectedLayer !== 'all' && n.layer !== selectedLayer) return false;
        if (searchQuery && !n.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .map((node) => {
        const colX = layerColumns[node.layer] || 300;
        const rowIndex = layerRowCounters[node.layer] || 0;
        layerRowCounters[node.layer] = rowIndex + 1;
        const rowY = 80 + rowIndex * 95;

        return {
          id: node.id,
          type: 'custom',
          position: { x: colX, y: rowY },
          data: {
            label: node.label,
            kind: node.kind,
            layer: node.layer,
            filePath: node.file_path,
            metrics: node.metrics,
            line: node.line,
          },
        };
      });
  }, [data.nodes, selectedLayer, searchQuery]);

  const initialEdges: Edge[] = useMemo(() => {
    const visibleNodeIds = new Set(initialNodes.map((n) => n.id));

    return data.edges
      .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      .map((edge) => {
        const isSelected =
          selectedNodeData &&
          (edge.source === selectedNodeData.id || edge.target === selectedNodeData.id);

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          animated: edge.relationship === 'calls',
          style: {
            stroke: isSelected ? 'var(--accent)' : 'var(--border)',
            strokeWidth: isSelected ? 2.5 : 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isSelected ? 'var(--accent)' : 'var(--border)',
            width: 14,
            height: 14,
          },
        };
      });
  }, [data.edges, initialNodes, selectedNodeData]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      const match = data.nodes.find((n) => n.id === node.id);
      if (match) setSelectedNodeData(match);
    },
    [data.nodes]
  );

  const handleOpenInExplorer = (filePath: string, line: number = 1) => {
    jumpToFileLine(filePath, line);
    navigate('/explorer');
  };

  const handleRunImpact = (target: string) => {
    navigate(`/impact?target=${encodeURIComponent(target)}`);
  };

  return (
    <div className="h-full w-full flex flex-col bg-theme-bg relative overflow-hidden font-sans">
      {/* Top Filter and Controls Bar */}
      <div className="h-12 px-5 bg-theme-surface border-b border-theme-border flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          {/* Node Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-theme-muted absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter nodes..."
              className="pl-8 pr-3 py-1 bg-theme-surface border border-theme-border rounded-[10px] text-xs text-theme-primary placeholder-theme-muted focus:outline-none focus:border-theme-accent focus:ring-2 focus:ring-theme-accent/40 font-sans w-48 transition-all"
            />
          </div>

          {/* Layer Selector */}
          <div className="flex items-center gap-1.5 text-xs text-theme-secondary">
            <Filter className="w-3.5 h-3.5 text-theme-muted" />
            <select
              value={selectedLayer}
              onChange={(e) => setSelectedLayer(e.target.value)}
              className="bg-theme-surface border border-theme-border rounded-[10px] px-2.5 py-1 text-xs text-theme-primary focus:outline-none focus:border-theme-accent font-sans transition-all"
            >
              <option value="all">All Layers</option>
              <option value="presentation">Presentation (Controllers / Middleware)</option>
              <option value="service">Service (Business Logic)</option>
              <option value="repository">Repository (Data Access)</option>
              <option value="database">Database (Storage)</option>
              <option value="test">Tests</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs font-sans text-theme-muted">
          <div>
            Nodes: <span className="text-theme-primary font-semibold font-serif text-sm">{data.nodes.length}</span>
          </div>
          <div>
            Edges: <span className="text-theme-primary font-semibold font-serif text-sm">{data.edges.length}</span>
          </div>
          <div className="hidden sm:block">
            DAG: <span className="text-theme-success font-medium">{data.stats.is_dag ? 'Acyclic' : 'Cyclic'}</span>
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
        >
          <Background color="var(--border)" gap={20} size={1} />
          <Controls className="bg-theme-surface border border-theme-border fill-theme-primary text-theme-primary rounded-card shadow-card" />
          <MiniMap
            className="bg-theme-surface border border-theme-border rounded-card shadow-card overflow-hidden"
            nodeColor={(n: any) => {
              const layer = n.data?.layer || 'service';
              return LAYER_COLORS[layer]?.border || '#1B5E3F';
            }}
          />
        </ReactFlow>

        {/* Selected Node Details Drawer */}
        {selectedNodeData && (
          <div className="absolute right-4 top-4 bottom-4 w-84 bg-theme-surface border border-theme-border rounded-card shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-5 flex flex-col justify-between z-20 animate-fade-in">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-theme-border">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-sans uppercase px-2 py-0.5 rounded-full font-semibold tracking-wider"
                    style={{
                      backgroundColor: LAYER_COLORS[selectedNodeData.layer]?.bg,
                      color: LAYER_COLORS[selectedNodeData.layer]?.text,
                    }}
                  >
                    {selectedNodeData.layer}
                  </span>
                  <span className="text-xs text-theme-muted font-sans font-medium">{selectedNodeData.kind}</span>
                </div>
                <button
                  onClick={() => setSelectedNodeData(null)}
                  className="text-theme-muted hover:text-theme-primary text-xs p-1"
                >
                  ✕
                </button>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-theme-primary font-mono break-all">
                  {selectedNodeData.label}
                </h3>
                <p className="text-xs text-theme-muted font-mono mt-1 break-all">
                  {selectedNodeData.file_path}
                </p>
              </div>

              {/* Metrics */}
              <div className="p-3.5 bg-theme-subtle rounded-card border border-theme-border space-y-2 text-xs">
                <div className="text-[11px] font-sans text-theme-muted font-semibold uppercase tracking-[0.06em]">
                  AST Metrics
                </div>
                {Object.entries(selectedNodeData.metrics).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between font-mono text-xs">
                    <span className="text-theme-secondary capitalize">{k.replace('_', ' ')}:</span>
                    <span className="text-theme-primary font-semibold">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-4 border-t border-theme-border">
              <button
                onClick={() =>
                  handleOpenInExplorer(selectedNodeData.file_path, selectedNodeData.line || 1)
                }
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-[10px] bg-theme-surface hover:bg-theme-subtle border border-theme-border text-xs text-theme-primary font-medium transition-all"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-theme-accent" />
                <span>Open in Monaco Editor</span>
              </button>

              <button
                onClick={() => handleRunImpact(selectedNodeData.label)}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-[10px] bg-theme-accent hover:bg-theme-accent-hover text-xs text-white font-medium transition-all shadow-sm border-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Run Impact Analysis</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
