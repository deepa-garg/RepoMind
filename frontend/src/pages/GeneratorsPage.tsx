import React, { useState } from 'react';
import {
  TestTube2,
  BookOpen,
  Sparkles,
  Code2,
  Copy,
  Check,
} from 'lucide-react';
import { useRepository } from '../hooks/useRepository';
import { api } from '../services/api';

export const GeneratorsPage: React.FC = () => {
  const { repository } = useRepository();
  const [activeTab, setActiveTab] = useState<'tests' | 'docs' | 'suggestions'>('tests');

  // Test Gen State
  const [testSymbol, setTestSymbol] = useState('AuthService.login');
  const [testResult, setTestResult] = useState<any>(null);
  const [loadingTest, setLoadingTest] = useState(false);

  // Doc Gen State
  const [docFile, setDocFile] = useState('src/auth/AuthService.ts');
  const [docResult, setDocResult] = useState<any>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  // Suggestion State
  const [suggType, setSuggType] = useState('error_handling');
  const [suggResult, setSuggResult] = useState<any>(null);
  const [loadingSugg, setLoadingSugg] = useState(false);

  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateTests = async () => {
    if (!repository) return;
    setLoadingTest(true);
    try {
      const res = await api.generateTests({
        repository_id: repository.id,
        file_path: 'src/auth/AuthService.ts',
        symbol_name: testSymbol,
        framework: 'jest',
      });
      setTestResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTest(false);
    }
  };

  const handleGenerateDocs = async () => {
    if (!repository) return;
    setLoadingDoc(true);
    try {
      const res = await api.generateDocs({
        repository_id: repository.id,
        file_path: docFile,
      });
      setDocResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleSuggestCode = async () => {
    if (!repository) return;
    setLoadingSugg(true);
    try {
      const res = await api.suggestCode({
        repository_id: repository.id,
        file_path: 'src/auth/TokenService.ts',
        symbol_name: 'verifyToken',
        prompt_type: suggType,
      });
      setSuggResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSugg(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif font-medium text-theme-primary tracking-tight flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-theme-accent" />
          <span>Code Intelligence Generators</span>
        </h1>
        <p className="text-sm text-theme-secondary mt-1">
          Context-aware test suites, architectural documentation, and defensive code refactors.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-theme-border pb-3">
        <button
          onClick={() => setActiveTab('tests')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] text-xs font-medium transition-all ${
            activeTab === 'tests'
              ? 'bg-theme-accent/10 text-theme-accent font-semibold'
              : 'text-theme-secondary hover:text-theme-primary'
          }`}
        >
          <TestTube2 className="w-4 h-4 text-theme-success" />
          <span>Test Suite Generator</span>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] text-xs font-medium transition-all ${
            activeTab === 'docs'
              ? 'bg-theme-accent/10 text-theme-accent font-semibold'
              : 'text-theme-secondary hover:text-theme-primary'
          }`}
        >
          <BookOpen className="w-4 h-4 text-theme-warning" />
          <span>Documentation Assistant</span>
        </button>

        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] text-xs font-medium transition-all ${
            activeTab === 'suggestions'
              ? 'bg-theme-accent/10 text-theme-accent font-semibold'
              : 'text-theme-secondary hover:text-theme-primary'
          }`}
        >
          <Code2 className="w-4 h-4 text-theme-info" />
          <span>Code Suggestion & Refactor</span>
        </button>
      </div>

      {activeTab === 'tests' && (
        <div className="space-y-6">
          <div className="p-6 rounded-card bg-theme-surface border border-theme-border space-y-3.5 shadow-card">
            <label className="block text-[13px] font-sans font-medium text-theme-primary">
              Target Function to Generate Unit Tests
            </label>
            <div className="flex gap-2.5">
              <input
                type="text"
                value={testSymbol}
                onChange={(e) => setTestSymbol(e.target.value)}
                placeholder="e.g. AuthService.login"
                className="flex-1 px-4 py-2.5 bg-theme-surface border border-theme-border rounded-[10px] text-sm text-theme-primary font-mono placeholder-theme-muted focus:outline-none focus:border-theme-accent focus:ring-2 focus:ring-theme-accent/40 transition-all"
              />
              <button
                onClick={handleGenerateTests}
                disabled={loadingTest}
                className="px-5 py-2.5 rounded-[10px] bg-theme-accent hover:bg-theme-accent-hover disabled:opacity-50 text-xs font-medium text-white transition-all shadow-sm border-0"
              >
                {loadingTest ? 'Synthesizing...' : 'Generate Jest Suite'}
              </button>
            </div>
          </div>

          {testResult && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-card bg-theme-surface border border-theme-border space-y-1 shadow-card">
                  <div className="text-[10px] uppercase font-sans text-theme-success font-semibold tracking-wider">
                    Normal Cases
                  </div>
                  <div className="text-xs text-theme-secondary font-mono">{testResult.normal_cases.join(', ')}</div>
                </div>

                <div className="p-3.5 rounded-card bg-theme-surface border border-theme-border space-y-1 shadow-card">
                  <div className="text-[10px] uppercase font-sans text-theme-warning font-semibold tracking-wider">
                    Edge Cases
                  </div>
                  <div className="text-xs text-theme-secondary font-mono">{testResult.edge_cases.join(', ')}</div>
                </div>

                <div className="p-3.5 rounded-card bg-theme-surface border border-theme-border space-y-1 shadow-card">
                  <div className="text-[10px] uppercase font-sans text-theme-info font-semibold tracking-wider">
                    Boundary Cases
                  </div>
                  <div className="text-xs text-theme-secondary font-mono">{testResult.boundary_cases.join(', ')}</div>
                </div>

                <div className="p-3.5 rounded-card bg-theme-surface border border-theme-border space-y-1 shadow-card">
                  <div className="text-[10px] uppercase font-sans text-theme-danger font-semibold tracking-wider">
                    Failure Modes
                  </div>
                  <div className="text-xs text-theme-secondary font-mono">{testResult.failure_cases.join(', ')}</div>
                </div>
              </div>

              <div className="rounded-card bg-theme-surface border border-theme-border overflow-hidden shadow-card">
                <div className="px-4 py-2.5 bg-theme-subtle border-b border-theme-border flex items-center justify-between text-xs font-mono">
                  <span className="text-theme-muted">tests/generated/{testSymbol}.test.ts</span>
                  <button
                    onClick={() => handleCopy(testResult.test_code)}
                    className="flex items-center gap-1.5 text-theme-muted hover:text-theme-primary transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-theme-success" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-theme-primary overflow-x-auto leading-relaxed bg-theme-subtle">
                  {testResult.test_code}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'docs' && (
        <div className="space-y-6">
          <div className="p-6 rounded-card bg-theme-surface border border-theme-border space-y-3.5 shadow-card">
            <label className="block text-[13px] font-sans font-medium text-theme-primary">
              Select Module / File to Document
            </label>
            <div className="flex gap-2.5">
              <input
                type="text"
                value={docFile}
                onChange={(e) => setDocFile(e.target.value)}
                placeholder="src/auth/AuthService.ts"
                className="flex-1 px-4 py-2.5 bg-theme-surface border border-theme-border rounded-[10px] text-sm text-theme-primary font-mono placeholder-theme-muted focus:outline-none focus:border-theme-accent focus:ring-2 focus:ring-theme-accent/40 transition-all"
              />
              <button
                onClick={handleGenerateDocs}
                disabled={loadingDoc}
                className="px-5 py-2.5 rounded-[10px] bg-theme-accent hover:bg-theme-accent-hover disabled:opacity-50 text-xs font-medium text-white transition-all shadow-sm border-0"
              >
                {loadingDoc ? 'Drafting...' : 'Generate Markdown'}
              </button>
            </div>
          </div>

          {docResult && (
            <div className="rounded-card bg-theme-surface border border-theme-border p-6 space-y-4 shadow-card animate-fade-in">
              <div className="flex items-center justify-between border-b border-theme-border pb-3">
                <h3 className="text-sm font-semibold text-theme-primary font-mono">{docResult.title}</h3>
                <button
                  onClick={() => handleCopy(docResult.generated_doc)}
                  className="flex items-center gap-1.5 text-xs text-theme-muted hover:text-theme-primary font-sans transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </button>
              </div>
              <pre className="text-xs font-mono text-theme-primary whitespace-pre-wrap leading-relaxed bg-theme-subtle p-4 rounded-[10px] border border-theme-border">
                {docResult.generated_doc}
              </pre>
            </div>
          )}
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="space-y-6">
          <div className="p-6 rounded-card bg-theme-surface border border-theme-border space-y-3.5 shadow-card">
            <label className="block text-[13px] font-sans font-medium text-theme-primary">
              Select Transformation Pattern
            </label>
            <div className="flex flex-wrap gap-3">
              <select
                value={suggType}
                onChange={(e) => setSuggType(e.target.value)}
                className="bg-theme-surface border border-theme-border rounded-[10px] px-3.5 py-2 text-xs text-theme-primary focus:outline-none focus:border-theme-accent font-sans transition-all"
              >
                <option value="error_handling">Add Defensive Error Handling</option>
                <option value="optimize">Optimize Clock Skew & Alg Whitelisting</option>
                <option value="async">Convert to Non-blocking Async</option>
                <option value="validation">Add Strong Schema Validation</option>
              </select>
              <button
                onClick={handleSuggestCode}
                disabled={loadingSugg}
                className="px-5 py-2.5 rounded-[10px] bg-theme-accent hover:bg-theme-accent-hover disabled:opacity-50 text-xs font-medium text-white transition-all shadow-sm border-0"
              >
                {loadingSugg ? 'Transforming...' : 'Refactor with Repository Context'}
              </button>
            </div>
          </div>

          {suggResult && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-card bg-theme-surface border border-theme-border text-xs text-theme-secondary leading-relaxed shadow-card">
                <strong className="text-theme-primary block font-sans text-xs font-medium mb-1">
                  Architectural Rationale:
                </strong>
                {suggResult.explanation}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-[11px] font-sans text-theme-danger font-semibold uppercase tracking-[0.06em]">
                    Original Implementation
                  </div>
                  <pre className="p-4 rounded-[10px] bg-theme-subtle border border-theme-border text-xs font-mono text-theme-secondary overflow-x-auto leading-relaxed">
                    {suggResult.original_code}
                  </pre>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-sans text-theme-success font-semibold uppercase tracking-[0.06em]">
                    Refactored Implementation
                  </div>
                  <pre className="p-4 rounded-[10px] bg-theme-subtle border border-theme-border text-xs font-mono text-theme-success overflow-x-auto leading-relaxed">
                    {suggResult.suggested_code}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
