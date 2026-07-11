import { createFileRoute } from "@tanstack/react-router";
import { ErrorState } from "@/components/error-state";

export const Route = createFileRoute("/unauthorized")({
  component: () => (
    <ErrorState
      code="401"
      title="Unauthorized"
      message="You need to sign in to access this page."
    />
  ),
});
