import React, { useState, useEffect } from 'react';
import { Bell, Check, AlertTriangle, Info, X } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';

interface Notification { id: string; title: string; message: string; severity: string; isRead: boolean; createdAt: string; }

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useWebSocket({
    farmId: 'farm-1',
    onAlarm: (alarm) => {
      setNotifications((prev) => [{ id: alarm.id, title: alarm.type, message: alarm.message, severity: alarm.severity, isRead: false, createdAt: alarm.createdAt }, ...prev]);
    },
  });

  const markAsRead = (id: string) => { setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))); };
  const markAllAsRead = () => { setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true }))); };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadCount}</span>}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Powiadomienia</h3>
            {unreadCount > 0 && <button onClick={markAllAsRead} className="text-sm text-blue-600 hover:text-blue-800 flex items-center"><Check className="w-4 h-4 mr-1" />Oznacz wszystkie</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && <div className="p-8 text-center text-gray-500"><Info className="w-6 h-6 mx-auto mb-2 text-gray-300" /><p>Brak powiadomień</p></div>}
            {notifications.map((n) => (
              <div key={n.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 ${!n.isRead ? 'bg-blue-50/30' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    {n.severity === 'CRITICAL' || n.severity === 'EMERGENCY' ? <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" /> : <Info className="w-4 h-4 text-blue-500 mt-0.5" />}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('pl-PL')}</p>
                    </div>
                  </div>
                  {!n.isRead && <button onClick={() => markAsRead(n.id)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
