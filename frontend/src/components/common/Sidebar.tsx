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
  const healthScore = repository?.codebase_health.overall || 84;

  return (
    <aside className="w-60 h-screen bg-theme-subtle border-r border-theme-border flex flex-col justify-between select-none shrink-0 z-30 transition-colors font-sans">
      {/* Brand Header */}
      <div>
        <div className="h-14 px-5 border-b border-theme-border flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-center text-theme-accent shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-medium text-theme-primary tracking-tight text-base">RepoMind</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-theme-surface text-theme-muted font-sans font-medium border border-theme-border">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-theme-muted tracking-tight font-sans">Codebase Intelligence</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-0.5">
          <div className="px-3 py-1.5 text-[11px] font-sans font-semibold text-theme-muted uppercase tracking-[0.06em]">
            Repository Intelligence
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13.5px] transition-colors duration-150 ${
                    isActive
                      ? 'bg-theme-accent/10 text-[#144931] dark:text-theme-accent font-medium'
                      : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle'
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
      <div className="p-3 border-t border-theme-border space-y-2">
        {/* Health Quick Widget */}
        <NavLink
          to="/health"
          className="block p-3 rounded-card bg-theme-surface hover:bg-theme-subtle border border-theme-border shadow-subtle transition-colors group"
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-theme-muted font-sans text-[11px] font-medium uppercase tracking-[0.04em]">Health Score</span>
            <span className="font-serif font-medium text-theme-success text-sm">
              {healthScore}/100
            </span>
          </div>
          <div className="h-2 w-full bg-theme-track rounded-full overflow-hidden block relative">
            <div
              className="h-full bg-theme-success rounded-full transition-all duration-600"
              style={{
                width: `${healthScore}%`,
                minWidth: healthScore > 0 ? '4px' : '0px',
              }}
            ></div>
          </div>
        </NavLink>

        {/* Settings Link */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] transition-colors duration-150 ${
              isActive
                ? 'bg-theme-accent/10 text-[#144931] dark:text-theme-accent font-medium'
                : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle'
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
