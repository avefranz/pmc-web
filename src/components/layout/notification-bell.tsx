import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  Inbox,
  CalendarCheck,
  CircleDollarSign,
  FileSignature,
  Stamp,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/stores/auth.store";
import {
  useNotificationFeed,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/hooks/use-notifications";
import { NotificationType, type NotificationDto } from "@/lib/types";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

// BUG-265: header notification bell + panel. Reads the in-app feed the
// backend exposes at GET /api/me/notifications, shows an unread badge, and
// lets the user mark items read (individually on click, or all at once).

interface TypeStyle {
  icon: LucideIcon;
  className: string;
}

// Icon + accent per notification type. Unknown types fall back to the bell.
function styleFor(type: string): TypeStyle {
  switch (type) {
    case NotificationType.BookingRequestReceived:
      return { icon: Inbox, className: "text-indigo-500 bg-indigo-500/12" };
    case NotificationType.BookingRequestApproved:
    case NotificationType.ReservationCreated:
      return { icon: CalendarCheck, className: "text-emerald-500 bg-emerald-500/12" };
    case NotificationType.BookingRequestRejected:
      return { icon: XCircle, className: "text-rose-500 bg-rose-500/12" };
    case NotificationType.PaymentReceived:
      return { icon: CircleDollarSign, className: "text-emerald-500 bg-emerald-500/12" };
    case NotificationType.ContractSigned:
      return { icon: FileSignature, className: "text-violet-500 bg-violet-500/12" };
    case NotificationType.Tm30Filed:
      return { icon: Stamp, className: "text-sky-500 bg-sky-500/12" };
    default:
      return { icon: Bell, className: "text-fg-muted bg-bg-subtle" };
  }
}

export function NotificationBell() {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data } = useNotificationFeed();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Bell only makes sense for authenticated users (mirrors UserMenu).
  if (!token) return null;

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  function handleOpen(n: NotificationDto) {
    setOpen(false);
    if (!n.isRead) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-bg-subtle transition-colors"
          aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        >
          <Bell size={18} className="text-fg-muted" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-bold bg-brand text-white leading-none ring-2 ring-bg-card">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] max-w-[calc(100vw-1rem)] p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-fg">
            Notifications
            {unread > 0 && (
              <span className="ml-1.5 text-xs font-medium text-fg-muted">({unread} new)</span>
            )}
          </p>
          {unread > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                markAllRead.mutate();
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-bg-subtle flex items-center justify-center mb-3">
              <Bell size={20} className="text-fg-subtle" />
            </div>
            <p className="text-sm font-medium text-fg">You're all caught up</p>
            <p className="text-xs text-fg-muted mt-0.5">
              New booking activity will show up here.
            </p>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            {items.map((n) => {
              const { icon: Icon, className } = styleFor(String(n.type));
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleOpen(n)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-subtle border-b border-border last:border-b-0",
                    !n.isRead && "bg-brand/[0.04]",
                  )}
                >
                  <div className={cn("shrink-0 w-9 h-9 rounded-full flex items-center justify-center", className)}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-snug", n.isRead ? "text-fg" : "text-fg font-semibold")}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-fg-muted mt-0.5 leading-snug line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[11px] text-fg-subtle mt-1">{formatRelative(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-brand" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Footer — only when there are read items the user might want to clear */}
        {items.length > 0 && unread === 0 && (
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-center gap-1.5 text-xs text-fg-muted">
            <Check size={12} /> No unread notifications
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
