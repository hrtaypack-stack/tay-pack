import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, History, Users } from "lucide-react";

export const Route = createFileRoute("/_app/manager/")({
  component: ManagerDashboard,
});

function ManagerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manager Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review pending approvals and team activity.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Pending Approvals" value="—" icon={ClipboardCheck} />
        <StatCard title="Team Members" value="—" icon={Users} />
        <StatCard title="Processed This Month" value="—" icon={History} />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: typeof ClipboardCheck;
}) {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">Data available in next phase</p>
      </CardContent>
    </Card>
  );
}
