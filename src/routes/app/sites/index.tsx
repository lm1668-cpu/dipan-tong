import { createFileRoute } from "@tanstack/react-router";
import { SitesPage } from "@/components/site/sites";

export const Route = createFileRoute("/app/sites/")({ component: SitesPage });
