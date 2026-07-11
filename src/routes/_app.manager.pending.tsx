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
import { Check, Eye, Search, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { LEAVE_STATUS, statusVariant } from "@/lib/leave-status";

export const Route = createFileRoute("/_app/manager/pending")({
  component: ManagerPendingPage,
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
  created_at: string;
};

function ManagerPendingPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<LeaveRequest | null>(null);
  const [comment, setComment] = useState("");

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
    queryKey: ["manager_pending", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("status", LEAVE_STATUS.PENDING_MANAGER)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LeaveRequest[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return requests.filter((r) => {
      if (!q) return true;
      const emp = empMap[r.employee_id];
      const hay = `${emp?.full_name ?? ""} ${emp?.email ?? ""} ${r.reason ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [requests, search, empMap]);

  const actMut = useMutation({
    mutationFn: async (decision: "approve" | "reject") => {
      if (!viewing || !profile) return;
      const status = decision === "approve" ? LEAVE_STATUS.PENDING_HR : LEAVE_STATUS.REJECTED_MANAGER;
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status,
          manager_action_by: profile.id,
          manager_action_date: new Date().toISOString(),
          manager_comment: comment.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", viewing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decision recorded");
      qc.invalidateQueries({ queryKey: ["manager_pending"] });
      qc.invalidateQueries({ queryKey: ["manager_history"] });
      setViewing(null);
      setComment("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Pending Requests"
        description="Approve or reject your team's leave requests."
      />

      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employee, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
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
              <TableHead>Submitted</TableHead>
              <TableHead className="w-16 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No pending requests.</TableCell></TableRow>
            ) : (
              filtered.map((r) => {
                const emp = empMap[r.employee_id];
                const t = typeMap[r.leave_type_id];
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{emp?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{emp?.email ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: t?.color }} />
                        {t?.name ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(r.start_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(r.end_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{r.days}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
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
            <DialogTitle>Leave request</DialogTitle>
            <DialogDescription>Review and take action.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Employee" value={empMap[viewing.employee_id]?.full_name ?? "—"} />
                <Info label="Type" value={typeMap[viewing.leave_type_id]?.name ?? "—"} />
                <Info label="Start" value={format(new Date(viewing.start_date), "MMM d, yyyy")} />
                <Info label="End" value={format(new Date(viewing.end_date), "MMM d, yyyy")} />
                <Info label="Days" value={String(viewing.days)} />
                <Info label="Status" value={<Badge variant={statusVariant(viewing.status)}>{viewing.status}</Badge>} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Reason</div>
                <div className="mt-1">{viewing.reason || "—"}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mgr-comment">Manager comment (optional)</Label>
                <Textarea
                  id="mgr-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a note..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => actMut.mutate("reject")} disabled={actMut.isPending}>
              <X className="mr-2 h-4 w-4" /> Reject
            </Button>
            <Button onClick={() => actMut.mutate("approve")} disabled={actMut.isPending}>
              <Check className="mr-2 h-4 w-4" /> Approve
            </Button>
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
