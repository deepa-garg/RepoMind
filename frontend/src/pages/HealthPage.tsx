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
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans animate-fade-in transition-colors">
      <div>
        <h1 className="text-2xl font-serif font-medium text-theme-primary tracking-tight flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-theme-success" />
          <span>Codebase Health & Quality Index</span>
        </h1>
        <p className="text-xs text-theme-secondary mt-1">
          Multidimensional quality score evaluated directly from AST parsing and dependency graph density.
        </p>
      </div>

      <div className="p-8 rounded-card bg-theme-surface border border-theme-border flex flex-col sm:flex-row items-center justify-between gap-6 shadow-card">
        <div className="space-y-2 text-center sm:text-left">
          <span className="text-[11px] font-sans uppercase text-theme-muted tracking-[0.06em] font-semibold">
            Composite Index
          </span>
          <div className="text-5xl sm:text-6xl font-serif font-medium text-theme-success tracking-tight">
            {health.overall} <span className="text-lg font-sans font-normal text-theme-muted">/ 100</span>
          </div>
          <p className="text-xs text-theme-secondary max-w-md leading-relaxed">
            Overall repository health rating is strong. Architecture follows clear N-tier boundaries
            with isolated database transactions and active test suites.
          </p>
        </div>

        <div className="p-5 rounded-[10px] bg-theme-subtle border border-theme-border space-y-2.5 text-xs font-sans shrink-0 w-64 shadow-subtle">
          <div className="text-[10px] uppercase font-semibold text-theme-muted tracking-[0.06em]">Underlying AST Inputs</div>
          <div className="flex justify-between text-theme-secondary">
            <span>Total Files:</span>
            <strong className="text-theme-primary font-mono">{health.metrics_detail.total_files}</strong>
          </div>
          <div className="flex justify-between text-theme-secondary">
            <span>Test Suites:</span>
            <strong className="text-theme-primary font-mono">{health.metrics_detail.test_files}</strong>
          </div>
          <div className="flex justify-between text-theme-secondary">
            <span>Indexed Symbols:</span>
            <strong className="text-theme-primary font-mono">{health.metrics_detail.total_symbols}</strong>
          </div>
          <div className="flex justify-between text-theme-secondary">
            <span>Avg Complexity:</span>
            <strong className="text-theme-primary font-mono">{health.metrics_detail.average_complexity}</strong>
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
              className={`p-5 rounded-card border cursor-pointer transition-all space-y-3 shadow-card ${
                isSelected
                  ? 'bg-theme-surface border-theme-accent ring-1 ring-theme-accent/30'
                  : 'bg-theme-surface border-theme-border hover:border-theme-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-[8px] bg-theme-subtle text-theme-accent">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-theme-primary font-sans">{m.label}</span>
                </div>
                <span className="text-sm font-serif font-medium text-theme-success">
                  {m.score} / 100
                </span>
              </div>

              <div className="h-2 w-full bg-theme-track rounded-full overflow-hidden block relative">
                <div
                  className="h-full bg-theme-success rounded-full transition-all duration-600"
                  style={{
                    width: `${m.score}%`,
                    minWidth: m.score > 0 ? '4px' : '0px',
                  }}
                ></div>
              </div>

              <p className="text-xs text-theme-secondary leading-relaxed font-sans">{m.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="p-6 rounded-card bg-theme-surface border border-theme-border space-y-2.5 shadow-card">
        <h3 className="text-xs font-sans uppercase text-theme-muted font-semibold tracking-[0.06em] flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-theme-accent" />
          <span>Metric Analysis: {selectedMetric.toUpperCase()}</span>
        </h3>
        <p className="text-xs text-theme-primary leading-relaxed font-sans">
          {health.explanations[selectedMetric]}
        </p>
      </div>
    </div>
  );
};
