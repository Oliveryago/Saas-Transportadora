import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Droplet, Package, ShieldCheck, UserCircle } from "lucide-react";
import { useNotifications, type Notification } from "../../contexts/NotificationContext";

type PanelPos = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

function categoryIcon(notification: Notification) {
  const className = "w-4 h-4";
  switch (notification.category) {
    case "oil":
      return <Droplet className={className} />;
    case "stock":
      return <Package className={className} />;
    case "insurance":
      return <ShieldCheck className={className} />;
    case "cnh":
      return <UserCircle className={className} />;
    default:
      return <Bell className={className} />;
  }
}

function typeStyles(type: Notification["type"]) {
  if (type === "error") return "bg-red-50 text-red-600";
  if (type === "warning") return "bg-amber-50 text-amber-600";
  if (type === "success") return "bg-emerald-50 text-emerald-600";
  return "bg-blue-50 text-blue-600";
}

export function NotificationBell({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useLayoutEffect(() => {
    if (!isOpen) {
      setPos(null);
      return;
    }

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 8;
      const gap = 8;
      const width = Math.min(320, vw - margin * 2);

      let left = rect.right - 12;
      if (left + width > vw - margin) left = vw - width - margin;
      if (left < margin) left = margin;

      const spaceBelow = vh - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const openBelow = spaceBelow >= 180 || spaceBelow >= spaceAbove;
      const maxHeight = Math.max(180, (openBelow ? spaceBelow : spaceAbove) - gap);

      if (openBelow) {
        setPos({ top: rect.bottom + gap, left, width, maxHeight });
      } else {
        setPos({ bottom: vh - rect.top + gap, left, width, maxHeight });
      }
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  function handleNotificationClick(notification: Notification) {
    markAsRead(notification.id);
    setIsOpen(false);
    if (notification.path) navigate(notification.path);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={variant === "light"
          ? "relative p-2 text-gray-500 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100 focus:outline-none"
          : "relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800 focus:outline-none"}
        aria-label="Notificações"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ${variant === "light" ? "ring-white" : "ring-slate-900"}`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[80] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
          style={{
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            width: pos.width,
            maxHeight: pos.maxHeight,
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100 shrink-0">
            <h3 className="font-semibold text-gray-900">Notificações</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                title="Marcar todas como lidas"
              >
                <Check className="w-4 h-4" />
                Ler todas
              </button>
            )}
          </div>

          <div className="overflow-y-auto overscroll-contain min-h-0 flex-1">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm">Nenhuma notificação</p>
                <p className="text-xs text-gray-400 mt-1">Óleo, estoque, CNH e seguros aparecem aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex gap-3 ${!notification.read ? "bg-blue-50/50" : ""}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeStyles(notification.type)}`}>
                      {categoryIcon(notification)}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm ${!notification.read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 break-words">{notification.message}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
