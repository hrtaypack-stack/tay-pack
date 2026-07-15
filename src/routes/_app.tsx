import { createFileRoute, Outlet, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, type UserRole } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { FullscreenLoader } from "@/components/loaders";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function NoProfileScreen() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-accent/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 text-center shadow-[var(--shadow-card)] ring-1 ring-border">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-xl font-semibold">No employee profile found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is authenticated but there is no employee profile linked to it.
          Please contact HR to complete your setup.
        </p>
        <div className="mt-6">
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

function AppLayout() {
  const { loading, profile, profileMissing, user, hasReports } = useAuth();
  const settings = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (profileMissing || !profile) return <NoProfileScreen />;

  return (
    <div className="min-h-screen bg-accent/30">
      <div className="flex min-h-screen">
        <AppSidebar
          role={profile.role as UserRole}
          hasReports={hasReports}
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
              <Outlet />
            </div>
          </main>
          <footer className="border-t bg-background/60 px-6 py-4 text-center text-xs text-muted-foreground">
            {settings.footer_text}
          </footer>
        </div>
      </div>
    </div>
  );
}
