import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, CalendarDays, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_app/hr/")({
  component: HRDashboard,
});

function HRDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">HR Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Company-wide leave metrics and administration.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Employees" value="—" icon={Users} />
        <StatCard title="Departments" value="—" icon={Building2} />
        <StatCard title="Leave Types" value="—" icon={CalendarDays} />
        <StatCard title="Requests This Month" value="—" icon={BarChart3} />
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
  icon: typeof Users;
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
