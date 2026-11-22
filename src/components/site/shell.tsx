import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  ChartColumn,
  CircleUser,
  CreditCard,
  Ellipsis,
  FolderOpen,
  HardHat,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  Package,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { DemoBanner, BrandMark, Mark } from "@/components/site/ui";
import { ROLE_LABEL, assetUrl, isOverdue, todayISO } from "@/lib/site/model";
import { useAppStore, useScope } from "@/lib/site/store";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; testid: string };

const MAIN: Item[] = [
  { to: "/app", label: "總覽", icon: LayoutDashboard, exact: true, testid: "nav-overview" },
  { to: "/app/sites", label: "工地", icon: HardHat, testid: "nav-sites" },
  { to: "/app/tasks", label: "任務", icon: ListChecks, testid: "nav-tasks" },
  { to: "/app/logs", label: "紀錄", icon: NotebookPen, testid: "nav-logs" },
];

function moreFor(role: string | undefined): Item[] {
  if (role === "platform_admin") {
    return [
      { to: "/app/admin", label: "客戶公司", icon: Building2, testid: "nav-admin" },
      { to: "/app/billing", label: "套餐說明", icon: CreditCard, testid: "nav-billing" },
      { to: "/app/account", label: "帳戶", icon: CircleUser, testid: "nav-account" },
    ];
  }
  const items: Item[] = [];
  if (role !== "subcontractor") items.push({ to: "/app/people", label: "人手／分判", icon: Users, testid: "nav-people" });
  items.push({ to: "/app/materials", label: "材料", icon: Package, testid: "nav-materials" });
  items.push({ to: "/app/files", label: "文件／相片", icon: FolderOpen, testid: "nav-files" });
  if (role !== "subcontractor") items.push({ to: "/app/reports", label: "報表", icon: ChartColumn, testid: "nav-reports" });
  if (role === "company_admin" || role === "project_manager" || role === "site_supervisor") {
    items.push({ to: "/app/billing", label: "套餐", icon: CreditCard, testid: "nav-billing" });
  }
  items.push({ to: "/app/account", label: "帳戶", icon: CircleUser, testid: "nav-account" });
  return items;
}

function active(path: string, item: Item) {
  if (item.exact) return path === item.to || path === `${item.to}/`;
  return path === item.to || path.startsWith(`${item.to}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useAppStore((s) => s._hydrated);
  const { user, company, tasks } = useScope();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    if (user.role === "platform_admin" && (path === "/app" || path === "/app/")) {
      void navigate({ to: "/app/admin" });
    }
  }, [hydrated, user, path, navigate]);

  if (!hydrated || !user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-paper px-6 text-center">
        <div>
          <BrandMark size="lg" />
          <p className="mt-4 font-display text-2xl">地盤通準備緊</p>
        </div>
      </div>
    );
  }

  const items = moreFor(user.role);
  const today = todayISO();
  const open = tasks.filter((t) => t.status !== "done" && (t.due <= today || isOverdue(t, today))).length;
  const home = user.role === "platform_admin" ? "/app/admin" : "/app";
  const moreActive = items.some((item) => active(path, item));

  const linkClass = (on: boolean) =>
    cn(
      "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-bold",
      on ? "bg-gold text-ink" : "text-card/80",
    );

  return (
    <div className="min-h-dvh bg-paper">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-navy md:flex">
        <Link to={home} className="flex items-center gap-3 px-4 py-5">
          <BrandMark />
          <span>
            <span className="block text-lg font-black leading-none text-card">地盤通</span>
            <span className="text-xs text-card/70">工地管理</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {user.role !== "platform_admin"
            ? MAIN.map((item) => (
                <Link key={item.to} to={item.to} data-testid={item.testid} className={linkClass(active(path, item))}>
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))
            : null}
          {items.map((item) => (
            <Link key={item.to} to={item.to} data-testid={item.testid} className={linkClass(active(path, item))}>
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
          <DemoBanner />
          <div className="flex items-center gap-3 px-4 py-3">
            <Mark text={company?.mark ?? "地"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{company?.shortName ?? "地盤通平台"}</p>
              <p className="truncate text-xs text-muted">
                {ROLE_LABEL[user.role]} · {user.name}
              </p>
            </div>
          </div>
          {user.role !== "platform_admin" ? (
            <div className="px-4 pb-3">
              <figure className="overflow-hidden rounded-3xl shadow-card">
                <img
                  src={assetUrl("/photos/crew-depart.jpg")}
                  alt="一班裝修師傅由站口一齊行去屋苑開工"
                  className="h-28 w-full object-cover object-[center_40%]"
                />
                <figcaption className="bg-navy px-4 py-2.5 text-sm font-bold text-card">
                  一齊出發 · 今日仲有 <span className="tabular-nums text-gold">{open}</span> 樣未搞掂
                </figcaption>
              </figure>
            </div>
          ) : null}
        </header>
        <main className="px-4 pb-28 pt-4 md:px-8 md:pb-12">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 bg-navy pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className={cn("grid gap-1 px-1 py-2", user.role === "platform_admin" ? "grid-cols-3" : "grid-cols-5")}>
          {user.role === "platform_admin" ? (
            items.slice(0, 4).map((item) => (
              <Link key={item.to} to={item.to} data-testid={item.testid} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold", active(path, item) ? "bg-gold text-ink" : "text-card")}>
                <item.icon className="size-5" />
                {item.label}
              </Link>
            ))
          ) : (
            <>
              {MAIN.map((item) => (
                <Link key={item.to} to={item.to} data-testid={item.testid} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold", active(path, item) ? "bg-gold text-ink" : "text-card")}>
                  <item.icon className="size-5" />
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                data-testid="nav-more"
                className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold", moreActive || more ? "bg-gold text-ink" : "text-card")}
                onClick={() => setMore(true)}
              >
                <Ellipsis className="size-5" />
                更多
              </button>
            </>
          )}
        </div>
      </nav>
      {more ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-navy/50" aria-label="關閉" onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-card p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl">更多</h2>
              <button type="button" className="grid size-11 place-items-center rounded-full bg-paper-2" aria-label="關閉" onClick={() => setMore(false)}>
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  data-testid={`${item.testid}-sheet`}
                  onClick={() => setMore(false)}
                  className="flex min-h-14 items-center gap-2 rounded-2xl border border-line px-3 text-sm"
                >
                  <item.icon className="size-4 text-navy" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
