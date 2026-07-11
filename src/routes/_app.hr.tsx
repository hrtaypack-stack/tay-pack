import { createFileRoute } from "@tanstack/react-router";
import { HRGate } from "@/components/role-gate";

export const Route = createFileRoute("/_app/hr")({
  component: HRGate,
});
