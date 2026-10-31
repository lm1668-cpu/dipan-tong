import { createFileRoute } from "@tanstack/react-router";
import { MaterialsPage } from "@/components/site/more-pages";

export const Route = createFileRoute("/app/materials/")({ component: MaterialsPage });
