import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  Activity,
  History,
  CalendarClock,
  Bell,
  BrainCircuit,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNotificationStore } from '@/store/notificationStore';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/workflows', label: 'Workflow', icon: GitBranch },
  { to: '/monitor', label: 'Monitor', icon: Activity },
  { to: '/history', label: 'Historia', icon: History },
  { to: '/schedule', label: 'Harmonogram', icon: CalendarClock },
  { to: '/notifications', label: 'Powiadomienia', icon: Bell },
  { to: '/ai-suggestions', label: 'AI Assistant', icon: BrainCircuit },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { unreadCount } = useNotificationStore();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-turkey-900 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-turkey-800">
          {sidebarOpen && (
            <span className="font-bold text-lg tracking-tight">🦃 BTE</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded hover:bg-turkey-800 transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-turkey-700 text-white'
                    : 'text-turkey-100 hover:bg-turkey-800'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && (
                  <span className="ml-3 text-sm font-medium flex-1">{item.label}</span>
                )}
                {sidebarOpen && item.to === '/notifications' && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-turkey-800">
          {sidebarOpen && (
            <div className="text-xs text-turkey-300">
              <p className="font-semibold">Bloody Turkey Enterprise</p>
              <p>v1.0.0 – Moduł Integracji</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <h1 className="text-xl font-semibold text-gray-800">
            {navItems.find((n) => n.to === location.pathname)?.label || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600">System aktywny</span>
            </div>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
