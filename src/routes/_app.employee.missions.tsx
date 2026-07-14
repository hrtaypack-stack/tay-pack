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
import {
  ALL_MISSION_STATUSES,
  MISSION_STATUS,
  REQUEST_TYPES,
  calcDurationHours,
  missionStatusVariant,
  type MissionRequest,
} from "@/lib/mission-utils";

export const Route = createFileRoute("/_app/employee/missions")({
  component: MyMissionsPage,
});

const PAGE_SIZE = 10;

function MyMissionsPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"created_desc" | "created_asc" | "date_desc" | "date_asc">(
    "created_desc",
  );
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<MissionRequest | null>(null);
  const [deleting, setDeleting] = useState<MissionRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my_mission_requests", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mission_requests")
        .select("*")
        .eq("employee_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MissionRequest[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const arr = requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.request_type !== typeFilter) return false;
      if (q) {
        const hay = `${r.details} ${r.request_type} ${r.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    arr.sort((a, b) => {
      switch (sortBy) {
        case "created_asc": return a.created_at.localeCompare(b.created_at);
        case "date_desc": return b.request_date.localeCompare(a.request_date);
        case "date_asc": return a.request_date.localeCompare(b.request_date);
        default: return b.created_at.localeCompare(a.created_at);
      }
    });
    return arr;
  }, [requests, search, statusFilter, typeFilter, sortBy]);

  useEffect(() => setPage(1), [search, statusFilter, typeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("mission_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request deleted");
      qc.invalidateQueries({ queryKey: ["my_mission_requests"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canModify = (r: MissionRequest) => r.status === MISSION_STATUS.PENDING_MANAGER;

  return (
    <>
      <PageHeader
        title="My Mission & Permission Requests"
        description="View and track your mission and permission requests."
        actions={
          <Button asChild>
            <Link to="/employee/new-mission">
              <Plus className="mr-2 h-4 w-4" /> New request
            </Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search details, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_MISSION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {REQUEST_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">Newest first</SelectItem>
            <SelectItem value="created_asc">Oldest first</SelectItem>
            <SelectItem value="date_desc">Request date (desc)</SelectItem>
            <SelectItem value="date_asc">Request date (asc)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : pageItems.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No requests yet.</TableCell></TableRow>
            ) : (
              pageItems.map((r) => {
                const editable = canModify(r);
                return (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.request_type}</Badge></TableCell>
                    <TableCell>{format(new Date(r.request_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{r.start_time?.slice(0, 5)}</TableCell>
                    <TableCell>{r.end_time?.slice(0, 5)}</TableCell>
                    <TableCell>{r.duration_hours}</TableCell>
                    <TableCell><Badge variant={missionStatusVariant(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" disabled={!editable} onClick={() => setEditing(r)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={!editable} onClick={() => setDeleting(r)} aria-label="Delete">
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
          <div>Page {page} of {totalPages} · {filtered.length} results</div>
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
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["my_mission_requests"] })}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this request?</AlertDialogTitle>
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
  onOpenChange,
  onSaved,
}: {
  request: MissionRequest | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [requestType, setRequestType] = useState<string>("");
  const [requestDate, setRequestDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (request) {
      setRequestType(request.request_type);
      setRequestDate(request.request_date);
      setStartTime(request.start_time?.slice(0, 5) ?? "");
      setEndTime(request.end_time?.slice(0, 5) ?? "");
      setDetails(request.details);
    }
  }, [request]);

  const hours = calcDurationHours(startTime, endTime);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!request) return;
      if (!requestType || !requestDate || !startTime || !endTime) throw new Error("All fields required");
      if (hours <= 0) throw new Error("To Time must be later than From Time");
      if (!details.trim()) throw new Error("Details required");
      const { error } = await (supabase as any)
        .from("mission_requests")
        .update({
          request_type: requestType,
          request_date: requestDate,
          start_time: startTime,
          end_time: endTime,
          duration_hours: hours,
          details: details.trim(),
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
          <DialogTitle>Edit request</DialogTitle>
          <DialogDescription>Only pending requests can be modified.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Request Date</Label>
            <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg bg-accent/40 p-3 text-sm">
            Total: <span className="font-semibold">{hours} Hours</span>
          </div>
          <div className="space-y-2">
            <Label>Details</Label>
            <Textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} />
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
