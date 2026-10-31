import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/site/shell";

export const Route = createFileRoute("/app")({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
