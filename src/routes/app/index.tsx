import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/components/site/overview";

export const Route = createFileRoute("/app/")({ component: OverviewPage });
