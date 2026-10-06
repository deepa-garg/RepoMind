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
        <h1 className="text-xl font-bold text-white tracking-tight">Semantic Code Search</h1>
        <p className="text-xs text-dark-400 mt-1">
          Combines Qdrant dense vector embeddings with AST symbol exact-match boosting.
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-dark-400 absolute left-3.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search code using natural language (e.g. 'validate token', 'shipping cost')..."
            className="w-full pl-10 pr-24 py-3 bg-dark-900 border border-dark-750 rounded-xl text-xs text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 font-mono shadow-inner"
          />
          <button
            onClick={() => handleSearch()}
            className="absolute right-2 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-medium text-white transition-colors"
          >
            Search
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-dark-400 font-mono text-[11px]">
              <Filter className="w-3.5 h-3.5" />
              <span>Kind:</span>
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className="bg-dark-850 border border-dark-750 rounded px-2 py-1 text-xs text-dark-200 focus:outline-none focus:border-brand-500 font-mono"
              >
                <option value="all">All Symbols</option>
                <option value="function">Functions</option>
                <option value="method">Methods</option>
                <option value="class">Classes</option>
                <option value="interface">Interfaces</option>
                <option value="file">Files</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-dark-400 font-mono text-[11px]">
              <span>Layer:</span>
              <select
                value={layerFilter}
                onChange={(e) => setLayerFilter(e.target.value)}
                className="bg-dark-850 border border-dark-750 rounded px-2 py-1 text-xs text-dark-200 focus:outline-none focus:border-brand-500 font-mono"
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

          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-dark-400">
            <span>Examples:</span>
            {SAMPLE_SEARCHES.slice(0, 2).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQuery(s);
                  handleSearch(s);
                }}
                className="px-2 py-0.5 rounded bg-dark-850 hover:bg-dark-800 border border-dark-750 text-dark-300 hover:text-white transition-colors truncate max-w-[200px]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs font-mono text-dark-400">
          <span>Results: {results.length} matches</span>
          {loading && <span className="text-brand-400 animate-pulse">Running hybrid retrieval...</span>}
        </div>

        {results.map((res, idx) => (
          <div
            key={idx}
            onClick={() => handleResultClick(res)}
            className="p-5 rounded-xl bg-dark-900 border border-dark-800 hover:border-brand-500/50 cursor-pointer transition-all space-y-3 shadow-md group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-dark-800 text-brand-400">
                  <Code2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold font-mono text-white group-hover:text-brand-300 transition-colors">
                  {res.symbol_name}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-dark-800 text-dark-400 border border-dark-750">
                  {res.symbol_kind}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                  Score: {res.score.toFixed(2)}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-dark-500 group-hover:text-brand-400 transition-colors" />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-dark-400">
              <FileCode className="w-3.5 h-3.5 text-dark-500" />
              <span>{res.file_path}</span>
              <span>•</span>
              <span>Lines {res.line_start}–{res.line_end}</span>
            </div>

            <pre className="p-3 rounded-lg bg-dark-950 border border-dark-800 text-[11px] font-mono text-dark-200 overflow-x-auto leading-relaxed max-h-36">
              {res.snippet}
            </pre>

            <p className="text-[11px] text-dark-400 italic font-mono">{res.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
