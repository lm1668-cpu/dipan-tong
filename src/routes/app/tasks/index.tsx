import { createFileRoute } from "@tanstack/react-router";
import { TasksPage } from "@/components/site/tasks-page";

export const Route = createFileRoute("/app/tasks/")({ component: TasksPage });
