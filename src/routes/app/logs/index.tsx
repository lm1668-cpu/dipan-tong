import { createFileRoute } from "@tanstack/react-router";
import { LogsPage } from "@/components/site/logs-page";

export const Route = createFileRoute("/app/logs/")({ component: LogsPage });
