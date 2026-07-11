import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, Download } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { ALL_STATUSES, statusVariant } from "@/lib/leave-status";
import { exportToExcel } from "@/lib/export-excel";

export const Route = createFileRoute("/_app/manager/history")({
  component: ManagerHistoryPage,
});

type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  manager_comment: string | null;
  hr_comment: string | null;
  created_at: string;
};

function ManagerHistoryPage() {
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: team = [] } = useQuery({
    queryKey: ["manager_team", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, employee_code")
        .eq("manager_id", profile!.id);
      if (error) throw error;
      return data as Array<{ id: string; full_name: string; email: string; employee_code: string | null }>;
    },
  });
  const empMap = useMemo(() => Object.fromEntries(team.map((e) => [e.id, e])), [team]);

  const { data: types = [] } = useQuery({
    queryKey: ["leave_types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_types").select("id, name, color");
      if (error) throw error;
      return data as Array<{ id: string; name: string; color: string }>;
    },
  });
  const typeMap = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t])), [types]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["manager_history", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LeaveRequest[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q) {
        const emp = empMap[r.employee_id];
        const hay = `${emp?.full_name ?? ""} ${emp?.email ?? ""} ${r.reason ?? ""} ${r.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [requests, search, statusFilter, empMap]);

  const handleExport = () => {
    const rows = filtered.map((r) => ({
      Employee: empMap[r.employee_id]?.full_name ?? "",
      "Leave Type": typeMap[r.leave_type_id]?.name ?? "",
      Start: r.start_date,
      End: r.end_date,
      Days: r.days,
      Status: r.status,
      Reason: r.reason ?? "",
      Submitted: new Date(r.created_at).toLocaleDateString(),
    }));
    exportToExcel(rows, `team-leave-history-${Date.now()}.xlsx`, "Team History");
  };

  return (
    <>
      <PageHeader
        title="Leave History"
        description="All leave requests from your team."
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search employee, reason..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
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
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No history yet.</TableCell></TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{empMap[r.employee_id]?.full_name ?? "—"}</TableCell>
                  <TableCell>{typeMap[r.leave_type_id]?.name ?? "—"}</TableCell>
                  <TableCell>{format(new Date(r.start_date), "MMM d, yyyy")}</TableCell>
                  <TableCell>{format(new Date(r.end_date), "MMM d, yyyy")}</TableCell>
                  <TableCell>{r.days}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
