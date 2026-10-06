import React, { useState, useEffect } from 'react';
import { DependencyGraphCanvas } from '../components/graph/DependencyGraphCanvas';
import { useRepository } from '../hooks/useRepository';
import { api } from '../services/api';
import { DependencyGraphData } from '../types';
import { Sparkles } from 'lucide-react';

export const GraphPage: React.FC = () => {
  const { repository } = useRepository();
  const [graphData, setGraphData] = useState<DependencyGraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGraph = async () => {
      if (!repository) return;
      try {
        setLoading(true);
        const data = await api.getGraph(repository.id);
        setGraphData(data);
      } catch (err) {
        console.error('Failed to load dependency graph:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [repository]);

  if (loading || !graphData) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-xs font-mono text-dark-400">
        <Sparkles className="w-4 h-4 text-brand-400 animate-spin mr-2" />
        <span>Building NetworkX architectural dependency graph...</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-dark-950 overflow-hidden">
      <DependencyGraphCanvas data={graphData} />
    </div>
  );
};
