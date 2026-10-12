import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  ArrowRight,
  Wrench,
  Sparkles,
} from 'lucide-react';
import { useRepository } from '../hooks/useRepository';
import { api } from '../services/api';
import { SecurityAuditResult, SecurityFinding } from '../types';
import { useNavigate } from 'react-router-dom';

export const SecurityPage: React.FC = () => {
  const { repository, jumpToFileLine } = useRepository();
  const [audit, setAudit] = useState<SecurityAuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAudit = async () => {
      if (!repository) return;
      try {
        setLoading(true);
        const data = await api.getSecurityAudit(repository.id);
        setAudit(data);
      } catch (err) {
        console.error('Failed to run security audit:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAudit();
  }, [repository]);

  const handleJump = (finding: SecurityFinding) => {
    jumpToFileLine(finding.file_path, finding.line_start);
    navigate('/explorer');
  };

  const filteredFindings = audit?.findings.filter((f) => {
    if (filterSeverity === 'all') return true;
    return f.severity.toLowerCase() === filterSeverity.toLowerCase();
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans animate-fade-in transition-colors">
      <div>
        <h1 className="text-2xl font-serif font-medium text-theme-primary tracking-tight flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-theme-danger" />
          <span>Security & Architectural Code Smells</span>
        </h1>
        <p className="text-sm text-theme-secondary mt-1">
          Static AST analysis for hardcoded secrets, injection vectors, and circular architecture boundaries.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-theme-muted font-sans flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-theme-accent animate-spin" />
          <span>Scanning AST nodes for security smells and token exposures...</span>
        </div>
      ) : !audit ? null : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            {[
              { label: 'Critical', count: audit.summary_counts.Critical || 0, color: 'text-theme-danger' },
              { label: 'High', count: audit.summary_counts.High || 0, color: 'text-theme-warning' },
              { label: 'Medium', count: audit.summary_counts.Medium || 0, color: 'text-theme-warning' },
              { label: 'Low', count: audit.summary_counts.Low || 0, color: 'text-theme-info' },
              { label: 'Info / Smells', count: audit.summary_counts.Info || 0, color: 'text-theme-secondary' },
            ].map((sev) => (
              <div
                key={sev.label}
                onClick={() => setFilterSeverity(sev.label.toLowerCase().split(' ')[0])}
                className="p-4 rounded-card bg-theme-surface border border-theme-border hover:border-theme-accent/50 cursor-pointer transition-all space-y-1 shadow-card"
              >
                <div className="text-[11px] font-sans text-theme-muted uppercase font-semibold tracking-[0.06em]">
                  {sev.label}
                </div>
                <div className={`text-2xl font-serif ${sev.color}`}>{sev.count}</div>
              </div>
            ))}
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-xs font-sans text-theme-muted">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">Detected Issues ({filteredFindings?.length || 0})</span>
              <button
                onClick={() => setFilterSeverity('all')}
                className="text-theme-accent hover:underline text-xs font-medium"
              >
                Reset Filter
              </button>
            </div>

            {filteredFindings?.map((finding: SecurityFinding) => (
              <div
                key={finding.id}
                className="p-5 rounded-card bg-theme-surface border border-theme-border space-y-3.5 shadow-card"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] font-sans font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        finding.severity === 'Critical'
                          ? 'bg-theme-danger/10 text-theme-danger border border-theme-danger/20'
                          : finding.severity === 'High'
                          ? 'bg-theme-warning/10 text-theme-warning border border-theme-warning/20'
                          : finding.severity === 'Medium'
                          ? 'bg-theme-warning/10 text-theme-warning border border-theme-warning/20'
                          : 'bg-theme-subtle text-theme-primary border border-theme-border'
                      }`}
                    >
                      {finding.severity}
                    </span>
                    <span className="text-sm font-semibold text-theme-primary font-mono">
                      {finding.title}
                    </span>
                    <span className="text-[11px] text-theme-muted font-sans">
                      ({finding.category})
                    </span>
                  </div>

                  <button
                    onClick={() => handleJump(finding)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-[10px] bg-theme-surface hover:bg-theme-subtle border border-theme-border text-xs font-sans text-theme-accent font-medium transition-all"
                  >
                    <span>Line {finding.line_start}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-theme-muted">
                  <FileCode className="w-3.5 h-3.5" />
                  <span className="text-theme-primary">{finding.file_path}</span>
                  <span>•</span>
                  <span>Lines {finding.line_start}–{finding.line_end}</span>
                </div>

                <pre className="p-3.5 rounded-[10px] bg-theme-subtle border border-theme-border text-xs font-mono text-theme-danger overflow-x-auto leading-relaxed">
                  {finding.snippet}
                </pre>

                <p className="text-xs text-theme-secondary leading-relaxed font-sans">
                  {finding.description}
                </p>

                <div className="p-3.5 rounded-[10px] bg-theme-subtle border border-theme-border text-xs text-theme-secondary flex items-start gap-2.5">
                  <Wrench className="w-3.5 h-3.5 text-theme-success shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-theme-primary font-sans text-xs">
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
