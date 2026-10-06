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
import { Search, Filter, Layers, ArrowUpRight, Shield, Zap, RefreshCw } from 'lucide-react';
import { DependencyGraphData, GraphNode as ApiGraphNode } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useRepository } from '../../hooks/useRepository';

interface Props {
  data: DependencyGraphData;
}

const LAYER_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  presentation: { bg: '#172238', border: '#2563eb', text: '#60a5fa', glow: 'rgba(37,99,235,0.2)' },
  service: { bg: '#192b33', border: '#0284c7', text: '#38bdf8', glow: 'rgba(2,132,199,0.2)' },
  repository: { bg: '#1c2e26', border: '#059669', text: '#34d399', glow: 'rgba(5,150,105,0.2)' },
  database: { bg: '#2b2233', border: '#7c3aed', text: '#a78bfa', glow: 'rgba(124,58,237,0.2)' },
  model: { bg: '#2e261d', border: '#d97706', text: '#fbbf24', glow: 'rgba(217,119,6,0.2)' },
  test: { bg: '#2e1c24', border: '#e11d48', text: '#fb7185', glow: 'rgba(225,29,72,0.2)' },
  utility: { bg: '#1e2430', border: '#475569', text: '#94a3b8', glow: 'rgba(71,85,105,0.2)' },
};

// Custom Node Component
const CustomArchNode = ({ data, selected }: any) => {
  const layerStyle = LAYER_COLORS[data.layer] || LAYER_COLORS.service;
  return (
    <div
      className={`px-3 py-2 rounded-lg border transition-all duration-200 cursor-pointer shadow-lg min-w-[150px] ${
        selected ? 'ring-2 ring-brand-400 scale-105' : 'hover:border-dark-400'
      }`}
      style={{
        backgroundColor: layerStyle.bg,
        borderColor: selected ? '#38bdf8' : layerStyle.border,
        boxShadow: selected ? `0 0 20px ${layerStyle.glow}` : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold tracking-wider"
          style={{ backgroundColor: `${layerStyle.border}33`, color: layerStyle.text }}
        >
          {data.layer}
        </span>
        <span className="text-[10px] text-dark-400 font-mono">{data.kind}</span>
      </div>
      <div className="text-xs font-semibold text-white tracking-tight truncate font-mono">
        {data.label}
      </div>
      <div className="text-[10px] text-dark-400 truncate mt-0.5">
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
            stroke: isSelected ? '#38bdf8' : '#28374f',
            strokeWidth: isSelected ? 2.5 : 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isSelected ? '#38bdf8' : '#28374f',
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
    <div className="h-full w-full flex flex-col bg-dark-950 relative overflow-hidden">
      {/* Top Filter and Controls Bar */}
      <div className="h-12 px-4 bg-dark-900 border-b border-dark-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {/* Node Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-dark-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter nodes..."
              className="pl-8 pr-3 py-1 bg-dark-850 border border-dark-750 rounded text-xs text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 font-mono w-44"
            />
          </div>

          {/* Layer Selector */}
          <div className="flex items-center gap-1.5 text-xs text-dark-300">
            <Filter className="w-3.5 h-3.5 text-dark-400" />
            <select
              value={selectedLayer}
              onChange={(e) => setSelectedLayer(e.target.value)}
              className="bg-dark-850 border border-dark-750 rounded px-2 py-1 text-xs text-dark-200 focus:outline-none focus:border-brand-500 font-mono"
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
        <div className="flex items-center gap-4 text-xs font-mono text-dark-400">
          <div>
            Nodes: <span className="text-white font-semibold">{data.nodes.length}</span>
          </div>
          <div>
            Edges: <span className="text-white font-semibold">{data.edges.length}</span>
          </div>
          <div className="hidden sm:block">
            DAG: <span className="text-emerald-400">{data.stats.is_dag ? 'Acyclic' : 'Cyclic'}</span>
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
          <Background color="#151e2e" gap={18} size={1} />
          <Controls className="bg-dark-900 border border-dark-800 fill-white text-white rounded-lg shadow-xl" />
          <MiniMap
            className="bg-dark-900 border border-dark-800 rounded-lg overflow-hidden"
            nodeColor={(n: any) => {
              const layer = n.data?.layer || 'service';
              return LAYER_COLORS[layer]?.border || '#38bdf8';
            }}
          />
        </ReactFlow>

        {/* Selected Node Details Drawer */}
        {selectedNodeData && (
          <div className="absolute right-4 top-4 bottom-4 w-80 bg-dark-900 border border-dark-750 rounded-xl shadow-2xl p-4 flex flex-col justify-between z-20 backdrop-blur-md animate-fade-in">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-dark-800">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold"
                    style={{
                      backgroundColor: `${LAYER_COLORS[selectedNodeData.layer]?.border}33`,
                      color: LAYER_COLORS[selectedNodeData.layer]?.text,
                    }}
                  >
                    {selectedNodeData.layer}
                  </span>
                  <span className="text-xs text-dark-400 font-mono">{selectedNodeData.kind}</span>
                </div>
                <button
                  onClick={() => setSelectedNodeData(null)}
                  className="text-dark-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white font-mono break-all">
                  {selectedNodeData.label}
                </h3>
                <p className="text-xs text-dark-400 font-mono mt-1 break-all">
                  {selectedNodeData.file_path}
                </p>
              </div>

              {/* Metrics */}
              <div className="p-3 bg-dark-850 rounded-lg border border-dark-750 space-y-1.5 text-xs">
                <div className="text-[11px] font-mono text-dark-400 font-semibold uppercase tracking-wider">
                  AST Metrics
                </div>
                {Object.entries(selectedNodeData.metrics).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between font-mono text-xs">
                    <span className="text-dark-400 capitalize">{k.replace('_', ' ')}:</span>
                    <span className="text-white font-semibold">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-4 border-t border-dark-800">
              <button
                onClick={() =>
                  handleOpenInExplorer(selectedNodeData.file_path, selectedNodeData.line || 1)
                }
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-dark-800 hover:bg-dark-750 border border-dark-700 text-xs text-white font-medium transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-brand-400" />
                <span>Open in Monaco Editor</span>
              </button>

              <button
                onClick={() => handleRunImpact(selectedNodeData.label)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs text-white font-medium transition-colors"
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
