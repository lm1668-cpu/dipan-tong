import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/site/more-pages";

export const Route = createFileRoute("/app/admin/")({ component: AdminPage });
