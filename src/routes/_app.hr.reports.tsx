import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/_app/hr/reports")({
  component: () => (
    <PagePlaceholder title="Reports" description="Analytics and exports for leave activity." />
  ),
});
