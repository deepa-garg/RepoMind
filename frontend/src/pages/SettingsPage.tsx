import React, { useState } from 'react';
import { Settings, Key, Database, Check, Sparkles } from 'lucide-react';
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
        <h1 className="text-2xl font-serif font-medium text-theme-primary tracking-tight flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-theme-accent" />
          <span>System & API Configuration</span>
        </h1>
        <p className="text-sm text-theme-secondary mt-1">
          Configure external LLM reasoning providers, vector stores, and GitHub credentials.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-card bg-theme-surface border border-theme-border space-y-4 shadow-card">
          <h2 className="text-xs font-sans uppercase font-semibold text-theme-primary tracking-[0.06em] flex items-center gap-2">
            <Key className="w-4 h-4 text-theme-accent" />
            <span>LLM Providers (Optional - Internal Grounded Engine Active)</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-sans text-theme-primary mb-1.5 font-medium">
                Anthropic API Key (Claude 3.5 Sonnet)
              </label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-4 py-2.5 bg-theme-surface border border-theme-border rounded-[10px] text-sm text-theme-primary font-mono placeholder-theme-muted focus:outline-none focus:border-theme-accent focus:ring-2 focus:ring-theme-accent/40 transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-sans text-theme-primary mb-1.5 font-medium">
                OpenAI API Key (GPT-4o)
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full px-4 py-2.5 bg-theme-surface border border-theme-border rounded-[10px] text-sm text-theme-primary font-mono placeholder-theme-muted focus:outline-none focus:border-theme-accent focus:ring-2 focus:ring-theme-accent/40 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-card bg-theme-surface border border-theme-border space-y-4 shadow-card">
          <h2 className="text-xs font-sans uppercase font-semibold text-theme-primary tracking-[0.06em] flex items-center gap-2">
            <Database className="w-4 h-4 text-theme-accent" />
            <span>Infrastructure & Ingestion</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-sans text-theme-primary mb-1.5 font-medium">
                Qdrant Vector Database URL
              </label>
              <input
                type="text"
                value={qdrantUrl}
                onChange={(e) => setQdrantUrl(e.target.value)}
                placeholder=":memory: or http://localhost:6333"
                className="w-full px-4 py-2.5 bg-theme-surface border border-theme-border rounded-[10px] text-sm text-theme-primary font-mono placeholder-theme-muted focus:outline-none focus:border-theme-accent focus:ring-2 focus:ring-theme-accent/40 transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-sans text-theme-primary mb-1.5 font-medium">
                GitHub Personal Access Token (for private repos & rate limits)
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
                className="w-full px-4 py-2.5 bg-theme-surface border border-theme-border rounded-[10px] text-sm text-theme-primary font-mono placeholder-theme-muted focus:outline-none focus:border-theme-accent focus:ring-2 focus:ring-theme-accent/40 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleReloadDemo}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-theme-surface hover:bg-theme-subtle border border-theme-border text-xs text-theme-primary font-sans font-medium transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-theme-accent" />
            <span>Reset Demo Repository</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-theme-accent hover:bg-theme-accent-hover text-xs font-medium text-white transition-all shadow-sm border-0"
          >
            {saved ? <Check className="w-3.5 h-3.5 text-white" /> : null}
            <span>{saved ? 'Saved Successfully' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
