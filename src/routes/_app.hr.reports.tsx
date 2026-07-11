import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { exportToExcel } from "@/lib/export-excel";
import { ALL_STATUSES, LEAVE_STATUS, statusVariant } from "@/lib/leave-status";

export const Route = createFileRoute("/_app/hr/reports")({
  component: ReportsPage,
});

type LR = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  created_at: string;
};

function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees_min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, department_id, employee_code");
      if (error) throw error;
      return data as Array<{ id: string; full_name: string; email: string; department_id: string | null; employee_code: string | null }>;
    },
  });
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const { data: types = [] } = useQuery({
    queryKey: ["leave_types_min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_types").select("id, name, color");
      if (error) throw error;
      return data as Array<{ id: string; name: string; color: string }>;
    },
  });
  const typeMap = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t])), [types]);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments_min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name").order("name");
      if (error) throw error;
      return data as Array<{ id: string; name: string }>;
    },
  });
  const deptMap = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["reports_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("id, employee_id, leave_type_id, start_date, end_date, days, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LR[];
    },
  });

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (from && r.start_date < from) return false;
      if (to && r.end_date > to) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.leave_type_id !== typeFilter) return false;
      if (deptFilter !== "all") {
        const emp = empMap[r.employee_id];
        if (emp?.department_id !== deptFilter) return false;
      }
      return true;
    });
  }, [requests, from, to, statusFilter, typeFilter, deptFilter, empMap]);

  const totals = useMemo(() => {
    const t = { total: filtered.length, approved: 0, pending: 0, rejected: 0, days: 0 };
    for (const r of filtered) {
      t.days += r.days;
      if (r.status === LEAVE_STATUS.APPROVED) t.approved++;
      else if (r.status === LEAVE_STATUS.PENDING_MANAGER || r.status === LEAVE_STATUS.PENDING_HR) t.pending++;
      else if (r.status === LEAVE_STATUS.REJECTED_MANAGER || r.status === LEAVE_STATUS.REJECTED_HR) t.rejected++;
    }
    return t;
  }, [filtered]);

  const handleExport = () => {
    const rows = filtered.map((r) => {
      const emp = empMap[r.employee_id];
      return {
        Employee: emp?.full_name ?? "",
        "Employee Code": emp?.employee_code ?? "",
        Department: emp?.department_id ? deptMap[emp.department_id]?.name ?? "" : "",
        "Leave Type": typeMap[r.leave_type_id]?.name ?? "",
        "Start Date": r.start_date,
        "End Date": r.end_date,
        Days: r.days,
        Status: r.status,
        "Submitted At": new Date(r.created_at).toLocaleDateString(),
      };
    });
    exportToExcel(rows, `leave-report-${Date.now()}.xlsx`, "Report");
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Analytics and exports for leave activity."
        actions={
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export to Excel
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-5">
        <div className="space-y-1.5">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Leave type</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Total Requests" value={totals.total} />
        <Stat title="Approved" value={totals.approved} />
        <Stat title="Pending" value={totals.pending} />
        <Stat title="Total Days" value={totals.days} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No data for these filters.</TableCell></TableRow>
            ) : (
              filtered.slice(0, 200).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{empMap[r.employee_id]?.full_name ?? "—"}</TableCell>
                  <TableCell>{typeMap[r.leave_type_id]?.name ?? "—"}</TableCell>
                  <TableCell>{format(new Date(r.start_date), "MMM d, yyyy")}</TableCell>
                  <TableCell>{format(new Date(r.end_date), "MMM d, yyyy")}</TableCell>
                  <TableCell>{r.days}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {filtered.length > 200 && (
        <p className="mt-3 text-xs text-muted-foreground">Showing first 200 rows — export to Excel for the full report.</p>
      )}
    </>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent><div className="text-3xl font-semibold">{value}</div></CardContent>
    </Card>
  );
}
