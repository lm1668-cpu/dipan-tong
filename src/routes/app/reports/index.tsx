import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/components/site/more-pages";

export const Route = createFileRoute("/app/reports/")({ component: ReportsPage });
