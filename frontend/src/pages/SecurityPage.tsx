import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  FileCode,
  Wrench,
  ArrowRight,
} from 'lucide-react';
import { useRepository } from '../hooks/useRepository';
import { api } from '../services/api';
import { SecurityAuditResult, SecurityFinding } from '../types';

export const SecurityPage: React.FC = () => {
  const { repository, jumpToFileLine } = useRepository();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<SecurityAuditResult | null>(null);
  const [filterSeverity, setFilterSeverity] = useState('all');

  useEffect(() => {
    const fetchSecurity = async () => {
      if (!repository) return;
      try {
        const data = await api.getSecurityAudit(repository.id);
        setAudit(data);
      } catch (err) {
        console.error('Failed to load security audit:', err);
      }
    };

    fetchSecurity();
  }, [repository]);

  const handleJump = (finding: SecurityFinding) => {
    jumpToFileLine(finding.file_path, finding.line_start);
    navigate('/explorer');
  };

  const filteredFindings = audit?.findings.filter((f: SecurityFinding) => {
    if (filterSeverity === 'all') return true;
    return f.severity.toLowerCase() === filterSeverity.toLowerCase();
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <span>Security & Code Smell Audit</span>
        </h1>
        <p className="text-xs text-dark-400 mt-1">
          Static AST and regex heuristics scan for secret exposures, injection patterns, and complexity hotspots.
        </p>
      </div>

      {audit && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Critical', count: audit.summary_counts.Critical || 0, color: 'text-rose-400' },
              { label: 'High', count: audit.summary_counts.High || 0, color: 'text-orange-400' },
              { label: 'Medium', count: audit.summary_counts.Medium || 0, color: 'text-amber-400' },
              { label: 'Low', count: audit.summary_counts.Low || 0, color: 'text-sky-400' },
              { label: 'Info / Smells', count: audit.summary_counts.Info || 0, color: 'text-dark-300' },
            ].map((sev) => (
              <div
                key={sev.label}
                onClick={() => setFilterSeverity(sev.label.toLowerCase().split(' ')[0])}
                className="p-4 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 cursor-pointer transition-colors space-y-1"
              >
                <div className="text-[11px] font-mono text-dark-400 uppercase font-semibold">
                  {sev.label}
                </div>
                <div className={`text-2xl font-bold font-mono ${sev.color}`}>{sev.count}</div>
              </div>
            ))}
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-xs font-mono text-dark-400">
              <span>Detected Issues ({filteredFindings?.length || 0})</span>
              <button
                onClick={() => setFilterSeverity('all')}
                className="text-brand-400 hover:underline"
              >
                Reset Filter
              </button>
            </div>

            {filteredFindings?.map((finding: SecurityFinding) => (
              <div
                key={finding.id}
                className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-3.5 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        finding.severity === 'Critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : finding.severity === 'High'
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : finding.severity === 'Medium'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-dark-800 text-dark-300 border border-dark-750'
                      }`}
                    >
                      {finding.severity}
                    </span>
                    <span className="text-xs font-bold text-white font-mono">
                      {finding.title}
                    </span>
                    <span className="text-[10px] text-dark-500 font-mono">
                      ({finding.category})
                    </span>
                  </div>

                  <button
                    onClick={() => handleJump(finding)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs font-mono text-brand-300 transition-colors"
                  >
                    <span>Line {finding.line_start}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-dark-400">
                  <FileCode className="w-3.5 h-3.5 text-dark-500" />
                  <span>{finding.file_path}</span>
                  <span>•</span>
                  <span>Lines {finding.line_start}–{finding.line_end}</span>
                </div>

                <pre className="p-3 rounded-lg bg-dark-950 border border-dark-800 text-[11px] font-mono text-rose-300/90 overflow-x-auto leading-relaxed">
                  {finding.snippet}
                </pre>

                <p className="text-xs text-dark-300 leading-relaxed font-sans">
                  {finding.description}
                </p>

                <div className="p-3 rounded-lg bg-dark-950 border border-dark-800 text-xs text-dark-300 flex items-start gap-2.5">
                  <Wrench className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white font-mono text-[11px]">
                      Remediation Guidance:{' '}
                    </span>
                    <span>{finding.remediation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
