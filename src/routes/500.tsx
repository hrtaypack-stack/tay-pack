import { createFileRoute } from "@tanstack/react-router";
import { ErrorState } from "@/components/error-state";

export const Route = createFileRoute("/500")({
  component: () => (
    <ErrorState
      code="500"
      title="Something went wrong"
      message="An unexpected error occurred. Please try again in a moment."
    />
  ),
});
