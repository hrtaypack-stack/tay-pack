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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Eye, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { exportToExcel } from "@/lib/export-excel";

export const Route = createFileRoute("/_app/hr/audit-logs")({
  component: AuditLogsPage,
});

type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
};

function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [tableFilter, setTableFilter] = useState("all");
  const [viewing, setViewing] = useState<AuditLog | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email");
      if (error) throw error;
      return data as Array<{ id: string; full_name: string; email: string }>;
    },
  });

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  const tableOptions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.table_name))).sort(),
    [logs],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter((l) => {
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (tableFilter !== "all" && l.table_name !== tableFilter) return false;
      if (q) {
        const u = l.user_id ? userMap[l.user_id] : null;
        const hay = `${u?.full_name ?? ""} ${u?.email ?? ""} ${l.record_id ?? ""} ${l.table_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, actionFilter, tableFilter, userMap]);

  const handleExport = () => {
    const rows = filtered.map((l) => {
      const u = l.user_id ? userMap[l.user_id] : null;
      return {
        Date: new Date(l.created_at).toLocaleString(),
        User: u?.full_name ?? "System",
        Email: u?.email ?? "",
        Action: l.action,
        Table: l.table_name,
        "Record ID": l.record_id ?? "",
      };
    });
    exportToExcel(rows, `audit-logs-${Date.now()}.xlsx`, "Audit Logs");
  };

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="System activity trail across all managed tables."
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
            placeholder="Search user, record..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="INSERT">INSERT</SelectItem>
            <SelectItem value="UPDATE">UPDATE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger><SelectValue placeholder="Table" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tables</SelectItem>
            {tableOptions.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Record</TableHead>
              <TableHead className="w-16 text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No audit records found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => {
                const u = l.user_id ? userMap[l.user_id] : null;
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(l.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{u?.full_name ?? "System"}</div>
                      <div className="text-xs text-muted-foreground">{u?.email ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.action === "DELETE" ? "destructive" : "secondary"}>
                        {l.action}
                      </Badge>
                    </TableCell>
                    <TableCell><code className="text-xs">{l.table_name}</code></TableCell>
                    <TableCell><code className="text-xs">{l.record_id?.slice(0, 8) ?? "—"}</code></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setViewing(l)}>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Audit entry</DialogTitle>
            <DialogDescription>Change details for this record.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Before
                </div>
                <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/50 p-3 text-xs">
                  {viewing.old_values ? JSON.stringify(viewing.old_values, null, 2) : "—"}
                </pre>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  After
                </div>
                <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/50 p-3 text-xs">
                  {viewing.new_values ? JSON.stringify(viewing.new_values, null, 2) : "—"}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
