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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Eye, Search, Download } from "lucide-react";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/export-excel";

export const Route = createFileRoute("/_app/hr/employees")({
  component: EmployeesPage,
});

type Employee = {
  id: string;
  employee_code: string | null;
  full_name: string;
  email: string;
  role: "employee" | "manager" | "hr";
  is_active: boolean;
  department_id: string | null;
  manager_id: string | null;
  created_at: string;
};

type Department = { id: string; name: string };

function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Department[];
    },
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data as Employee[];
    },
  });

  const deptMap = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments],
  );
  const empMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter((e) => {
      if (
        q &&
        !(
          e.full_name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          (e.employee_code ?? "").toLowerCase().includes(q)
        )
      )
        return false;
      if (departmentFilter !== "all" && e.department_id !== departmentFilter) return false;
      if (roleFilter !== "all" && e.role !== roleFilter) return false;
      if (statusFilter === "active" && !e.is_active) return false;
      if (statusFilter === "inactive" && e.is_active) return false;
      return true;
    });
  }, [employees, search, departmentFilter, roleFilter, statusFilter]);

  const handleExport = () => {
    const rows = filtered.map((e) => ({
      "Employee Code": e.employee_code ?? "",
      Name: e.full_name,
      Email: e.email,
      Role: e.role,
      Department: e.department_id ? deptMap[e.department_id] : "",
      Manager: e.manager_id ? empMap[e.manager_id]?.full_name ?? "" : "",
      Status: e.is_active ? "Active" : "Inactive",
      "Created At": new Date(e.created_at).toLocaleDateString(),
    }));
    exportToExcel(rows, `employees-${Date.now()}.xlsx`, "Employees");
  };

  return (
    <>
      <PageHeader
        title="Employees"
        description="View and manage employee profiles."
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="hr">HR</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.employee_code ?? "—"}</TableCell>
                  <TableCell className="font-medium">{e.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{e.email}</TableCell>
                  <TableCell>{e.department_id ? deptMap[e.department_id] : "—"}</TableCell>
                  <TableCell>{e.manager_id ? empMap[e.manager_id]?.full_name ?? "—" : "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{e.role}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={e.is_active ? "default" : "secondary"}>
                      {e.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewing(e)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(e)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EmployeeViewDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        employee={viewing}
        deptMap={deptMap}
        empMap={empMap}
      />

      <EmployeeEditDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        employee={editing}
        departments={departments}
        employees={employees}
      />
    </>
  );
}

function EmployeeViewDialog({
  open,
  onOpenChange,
  employee,
  deptMap,
  empMap,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employee: Employee | null;
  deptMap: Record<string, string>;
  empMap: Record<string, Employee>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Employee details</DialogTitle>
          <DialogDescription>Read-only profile information.</DialogDescription>
        </DialogHeader>
        {employee && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Field label="Employee code" value={employee.employee_code ?? "—"} />
            <Field label="Full name" value={employee.full_name} />
            <Field label="Email" value={employee.email} />
            <Field label="Role" value={employee.role} />
            <Field label="Department" value={employee.department_id ? deptMap[employee.department_id] : "—"} />
            <Field label="Manager" value={employee.manager_id ? empMap[employee.manager_id]?.full_name ?? "—" : "—"} />
            <Field label="Status" value={employee.is_active ? "Active" : "Inactive"} />
            <Field label="Created" value={new Date(employee.created_at).toLocaleString()} />
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function EmployeeEditDialog({
  open,
  onOpenChange,
  employee,
  departments,
  employees,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employee: Employee | null;
  departments: Department[];
  employees: Employee[];
}) {
  const qc = useQueryClient();
  const [employeeCode, setEmployeeCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"employee" | "manager" | "hr">("employee");
  const [departmentId, setDepartmentId] = useState<string>("none");
  const [managerId, setManagerId] = useState<string>("none");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open && employee) {
      setEmployeeCode(employee.employee_code ?? "");
      setFullName(employee.full_name);
      setRole(employee.role);
      setDepartmentId(employee.department_id ?? "none");
      setManagerId(employee.manager_id ?? "none");
      setIsActive(employee.is_active);
    }
  }, [open, employee]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!employee) return;
      const { error } = await supabase
        .from("profiles")
        .update({
          employee_code: employeeCode || null,
          full_name: fullName,
          role,
          department_id: departmentId === "none" ? null : departmentId,
          manager_id: managerId === "none" ? null : managerId,
          is_active: isActive,
        })
        .eq("id", employee.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee updated");
      qc.invalidateQueries({ queryKey: ["employees"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const managerOptions = employees.filter(
    (e) => e.id !== employee?.id && e.is_active,
  );


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit employee</DialogTitle>
          <DialogDescription>
            Update profile fields. Email is managed via Supabase Auth.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Employee code</Label>
            <Input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "employee" | "manager" | "hr")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Manager</Label>
            <Select value={managerId} onValueChange={setManagerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {managerOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-lg border p-3">
            <div className="text-sm font-medium">Active</div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
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
