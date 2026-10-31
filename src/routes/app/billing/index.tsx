import { createFileRoute } from "@tanstack/react-router";
import { BillingPage } from "@/components/site/more-pages";

export const Route = createFileRoute("/app/billing/")({ component: BillingPage });
