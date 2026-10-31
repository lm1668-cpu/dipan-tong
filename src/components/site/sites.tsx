import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { LogDialog, SiteDialog, TaskDialog } from "@/components/site/forms";
import { TaskDetail } from "@/components/site/task-detail";
import { Badge, Button, Card, Denied, Empty, ProgressBar } from "@/components/site/ui";
import {
  MATERIAL_LABEL,
  STATUS_LABEL,
  can,
  canSeeSite,
  formatDate,
  memberName,
  type Task,
} from "@/lib/site/model";
import { progressOf, useAppStore, useScope } from "@/lib/site/store";

const TABS = [
  { id: "overview", label: "概覽" },
  { id: "progress", label: "進度" },
  { id: "logs", label: "紀錄" },
  { id: "resources", label: "資源" },
  { id: "files", label: "文件" },
] as const;

export function SitesPage() {
  const { sites, user } = useScope();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  if (!user || user.role === "platform_admin") return <Denied />;
  const filtered = sites.filter((site) => `${site.name}${site.district}${site.client}`.includes(query.trim()));
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">工地</h1>
          <p className="text-sm text-muted">你睇到嘅盤，先至係你嘅盤。</p>
        </div>
        {can(user, "create_site") ? <Button data-testid="open-site" onClick={() => setOpen(true)}>開工地</Button> : null}
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搵工地、地區、客戶"
        className="min-h-11 w-full rounded-2xl border border-line bg-card px-3 text-sm"
      />
      {filtered.length === 0 ? <Empty title="冇工地" body="未有符合嘅工地，或者未派畀你。" /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((site) => (
          <button
            key={site.id}
            type="button"
            data-testid={`site-card-${site.id}`}
            className="overflow-hidden rounded-3xl border border-line bg-card text-left shadow-card"
            onClick={() => void navigate({ to: "/app/sites/$siteId", params: { siteId: site.id } })}
          >
            <img src={site.cover} alt={`${site.name}現場`} className="h-40 w-full object-cover" />
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted">{site.district}</p>
                <Badge>{site.stage}</Badge>
              </div>
              <p className="font-medium">{site.name}</p>
              <p className="text-sm text-muted">{site.client} · 目標 {formatDate(site.targetDate)}</p>
              <div className="flex items-center gap-3">
                <ProgressBar value={progressOf(site)} />
                <span className="tabular-nums text-sm">{progressOf(site)}%</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <SiteDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

export function SiteDetailPage() {
  const { siteId } = useParams({ strict: false }) as { siteId: string };
  const { user, allSites, logs, tasks, materials, files, members, people } = useScope();
  const setTrades = useAppStore((s) => s.setTrades);
  const toggleSub = useAppStore((s) => s.toggleSub);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const [logOpen, setLogOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [picked, setPicked] = useState<Task | null>(null);
  const site = allSites.find((s) => s.id === siteId);
  if (!user || user.role === "platform_admin") return <Denied />;
  if (!site) return <Empty title="搵唔到呢個工地" body="可能已經唔喺示範資料入面。" />;
  if (!canSeeSite(user, site)) return <Denied />;

  const siteLogs = logs.filter((l) => l.siteId === site.id);
  const siteTasks = tasks.filter((t) => t.siteId === site.id);
  const siteMats = materials.filter((m) => m.siteId === site.id);
  const siteFiles = files.filter((f) => f.siteId === site.id);
  const subs = people.filter((p) => p.role === "subcontractor");
  const editable = can(user, "edit_site", site);

  return (
    <div className="space-y-4">
      <img src={site.cover} alt="" className="h-44 w-full rounded-3xl object-cover" />
      <div>
        <p className="text-sm text-muted">{site.district} · {site.stage}</p>
        <h1 className="font-display text-3xl">{site.name}</h1>
      </div>
      <div className="flex gap-2 overflow-x-auto" data-testid="site-tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`tab-${item.id}`}
            className={item.id === tab ? "min-h-11 shrink-0 rounded-full bg-navy px-4 text-sm text-paper" : "min-h-11 shrink-0 rounded-full border border-line bg-card px-4 text-sm"}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "overview" ? (
        <Card>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div><dt className="block text-muted">地址</dt><dd className="block">{site.address}</dd></div>
            <div><dt className="block text-muted">客戶</dt><dd className="block">{site.client}</dd></div>
            <div><dt className="block text-muted">項目經理</dt><dd className="block">{memberName(members, site.managerId)}</dd></div>
            <div><dt className="block text-muted">工地主管</dt><dd className="block">{memberName(members, site.supervisorId)}</dd></div>
            <div><dt className="block text-muted">目標完工</dt><dd className="block">{formatDate(site.targetDate)}</dd></div>
            <div><dt className="block text-muted">總進度</dt><dd className="block tabular-nums">{progressOf(site)}%</dd></div>
          </dl>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-2xl bg-paper-2 p-3"><p className="tabular-nums text-xl">{siteTasks.filter((t) => t.status !== "done").length}</p><p className="text-xs text-muted">未完成</p></div>
            <div className="rounded-2xl bg-paper-2 p-3"><p className="tabular-nums text-xl">{siteLogs.length}</p><p className="text-xs text-muted">日誌</p></div>
            <div className="rounded-2xl bg-paper-2 p-3"><p className="tabular-nums text-xl">{siteFiles.length}</p><p className="text-xs text-muted">檔案</p></div>
          </div>
        </Card>
      ) : null}
      {tab === "progress" ? (
        <Card className="space-y-4">
          {site.trades.map((trade, index) => (
            <div key={trade.name} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{trade.name}</span>
                <span className="tabular-nums">{trade.progress}%</span>
              </div>
              <ProgressBar value={trade.progress} />
              {editable ? (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={trade.progress}
                  aria-label={trade.name}
                  className="w-full"
                  onChange={(e) => {
                    const trades = site.trades.map((item, i) => (i === index ? { ...item, progress: Number(e.target.value) } : item));
                    const result = setTrades(site.id, trades);
                    if (!result.ok) toast.error(result.error);
                  }}
                />
              ) : null}
            </div>
          ))}
          {!editable ? <p className="text-xs text-muted">進度由主管更新。</p> : null}
        </Card>
      ) : null}
      {tab === "logs" ? (
        <div className="space-y-3">
          {can(user, "create_log", site) ? <Button onClick={() => setLogOpen(true)}>寫今日紀錄</Button> : null}
          {siteLogs.length === 0 ? <Empty title="未有紀錄" body="呢個盤未有日誌。" /> : null}
          {siteLogs.map((log) => (
            <Card key={log.id}>
              <div className="flex items-center justify-between">
                <p className="font-medium">{formatDate(log.date)} · {log.weather}</p>
                <Badge tone={log.status === "draft" ? "gold" : "navy"}>{log.status === "draft" ? "草稿" : "已提交"}</Badge>
              </div>
              <p className="mt-2 text-sm">{log.noWork ? "今日無施工" : log.work}</p>
              <p className="mt-1 text-xs text-muted">填寫人 {log.authorName}</p>
            </Card>
          ))}
        </div>
      ) : null}
      {tab === "resources" ? (
        <div className="space-y-3">
          <Card className="space-y-2">
            <h2 className="font-display text-xl">人手</h2>
            <p className="text-sm">主管 {memberName(members, site.supervisorId)}</p>
            {user.role === "subcontractor" ? <p className="text-sm text-muted">你只係呢個盤嘅分判，睇唔到成隊名單以外嘅公司資料。</p> : null}
            {(user.role === "subcontractor" ? people : subs).map((person) => {
              const on = site.assignedSubIds.includes(person.id);
              return (
                <div key={person.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{person.name} · {person.trade ?? person.title}</span>
                  {can(user, "assign_sub", site) ? (
                    <Button variant={on ? "soft" : "ghost"} onClick={() => {
                      const result = toggleSub(site.id, person.id);
                      if (!result.ok) toast.error(result.error);
                    }}>{on ? "已派" : "派入場"}</Button>
                  ) : on || person.id === user.id ? <Badge>在場</Badge> : null}
                </div>
              );
            })}
          </Card>
          <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">材料</h2>
              {can(user, "create_task", site) ? <Button variant="ghost" onClick={() => setTaskOpen(true)}>開任務</Button> : null}
            </div>
            {siteMats.map((item) => (
              <p key={item.id} className="text-sm">{item.name} · {item.qty} · {MATERIAL_LABEL[item.status]}</p>
            ))}
            {siteMats.length === 0 ? <p className="text-sm text-muted">未有材料跟進。</p> : null}
          </Card>
          <div className="space-y-2">
            {siteTasks.map((task) => (
              <button key={task.id} type="button" className="flex w-full items-center justify-between rounded-2xl border border-line bg-card px-4 py-3 text-left text-sm" onClick={() => setPicked(task)}>
                <span>{task.title}</span>
                <Badge>{STATUS_LABEL[task.status]}</Badge>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {tab === "files" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {siteFiles.map((file) => (
            <Card key={file.id}>
              {file.src ? <img src={file.src} alt={file.name} className="mb-3 h-32 w-full rounded-2xl object-cover" /> : null}
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-muted">{file.kind === "drawing" ? "圖則" : file.kind === "photo" ? "相片" : "文件"} · {file.note}</p>
            </Card>
          ))}
          {siteFiles.length === 0 ? <Empty title="未有檔案" body="圖則同相片會出現喺度。" /> : null}
        </div>
      ) : null}
      <LogDialog open={logOpen} onOpenChange={setLogOpen} />
      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} />
      <TaskDetail task={picked} onClose={() => setPicked(null)} />
    </div>
  );
}
