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
import {
  ALL_MISSION_STATUSES,
  MISSION_STATUS,
  REQUEST_TYPES,
  calcDurationHours,
  missionStatusVariant,
  type MissionRequest,
} from "@/lib/mission-utils";

export const Route = createFileRoute("/_app/hr/missions")({
  component: HRMissionsPage,
});

function HRMissionsPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewing, setViewing] = useState<MissionRequest | null>(null);
  const [comment, setComment] = useState("");
  const [editType, setEditType] = useState<string>("");
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editDetails, setEditDetails] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees_mission"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, employee_code, department_id, manager_id, departments(name), manager:manager_id(full_name)");
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        full_name: string;
        email: string;
        employee_code: string | null;
        department_id: string | null;
        departments: { name: string } | null;
        manager: { full_name: string } | null;
      }>;
    },
  });
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["mission_requests_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mission_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MissionRequest[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.request_type !== typeFilter) return false;
      if (q) {
        const emp = empMap[r.employee_id];
        const hay = `${emp?.full_name ?? ""} ${emp?.email ?? ""} ${emp?.employee_code ?? ""} ${r.details}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [requests, search, statusFilter, typeFilter, empMap]);

  const handleExport = () => {
    const rows = filtered.map((r) => {
      const emp = empMap[r.employee_id];
      return {
        "Employee Code": emp?.employee_code ?? "",
        "Employee Name": emp?.full_name ?? "",
        Department: emp?.departments?.name ?? "",
        Manager: emp?.manager?.full_name ?? "",
        "Request Type": r.request_type,
        "Request Date": r.request_date,
        "From Time": r.start_time,
        "To Time": r.end_time,
        "Duration Hours": r.duration_hours,
        Details: r.details,
        Status: r.status,
        "Created Date": new Date(r.created_at).toLocaleDateString(),
        "Manager Decision Date": r.manager_action_date ? new Date(r.manager_action_date).toLocaleDateString() : "",
        "HR Decision Date": r.hr_action_date ? new Date(r.hr_action_date).toLocaleDateString() : "",
      };
    });
    exportToExcel(rows, `mission-permission-${Date.now()}.xlsx`, "Mission & Permission");
  };

  const openView = (r: MissionRequest) => {
    setViewing(r);
    setComment("");
    setEditType(r.request_type);
    setEditDate(r.request_date);
    setEditStart(r.start_time?.slice(0, 5) ?? "");
    setEditEnd(r.end_time?.slice(0, 5) ?? "");
    setEditDetails(r.details);
  };

  const actMut = useMutation({
    mutationFn: async (decision: "approve" | "reject") => {
      if (!viewing || !profile) return;
      const status = decision === "approve" ? MISSION_STATUS.APPROVED : MISSION_STATUS.REJECTED_HR;
      const { error } = await (supabase as any)
        .from("mission_requests")
        .update({
          status,
          hr_action_by: profile.id,
          hr_action_date: new Date().toISOString(),
          hr_comment: comment.trim() || null,
        })
        .eq("id", viewing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decision recorded");
      qc.invalidateQueries({ queryKey: ["mission_requests_all"] });
      setViewing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMut = useMutation({
    mutationFn: async () => {
      if (!viewing) return;
      const hours = calcDurationHours(editStart, editEnd);
      if (hours <= 0) throw new Error("To Time must be later than From Time");
      if (!editDetails.trim()) throw new Error("Details required");
      const { error } = await (supabase as any)
        .from("mission_requests")
        .update({
          request_type: editType,
          request_date: editDate,
          start_time: editStart,
          end_time: editEnd,
          duration_hours: hours,
          details: editDetails.trim(),
        })
        .eq("id", viewing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request updated");
      qc.invalidateQueries({ queryKey: ["mission_requests_all"] });
      setViewing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canDecide =
    viewing?.status === MISSION_STATUS.PENDING_HR || viewing?.status === MISSION_STATUS.PENDING_MANAGER;

  return (
    <>
      <PageHeader
        title="Mission & Permission Requests"
        description="Review and take final decisions on mission and permission requests."
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
            placeholder="Search employee, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_MISSION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {REQUEST_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16 text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No requests found.</TableCell></TableRow>
            ) : (
              filtered.map((r) => {
                const emp = empMap[r.employee_id];
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{emp?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{emp?.email ?? ""}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.request_type}</Badge></TableCell>
                    <TableCell>{format(new Date(r.request_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{r.start_time?.slice(0, 5)}</TableCell>
                    <TableCell>{r.end_time?.slice(0, 5)}</TableCell>
                    <TableCell>{r.duration_hours}</TableCell>
                    <TableCell><Badge variant={missionStatusVariant(r.status)}>{r.status}</Badge></TableCell>
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
            <DialogTitle>Mission / Permission request</DialogTitle>
            <DialogDescription>Review the request and record a decision.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Info label="Employee" value={empMap[viewing.employee_id]?.full_name ?? "—"} />
                <Info label="Employee Code" value={empMap[viewing.employee_id]?.employee_code ?? "—"} />
                <Info label="Department" value={empMap[viewing.employee_id]?.departments?.name ?? "—"} />
                <Info label="Manager" value={empMap[viewing.employee_id]?.manager?.full_name ?? "—"} />
                <Info label="Type" value={viewing.request_type} />
                <Info label="Status" value={<Badge variant={missionStatusVariant(viewing.status)}>{viewing.status}</Badge>} />
                <Info label="Duration" value={`${viewing.duration_hours} h`} />
                <Info label="Submitted" value={format(new Date(viewing.created_at), "MMM d, yyyy")} />
                <div className="col-span-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Details</div>
                  <div className="mt-0.5 whitespace-pre-wrap">{viewing.details || "—"}</div>
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
                  <Label>Type</Label>
                  <Select value={editType} onValueChange={setEditType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REQUEST_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Details</Label>
                  <Textarea rows={3} value={editDetails} onChange={(e) => setEditDetails(e.target.value)} />
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editMut.mutate()}
                    disabled={editMut.isPending}
                  >
                    Save changes
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
