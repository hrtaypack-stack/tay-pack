import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { ALL_STATUSES, LEAVE_STATUS, calcDays, statusVariant } from "@/lib/leave-status";

export const Route = createFileRoute("/_app/employee/my-leaves")({
  component: MyLeavesPage,
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

const PAGE_SIZE = 10;

function MyLeavesPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"created_desc" | "created_asc" | "start_desc" | "start_asc">(
    "created_desc",
  );
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [deleting, setDeleting] = useState<LeaveRequest | null>(null);

  const { data: types = [] } = useQuery({
    queryKey: ["leave_types_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_types")
        .select("id, name, color")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Array<{ id: string; name: string; color: string }>;
    },
  });
  const typeMap = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t])), [types]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my_leave_requests", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("employee_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LeaveRequest[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const arr = requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.leave_type_id !== typeFilter) return false;
      if (q) {
        const hay = `${r.reason ?? ""} ${typeMap[r.leave_type_id]?.name ?? ""} ${r.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    arr.sort((a, b) => {
      switch (sortBy) {
        case "created_asc":
          return a.created_at.localeCompare(b.created_at);
        case "start_desc":
          return b.start_date.localeCompare(a.start_date);
        case "start_asc":
          return a.start_date.localeCompare(b.start_date);
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });
    return arr;
  }, [requests, search, statusFilter, typeFilter, sortBy, typeMap]);

  useEffect(() => setPage(1), [search, statusFilter, typeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leave_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request deleted");
      qc.invalidateQueries({ queryKey: ["my_leave_requests"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canModify = (r: LeaveRequest) => r.status === LEAVE_STATUS.PENDING_MANAGER;

  return (
    <>
      <PageHeader
        title="My Leave Requests"
        description="View and track all of your leave requests."
        actions={
          <Button asChild>
            <Link to="/employee/new-leave">
              <Plus className="mr-2 h-4 w-4" /> New request
            </Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reason, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Leave type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">Newest first</SelectItem>
            <SelectItem value="created_asc">Oldest first</SelectItem>
            <SelectItem value="start_desc">Start date (desc)</SelectItem>
            <SelectItem value="start_asc">Start date (asc)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : pageItems.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No leave requests yet.</TableCell></TableRow>
            ) : (
              pageItems.map((r) => {
                const t = typeMap[r.leave_type_id];
                const editable = canModify(r);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: t?.color }} />
                        {t?.name ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(r.start_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(r.end_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{r.days}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!editable}
                        onClick={() => setEditing(r)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!editable}
                        onClick={() => setDeleting(r)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Page {page} of {totalPages} · {filtered.length} results
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <EditDialog
        request={editing}
        types={types}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["my_leave_requests"] })}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this leave request?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditDialog({
  request,
  types,
  onOpenChange,
  onSaved,
}: {
  request: LeaveRequest | null;
  types: Array<{ id: string; name: string; color: string }>;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (request) {
      setLeaveTypeId(request.leave_type_id);
      setStartDate(request.start_date);
      setEndDate(request.end_date);
      setReason(request.reason ?? "");
    }
  }, [request]);

  const days = calcDays(startDate, endDate);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!request) return;
      if (!leaveTypeId || !startDate || !endDate) throw new Error("All fields required");
      if (days <= 0) throw new Error("End date must be on or after start date");
      const { error } = await supabase
        .from("leave_requests")
        .update({
          leave_type_id: leaveTypeId,
          start_date: startDate,
          end_date: endDate,
          days,
          reason: reason.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request updated");
      onSaved();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!request} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit leave request</DialogTitle>
          <DialogDescription>Only pending requests can be modified.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Leave type</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg bg-accent/40 p-3 text-sm">
            Total days: <span className="font-semibold">{days}</span>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
