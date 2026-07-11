import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/_app/hr/leave-types")({
  component: () => (
    <PagePlaceholder title="Leave Types" description="Define categories of leave and their rules." />
  ),
});
