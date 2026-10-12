import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCode,
  Code2,
  Box,
  Layers,
  TestTube2,
  BookOpen,
  Activity,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useRepository } from '../hooks/useRepository';

export const DashboardPage: React.FC = () => {
  const { repository, loading } = useRepository();
  const navigate = useNavigate();

  if (loading || !repository) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-sm text-theme-muted">
        <Sparkles className="w-4 h-4 text-theme-accent animate-spin mr-2" />
        <span>Loading repository intelligence data...</span>
      </div>
    );
  }

  const { codebase_health: health } = repository;
  const circumference = 138.23; // 2 * pi * 22

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in font-sans">
      {/* Header Overview Card */}
      <div className="p-7 rounded-card bg-theme-surface border border-theme-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-card">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-serif font-medium text-theme-primary tracking-tight">
              {repository.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-theme-subtle text-theme-primary border border-theme-border">
              {repository.branch}
            </span>
            {repository.is_demo && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium tracking-wide bg-theme-accent/10 text-theme-accent border border-theme-accent/20">
                Demo Repository
              </span>
            )}
          </div>
          <p className="text-sm text-theme-secondary max-w-2xl leading-relaxed">
            {repository.description}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-theme-muted font-sans">
            <span>Analyzed at {repository.analysis_time}</span>
            <span>•</span>
            <div className="flex items-center gap-2">
              {Object.entries(repository.languages).map(([lang, pct]) => (
                <span key={lang} className="text-theme-secondary">
                  {lang}: <strong className="font-medium text-theme-primary">{pct}%</strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Overall Health Score Card */}
        <div
          onClick={() => navigate('/health')}
          className="p-5 rounded-card bg-theme-surface border border-theme-border hover:border-theme-accent/50 cursor-pointer transition-all flex items-center gap-5 shrink-0 shadow-card group"
        >
          <div>
            <div className="text-[11px] font-sans uppercase text-theme-muted font-semibold tracking-[0.06em]">
              Codebase Health
            </div>
            <div className="text-3xl font-serif font-medium text-theme-success mt-0.5">
              {health.overall} <span className="text-sm font-sans font-normal text-theme-muted">/ 100</span>
            </div>
            <div className="text-xs text-theme-muted mt-1 flex items-center gap-1 group-hover:text-theme-accent transition-colors font-medium">
              <span>View Breakdown</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
          
          {/* SVG Circular Health Ring */}
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="w-14 h-14 -rotate-90 transform" viewBox="0 0 56 56">
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="var(--track)"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="var(--success)"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (circumference * health.overall) / 100}
                strokeLinecap="round"
                fill="none"
                style={{ transition: 'stroke-dashoffset 600ms ease' }}
              />
            </svg>
            <span className="absolute font-serif text-sm font-medium text-theme-primary">
              {health.overall}%
            </span>
          </div>
        </div>
      </div>

      {/* Core Codebase Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-card bg-theme-surface border border-theme-border shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] text-theme-muted">Files</span>
            <div className="p-1.5 rounded-[8px] bg-theme-subtle text-theme-accent">
              <FileCode className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-[30px] font-serif font-medium text-theme-primary leading-none tracking-tight">{repository.file_count}</div>
        </div>

        <div className="p-4 rounded-card bg-theme-surface border border-theme-border shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] text-theme-muted">Functions</span>
            <div className="p-1.5 rounded-[8px] bg-theme-subtle text-theme-info">
              <Code2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-[30px] font-serif font-medium text-theme-primary leading-none tracking-tight">{repository.function_count}</div>
        </div>

        <div className="p-4 rounded-card bg-theme-surface border border-theme-border shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] text-theme-muted">Classes</span>
            <div className="p-1.5 rounded-[8px] bg-theme-subtle text-theme-purple">
              <Box className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-[30px] font-serif font-medium text-theme-primary leading-none tracking-tight">{repository.class_count}</div>
        </div>

        <div className="p-4 rounded-card bg-theme-surface border border-theme-border shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] text-theme-muted">Dependencies</span>
            <div className="p-1.5 rounded-[8px] bg-theme-subtle text-theme-accent">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-[30px] font-serif font-medium text-theme-primary leading-none tracking-tight">{repository.dependency_count}</div>
        </div>

        <div className="p-4 rounded-card bg-theme-surface border border-theme-border shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] text-theme-muted">Test Suites</span>
            <div className="p-1.5 rounded-[8px] bg-theme-subtle text-theme-success">
              <TestTube2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-[30px] font-serif font-medium text-theme-primary leading-none tracking-tight">{repository.test_file_count}</div>
        </div>

        <div className="p-4 rounded-card bg-theme-surface border border-theme-border shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] text-theme-muted">Documentation</span>
            <div className="p-1.5 rounded-[8px] bg-theme-subtle text-theme-warning">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-[30px] font-serif font-medium text-theme-primary leading-none tracking-tight">{repository.doc_percentage}%</div>
        </div>
      </div>

      {/* Health Breakdown & Workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-card bg-theme-surface border border-theme-border shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-serif font-medium text-theme-primary tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-theme-success" />
              <span>Architectural Health Breakdown</span>
            </h2>
            <span className="text-xs text-theme-muted font-sans">Calculated from AST metrics</span>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Maintainability', score: health.maintainability, color: 'bg-theme-success', key: 'maintainability' },
              { label: 'Security & Auth', score: health.security, color: 'bg-theme-info', key: 'security' },
              { label: 'Architecture Hygiene', score: health.architecture, color: 'bg-theme-purple', key: 'architecture' },
              { label: 'Complexity Bounds', score: health.complexity, color: 'bg-theme-warning', key: 'complexity' },
              { label: 'Testability & Coverage', score: health.testability, color: 'bg-theme-accent', key: 'testability' },
              { label: 'Documentation Coverage', score: health.documentation, color: 'bg-theme-info', key: 'documentation' },
            ].map((metric) => (
              <div key={metric.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="text-theme-secondary font-medium">{metric.label}</span>
                  <span className="font-serif font-medium text-theme-primary text-sm">{metric.score} / 100</span>
                </div>
                <div className="h-2 w-full bg-theme-track rounded-full overflow-hidden block relative">
                  <div
                    className={`h-full ${metric.color} rounded-full transition-all duration-600`}
                    style={{
                      width: `${metric.score}%`,
                      minWidth: metric.score > 0 ? '4px' : '0px',
                    }}
                  ></div>
                </div>
                <p className="text-xs text-theme-muted font-sans leading-normal">
                  {health.explanations[metric.key]}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-card bg-theme-surface border border-theme-border shadow-card space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-base font-serif font-medium text-theme-primary tracking-tight">
              Intelligence Workflows
            </h3>
            <p className="text-xs text-theme-secondary leading-relaxed">
              Launch targeted analysis across the repository AST and dependency graph.
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => navigate('/assistant')}
                className="w-full p-3.5 rounded-card bg-theme-surface hover:bg-theme-subtle border border-theme-border text-left flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-[8px] bg-theme-accent/10 text-theme-accent">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-theme-primary">AI Assistant Chat</div>
                    <div className="text-[11px] text-theme-muted">Grounded code Q&A</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-theme-muted group-hover:text-theme-accent transition-colors" />
              </button>

              <button
                onClick={() => navigate('/graph')}
                className="w-full p-3.5 rounded-card bg-theme-surface hover:bg-theme-subtle border border-theme-border text-left flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-[8px] bg-theme-info/10 text-theme-info">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-theme-primary">Interactive Graph</div>
                    <div className="text-[11px] text-theme-muted">Multi-layer architecture</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-theme-muted group-hover:text-theme-info transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
