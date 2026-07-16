import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  related_type: string | null;
  related_id: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export function useNotifications(limit = 50) {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error && data) setItems(data as NotificationRow[]);
    setLoading(false);
  }, [user, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setItems((prev) => [payload.new as NotificationRow, ...prev]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const next = payload.new as NotificationRow;
          setItems((prev) => prev.map((n) => (n.id === next.id ? next : n)));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const old = payload.old as NotificationRow;
          setItems((prev) => prev.filter((n) => n.id !== old.id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.is_read).length,
    [items],
  );

  const markAsRead = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("is_read", false);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  }, [user]);

  return {
    items,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    reload: load,
  };
}
