import { createFileRoute, Link } from "@tanstack/react-router";
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
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  ListChecks,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LEAVE_STATUS, statusVariant } from "@/lib/leave-status";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/employee/")({
  component: EmployeeDashboard,
});

function EmployeeDashboard() {
  const { profile } = useAuth();
  const employeeId = profile?.id;

  const { data, isLoading } = useQuery({
    enabled: !!employeeId,
    queryKey: ["employee-dashboard", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select(
          "id, start_date, end_date, days, status, created_at, leave_types(name)",
        )
        .eq("employee_id", employeeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = data ?? [];
  const total = rows.length;
  const pending = rows.filter(
    (r) =>
      r.status === LEAVE_STATUS.PENDING_MANAGER ||
      r.status === LEAVE_STATUS.PENDING_HR,
  ).length;
  const approved = rows.filter((r) => r.status === LEAVE_STATUS.APPROVED).length;
  const rejected = rows.filter(
    (r) =>
      r.status === LEAVE_STATUS.REJECTED_MANAGER ||
      r.status === LEAVE_STATUS.REJECTED_HR,
  ).length;
  const recent = rows.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {profile?.fullName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's a snapshot of your time off.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Requests" value={isLoading ? "…" : total} icon={ListChecks} />
        <StatCard title="Pending" value={isLoading ? "…" : pending} icon={Clock} />
        <StatCard title="Approved" value={isLoading ? "…" : approved} icon={CheckCircle2} />
        <StatCard title="Rejected" value={isLoading ? "…" : rejected} icon={XCircle} />
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Recent Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leave requests yet.{" "}
              <Link to="/employee/new-leave" className="text-primary underline">
                Submit one
              </Link>
              .
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
  icon: typeof CalendarDays;
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
