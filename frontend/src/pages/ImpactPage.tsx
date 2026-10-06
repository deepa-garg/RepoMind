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
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <span>Change Impact Analysis</span>
        </h1>
        <p className="text-xs text-dark-400 mt-1">
          Predicts upstream blast radius, affected controllers, and regression testing requirements before code changes.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-dark-900 border border-dark-800 space-y-3 shadow-xl">
        <label className="block text-xs font-mono font-medium text-dark-300">
          Target Function, Class, or Module
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runAnalysis(target)}
            placeholder="e.g. AuthService.validateToken"
            className="flex-1 px-3.5 py-2.5 bg-dark-950 border border-dark-750 rounded-xl text-xs text-white font-mono placeholder-dark-500 focus:outline-none focus:border-brand-500 shadow-inner"
          />
          <button
            onClick={() => runAnalysis(target)}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
          >
            {loading ? 'Evaluating...' : 'Analyze Impact'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-mono text-dark-500">Quick Targets:</span>
          {SAMPLE_TARGETS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTarget(t);
                runAnalysis(t);
              }}
              className="px-2 py-0.5 rounded bg-dark-850 hover:bg-dark-800 border border-dark-750 text-[11px] font-mono text-dark-300 hover:text-white transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          <div
            className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl ${
              result.risk_level === 'HIGH'
                ? 'bg-rose-950/20 border-rose-900/50'
                : result.risk_level === 'MEDIUM'
                ? 'bg-amber-950/20 border-amber-900/50'
                : 'bg-emerald-950/20 border-emerald-900/50'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-xl ${
                  result.risk_level === 'HIGH'
                    ? 'bg-rose-500/10 text-rose-400'
                    : result.risk_level === 'MEDIUM'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-emerald-500/10 text-emerald-400'
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase text-dark-400">Blast Radius Risk:</span>
                  <span
                    className={`text-sm font-bold font-mono tracking-wider px-2 py-0.5 rounded ${
                      result.risk_level === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-300'
                        : result.risk_level === 'MEDIUM'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {result.risk_level} IMPACT
                  </span>
                </div>
                <div className="text-xs text-dark-300 mt-1 max-w-2xl leading-relaxed">
                  {result.rationale}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-xs font-mono text-dark-400">Impact Score</div>
              <div className="text-3xl font-bold font-mono text-white mt-0.5">
                {result.score} <span className="text-xs text-dark-500">/ 100</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-dark-300 font-semibold uppercase tracking-wider">
                  Affected Controllers
                </span>
                <span className="text-brand-400 font-bold">{result.affected_controllers.length}</span>
              </div>
              <div className="space-y-1.5">
                {result.affected_controllers.map((ctrl: string) => (
                  <div
                    key={ctrl}
                    className="p-2 rounded bg-dark-950 border border-dark-800 text-xs font-mono text-white flex items-center justify-between"
                  >
                    <span>{ctrl}</span>
                    <span className="text-[10px] text-dark-500">Presentation</span>
                  </div>
                ))}
                {result.affected_controllers.length === 0 && (
                  <p className="text-xs text-dark-500 italic">No controllers directly affected.</p>
                )}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-dark-300 font-semibold uppercase tracking-wider">
                  Affected Test Suites
                </span>
                <span className="text-emerald-400 font-bold">{result.affected_tests.length}</span>
              </div>
              <div className="space-y-1.5">
                {result.affected_tests.map((test: string) => (
                  <div
                    key={test}
                    className="p-2 rounded bg-dark-950 border border-dark-800 text-xs font-mono text-emerald-300 flex items-center justify-between"
                  >
                    <span>{test}</span>
                    <span className="text-[10px] text-dark-500">Unit / Spec</span>
                  </div>
                ))}
                {result.affected_tests.length === 0 && (
                  <p className="text-xs text-dark-500 italic">No test suites identified.</p>
                )}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-dark-300 font-semibold uppercase tracking-wider">
                  Caller Hierarchy
                </span>
                <span className="text-indigo-400 font-bold">
                  {result.direct_callers.length + result.indirect_callers.length}
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-dark-500 uppercase">Direct Callers:</span>
                  <div className="text-dark-200 mt-0.5">
                    {result.direct_callers.join(', ') || 'None'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-dark-500 uppercase">Indirect Upstream:</span>
                  <div className="text-dark-200 mt-0.5">
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
