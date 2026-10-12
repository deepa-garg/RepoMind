import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Bug,
  AlertCircle,
  FileCode,
  ArrowRight,
  Wrench,
} from 'lucide-react';
import { useRepository } from '../hooks/useRepository';
import { api } from '../services/api';
import { BugAnalysisResult, BugHypothesis } from '../types';

const PRESET_DEFECTS = [
  'Users are getting logged out after refreshing the page',
  'Payment charge failing or timing out during checkout',
  'Unsafe SQL query execution in database helper',
  'Missing active user status check on profile updates',
];

export const BugInvestigatorPage: React.FC = () => {
  const { repository, jumpToFileLine } = useRepository();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [description, setDescription] = useState(
    searchParams.get('query') || 'Users are getting logged out after refreshing the page'
  );
  const [result, setResult] = useState<BugAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runInvestigation = async (desc: string) => {
    if (!repository || !desc.trim()) return;
    setLoading(true);
    try {
      const data = await api.investigateBug({
        description: desc,
        repository_id: repository.id,
      });
      setResult(data);
    } catch (err) {
      console.error('Bug investigation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runInvestigation(description);
  }, [repository]);

  const handleJumpToCode = (filePath: string, line: number) => {
    jumpToFileLine(filePath, line);
    navigate('/explorer');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif font-medium text-theme-primary tracking-tight flex items-center gap-2.5">
          <Bug className="w-5 h-5 text-theme-danger" />
          <span>Bug Investigator & Root Cause Localization</span>
        </h1>
        <p className="text-sm text-theme-secondary mt-1">
          Analyzes natural language defect descriptions against AST symbols and dependency call graphs.
        </p>
      </div>

      <div className="p-6 rounded-card bg-theme-surface border border-theme-border space-y-3.5 shadow-card">
        <label className="block text-[13px] font-sans font-medium text-theme-primary">
          Describe Bug or Unexpected Behavior
        </label>
        <div className="flex gap-2.5">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runInvestigation(description)}
            placeholder="e.g. Users are getting logged out after refreshing the page"
            className="flex-1 px-4 py-2.5 bg-theme-surface border border-theme-border rounded-[10px] text-sm text-theme-primary placeholder-theme-muted focus:outline-none focus:border-theme-accent focus:ring-2 focus:ring-theme-accent/40 font-sans transition-all"
          />
          <button
            onClick={() => runInvestigation(description)}
            disabled={loading}
            className="px-5 py-2.5 rounded-[10px] bg-theme-accent hover:bg-theme-accent-hover disabled:opacity-50 text-xs font-medium text-white transition-all shadow-sm border-0"
          >
            {loading ? 'Diagnosing...' : 'Investigate'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] text-theme-muted">Known Defects:</span>
          {PRESET_DEFECTS.map((defect) => (
            <button
              key={defect}
              onClick={() => {
                setDescription(defect);
                runInvestigation(defect);
              }}
              className="px-2.5 py-1 rounded-full bg-theme-surface hover:bg-theme-subtle border border-theme-border text-xs text-theme-primary transition-colors truncate max-w-xs"
            >
              {defect}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="p-5 rounded-card bg-theme-surface border border-theme-border flex items-start gap-4 shadow-card">
            <div className="p-2.5 rounded-[10px] bg-theme-danger/10 text-theme-danger shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] text-theme-muted">
                Primary Root Cause Prediction
              </div>
              <div className="text-sm font-semibold text-theme-primary font-mono">
                {result.root_cause_prediction}
              </div>
              <p className="text-sm text-theme-secondary leading-relaxed pt-1">{result.summary}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-[11px] font-sans uppercase text-theme-muted font-semibold tracking-[0.06em]">
              Ranked Fault Hypotheses ({result.hypotheses.length})
            </div>

            {result.hypotheses.map((hyp: BugHypothesis, idx: number) => (
              <div
                key={idx}
                className="p-5 rounded-card bg-theme-surface border border-theme-border space-y-4 shadow-card"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] font-sans font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        hyp.confidence === 'High'
                          ? 'bg-theme-danger/10 text-theme-danger border border-theme-danger/20'
                          : 'bg-theme-warning/10 text-theme-warning border border-theme-warning/20'
                      }`}
                    >
                      {hyp.confidence} Confidence ({Math.round(hyp.score * 100)}%)
                    </span>
                    <span className="text-sm font-semibold font-mono text-theme-primary">
                      {hyp.symbol_name}()
                    </span>
                  </div>

                  <button
                    onClick={() => handleJumpToCode(hyp.file_path, hyp.line_start)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-[10px] bg-theme-surface hover:bg-theme-subtle border border-theme-border text-xs text-theme-accent font-sans font-medium transition-all"
                  >
                    <span>View at Line {hyp.line_start}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-theme-muted">
                  <FileCode className="w-3.5 h-3.5" />
                  <span className="text-theme-primary">{hyp.file_path}</span>
                  <span>•</span>
                  <span>Lines {hyp.line_start}–{hyp.line_end}</span>
                </div>

                <div className="text-xs text-theme-secondary leading-relaxed font-sans bg-theme-subtle p-3.5 rounded-[10px] border border-theme-border">
                  <strong className="text-theme-primary block font-sans text-xs font-medium mb-1">Architectural Reasoning:</strong>
                  {hyp.reasoning}
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-sans text-theme-success flex items-center gap-1.5 font-semibold uppercase tracking-[0.06em]">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Suggested Remediation Patch:</span>
                  </div>
                  <pre className="p-3.5 rounded-[10px] bg-theme-subtle border border-theme-border text-xs font-mono text-theme-success overflow-x-auto leading-relaxed">
                    {hyp.suggested_fix}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
