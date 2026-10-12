import React, { useState, useEffect } from 'react';
import { Search, Filter, FileCode, Code2, ArrowUpRight } from 'lucide-react';
import { useRepository } from '../hooks/useRepository';
import { api } from '../services/api';
import { SearchResult } from '../types';
import { useNavigate } from 'react-router-dom';

const SAMPLE_SEARCHES = [
  'Find code that validates JWT tokens',
  'Show functions that calculate shipping cost',
  'Where are database connections created?',
  'How are user profile updates handled?',
  'Where are payment transactions captured?',
];

export const SearchPage: React.FC = () => {
  const { repository, jumpToFileLine } = useRepository();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [layerFilter, setLayerFilter] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery || query;
    if (!q.trim() || !repository) return;
    setLoading(true);
    try {
      const data = await api.searchCode({
        query: q,
        repository_id: repository.id,
        kind_filter: kindFilter,
        layer_filter: layerFilter,
        limit: 10,
      });
      setResults(data.results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch('jwt token authentication verify');
  }, [repository]);

  const handleResultClick = (res: SearchResult) => {
    jumpToFileLine(res.file_path, res.line_start);
    navigate('/explorer');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif font-medium text-theme-primary tracking-tight">Semantic Code Search</h1>
        <p className="text-sm text-theme-secondary mt-1">
          Combines dense vector embeddings with AST symbol exact-match boosting.
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-theme-muted absolute left-3.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search code using natural language (e.g. 'validate token', 'shipping cost')..."
            className="w-full pl-10 pr-24 py-3 bg-theme-surface border border-theme-border rounded-[10px] text-sm text-theme-primary placeholder-theme-muted focus:outline-none focus:border-theme-accent focus:ring-2 focus:ring-theme-accent/40 font-sans shadow-card transition-all"
          />
          <button
            onClick={() => handleSearch()}
            className="absolute right-2 px-3.5 py-1.5 rounded-[10px] bg-theme-accent hover:bg-theme-accent-hover text-xs font-medium text-white transition-all shadow-sm border-0"
          >
            Search
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-theme-secondary text-xs">
              <Filter className="w-3.5 h-3.5 text-theme-muted" />
              <span className="font-medium text-theme-primary">Kind:</span>
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className="bg-theme-surface border border-theme-border rounded-[8px] px-2.5 py-1 text-xs text-theme-primary focus:outline-none focus:border-theme-accent font-sans transition-all"
              >
                <option value="all">All Symbols</option>
                <option value="function">Functions</option>
                <option value="method">Methods</option>
                <option value="class">Classes</option>
                <option value="interface">Interfaces</option>
                <option value="file">Files</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-theme-secondary text-xs">
              <span className="font-medium text-theme-primary">Layer:</span>
              <select
                value={layerFilter}
                onChange={(e) => setLayerFilter(e.target.value)}
                className="bg-theme-surface border border-theme-border rounded-[8px] px-2.5 py-1 text-xs text-theme-primary focus:outline-none focus:border-theme-accent font-sans transition-all"
              >
                <option value="all">All Layers</option>
                <option value="presentation">Presentation</option>
                <option value="service">Service</option>
                <option value="repository">Repository</option>
                <option value="database">Database</option>
                <option value="test">Test</option>
              </select>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-theme-muted">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">Examples:</span>
            {SAMPLE_SEARCHES.slice(0, 2).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQuery(s);
                  handleSearch(s);
                }}
                className="px-2.5 py-1 rounded-full bg-theme-surface hover:bg-theme-subtle border border-theme-border text-theme-primary text-xs transition-colors truncate max-w-[220px]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs text-theme-muted">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">Results: {results.length} matches</span>
          {loading && <span className="text-theme-accent animate-pulse font-medium">Running hybrid retrieval...</span>}
        </div>

        {results.map((res, idx) => (
          <div
            key={idx}
            onClick={() => handleResultClick(res)}
            className="p-5 rounded-card bg-theme-surface border border-theme-border hover:border-theme-accent/40 cursor-pointer transition-all space-y-3 shadow-card group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-theme-accent/10 text-theme-accent">
                  <Code2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-semibold font-mono text-theme-primary group-hover:text-theme-accent transition-colors">
                  {res.symbol_name}
                </span>
                <span className="text-[10px] uppercase font-sans font-semibold tracking-wider px-2 py-0.5 rounded-full bg-theme-subtle text-theme-primary border border-theme-border">
                  {res.symbol_kind}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-xs font-sans font-medium text-theme-success bg-theme-success/10 px-2 py-0.5 rounded-full">
                  Score: {res.score.toFixed(2)}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-theme-muted group-hover:text-theme-accent transition-colors" />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-theme-muted">
              <FileCode className="w-3.5 h-3.5" />
              <span className="text-theme-primary">{res.file_path}</span>
              <span>•</span>
              <span>Lines {res.line_start}–{res.line_end}</span>
            </div>

            <pre className="p-3.5 rounded-lg bg-theme-subtle border border-theme-border text-xs font-mono text-theme-primary overflow-x-auto leading-relaxed max-h-36">
              {res.snippet}
            </pre>

            <p className="text-xs text-theme-secondary font-sans leading-relaxed">{res.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
