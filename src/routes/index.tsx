import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { FullscreenLoader } from "@/components/loaders";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { loading, profile } = useAuth();
  if (loading) return <FullscreenLoader />;
  if (!profile) return <Navigate to="/auth" replace />;
  const dest =
    profile.role === "hr"
      ? "/hr"
      : profile.role === "manager"
        ? "/manager"
        : "/employee";
  return <Navigate to={dest} replace />;
}
