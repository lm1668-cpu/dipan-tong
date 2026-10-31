import { createFileRoute } from "@tanstack/react-router";
import { FilesPage } from "@/components/site/more-pages";

export const Route = createFileRoute("/app/files/")({ component: FilesPage });
