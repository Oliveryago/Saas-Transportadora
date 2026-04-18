import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: "info" | "warning" | "success" | "error";
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

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load from local storage initially
  useEffect(() => {
    if (user?.tenant_id) {
      const saved = localStorage.getItem(`notifications_${user.tenant_id}`);
      if (saved) {
        try {
          setNotifications(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse notifications");
        }
      }
    }
  }, [user?.tenant_id]);

  // Save to local storage when changed
  useEffect(() => {
    if (user?.tenant_id && notifications.length > 0) {
      localStorage.setItem(`notifications_${user.tenant_id}`, JSON.stringify(notifications.slice(0, 50))); // Keep last 50
    }
  }, [notifications, user?.tenant_id]);

  const addNotification = useCallback((notif: Omit<Notification, "id" | "date" | "read">) => {
    setNotifications((prev) => [
      {
        ...notif,
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  }, []);

  useEffect(() => {
    if (!user?.tenant_id) return;

    // Listen to changes in important tables
    const maintChannel = supabase
      .channel("maintenance_inserts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "maintenance_records",
          filter: `tenant_id=eq.${user.tenant_id}`,
        },
        (payload) => {
          // If the user itself made the change, we could skip it, but let's just show it for demo
          addNotification({
            title: "Nova Manutenção",
            message: `Registro adicionado no valor de R$ ${payload.new.value_brl || 0}`,
            type: "warning",
          });
        }
      )
      .subscribe();

    const fuelChannel = supabase
      .channel("fuel_inserts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "fuel_records",
          filter: `tenant_id=eq.${user.tenant_id}`,
        },
        (payload) => {
          addNotification({
            title: "Novo Abastecimento",
            message: `${payload.new.liters} litros registrados em ${payload.new.fuel_station || "Posto"}`,
            type: "info",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(maintChannel);
      supabase.removeChannel(fuelChannel);
    };
  }, [user?.tenant_id, addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAsRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function clearAll() {
    setNotifications([]);
    if (user?.tenant_id) {
      localStorage.removeItem(`notifications_${user.tenant_id}`);
    }
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
