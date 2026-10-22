import React from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  Bug,
  FileSpreadsheet,
  BrainCircuit,
  MessageSquare,
  Sparkles,
  Layers,
  LayoutDashboard,
  LogOut,
  ListTodo,
  Video,
  ShieldCheck,
  Wrench,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { Project } from '../types/qa.ts';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  testCaseCount: number;
  bugCount: number;
  isLoggingIn: boolean;
  hasWorkspaceAuth: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onLogin,
  onLogout,
  projects,
  selectedProjectId,
  onSelectProject,
  testCaseCount,
  bugCount,
  isLoggingIn,
  hasWorkspaceAuth,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'audit', label: 'Audit Sito & Bug', icon: Globe, badgeText: '5 Pilastri', highlight: true },
    { id: 'testcases', label: 'Test Cases', icon: CheckCircle2, badge: testCaseCount },
    { id: 'bugs', label: 'Defects & Bugs', icon: Bug, badge: bugCount, badgeColor: 'bg-rose-50 text-rose-700 border border-rose-200' },
    { id: 'inspector', label: 'Visual & Video QA', icon: Video },
    { id: 'thinking', label: 'High Thinking Lab', icon: BrainCircuit, badgeText: 'Argon High' },
    { id: 'copilot', label: 'AI QA Copilot', icon: MessageSquare },
    { id: 'tasks', label: 'Google Tasks', icon: ListTodo },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-md text-zinc-900 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-zinc-900 tracking-tight text-base">Online QA Tester</span>
                <p className="text-[11px] text-zinc-500 hidden sm:block">Quality Engineering & Workspace Suite</p>
              </div>
            </div>

            {/* Project Switcher */}
            {projects.length > 0 && (
              <div className="hidden md:flex items-center gap-2 pl-4 border-l border-zinc-200">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <select
                  value={selectedProjectId}
                  onChange={(e) => onSelectProject(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* User & Auth Action */}
          <div className="flex items-center gap-2.5">
            <a
              href="https://luancerco.it/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all hover:scale-[1.02] cursor-pointer"
              title="Stai riscontrando problemi nel sito? Passa da me, te lo risolvo subito!"
            >
              <img
                src="/assets/aistudio/logo_LUANCER_square.png"
                alt="Logo Luancer"
                className="w-4 h-4 rounded-sm object-cover shrink-0"
              />
              <span>Problemi nel sito?</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>

            {user ? (
              <div className="flex items-center gap-2.5">
                {hasWorkspaceAuth && (
                  <span className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Workspace Active</span>
                  </span>
                )}

                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'QA User'}
                      className="w-7 h-7 rounded-full border border-zinc-300 object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-zinc-800 text-white flex items-center justify-center font-bold text-xs">
                      {user.displayName?.[0] || user.email?.[0] || 'U'}
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-zinc-900 leading-tight">
                      {user.displayName || 'QA Engineer'}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate max-w-[120px]">{user.email}</p>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-semibold shadow-2xs transition-all disabled:opacity-70 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation - Minimalist Clean Pills */}
        <nav className="flex items-center space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-zinc-150">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                      isActive
                        ? 'bg-zinc-800 text-zinc-200'
                        : item.badgeColor || 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.badgeText && (
                  <span
                    className={`ml-1 text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
                      isActive
                        ? 'bg-zinc-800 text-purple-300 border-zinc-700'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}
                  >
                    {item.badgeText}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
