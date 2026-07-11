import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Download, Eye, Search, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { exportToExcel } from "@/lib/export-excel";
import { useAuth } from "@/hooks/use-auth";
import { ALL_STATUSES, LEAVE_STATUS, calcDays, statusVariant } from "@/lib/leave-status";

export const Route = createFileRoute("/_app/hr/leave-requests")({
  component: HRLeaveRequestsPage,
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
  manager_action_by: string | null;
  manager_action_date: string | null;
  manager_comment: string | null;
  hr_action_by: string | null;
  hr_action_date: string | null;
  hr_comment: string | null;
  created_at: string;
};

function HRLeaveRequestsPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewing, setViewing] = useState<LeaveRequest | null>(null);
  const [comment, setComment] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, employee_code");
      if (error) throw error;
      return data as Array<{ id: string; full_name: string; email: string; employee_code: string | null }>;
    },
  });

  const { data: types = [] } = useQuery({
    queryKey: ["leave_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_types")
        .select("id, name, code, color")
        .order("name");
      if (error) throw error;
      return data as Array<{ id: string; name: string; code: string; color: string }>;
    },
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["leave_requests_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LeaveRequest[];
    },
  });

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const typeMap = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t])), [types]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.leave_type_id !== typeFilter) return false;
      if (q) {
        const emp = empMap[r.employee_id];
        const hay = `${emp?.full_name ?? ""} ${emp?.email ?? ""} ${emp?.employee_code ?? ""} ${r.reason ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [requests, search, statusFilter, typeFilter, empMap]);

  const handleExport = () => {
    const rows = filtered.map((r) => ({
      Employee: empMap[r.employee_id]?.full_name ?? "",
      "Employee Code": empMap[r.employee_id]?.employee_code ?? "",
      Email: empMap[r.employee_id]?.email ?? "",
      "Leave Type": typeMap[r.leave_type_id]?.name ?? "",
      "Start Date": r.start_date,
      "End Date": r.end_date,
      Days: r.days,
      Status: r.status,
      Reason: r.reason ?? "",
      "Submitted At": new Date(r.created_at).toLocaleDateString(),
    }));
    exportToExcel(rows, `leave-requests-${Date.now()}.xlsx`, "Leave Requests");
  };

  const openView = (r: LeaveRequest) => {
    setViewing(r);
    setComment("");
    setEditStart(r.start_date);
    setEditEnd(r.end_date);
  };

  const actMut = useMutation({
    mutationFn: async (decision: "approve" | "reject") => {
      if (!viewing || !profile) return;
      const status = decision === "approve" ? LEAVE_STATUS.APPROVED : LEAVE_STATUS.REJECTED_HR;
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status,
          hr_action_by: profile.id,
          hr_action_date: new Date().toISOString(),
          hr_comment: comment.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", viewing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decision recorded");
      qc.invalidateQueries({ queryKey: ["leave_requests_all"] });
      setViewing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMut = useMutation({
    mutationFn: async () => {
      if (!viewing) return;
      const days = calcDays(editStart, editEnd);
      if (days <= 0) throw new Error("End date must be on or after start date");
      const { error } = await supabase
        .from("leave_requests")
        .update({
          start_date: editStart,
          end_date: editEnd,
          days,
          updated_at: new Date().toISOString(),
        })
        .eq("id", viewing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dates updated");
      qc.invalidateQueries({ queryKey: ["leave_requests_all"] });
      setViewing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canDecide =
    viewing?.status === LEAVE_STATUS.PENDING_HR || viewing?.status === LEAVE_STATUS.PENDING_MANAGER;

  return (
    <>
      <PageHeader
        title="Leave Requests"
        description="Review and take final decisions on leave requests."
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employee, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Leave type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
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
              <TableHead className="w-16 text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No leave requests found.</TableCell></TableRow>
            ) : (
              filtered.map((r) => {
                const emp = empMap[r.employee_id];
                const type = typeMap[r.leave_type_id];
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{emp?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{emp?.email ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: type?.color }} />
                        {type?.name ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(r.start_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(r.end_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{r.days}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openView(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Leave request</DialogTitle>
            <DialogDescription>Review the request and record a decision.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Info label="Employee" value={empMap[viewing.employee_id]?.full_name ?? "—"} />
                <Info label="Employee Code" value={empMap[viewing.employee_id]?.employee_code ?? "—"} />
                <Info label="Leave Type" value={typeMap[viewing.leave_type_id]?.name ?? "—"} />
                <Info label="Status" value={<Badge variant={statusVariant(viewing.status)}>{viewing.status}</Badge>} />
                <Info label="Days" value={String(viewing.days)} />
                <Info label="Submitted" value={format(new Date(viewing.created_at), "MMM d, yyyy")} />
                <div className="col-span-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Reason</div>
                  <div className="mt-0.5">{viewing.reason || "—"}</div>
                </div>
                {viewing.manager_comment && (
                  <div className="col-span-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Manager comment</div>
                    <div className="mt-0.5">{viewing.manager_comment}</div>
                  </div>
                )}
                {viewing.hr_comment && (
                  <div className="col-span-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">HR comment</div>
                    <div className="mt-0.5">{viewing.hr_comment}</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 border-t pt-4">
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editMut.mutate()}
                    disabled={editMut.isPending || (editStart === viewing.start_date && editEnd === viewing.end_date)}
                  >
                    Save dates
                  </Button>
                </div>
              </div>

              {canDecide && (
                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="hr-comment">HR comment (optional)</Label>
                  <Textarea
                    id="hr-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a note about the decision..."
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {canDecide ? (
              <>
                <Button variant="outline" onClick={() => actMut.mutate("reject")} disabled={actMut.isPending}>
                  <X className="mr-2 h-4 w-4" /> Reject
                </Button>
                <Button onClick={() => actMut.mutate("approve")} disabled={actMut.isPending}>
                  <Check className="mr-2 h-4 w-4" /> Approve
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
