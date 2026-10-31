import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/components/site/more-pages";

export const Route = createFileRoute("/app/account/")({ component: AccountPage });
