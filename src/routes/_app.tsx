import { createFileRoute, Outlet, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, type UserRole } from "@/hooks/use-auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { FullscreenLoader } from "@/components/loaders";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { loading, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Close mobile drawer on route change is handled by onNavigate callback in sidebar
  }, []);

  if (loading) return <FullscreenLoader />;
  if (!profile) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-accent/30">
      <div className="flex min-h-screen">
        <AppSidebar
          role={profile.role as UserRole}
          open={sidebarOpen}
          onNavigate={() => setSidebarOpen(false)}
        />
        {sidebarOpen && (
          <button
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
            profile={profile}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">
              <RoleGuard role={profile.role as UserRole} onDeny={() => navigate({ to: "/403" })}>
                <Outlet />
              </RoleGuard>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function RoleGuard({
  role,
  children,
}: {
  role: UserRole;
  onDeny: () => void;
  children: React.ReactNode;
}) {
  // Reserved for per-section role checks — currently each area checks its own prefix.
  void role;
  return <>{children}</>;
}
