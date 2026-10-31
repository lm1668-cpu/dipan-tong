import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage } from "@/components/site/marketing";

export const Route = createFileRoute("/")({ component: MarketingPage });
