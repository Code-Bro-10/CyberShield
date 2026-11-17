import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSocket } from '../services/socket';
import { playAlertSound } from '../utils/audioAlert';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [alertToasts, setAlertToasts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('cybershield_sound_enabled') !== 'false';
  });

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('cybershield_sound_enabled', String(nextVal));
  };

  const dismissToast = useCallback((alertId) => {
    setAlertToasts((prev) => prev.filter((t) => t.alertId !== alertId));
  }, []);

  const clearAllToasts = useCallback(() => {
    setAlertToasts([]);
  }, []);

  // Request browser notification permission if not yet decided
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const s = getSocket();
    setSocket(s);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onNewAlert = (data) => {
      const alert = data.alert || data;
      setUnreadAlertCount((c) => c + 1);

      // Add to toast notifications (keep max 4 active)
      setAlertToasts((prev) => [
        { ...alert, receivedAt: Date.now() },
        ...prev.slice(0, 3)
      ]);

      // Trigger audio chime
      if (soundEnabled) {
        playAlertSound(alert.severity);
      }

      // Browser push notification if permitted and in background
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        try {
          new Notification(`CyberShield SOC [${alert.severity}]`, {
            body: `${alert.category}: ${alert.description}`,
            icon: '/favicon.svg',
          });
        } catch {
          // ignore
        }
      }
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('new_alert', onNewAlert);

    if (s.connected) {
      setConnected(true);
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('new_alert', onNewAlert);
    };
  }, [soundEnabled]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        unreadAlertCount,
        setUnreadAlertCount,
        alertToasts,
        dismissToast,
        clearAllToasts,
        soundEnabled,
        toggleSound,
        requestNotificationPermission,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
