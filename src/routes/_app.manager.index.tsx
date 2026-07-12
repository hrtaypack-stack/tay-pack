import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardCheck, CheckCircle2, XCircle, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LEAVE_STATUS, statusVariant } from "@/lib/leave-status";
import { format, startOfDay } from "date-fns";

export const Route = createFileRoute("/_app/manager/")({
  component: ManagerDashboard,
});

function ManagerDashboard() {
  const { profile } = useAuth();
  const managerId = profile?.id;

  const { data: team } = useQuery({
    enabled: !!managerId,
    queryKey: ["manager-team", managerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("manager_id", managerId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const teamIds = (team ?? []).map((t) => t.id);

  const { data: rows, isLoading } = useQuery({
    enabled: !!managerId && teamIds.length >= 0,
    queryKey: ["manager-dashboard", managerId, teamIds.join(",")],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      const { data, error } = await supabase
        .from("leave_requests")
        .select(
          "id, start_date, end_date, days, status, created_at, manager_action_date, profiles!leave_requests_employee_id_fkey(full_name), leave_types(name)",
        )
        .in("employee_id", teamIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = rows ?? [];
  const today = startOfDay(new Date()).getTime();
  const pending = list.filter((r) => r.status === LEAVE_STATUS.PENDING_MANAGER).length;
  const approvedToday = list.filter(
    (r) =>
      r.manager_action_date &&
      startOfDay(new Date(r.manager_action_date)).getTime() === today &&
      r.status !== LEAVE_STATUS.REJECTED_MANAGER,
  ).length;
  const rejectedToday = list.filter(
    (r) =>
      r.manager_action_date &&
      startOfDay(new Date(r.manager_action_date)).getTime() === today &&
      r.status === LEAVE_STATUS.REJECTED_MANAGER,
  ).length;
  const recent = list.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manager Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review pending approvals and team activity.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Team Members" value={team ? team.length : "…"} icon={Users} />
        <StatCard title="Pending Approvals" value={isLoading ? "…" : pending} icon={ClipboardCheck} />
        <StatCard title="Approved Today" value={isLoading ? "…" : approvedToday} icon={CheckCircle2} />
        <StatCard title="Rejected Today" value={isLoading ? "…" : rejectedToday} icon={XCircle} />
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Recent Team Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave requests from your team yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell>{r.leave_types?.name ?? "—"}</TableCell>
                    <TableCell>{format(new Date(r.start_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(r.end_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{r.days}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: typeof ClipboardCheck;
}) {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
