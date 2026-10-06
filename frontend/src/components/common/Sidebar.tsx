import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderTree,
  Bot,
  Search,
  Network,
  Zap,
  Bug,
  TestTube2,
  BookOpen,
  ShieldAlert,
  Activity,
  Settings,
  Layers,
} from 'lucide-react';
import { useRepository } from '../../hooks/useRepository';

const navItems = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/explorer', label: 'Code Explorer', icon: FolderTree },
  { path: '/assistant', label: 'AI Assistant', icon: Bot },
  { path: '/search', label: 'Semantic Search', icon: Search },
  { path: '/graph', label: 'Dependency Graph', icon: Network },
  { path: '/impact', label: 'Impact Analysis', icon: Zap },
  { path: '/bugs', label: 'Bug Investigator', icon: Bug },
  { path: '/tests', label: 'Test Generator', icon: TestTube2 },
  { path: '/docs', label: 'Documentation', icon: BookOpen },
  { path: '/security', label: 'Security & Smells', icon: ShieldAlert },
  { path: '/health', label: 'Codebase Health', icon: Activity },
];

export const Sidebar: React.FC = () => {
  const { repository } = useRepository();

  return (
    <aside className="w-60 h-screen bg-dark-900 border-r border-dark-800 flex flex-col justify-between select-none shrink-0 z-30">
      {/* Brand Header */}
      <div>
        <div className="h-14 px-5 border-b border-dark-800 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 font-mono font-bold text-sm shadow-sm">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white tracking-tight text-sm">RepoMind</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-dark-800 text-brand-400 font-mono font-medium border border-dark-700">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-dark-400 tracking-tight">Codebase Intelligence</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-0.5">
          <div className="px-2 py-1.5 text-[10px] font-mono font-semibold text-dark-500 uppercase tracking-wider">
            Repository Intelligence
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 font-semibold'
                      : 'text-dark-300 hover:text-white hover:bg-dark-850 border border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Details */}
      <div className="p-3 border-t border-dark-800 space-y-2">
        {/* Health Quick Widget */}
        <NavLink
          to="/health"
          className="block p-2.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-750 transition-colors"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-dark-400 font-mono text-[11px]">Health Score</span>
            <span className="font-semibold font-mono text-emerald-400">
              {repository?.codebase_health.overall || 84}/100
            </span>
          </div>
          <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full"
              style={{ width: `${repository?.codebase_health.overall || 84}%` }}
            ></div>
          </div>
        </NavLink>

        {/* Settings Link */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              isActive
                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                : 'text-dark-400 hover:text-white hover:bg-dark-850'
            }`
          }
        >
          <Settings className="w-4 h-4" />
          <span>System Settings</span>
        </NavLink>
      </div>
    </aside>
  );
};
