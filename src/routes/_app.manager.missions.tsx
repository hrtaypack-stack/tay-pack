import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { Check, Eye, Search, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import {
  ALL_MISSION_STATUSES,
  MISSION_STATUS,
  missionStatusVariant,
  type MissionRequest,
} from "@/lib/mission-utils";

export const Route = createFileRoute("/_app/manager/missions")({
  component: ManagerMissionsPage,
});

function ManagerMissionsPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(MISSION_STATUS.PENDING_MANAGER);
  const [viewing, setViewing] = useState<MissionRequest | null>(null);
  const [comment, setComment] = useState("");

  const { data: team = [] } = useQuery({
    queryKey: ["manager_team_mission", profile?.id],
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

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["manager_missions", profile?.id],
    enabled: !!profile,
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
      if (q) {
        const emp = empMap[r.employee_id];
        const hay = `${emp?.full_name ?? ""} ${emp?.email ?? ""} ${r.details}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [requests, search, statusFilter, empMap]);

  const actMut = useMutation({
    mutationFn: async (decision: "approve" | "reject") => {
      if (!viewing || !profile) return;
      const status = decision === "approve" ? MISSION_STATUS.PENDING_HR : MISSION_STATUS.REJECTED_MANAGER;
      const { error } = await (supabase as any)
        .from("mission_requests")
        .update({
          status,
          manager_action_by: profile.id,
          manager_action_date: new Date().toISOString(),
          manager_comment: comment.trim() || null,
        })
        .eq("id", viewing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decision recorded");
      qc.invalidateQueries({ queryKey: ["manager_missions"] });
      setViewing(null);
      setComment("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canDecide = viewing?.status === MISSION_STATUS.PENDING_MANAGER;

  return (
    <>
      <PageHeader
        title="Mission & Permission Requests"
        description="Review and act on requests from your team."
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2">
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
            {ALL_MISSION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
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
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No requests.</TableCell></TableRow>
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
                      <Button variant="ghost" size="icon" onClick={() => { setViewing(r); setComment(""); }}>
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

      <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) { setViewing(null); setComment(""); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Request details</DialogTitle>
            <DialogDescription>Review and take action.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Employee" value={empMap[viewing.employee_id]?.full_name ?? "—"} />
                <Info label="Employee Code" value={empMap[viewing.employee_id]?.employee_code ?? "—"} />
                <Info label="Type" value={viewing.request_type} />
                <Info label="Status" value={<Badge variant={missionStatusVariant(viewing.status)}>{viewing.status}</Badge>} />
                <Info label="Date" value={format(new Date(viewing.request_date), "MMM d, yyyy")} />
                <Info label="Duration" value={`${viewing.duration_hours} h`} />
                <Info label="From" value={viewing.start_time?.slice(0, 5)} />
                <Info label="To" value={viewing.end_time?.slice(0, 5)} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Details</div>
                <div className="mt-1 whitespace-pre-wrap">{viewing.details || "—"}</div>
              </div>
              {viewing.manager_comment && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Manager comment</div>
                  <div className="mt-1">{viewing.manager_comment}</div>
                </div>
              )}
              {canDecide && (
                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="mgr-comment">Manager comment (optional)</Label>
                  <Textarea
                    id="mgr-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a note..."
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
