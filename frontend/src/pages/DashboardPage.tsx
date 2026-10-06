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
      <div className="h-full flex items-center justify-center p-8 text-xs font-mono text-dark-400">
        <Sparkles className="w-4 h-4 text-brand-400 animate-spin mr-2" />
        <span>Loading repository intelligence data...</span>
      </div>
    );
  }

  const { codebase_health: health } = repository;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in font-sans">
      {/* Header Overview Card */}
      <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {repository.name}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-dark-800 text-brand-400 border border-dark-700">
              {repository.branch}
            </span>
            {repository.is_demo && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-500/10 text-brand-400 border border-brand-500/30">
                DEMO MODE
              </span>
            )}
          </div>
          <p className="text-xs text-dark-300 max-w-2xl leading-relaxed">
            {repository.description}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-dark-400">
            <span>Analyzed at: {repository.analysis_time}</span>
            <span>•</span>
            <div className="flex items-center gap-2">
              {Object.entries(repository.languages).map(([lang, pct]) => (
                <span key={lang} className="text-dark-300">
                  {lang}: <strong className="text-white">{pct}%</strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Overall Health Score Card */}
        <div
          onClick={() => navigate('/health')}
          className="p-5 rounded-xl bg-dark-950 border border-dark-750 hover:border-brand-500/50 cursor-pointer transition-all flex items-center gap-5 shrink-0 shadow-inner group"
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-dark-400 font-semibold tracking-wider">
              Codebase Health
            </div>
            <div className="text-3xl font-bold font-mono text-emerald-400 mt-0.5">
              {health.overall} <span className="text-xs text-dark-500 font-normal">/ 100</span>
            </div>
            <div className="text-[11px] text-dark-400 mt-1 flex items-center gap-1 group-hover:text-brand-400 transition-colors">
              <span>View Breakdown</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 flex items-center justify-center font-mono text-xs font-bold text-white">
            {health.overall}%
          </div>
        </div>
      </div>

      {/* Core Codebase Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 space-y-1">
          <div className="flex items-center justify-between text-dark-400">
            <span className="text-[11px] font-mono">Files</span>
            <FileCode className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">{repository.file_count}</div>
        </div>

        <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 space-y-1">
          <div className="flex items-center justify-between text-dark-400">
            <span className="text-[11px] font-mono">Functions</span>
            <Code2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">{repository.function_count}</div>
        </div>

        <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 space-y-1">
          <div className="flex items-center justify-between text-dark-400">
            <span className="text-[11px] font-mono">Classes</span>
            <Box className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">{repository.class_count}</div>
        </div>

        <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 space-y-1">
          <div className="flex items-center justify-between text-dark-400">
            <span className="text-[11px] font-mono">Dependencies</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">{repository.dependency_count}</div>
        </div>

        <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 space-y-1">
          <div className="flex items-center justify-between text-dark-400">
            <span className="text-[11px] font-mono">Test Suites</span>
            <TestTube2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">{repository.test_file_count}</div>
        </div>

        <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 space-y-1">
          <div className="flex items-center justify-between text-dark-400">
            <span className="text-[11px] font-mono">Documentation</span>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">{repository.doc_percentage}%</div>
        </div>
      </div>

      {/* Health Breakdown & Workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-dark-900 border border-dark-800 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Architectural Health Breakdown</span>
            </h2>
            <span className="text-xs text-dark-400 font-mono">Calculated from AST metrics</span>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Maintainability', score: health.maintainability, color: 'bg-emerald-400', key: 'maintainability' },
              { label: 'Security & Auth', score: health.security, color: 'bg-blue-400', key: 'security' },
              { label: 'Architecture Hygiene', score: health.architecture, color: 'bg-indigo-400', key: 'architecture' },
              { label: 'Complexity Bounds', score: health.complexity, color: 'bg-purple-400', key: 'complexity' },
              { label: 'Testability & Coverage', score: health.testability, color: 'bg-sky-400', key: 'testability' },
              { label: 'Documentation Coverage', score: health.documentation, color: 'bg-amber-400', key: 'documentation' },
            ].map((metric) => (
              <div key={metric.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-dark-300 font-medium">{metric.label}</span>
                  <span className="text-white font-bold">{metric.score} / 100</span>
                </div>
                <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${metric.color} rounded-full transition-all duration-500`}
                    style={{ width: `${metric.score}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-dark-500 italic">
                  {health.explanations[metric.key]}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Intelligence Workflows
            </h3>
            <p className="text-xs text-dark-400 leading-relaxed">
              Launch targeted analysis across the repository AST and dependency graph.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => navigate('/assistant')}
                className="w-full p-3 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-750 text-left flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">AI Assistant Chat</div>
                    <div className="text-[11px] text-dark-400">Grounded code Q&A</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-dark-500 group-hover:text-brand-400 transition-colors" />
              </button>

              <button
                onClick={() => navigate('/graph')}
                className="w-full p-3 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-750 text-left flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Interactive Graph</div>
                    <div className="text-[11px] text-dark-400">Multi-layer architecture</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-dark-500 group-hover:text-sky-400 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
