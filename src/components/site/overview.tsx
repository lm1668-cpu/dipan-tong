import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogDialog, MaterialDialog, TaskDialog } from "@/components/site/forms";
import { RoleLoop } from "@/components/site/loops";
import { Badge, Button, Card, NoticeList, ProgressBar } from "@/components/site/ui";
import { assetUrl, formatDate, isOverdue, todayISO, weekday, can } from "@/lib/site/model";
import { progressOf, useAppStore, useScope } from "@/lib/site/store";
import { cn } from "@/lib/utils";

export function OverviewPage() {
  const { user, sites, tasks, logs, materials, notices } = useScope();
  const setFocusTask = useAppStore((s) => s.setFocusTask);
  const setFocusLog = useAppStore((s) => s.setFocusLog);
  const navigate = useNavigate();
  const [logOpen, setLogOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [snagOpen, setSnagOpen] = useState(false);
  const [matOpen, setMatOpen] = useState(false);
  const today = todayISO();
  if (!user || user.role === "platform_admin") return null;

  const activeSites = sites.filter((s) => s.status !== "paused");
  const canLog = sites.some((site) => can(user, "create_log", site));
  const canMat = sites.some((site) => can(user, "create_material", site));
  const todayTasks = tasks.filter((t) => t.status !== "done" && t.due === today);
  const overdue = tasks.filter((t) => isOverdue(t, today));
  const review = tasks.filter((t) => t.status === "review");
  const drafts = logs.filter((l) => l.status === "draft");
  const matSoon = materials.filter((m) => m.status !== "delivered" && m.neededBy <= today);

  const stats = [
    { id: "stat-sites", label: "進行中工地", value: activeSites.length },
    { id: "stat-today", label: "今日任務", value: todayTasks.length },
    { id: "stat-overdue", label: "逾期事項", value: overdue.length },
    { id: "stat-review", label: "待驗收", value: review.length },
  ];

  const tones = [
    "border-line bg-card",
    "border-clay/50 bg-blush",
    "border-leaf/40 bg-leaf-soft",
    "border-navy/10 bg-ice",
  ];
  const numbers = ["text-leaf", "text-clay", "text-gold-2", "text-navy"];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-muted">{formatDate(today)} 星期{weekday(today)}</p>
        <h1 className="text-3xl">{user.name}，今日有咩要跟？</h1>
      </div>
      <RoleLoop />
      {user.role !== "subcontractor" ? <NoticeList notes={notices} /> : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={stat.id} className={cn("border-2", tones[index])}>
            <p className="text-xs font-bold text-muted">{stat.label}</p>
            <p className={cn("mt-1 text-3xl font-black tabular-nums", numbers[index])} data-testid={stat.id}>{stat.value}</p>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {canLog ? <Button data-testid="quick-log" onClick={() => setLogOpen(true)}>每日紀錄</Button> : null}
        <Button variant="gold" data-testid="quick-task" onClick={() => setTaskOpen(true)}>開任務</Button>
        <Button variant="ghost" data-testid="quick-snag" onClick={() => setSnagOpen(true)}>報問題</Button>
        {canMat ? <Button variant="soft" data-testid="quick-material" onClick={() => setMatOpen(true)}>材料跟進</Button> : null}
      </div>
      <section className="space-y-3">
        <h2 className="font-display text-2xl">各工地進度</h2>
        {sites.length === 0 ? <p className="text-sm text-muted">你未有獲分派嘅工地。</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {sites.map((site) => {
            const progress = progressOf(site);
            return (
              <button
                key={site.id}
                type="button"
                className="overflow-hidden rounded-3xl border border-line bg-card text-left shadow-card"
                onClick={() => void navigate({ to: "/app/sites/$siteId", params: { siteId: site.id } })}
              >
                <img src={assetUrl(site.cover)} alt="" className="h-32 w-full object-cover" />
                <div className="space-y-2 p-4">
                  <p className="text-xs text-muted">{site.district} · {site.stage}</p>
                  <p className="font-medium">{site.name}</p>
                  <div className="flex items-center gap-3">
                    <ProgressBar value={progress} />
                    <span className="tabular-nums text-sm">{progress}%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl">今日待辦</h2>
        <div className="space-y-2">
          {overdue.map((task) => (
            <button key={task.id} type="button" className="flex w-full items-center justify-between rounded-2xl bg-clay-soft px-4 py-3 text-left" onClick={() => { setFocusTask(task.id); void navigate({ to: "/app/tasks" }); }}>
              <span>
                <span className="block text-sm font-medium">{task.title}</span>
                <span className="text-xs text-clay">逾期 · {formatDate(task.due)}</span>
              </span>
              <Badge tone="clay">逾期</Badge>
            </button>
          ))}
          {todayTasks.filter((t) => !isOverdue(t, today)).map((task) => (
            <button key={task.id} type="button" className="flex w-full items-center justify-between rounded-2xl border border-line bg-card px-4 py-3 text-left" onClick={() => { setFocusTask(task.id); void navigate({ to: "/app/tasks" }); }}>
              <span className="text-sm font-medium">{task.title}</span>
              <Badge tone="gold">今日</Badge>
            </button>
          ))}
          {user.role !== "subcontractor"
            ? drafts.map((log) => (
            <button key={log.id} type="button" className="flex w-full items-center justify-between rounded-2xl border border-line bg-card px-4 py-3 text-left" onClick={() => { setFocusLog(log.id); void navigate({ to: "/app/logs" }); }}>
              <span className="text-sm">日誌草稿未提交</span>
              <Badge>草稿</Badge>
            </button>
          ))
            : null}
          {matSoon.map((item) => (
            <button key={item.id} type="button" className="flex w-full items-center justify-between rounded-2xl border border-line bg-card px-4 py-3 text-left" onClick={() => void navigate({ to: "/app/materials" })}>
              <span className="text-sm">{item.name}要跟</span>
              <Badge tone={item.status === "issue" ? "clay" : "gold"}>{item.status === "issue" ? "有問題" : "快要用"}</Badge>
            </button>
          ))}
          {overdue.length + todayTasks.length + (user.role === "subcontractor" ? 0 : drafts.length) + matSoon.length === 0 ? (
            <p className="text-sm text-muted">今日冇趕住要跟嘅單。收得工就收工。</p>
          ) : null}
        </div>
      </section>
      <LogDialog open={logOpen} onOpenChange={setLogOpen} />
      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} kind="task" />
      <TaskDialog open={snagOpen} onOpenChange={setSnagOpen} kind="snag" />
      <MaterialDialog open={matOpen} onOpenChange={setMatOpen} />
    </div>
  );
}
