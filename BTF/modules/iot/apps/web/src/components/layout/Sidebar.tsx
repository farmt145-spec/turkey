import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Cpu, Map, Box, Brain, Bell, Settings, FileText, LogOut } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/devices', icon: Cpu, label: 'Urządzenia' },
    { to: '/map', icon: Map, label: 'Mapa' },
    { to: '/digital-twin', icon: Box, label: 'Digital Twin' },
    { to: '/ai', icon: Brain, label: 'AI Engine' },
    { to: '/alarms', icon: Bell, label: 'Alarmy' },
    { to: '/reports', icon: FileText, label: 'Raporty' },
    { to: '/settings', icon: Settings, label: 'Ustawienia' },
  ];
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white">BT</div>
          <div>
            <h1 className="font-bold text-lg leading-tight">BLOODY TURKEY</h1>
            <p className="text-xs text-gray-400">IoT & Automatyka</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) => `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <button className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white w-full rounded-lg hover:bg-gray-800 transition-colors">
          <LogOut className="w-5 h-5" /><span className="font-medium">Wyloguj</span>
        </button>
      </div>
    </aside>
  );
};
