import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/hr/leave-types")({
  component: LeaveTypesPage,
});

type LeaveType = {
  id: string;
  name: string;
  code: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

function LeaveTypesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<LeaveType | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["leave_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_types")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as LeaveType[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return data;
    return data.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q),
    );
  }, [data, search]);

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leave_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Leave type deleted");
      qc.invalidateQueries({ queryKey: ["leave_types"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Leave Types"
        description="Configure the types of leave employees can request."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add leave type
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leave types..."
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
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
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
                  No leave types found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-2 py-0.5 text-xs">{t.code}</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-4 rounded"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="text-xs text-muted-foreground">{t.color}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant={t.is_active ? "default" : "secondary"}>
                      {t.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(t)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <LeaveTypeDialog
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        leaveType={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete leave type?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleting?.name}". Leave requests referencing
              this type will remain but the type will no longer be available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && removeMut.mutate(deleting.id)}
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

function LeaveTypeDialog({
  open,
  onOpenChange,
  leaveType,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  leaveType: LeaveType | null;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open) {
      setName(leaveType?.name ?? "");
      setCode(leaveType?.code ?? "");
      setColor(leaveType?.color ?? "#3b82f6");
      setSortOrder(leaveType?.sort_order ?? 0);
      setIsActive(leaveType?.is_active ?? true);
    }
  }, [open, leaveType]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !code.trim()) throw new Error("Name and code are required");
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        color,
        sort_order: sortOrder,
        is_active: isActive,
      };
      if (leaveType) {
        const { error } = await supabase
          .from("leave_types")
          .update(payload)
          .eq("id", leaveType.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("leave_types").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(leaveType ? "Leave type updated" : "Leave type created");
      qc.invalidateQueries({ queryKey: ["leave_types"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{leaveType ? "Edit leave type" : "Add leave type"}</DialogTitle>
          <DialogDescription>
            {leaveType ? "Update leave type details." : "Create a new leave type."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lt-name">Name</Label>
              <Input id="lt-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lt-code">Code</Label>
              <Input
                id="lt-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="AL"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lt-color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="lt-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-14 p-1"
                />
                <Input value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lt-sort">Sort order</Label>
              <Input
                id="lt-sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="text-sm font-medium">Active</div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
