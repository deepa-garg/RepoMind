import React, { useState } from 'react';
import { Settings, Key, Database, GitBranch, Check, Sparkles } from 'lucide-react';
import { useRepository } from '../hooks/useRepository';

export const SettingsPage: React.FC = () => {
  const { analyzeRepo } = useRepository();
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [qdrantUrl, setQdrantUrl] = useState(':memory:');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReloadDemo = () => {
    analyzeRepo('https://github.com/repomind/ecommerce-platform', 'main', true);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 font-sans animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-400" />
          <span>System & API Configuration</span>
        </h1>
        <p className="text-xs text-dark-400 mt-1">
          Configure external LLM reasoning providers, vector stores, and GitHub credentials.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 space-y-4 shadow-xl">
          <h2 className="text-xs font-mono uppercase font-semibold text-white tracking-wider flex items-center gap-2">
            <Key className="w-4 h-4 text-brand-400" />
            <span>LLM Providers (Optional - Internal Grounded Engine Active)</span>
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-dark-300 mb-1">
                Anthropic API Key (Claude 3.5 Sonnet)
              </label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-3.5 py-2 bg-dark-950 border border-dark-750 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-dark-300 mb-1">
                OpenAI API Key (GPT-4o)
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full px-3.5 py-2 bg-dark-950 border border-dark-750 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 space-y-4 shadow-xl">
          <h2 className="text-xs font-mono uppercase font-semibold text-white tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-400" />
            <span>Infrastructure & Ingestion</span>
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-dark-300 mb-1">
                Qdrant Vector Database URL
              </label>
              <input
                type="text"
                value={qdrantUrl}
                onChange={(e) => setQdrantUrl(e.target.value)}
                placeholder=":memory: or http://localhost:6333"
                className="w-full px-3.5 py-2 bg-dark-950 border border-dark-750 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-dark-300 mb-1">
                GitHub Personal Access Token (for private repos & rate limits)
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
                className="w-full px-3.5 py-2 bg-dark-950 border border-dark-750 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleReloadDemo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs text-brand-300 font-mono transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Reset Demo Repository</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-medium text-white transition-colors shadow-sm"
          >
            {saved ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : null}
            <span>{saved ? 'Saved Successfully' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
