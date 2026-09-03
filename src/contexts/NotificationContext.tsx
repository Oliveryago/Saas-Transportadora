import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { fetchOperationalAlerts, type OperationalAlertCategory } from "../services/operationalAlerts";

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: "info" | "warning" | "success" | "error";
  path?: string;
  category?: OperationalAlertCategory;
}

interface NotificationContextProps {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextProps>({
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearAll: () => {},
});

function dismissedKey(tenantId: string) {
  return `notif_dismissed_${tenantId}`;
}

function loadDismissed(tenantId: string): Set<string> {
  try {
    const raw = localStorage.getItem(dismissedKey(tenantId));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(tenantId: string, ids: Set<string>) {
  localStorage.setItem(dismissedKey(tenantId), JSON.stringify([...ids]));
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { tenant } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refreshAlerts = useCallback(async () => {
    if (!tenant?.id) {
      setNotifications([]);
      return;
    }

    try {
      const alerts = await fetchOperationalAlerts(tenant.id);
      const stored = loadDismissed(tenant.id);
      const currentIds = new Set(alerts.map((alert) => alert.id));
      let pruned = false;
      for (const id of [...stored]) {
        if (!currentIds.has(id)) {
          stored.delete(id);
          pruned = true;
        }
      }
      if (pruned) saveDismissed(tenant.id, stored);

      setNotifications(
        alerts.map((alert) => ({
          ...alert,
          read: stored.has(alert.id),
        }))
      );
    } catch (error) {
      console.error("Failed to load operational alerts", error);
    }
  }, [tenant?.id]);

  useEffect(() => {
    refreshAlerts();
    const interval = window.setInterval(refreshAlerts, 120_000);
    const onFocus = () => refreshAlerts();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshAlerts]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  function markAsRead(id: string) {
    if (!tenant?.id) return;
    setNotifications((prev) => prev.map((notification) => (
      notification.id === id ? { ...notification, read: true } : notification
    )));
    const next = loadDismissed(tenant.id);
    next.add(id);
    saveDismissed(tenant.id, next);
  }

  function markAllAsRead() {
    if (!tenant?.id) return;
    setNotifications((prev) => {
      const next = new Set(prev.map((notification) => notification.id));
      saveDismissed(tenant.id, next);
      return prev.map((notification) => ({ ...notification, read: true }));
    });
  }

  function clearAll() {
    markAllAsRead();
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
