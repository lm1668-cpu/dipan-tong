import { createFileRoute } from "@tanstack/react-router";
import { PeoplePage } from "@/components/site/more-pages";

export const Route = createFileRoute("/app/people/")({ component: PeoplePage });
