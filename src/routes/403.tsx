import { createFileRoute } from "@tanstack/react-router";
import { ErrorState } from "@/components/error-state";

export const Route = createFileRoute("/403")({
  component: () => (
    <ErrorState
      code="403"
      title="Access denied"
      message="You don't have permission to view this page."
    />
  ),
});
