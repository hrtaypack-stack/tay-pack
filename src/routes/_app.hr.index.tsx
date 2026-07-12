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
import {
  Users,
  UserCheck,
  Shield,
  Briefcase,
  Clock,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LEAVE_STATUS, statusVariant } from "@/lib/leave-status";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/hr/")({
  component: HRDashboard,
});

function HRDashboard() {
  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ["hr-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, is_active");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: requests, isLoading: loadingRequests } = useQuery({
    queryKey: ["hr-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select(
          "id, start_date, end_date, days, status, created_at, profiles!leave_requests_employee_id_fkey(full_name), leave_types(name)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const ps = profiles ?? [];
  const totalEmployees = ps.length;
  const activeEmployees = ps.filter((p) => p.is_active).length;
  const managers = ps.filter((p) => p.role === "manager").length;
  const hrUsers = ps.filter((p) => p.role === "hr").length;

  const rs = requests ?? [];
  const pendingManager = rs.filter((r) => r.status === LEAVE_STATUS.PENDING_MANAGER).length;
  const pendingHr = rs.filter((r) => r.status === LEAVE_STATUS.PENDING_HR).length;
  const approved = rs.filter((r) => r.status === LEAVE_STATUS.APPROVED).length;
  const rejected = rs.filter(
    (r) =>
      r.status === LEAVE_STATUS.REJECTED_MANAGER ||
      r.status === LEAVE_STATUS.REJECTED_HR,
  ).length;
  const recent = rs.slice(0, 8);

  const v = (n: number, loading: boolean) => (loading ? "…" : n);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">HR Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Company-wide leave metrics and administration.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Employees" value={v(totalEmployees, loadingProfiles)} icon={Users} />
        <StatCard title="Active Employees" value={v(activeEmployees, loadingProfiles)} icon={UserCheck} />
        <StatCard title="Managers" value={v(managers, loadingProfiles)} icon={Briefcase} />
        <StatCard title="HR Users" value={v(hrUsers, loadingProfiles)} icon={Shield} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pending Manager" value={v(pendingManager, loadingRequests)} icon={Clock} />
        <StatCard title="Pending HR" value={v(pendingHr, loadingRequests)} icon={ClipboardCheck} />
        <StatCard title="Approved" value={v(approved, loadingRequests)} icon={CheckCircle2} />
        <StatCard title="Rejected" value={v(rejected, loadingRequests)} icon={XCircle} />
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Recent Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave requests yet.</p>
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
  icon: typeof Users;
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
