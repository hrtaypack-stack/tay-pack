import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  ClipboardCheck,
  History,
  Users,
  Building2,
  CalendarDays,
  BarChart3,
  Settings,
  ClipboardList,
  ScrollText,
  Briefcase,
  BriefcaseBusiness,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/hooks/use-auth";
import { CompanyBrand } from "@/components/company-brand";
import { cn } from "@/lib/utils";

type NavItem = { title: string; url: string; icon: LucideIcon };

const NAV: Record<UserRole, NavItem[]> = {
  employee: [
    { title: "Dashboard", url: "/employee", icon: LayoutDashboard },
    { title: "My Leave Requests", url: "/employee/my-leaves", icon: FileText },
    { title: "New Leave Request", url: "/employee/new-leave", icon: PlusCircle },
    { title: "Mission & Permission", url: "/employee/missions", icon: Briefcase },
    { title: "New Mission/Permission", url: "/employee/new-mission", icon: PlusCircle },
  ],
  manager: [
    { title: "Dashboard", url: "/manager", icon: LayoutDashboard },
    { title: "Pending Requests", url: "/manager/pending", icon: ClipboardCheck },
    { title: "Leave History", url: "/manager/history", icon: History },
    { title: "Mission & Permission", url: "/manager/missions", icon: Briefcase },
  ],
  hr: [
    { title: "Dashboard", url: "/hr", icon: LayoutDashboard },
    { title: "Employees", url: "/hr/employees", icon: Users },
    { title: "Departments", url: "/hr/departments", icon: Building2 },
    { title: "Leave Types", url: "/hr/leave-types", icon: CalendarDays },
    { title: "Leave Requests", url: "/hr/leave-requests", icon: ClipboardList },
    { title: "Mission & Permission", url: "/hr/missions", icon: BriefcaseBusiness },
    { title: "Reports", url: "/hr/reports", icon: BarChart3 },
    { title: "Audit Logs", url: "/hr/audit-logs", icon: ScrollText },
    { title: "Settings", url: "/hr/settings", icon: Settings },
  ],
};

export function AppSidebar({
  role,
  open,
  onNavigate,
}: {
  role: UserRole;
  open: boolean;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const items = NAV[role];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-16 items-center border-b px-4">
        <CompanyBrand linkTo="/" />
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {role === "hr" ? "HR" : role.charAt(0).toUpperCase() + role.slice(1)}
        </p>
        <ul className="space-y-1">
          {items.map((item) => {
            const active =
              pathname === item.url || pathname.startsWith(item.url + "/");
            return (
              <li key={item.url}>
                <Link
                  to={item.url}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
        v1.0 · Phase 1
      </div>
    </aside>
  );
}
