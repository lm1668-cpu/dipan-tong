import { createFileRoute } from "@tanstack/react-router";
import { SiteDetailPage } from "@/components/site/sites";

export const Route = createFileRoute("/app/sites/$siteId")({ component: SiteDetailPage });
