import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/_app/hr/departments")({
  component: () => (
    <PagePlaceholder title="Departments" description="Configure organizational departments." />
  ),
});
