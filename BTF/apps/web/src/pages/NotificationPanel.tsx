import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { notificationApi } from '@/api/client';
import { useNotificationStore } from '@/store/notificationStore';
import { Bell, Mail, MessageSquare, Smartphone, CheckCircle2, AlertTriangle, Info, FileText } from 'lucide-react';

const channelIcons: Record<string, React.ElementType> = {
  PUSH: Bell,
  SMS: Smartphone,
  EMAIL: Mail,
  IN_APP: MessageSquare,
};

const typeConfig: Record<string, { color: string; icon: React.ElementType }> = {
  ALARM: { color: 'bg-red-50 border-red-200', icon: AlertTriangle },
  REMINDER: { color: 'bg-yellow-50 border-yellow-200', icon: Bell },
  INFO: { color: 'bg-blue-50 border-blue-200', icon: Info },
  ESCALATION: { color: 'bg-orange-50 border-orange-200', icon: AlertTriangle },
  REPORT_READY: { color: 'bg-green-50 border-green-200', icon: FileText },
};

export default function NotificationPanel() {
  const queryClient = useQueryClient();
  const { notifications, setNotifications, markAsRead } = useNotificationStore();

  const userId = 'user-1'; // TODO: z auth context

  const { data } = useQuery(
    ['notifications', userId],
    () => notificationApi.getUnread(userId),
    { refetchInterval: 10000 }
  );

  useEffect(() => {
    if (data) setNotifications((data as any) || []);
  }, [data]);

  const readMutation = useMutation(
    (id: string) => notificationApi.markAsRead(id),
    {
      onSuccess: (_, id) => {
        markAsRead(id);
        queryClient.invalidateQueries(['notifications', userId]);
      },
    }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Panel Powiadomień</h2>
          <p className="text-gray-500 mt-1">Push, SMS, Email i komunikaty w aplikacji</p>
        </div>
        <div className="flex items-center gap-2 bg-turkey-50 px-4 py-2 rounded-lg">
          <Bell size={18} className="text-turkey-600" />
          <span className="text-sm font-medium text-turkey-800">
            {notifications.filter((n) => !n.isRead).length} nieprzeczytanych
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="card text-center py-12">
            <Bell size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Brak powiadomień</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const cfg = typeConfig[notification.type] || typeConfig.INFO;
            const TypeIcon = cfg.icon;
            const ChannelIcon = channelIcons[notification.channel] || MessageSquare;
            return (
              <div
                key={notification.id}
                className={`card p-4 border-l-4 ${
                  notification.isRead ? 'border-gray-200 opacity-75' : 'border-turkey-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${cfg.color}`}>
                    <TypeIcon size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <ChannelIcon size={12} />
                          {notification.channel}
                        </span>
                        {!notification.isRead && (
                          <button
                            onClick={() => {
                              markAsRead(notification.id);
                              readMutation.mutate(notification.id);
                            }}
                            className="text-xs text-turkey-600 hover:text-turkey-800 flex items-center gap-1"
                          >
                            <CheckCircle2 size={12} /> Oznacz jako przeczytane
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {notification.sentAt
                        ? new Date(notification.sentAt).toLocaleString('pl-PL')
                        : new Date(notification.createdAt).toLocaleString('pl-PL')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
