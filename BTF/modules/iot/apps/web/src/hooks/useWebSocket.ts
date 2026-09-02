import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  farmId?: string; deviceIds?: string[];
  onTelemetry?: (data: any) => void; onAlarm?: (data: any) => void; onDeviceStatus?: (data: any) => void;
}

export const useWebSocket = (options: UseWebSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const socket = io(`${import.meta.env.VITE_WS_URL || 'http://localhost:4000'}/iot`, { auth: { token }, transports: ['websocket'] });
    socket.on('connect', () => {
      setIsConnected(true); setError(null);
      if (options.farmId) socket.emit('subscribe:farm', options.farmId);
      if (options.deviceIds) options.deviceIds.forEach(id => socket.emit('subscribe:device', id));
    });
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', (err) => { setError(err.message); setIsConnected(false); });
    socket.on('telemetry:realtime', options.onTelemetry || (() => {}));
    socket.on('alarm:new', options.onAlarm || (() => {}));
    socket.on('device:status', options.onDeviceStatus || (() => {}));
    socketRef.current = socket;
  }, [options.farmId, options.deviceIds]);

  const disconnect = useCallback(() => { if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; } }, []);
  useEffect(() => { connect(); return () => disconnect(); }, [connect, disconnect]);
  return { isConnected, error, socket: socketRef.current, connect, disconnect };
};
