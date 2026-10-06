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
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Bug className="w-5 h-5 text-rose-400" />
          <span>Bug Investigator & Root Cause Localization</span>
        </h1>
        <p className="text-xs text-dark-400 mt-1">
          Analyzes natural language defect descriptions against AST symbols and dependency call graphs.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-dark-900 border border-dark-800 space-y-3 shadow-xl">
        <label className="block text-xs font-mono font-medium text-dark-300">
          Describe Bug or Unexpected Behavior
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runInvestigation(description)}
            placeholder="e.g. Users are getting logged out after refreshing the page"
            className="flex-1 px-3.5 py-2.5 bg-dark-950 border border-dark-750 rounded-xl text-xs text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 font-sans shadow-inner"
          />
          <button
            onClick={() => runInvestigation(description)}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
          >
            {loading ? 'Diagnosing...' : 'Investigate'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-mono text-dark-500">Known Defects:</span>
          {PRESET_DEFECTS.map((defect) => (
            <button
              key={defect}
              onClick={() => {
                setDescription(defect);
                runInvestigation(defect);
              }}
              className="px-2 py-0.5 rounded bg-dark-850 hover:bg-dark-800 border border-dark-750 text-[11px] text-dark-300 hover:text-white transition-colors truncate max-w-xs"
            >
              {defect}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 flex items-start gap-4 shadow-lg">
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-mono font-semibold uppercase text-dark-400">
                Primary Root Cause Prediction
              </div>
              <div className="text-sm font-bold text-white font-mono">
                {result.root_cause_prediction}
              </div>
              <p className="text-xs text-dark-300 leading-relaxed pt-1">{result.summary}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-xs font-mono uppercase text-dark-400 font-semibold tracking-wider">
              Ranked Fault Hypotheses ({result.hypotheses.length})
            </div>

            {result.hypotheses.map((hyp: BugHypothesis, idx: number) => (
              <div
                key={idx}
                className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-4 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        hyp.confidence === 'High'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {hyp.confidence} Confidence ({Math.round(hyp.score * 100)}%)
                    </span>
                    <span className="text-xs font-bold font-mono text-white">
                      {hyp.symbol_name}()
                    </span>
                  </div>

                  <button
                    onClick={() => handleJumpToCode(hyp.file_path, hyp.line_start)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs text-brand-300 font-mono transition-colors"
                  >
                    <span>View at Line {hyp.line_start}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-dark-400">
                  <FileCode className="w-3.5 h-3.5 text-dark-500" />
                  <span>{hyp.file_path}</span>
                  <span>•</span>
                  <span>Lines {hyp.line_start}–{hyp.line_end}</span>
                </div>

                <div className="text-xs text-dark-200 leading-relaxed font-sans bg-dark-950 p-3 rounded-lg border border-dark-800">
                  <strong className="text-white block font-mono text-[11px] mb-1">Architectural Reasoning:</strong>
                  {hyp.reasoning}
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 font-semibold">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Suggested Remediation Patch:</span>
                  </div>
                  <pre className="p-3 rounded-lg bg-dark-950 border border-dark-800 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
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
