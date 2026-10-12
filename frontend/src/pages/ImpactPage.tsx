import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Zap,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
} from 'lucide-react';
import { useRepository } from '../hooks/useRepository';
import { api } from '../services/api';
import { ImpactAnalysisResult } from '../types';

const SAMPLE_TARGETS = [
  'AuthService.validateToken',
  'TokenService',
  'UserService.updateUser',
  'PaymentGateway.chargeCustomer',
  'Database.query',
  'OrderService.createOrder',
];

export const ImpactPage: React.FC = () => {
  const { repository } = useRepository();
  const [searchParams] = useSearchParams();

  const [target, setTarget] = useState(
    searchParams.get('target') || 'AuthService.validateToken'
  );
  const [result, setResult] = useState<ImpactAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async (targetSymbol: string) => {
    if (!repository || !targetSymbol.trim()) return;
    setLoading(true);
    try {
      const data = await api.analyzeImpact({
        repository_id: repository.id,
        target_symbol: targetSymbol,
      });
      setResult(data);
    } catch (err) {
      console.error('Impact analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlTarget = searchParams.get('target') || 'AuthService.validateToken';
    setTarget(urlTarget);
    runAnalysis(urlTarget);
  }, [repository, searchParams]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif font-medium text-theme-primary tracking-tight flex items-center gap-2.5">
          <Zap className="w-5 h-5 text-theme-warning" />
          <span>Change Impact Analysis</span>
        </h1>
        <p className="text-sm text-theme-secondary mt-1">
          Predicts upstream blast radius, affected controllers, and regression testing requirements before code changes.
        </p>
      </div>

      <div className="p-6 rounded-card bg-theme-surface border border-theme-border space-y-3.5 shadow-card">
        <label className="block text-[13px] font-sans font-medium text-theme-primary">
          Target Function, Class, or Module
        </label>
        <div className="flex gap-2.5">
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runAnalysis(target)}
            placeholder="e.g. AuthService.validateToken"
            className="flex-1 px-4 py-2.5 bg-theme-surface border border-theme-border rounded-[10px] text-sm text-theme-primary font-mono placeholder-theme-muted focus:outline-none focus:border-theme-accent focus:ring-2 focus:ring-theme-accent/40 transition-all"
          />
          <button
            onClick={() => runAnalysis(target)}
            disabled={loading}
            className="px-5 py-2.5 rounded-[10px] bg-theme-accent hover:bg-theme-accent-hover disabled:opacity-50 text-xs font-medium text-white transition-all shadow-sm border-0"
          >
            {loading ? 'Evaluating...' : 'Analyze Impact'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] text-theme-muted">Quick Targets:</span>
          {SAMPLE_TARGETS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTarget(t);
                runAnalysis(t);
              }}
              className="px-2.5 py-1 rounded-full bg-theme-surface hover:bg-theme-subtle border border-theme-border text-xs font-mono text-theme-primary transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          <div
            className={`p-6 rounded-card border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-card ${
              result.risk_level === 'HIGH'
                ? 'bg-theme-danger/10 border-theme-danger/30'
                : result.risk_level === 'MEDIUM'
                ? 'bg-theme-warning/10 border-theme-warning/30'
                : 'bg-theme-success/10 border-theme-success/30'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-[10px] ${
                  result.risk_level === 'HIGH'
                    ? 'bg-theme-danger/20 text-theme-danger'
                    : result.risk_level === 'MEDIUM'
                    ? 'bg-theme-warning/20 text-theme-warning'
                    : 'bg-theme-success/20 text-theme-success'
                }`}
              >
                {result.risk_level === 'HIGH' ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : result.risk_level === 'MEDIUM' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <CheckCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] text-theme-muted">Blast Radius Risk:</span>
                  <span
                    className={`text-xs font-semibold font-sans tracking-wider px-2.5 py-0.5 rounded-full uppercase ${
                      result.risk_level === 'HIGH'
                        ? 'bg-theme-danger/20 text-theme-danger'
                        : result.risk_level === 'MEDIUM'
                        ? 'bg-theme-warning/20 text-theme-warning'
                        : 'bg-theme-success/20 text-theme-success'
                    }`}
                  >
                    {result.risk_level} IMPACT
                  </span>
                </div>
                <div className="text-xs text-theme-secondary mt-1 max-w-2xl leading-relaxed">
                  {result.rationale}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] text-theme-muted">Impact Score</div>
              <div className="text-3xl font-serif text-theme-primary mt-0.5">
                {result.score} <span className="text-xs font-sans text-theme-muted">/ 100</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-card bg-theme-surface border border-theme-border space-y-3 shadow-card">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-theme-primary font-semibold uppercase tracking-wider">
                  Affected Controllers
                </span>
                <span className="text-theme-accent font-bold">{result.affected_controllers.length}</span>
              </div>
              <div className="space-y-1.5">
                {result.affected_controllers.map((ctrl: string) => (
                  <div
                    key={ctrl}
                    className="p-2.5 rounded-[10px] bg-theme-subtle border border-theme-border text-xs font-mono text-theme-primary flex items-center justify-between"
                  >
                    <span>{ctrl}</span>
                    <span className="text-[10px] text-theme-muted">Presentation</span>
                  </div>
                ))}
                {result.affected_controllers.length === 0 && (
                  <p className="text-xs text-theme-muted italic">No controllers directly affected.</p>
                )}
              </div>
            </div>

            <div className="p-5 rounded-card bg-theme-surface border border-theme-border space-y-3 shadow-card">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-theme-primary font-semibold uppercase tracking-wider">
                  Affected Test Suites
                </span>
                <span className="text-theme-success font-bold">{result.affected_tests.length}</span>
              </div>
              <div className="space-y-1.5">
                {result.affected_tests.map((test: string) => (
                  <div
                    key={test}
                    className="p-2.5 rounded-[10px] bg-theme-subtle border border-theme-border text-xs font-mono text-theme-success flex items-center justify-between"
                  >
                    <span>{test}</span>
                    <span className="text-[10px] text-theme-muted">Unit / Spec</span>
                  </div>
                ))}
                {result.affected_tests.length === 0 && (
                  <p className="text-xs text-theme-muted italic">No test suites identified.</p>
                )}
              </div>
            </div>

            <div className="p-5 rounded-card bg-theme-surface border border-theme-border space-y-3 shadow-card">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-theme-primary font-semibold uppercase tracking-wider">
                  Caller Hierarchy
                </span>
                <span className="text-theme-purple font-bold">
                  {result.direct_callers.length + result.indirect_callers.length}
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-theme-muted uppercase font-semibold">Direct Callers:</span>
                  <div className="text-theme-primary mt-0.5">
                    {result.direct_callers.join(', ') || 'None'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-theme-muted uppercase font-semibold">Indirect Upstream:</span>
                  <div className="text-theme-secondary mt-0.5">
                    {result.indirect_callers.join(', ') || 'None'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
