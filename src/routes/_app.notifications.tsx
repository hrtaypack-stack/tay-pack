import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCheck, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  type NotificationRow,
} from "@/hooks/use-notifications";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications" },
      { name: "description", content: "Your in-app notifications." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: NotificationsPage,
});

type Filter = "all" | "unread" | "read";
const PAGE_SIZE = 20;

function timeAgo(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function NotificationsPage() {
  const navigate = useNavigate();
  const { items, loading, unreadCount, markAsRead, markAllAsRead } =
    useNotifications(500);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((n) => {
      if (filter === "unread" && n.is_read) return false;
      if (filter === "read" && !n.is_read) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleClick = async (n: NotificationRow) => {
    if (!n.is_read) await markAsRead(n.id);
    if (n.link) navigate({ to: n.link });
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="All your in-app notifications, newest first."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={unreadCount === 0}
            onClick={() => void markAllAsRead()}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search notifications..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={filter}
          onValueChange={(v) => {
            setFilter(v as Filter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread only</SelectItem>
            <SelectItem value="read">Read only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No notifications found.
          </div>
        ) : (
          <ul className="divide-y">
            {paginated.map((n) => (
              <li key={n.id}>
                <div
                  className={cn(
                    "flex items-start gap-3 px-4 py-3",
                    !n.is_read && "bg-primary/5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className="flex flex-1 flex-col items-start text-left"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm",
                          !n.is_read ? "font-semibold" : "font-medium",
                        )}
                      >
                        {n.title}
                      </span>
                      <div className="flex items-center gap-2">
                        {!n.is_read && (
                          <Badge variant="secondary" className="text-[10px]">
                            New
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {n.message}
                    </p>
                  </button>
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => void markAsRead(n.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
