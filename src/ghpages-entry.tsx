import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Outlet,
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { MarketingPage } from "@/components/site/marketing";
import { LoginPage } from "@/components/site/login-page";
import { AppShell } from "@/components/site/shell";
import { OverviewPage } from "@/components/site/overview";
import { SitesPage, SiteDetailPage } from "@/components/site/sites";
import { TasksPage } from "@/components/site/tasks-page";
import { LogsPage } from "@/components/site/logs-page";
import {
  AccountPage,
  AdminPage,
  BillingPage,
  FilesPage,
  MaterialsPage,
  PeoplePage,
  ReportsPage,
} from "@/components/site/more-pages";
import { useAppStore } from "@/lib/site/store";
import "./styles.css";

function StoreHydrator() {
  useEffect(() => {
    let live = true;
    void Promise.resolve(useAppStore.persist.rehydrate()).finally(() => {
      if (live) useAppStore.setState({ _hydrated: true });
    });
    return () => {
      live = false;
    };
  }, []);
  return null;
}

const rootRoute = createRootRoute({
  component: () => (
    <>
      <StoreHydrator />
      <Outlet />
      <Toaster position="top-center" />
    </>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: MarketingPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app",
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const appIndexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: OverviewPage,
});

const sitesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/sites",
  component: SitesPage,
});

const siteDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/sites/$siteId",
  component: SiteDetailPage,
});

const tasksRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/tasks",
  component: TasksPage,
});

const logsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/logs",
  component: LogsPage,
});

const peopleRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/people",
  component: PeoplePage,
});

const materialsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/materials",
  component: MaterialsPage,
});

const filesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/files",
  component: FilesPage,
});

const reportsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/reports",
  component: ReportsPage,
});

const billingRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/billing",
  component: BillingPage,
});

const adminRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/admin",
  component: AdminPage,
});

const accountRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/account",
  component: AccountPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  appRoute.addChildren([
    appIndexRoute,
    sitesRoute,
    siteDetailRoute,
    tasksRoute,
    logsRoute,
    peopleRoute,
    materialsRoute,
    filesRoute,
    reportsRoute,
    billingRoute,
    adminRoute,
    accountRoute,
  ]),
]);

const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
