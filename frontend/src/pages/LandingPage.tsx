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
  Activity,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-theme-bg text-theme-primary flex flex-col font-sans selection:bg-theme-accent/20 transition-colors">
      {/* Top Navigation */}
      <header className="h-16 border-b border-theme-border px-8 flex items-center justify-between sticky top-0 bg-theme-bg z-30 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-center text-theme-accent shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <span className="font-serif font-medium text-theme-primary tracking-tight text-lg">RepoMind</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-[10px] bg-theme-surface hover:bg-theme-subtle border border-theme-border text-xs font-medium text-theme-primary transition-colors shadow-subtle"
          >
            Explore Demo
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-theme-accent hover:bg-theme-accent-hover text-xs font-medium text-white transition-colors duration-150 shadow-xs border-0"
          >
            <span>Launch Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-16 max-w-5xl mx-auto text-center space-y-7">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-theme-surface border border-theme-border text-xs font-sans text-theme-primary shadow-subtle">
          <span className="w-1.5 h-1.5 rounded-full bg-theme-accent"></span>
          <span className="font-medium">Architectural Intelligence for Complex Repositories</span>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-medium tracking-tight text-theme-primary leading-[1.12]">
          Understand your codebase <br />
          <span className="italic font-normal text-theme-accent">
            before you change it.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-theme-secondary max-w-2xl mx-auto leading-relaxed font-sans">
          An intelligent developer platform combining Tree-sitter AST extraction,
          NetworkX dependency intelligence, and Qdrant vector retrieval to understand
          real software systems before generating code or answering questions.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-6 py-3 rounded-[10px] bg-theme-accent hover:bg-theme-accent-hover text-sm font-medium text-white transition-colors duration-150 shadow-sm border-0"
          >
            <span>Explore Demo Repository</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/graph')}
            className="flex items-center gap-2 px-6 py-3 rounded-[10px] bg-theme-surface hover:bg-theme-subtle border border-theme-border text-sm font-medium text-theme-primary transition-colors shadow-subtle"
          >
            <Network className="w-4 h-4 text-theme-accent" />
            <span>View Dependency Graph</span>
          </button>
        </div>
      </section>

      {/* System Pipeline Section */}
      <section className="px-6 py-12 max-w-5xl mx-auto w-full">
        <div className="p-7 rounded-card bg-theme-surface border border-theme-border shadow-card space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-theme-border text-xs font-sans">
            <span className="font-semibold uppercase tracking-[0.06em] text-theme-muted">RepoMind Structural Processing Pipeline</span>
            <span className="font-medium text-theme-accent">Zero-Hallucination Grounding</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-4 rounded-[10px] bg-theme-subtle border border-theme-border shadow-xs space-y-1.5">
              <div className="text-[10px] text-theme-muted font-sans font-semibold uppercase tracking-[0.06em]">01. INGEST</div>
              <div className="text-xs font-serif font-medium text-theme-primary">GitHub Repo</div>
              <div className="text-[11px] text-theme-muted font-sans">Git clone / API</div>
            </div>

            <div className="p-4 rounded-[10px] bg-theme-subtle border border-theme-border shadow-xs space-y-1.5">
              <div className="text-[10px] text-theme-muted font-sans font-semibold uppercase tracking-[0.06em]">02. PARSE</div>
              <div className="text-xs font-serif font-medium text-theme-accent">Tree-sitter AST</div>
              <div className="text-[11px] text-theme-muted font-sans">Functions, classes, calls</div>
            </div>

            <div className="p-4 rounded-[10px] bg-theme-subtle border border-theme-border shadow-xs space-y-1.5">
              <div className="text-[10px] text-theme-muted font-sans font-semibold uppercase tracking-[0.06em]">03. MAP</div>
              <div className="text-xs font-serif font-medium text-theme-info">NetworkX Graph</div>
              <div className="text-[11px] text-theme-muted font-sans">Call chains & callers</div>
            </div>

            <div className="p-4 rounded-[10px] bg-theme-subtle border border-theme-border shadow-xs space-y-1.5">
              <div className="text-[10px] text-theme-muted font-sans font-semibold uppercase tracking-[0.06em]">04. INDEX</div>
              <div className="text-xs font-serif font-medium text-theme-purple">Qdrant Vectors</div>
              <div className="text-[11px] text-theme-muted font-sans">Hybrid dense retrieval</div>
            </div>

            <div className="p-4 rounded-[10px] bg-theme-subtle border border-theme-border shadow-xs space-y-1.5 col-span-2 sm:col-span-1">
              <div className="text-[10px] text-theme-muted font-sans font-semibold uppercase tracking-[0.06em]">05. REASON</div>
              <div className="text-xs font-serif font-medium text-theme-success">Grounded AI</div>
              <div className="text-[11px] text-theme-muted font-sans">Flow & line citations</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Core Capabilities */}
      <section className="px-6 py-16 max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-theme-primary">
            Five Pillars of Codebase Intelligence
          </h2>
          <p className="text-sm text-theme-secondary max-w-lg mx-auto">
            Not a shallow chatbot. A deterministic platform that diagnoses and predicts changes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
          <div className="p-6 rounded-card bg-theme-surface border border-theme-border shadow-subtle space-y-3">
            <div className="p-2.5 rounded-[10px] bg-theme-info/10 text-theme-info w-fit">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-base font-serif font-medium text-theme-primary">1. Understand</h3>
            <p className="text-xs text-theme-secondary leading-relaxed">
              Tree-sitter AST symbol tables distinguish functions, endpoints, and variables from mere string references.
            </p>
          </div>

          <div className="p-6 rounded-card bg-theme-surface border border-theme-border shadow-subtle space-y-3">
            <div className="p-2.5 rounded-[10px] bg-theme-accent/10 text-theme-accent w-fit">
              <Network className="w-4 h-4" />
            </div>
            <h3 className="text-base font-serif font-medium text-theme-primary">2. Navigate</h3>
            <p className="text-xs text-theme-secondary leading-relaxed">
              Interactive React Flow dependency canvas tracing Component → Service → Controller → Repository → Database.
            </p>
          </div>

          <div className="p-6 rounded-card bg-theme-surface border border-theme-border shadow-subtle space-y-3">
            <div className="p-2.5 rounded-[10px] bg-theme-danger/10 text-theme-danger w-fit">
              <Bug className="w-4 h-4" />
            </div>
            <h3 className="text-base font-serif font-medium text-theme-primary">3. Diagnose</h3>
            <p className="text-xs text-theme-secondary leading-relaxed">
              Bug Investigator evaluates natural language defect descriptions against call graphs to isolate candidate functions with confidence ratings.
            </p>
          </div>

          <div className="p-6 rounded-card bg-theme-surface border border-theme-border shadow-subtle space-y-3">
            <div className="p-2.5 rounded-[10px] bg-theme-warning/10 text-theme-warning w-fit">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-base font-serif font-medium text-theme-primary">4. Predict</h3>
            <p className="text-xs text-theme-secondary leading-relaxed">
              Change Impact Analysis computes upstream blast radius, affected controllers, and affected test suites before code modifications.
            </p>
          </div>

          <div className="p-6 rounded-card bg-theme-surface border border-theme-border shadow-subtle space-y-3">
            <div className="p-2.5 rounded-[10px] bg-theme-success/10 text-theme-success w-fit">
              <TestTube2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-serif font-medium text-theme-primary">5. Assist</h3>
            <p className="text-xs text-theme-secondary leading-relaxed">
              Repository-compatible test generator (pytest/jest), docstring synthesis, and security vulnerability pattern audits.
            </p>
          </div>

          <div className="p-6 rounded-card bg-theme-surface border border-theme-border shadow-subtle space-y-3">
            <div className="p-2.5 rounded-[10px] bg-theme-purple/10 text-theme-purple w-fit">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-base font-serif font-medium text-theme-primary">Code Health Score</h3>
            <p className="text-xs text-theme-secondary leading-relaxed">
              Transparent 0-100 codebase health metric calculated directly from AST cyclomatic complexity, test coverage, and documentation density.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-theme-border py-8 px-8 text-center text-xs text-theme-muted font-sans">
        <p>RepoMind • AI-Powered Codebase Intelligence & Developer Assistant</p>
      </footer>
    </div>
  );
};
