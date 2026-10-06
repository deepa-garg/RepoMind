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
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <span>Code Intelligence Generators</span>
        </h1>
        <p className="text-xs text-dark-400 mt-1">
          Context-aware test suites, architectural documentation, and defensive code refactors.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-dark-800 pb-2">
        <button
          onClick={() => setActiveTab('tests')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'tests'
              ? 'bg-brand-500/15 text-brand-300 border border-brand-500/25'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <TestTube2 className="w-4 h-4 text-emerald-400" />
          <span>Test Suite Generator</span>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'docs'
              ? 'bg-brand-500/15 text-brand-300 border border-brand-500/25'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span>Documentation Assistant</span>
        </button>

        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'suggestions'
              ? 'bg-brand-500/15 text-brand-300 border border-brand-500/25'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <Code2 className="w-4 h-4 text-sky-400" />
          <span>Code Suggestion & Refactor</span>
        </button>
      </div>

      {activeTab === 'tests' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-dark-900 border border-dark-800 space-y-3">
            <label className="block text-xs font-mono text-dark-300 font-medium">
              Target Function to Generate Unit Tests
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testSymbol}
                onChange={(e) => setTestSymbol(e.target.value)}
                placeholder="e.g. AuthService.login"
                className="flex-1 px-3.5 py-2.5 bg-dark-950 border border-dark-750 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-brand-500 shadow-inner"
              />
              <button
                onClick={handleGenerateTests}
                disabled={loadingTest}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
              >
                {loadingTest ? 'Synthesizing...' : 'Generate Jest Suite'}
              </button>
            </div>
          </div>

          {testResult && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-dark-900 border border-dark-800 space-y-1">
                  <div className="text-[10px] uppercase font-mono text-emerald-400 font-bold">
                    Normal Cases
                  </div>
                  <div className="text-xs text-dark-300">{testResult.normal_cases.join(', ')}</div>
                </div>

                <div className="p-3 rounded-lg bg-dark-900 border border-dark-800 space-y-1">
                  <div className="text-[10px] uppercase font-mono text-amber-400 font-bold">
                    Edge Cases
                  </div>
                  <div className="text-xs text-dark-300">{testResult.edge_cases.join(', ')}</div>
                </div>

                <div className="p-3 rounded-lg bg-dark-900 border border-dark-800 space-y-1">
                  <div className="text-[10px] uppercase font-mono text-sky-400 font-bold">
                    Boundary Cases
                  </div>
                  <div className="text-xs text-dark-300">{testResult.boundary_cases.join(', ')}</div>
                </div>

                <div className="p-3 rounded-lg bg-dark-900 border border-dark-800 space-y-1">
                  <div className="text-[10px] uppercase font-mono text-rose-400 font-bold">
                    Failure Modes
                  </div>
                  <div className="text-xs text-dark-300">{testResult.failure_cases.join(', ')}</div>
                </div>
              </div>

              <div className="rounded-xl bg-dark-900 border border-dark-800 overflow-hidden shadow-lg">
                <div className="px-4 py-2.5 bg-dark-850 border-b border-dark-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-dark-300">tests/generated/{testSymbol}.test.ts</span>
                  <button
                    onClick={() => handleCopy(testResult.test_code)}
                    className="flex items-center gap-1.5 text-dark-400 hover:text-white"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-dark-200 overflow-x-auto leading-relaxed bg-dark-950">
                  {testResult.test_code}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'docs' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-dark-900 border border-dark-800 space-y-3">
            <label className="block text-xs font-mono text-dark-300 font-medium">
              Select Module / File to Document
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={docFile}
                onChange={(e) => setDocFile(e.target.value)}
                placeholder="src/auth/AuthService.ts"
                className="flex-1 px-3.5 py-2.5 bg-dark-950 border border-dark-750 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-brand-500 shadow-inner"
              />
              <button
                onClick={handleGenerateDocs}
                disabled={loadingDoc}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
              >
                {loadingDoc ? 'Drafting...' : 'Generate Markdown'}
              </button>
            </div>
          </div>

          {docResult && (
            <div className="rounded-xl bg-dark-900 border border-dark-800 p-6 space-y-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between border-b border-dark-800 pb-3">
                <h3 className="text-sm font-semibold text-white font-mono">{docResult.title}</h3>
                <button
                  onClick={() => handleCopy(docResult.generated_doc)}
                  className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-white font-mono"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </button>
              </div>
              <pre className="text-xs font-mono text-dark-200 whitespace-pre-wrap leading-relaxed bg-dark-950 p-4 rounded-lg border border-dark-850">
                {docResult.generated_doc}
              </pre>
            </div>
          )}
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-dark-900 border border-dark-800 space-y-3">
            <label className="block text-xs font-mono text-dark-300 font-medium">
              Select Transformation Pattern
            </label>
            <div className="flex gap-3">
              <select
                value={suggType}
                onChange={(e) => setSuggType(e.target.value)}
                className="bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-xs text-dark-200 focus:outline-none focus:border-brand-500 font-mono"
              >
                <option value="error_handling">Add Defensive Error Handling</option>
                <option value="optimize">Optimize Clock Skew & Alg Whitelisting</option>
                <option value="async">Convert to Non-blocking Async</option>
                <option value="validation">Add Strong Schema Validation</option>
              </select>
              <button
                onClick={handleSuggestCode}
                disabled={loadingSugg}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
              >
                {loadingSugg ? 'Transforming...' : 'Refactor with Repository Context'}
              </button>
            </div>
          </div>

          {suggResult && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 text-xs text-dark-300 leading-relaxed">
                <strong className="text-white block font-mono text-[11px] mb-1">
                  Architectural Rationale:
                </strong>
                {suggResult.explanation}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-rose-400 font-semibold uppercase">
                    Original Implementation
                  </div>
                  <pre className="p-4 rounded-xl bg-dark-950 border border-dark-800 text-xs font-mono text-dark-400 overflow-x-auto leading-relaxed">
                    {suggResult.original_code}
                  </pre>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-emerald-400 font-semibold uppercase">
                    Refactored Implementation
                  </div>
                  <pre className="p-4 rounded-xl bg-dark-950 border border-emerald-950 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
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
