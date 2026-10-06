import React, { useState } from 'react';
import {
  Activity,
  ShieldCheck,
  BookOpen,
  Cpu,
  Layers,
  TestTube2,
  FileCode,
  HelpCircle,
} from 'lucide-react';
import { useRepository } from '../hooks/useRepository';

export const HealthPage: React.FC = () => {
  const { repository } = useRepository();
  const [selectedMetric, setSelectedMetric] = useState<string>('maintainability');

  if (!repository) return null;
  const { codebase_health: health } = repository;

  const metricCards = [
    { id: 'maintainability', label: 'Maintainability', score: health.maintainability, icon: FileCode, desc: 'Function length, modular coupling, and cyclomatic branching thresholds.' },
    { id: 'security', label: 'Security & Auth', score: health.security, icon: ShieldCheck, desc: 'Bearer token enforcement and protection against injection or secret exposure.' },
    { id: 'complexity', label: 'Complexity Bounds', score: health.complexity, icon: Cpu, desc: 'Cyclomatic branching density per function and nest depth metrics.' },
    { id: 'architecture', label: 'Architecture Hygiene', score: health.architecture, icon: Layers, desc: 'Clean tiered separation: Presentation → Service → Repository → Database.' },
    { id: 'testability', label: 'Testability & Suites', score: health.testability, icon: TestTube2, desc: 'Ratio of unit test files covering domain services and controllers.' },
    { id: 'documentation', label: 'Documentation Coverage', score: health.documentation, icon: BookOpen, desc: 'Presence of JSDoc/docstring comments across exported symbols and interfaces.' },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <span>Codebase Health & Quality Index</span>
        </h1>
        <p className="text-xs text-dark-400 mt-1">
          Multidimensional quality score evaluated directly from AST parsing and dependency graph density.
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-dark-900 border border-dark-800 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center sm:text-left">
          <span className="text-xs font-mono uppercase text-dark-400 tracking-wider font-semibold">
            Composite Index
          </span>
          <div className="text-5xl font-black font-mono text-emerald-400 tracking-tight">
            {health.overall} <span className="text-lg text-dark-500 font-normal">/ 100</span>
          </div>
          <p className="text-xs text-dark-300 max-w-md leading-relaxed">
            Overall repository health rating is strong. Architecture follows clear N-tier boundaries
            with isolated database transactions and active test suites.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 space-y-2 text-xs font-mono shrink-0 w-64 shadow-inner">
          <div className="text-[10px] uppercase font-semibold text-dark-400">Underlying AST Inputs</div>
          <div className="flex justify-between text-dark-300">
            <span>Total Files:</span>
            <strong className="text-white">{health.metrics_detail.total_files}</strong>
          </div>
          <div className="flex justify-between text-dark-300">
            <span>Test Suites:</span>
            <strong className="text-white">{health.metrics_detail.test_files}</strong>
          </div>
          <div className="flex justify-between text-dark-300">
            <span>Indexed Symbols:</span>
            <strong className="text-white">{health.metrics_detail.total_symbols}</strong>
          </div>
          <div className="flex justify-between text-dark-300">
            <span>Avg Complexity:</span>
            <strong className="text-white">{health.metrics_detail.average_complexity}</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((m) => {
          const Icon = m.icon;
          const isSelected = selectedMetric === m.id;
          return (
            <div
              key={m.id}
              onClick={() => setSelectedMetric(m.id)}
              className={`p-5 rounded-xl border cursor-pointer transition-all space-y-3 ${
                isSelected
                  ? 'bg-dark-850 border-brand-500/50 ring-1 ring-brand-500/30'
                  : 'bg-dark-900 border-dark-800 hover:border-dark-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-dark-800 text-brand-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white font-mono">{m.label}</span>
                </div>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  {m.score} / 100
                </span>
              </div>

              <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${m.score}%` }}
                ></div>
              </div>

              <p className="text-[11px] text-dark-400 leading-relaxed font-sans">{m.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 space-y-3 shadow-xl">
        <h3 className="text-xs font-mono uppercase text-dark-400 font-semibold tracking-wider flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-brand-400" />
          <span>Metric Analysis: {selectedMetric.toUpperCase()}</span>
        </h3>
        <p className="text-xs text-dark-200 leading-relaxed font-mono">
          {health.explanations[selectedMetric]}
        </p>
      </div>
    </div>
  );
};
