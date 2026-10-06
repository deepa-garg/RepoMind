import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  Cpu,
  Network,
  Bug,
  Zap,
  TestTube2,
  BookOpen,
  ShieldCheck,
  Code2,
  GitBranch,
  Terminal,
  Activity,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-950 text-white flex flex-col font-sans selection:bg-brand-500/30">
      {/* Top Navigation */}
      <header className="h-16 border-b border-dark-800/80 px-8 flex items-center justify-between sticky top-0 bg-dark-950/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 font-mono font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <span className="font-semibold text-white tracking-tight text-base font-mono">RepoMind</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs font-medium text-dark-200 transition-colors"
          >
            Explore Demo
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-medium text-white transition-colors shadow-sm"
          >
            <span>Launch Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pt-20 pb-16 max-w-5xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-900 border border-dark-750 text-xs font-mono text-brand-400">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
          <span>Architectural Intelligence for Complex Repositories</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1]">
          Understand your codebase <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-brand-400 to-sky-200">
            before you change it.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-dark-300 max-w-2xl mx-auto leading-relaxed">
          An intelligent developer platform combining Tree-sitter AST extraction,
          NetworkX dependency intelligence, and Qdrant vector retrieval to understand
          real software systems before generating code or answering questions.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white transition-all shadow-lg hover:shadow-brand-500/20"
          >
            <span>Explore Demo Repository</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/graph')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-dark-900 hover:bg-dark-850 border border-dark-750 text-sm font-medium text-dark-200 transition-colors"
          >
            <Network className="w-4 h-4 text-brand-400" />
            <span>View Dependency Graph</span>
          </button>
        </div>
      </section>

      {/* System Pipeline Section */}
      <section className="px-6 py-12 max-w-5xl mx-auto w-full">
        <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-dark-800 text-xs font-mono">
            <span className="text-dark-400">RepoMind Structural Processing Pipeline</span>
            <span className="text-brand-400">Zero-Hallucination Grounding</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 rounded-lg bg-dark-950 border border-dark-800 space-y-1">
              <div className="text-[10px] text-dark-500 font-mono">01. INGEST</div>
              <div className="text-xs font-semibold text-white">GitHub Repo</div>
              <div className="text-[10px] text-dark-400">Git clone / API</div>
            </div>

            <div className="p-3 rounded-lg bg-dark-950 border border-dark-800 space-y-1">
              <div className="text-[10px] text-dark-500 font-mono">02. PARSE</div>
              <div className="text-xs font-semibold text-brand-300">Tree-sitter AST</div>
              <div className="text-[10px] text-dark-400">Functions, classes, calls</div>
            </div>

            <div className="p-3 rounded-lg bg-dark-950 border border-dark-800 space-y-1">
              <div className="text-[10px] text-dark-500 font-mono">03. MAP</div>
              <div className="text-xs font-semibold text-sky-300">NetworkX Graph</div>
              <div className="text-[10px] text-dark-400">Call chains & callers</div>
            </div>

            <div className="p-3 rounded-lg bg-dark-950 border border-dark-800 space-y-1">
              <div className="text-[10px] text-dark-500 font-mono">04. INDEX</div>
              <div className="text-xs font-semibold text-indigo-300">Qdrant Vectors</div>
              <div className="text-[10px] text-dark-400">Hybrid dense retrieval</div>
            </div>

            <div className="p-3 rounded-lg bg-dark-950 border border-dark-800 space-y-1 col-span-2 sm:col-span-1">
              <div className="text-[10px] text-dark-500 font-mono">05. REASON</div>
              <div className="text-xs font-semibold text-emerald-300">Grounded AI</div>
              <div className="text-[10px] text-dark-400">Flow & line citations</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Core Capabilities */}
      <section className="px-6 py-16 max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Five Pillars of Codebase Intelligence
          </h2>
          <p className="text-xs text-dark-400 max-w-lg mx-auto">
            Not a shallow chatbot. A deterministic platform that diagnoses and predicts changes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 w-fit">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">1. Understand</h3>
            <p className="text-xs text-dark-400 leading-relaxed">
              Tree-sitter AST symbol tables distinguish functions, endpoints, and variables from mere string references.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 w-fit">
              <Network className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">2. Navigate</h3>
            <p className="text-xs text-dark-400 leading-relaxed">
              Interactive React Flow dependency canvas tracing Component → Service → Controller → Repository → Database.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 w-fit">
              <Bug className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">3. Diagnose</h3>
            <p className="text-xs text-dark-400 leading-relaxed">
              Bug Investigator evaluates natural language defect descriptions against call graphs to isolate candidate functions with confidence ratings.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 w-fit">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">4. Predict</h3>
            <p className="text-xs text-dark-400 leading-relaxed">
              Change Impact Analysis computes upstream blast radius, affected controllers, and affected test suites before code modifications.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit">
              <TestTube2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">5. Assist</h3>
            <p className="text-xs text-dark-400 leading-relaxed">
              Repository-compatible test generator (pytest/jest), docstring synthesis, and security vulnerability pattern audits.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 w-fit">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Code Health Score</h3>
            <p className="text-xs text-dark-400 leading-relaxed">
              Transparent 0-100 codebase health metric calculated directly from AST cyclomatic complexity, test coverage, and documentation density.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-dark-800/80 py-8 px-8 text-center text-xs text-dark-500 font-mono">
        <p>RepoMind • AI-Powered Codebase Intelligence & Developer Assistant</p>
      </footer>
    </div>
  );
};
