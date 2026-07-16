import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  type NotificationRow,
} from "@/hooks/use-notifications";

function timeAgo(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { items, unreadCount, markAsRead, markAllAsRead } = useNotifications(20);

  const handleClick = async (n: NotificationRow) => {
    if (!n.is_read) await markAsRead(n.id);
    if (n.link) {
      navigate({ to: n.link });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] leading-none"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold">Notifications</div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={unreadCount === 0}
            onClick={(e) => {
              e.preventDefault();
              void markAllAsRead();
            }}
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-[400px]">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className={cn(
                      "flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-accent/60",
                      !n.is_read && "bg-primary/5",
                    )}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm",
                          !n.is_read ? "font-semibold" : "font-medium",
                        )}
                      >
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span
                          aria-hidden
                          className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {n.message}
                    </p>
                    <span className="text-[11px] text-muted-foreground/80">
                      {timeAgo(n.created_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-sm"
            onClick={() => navigate({ to: "/notifications" })}
          >
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
