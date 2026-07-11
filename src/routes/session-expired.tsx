import { createFileRoute } from "@tanstack/react-router";
import { ErrorState } from "@/components/error-state";

export const Route = createFileRoute("/session-expired")({
  component: () => (
    <ErrorState
      code="⏱"
      title="Session expired"
      message="Your session has expired. Please sign in again to continue."
    />
  ),
});
