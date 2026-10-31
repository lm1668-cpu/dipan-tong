import { useEffect, useState } from "react";
import { TaskDialog } from "@/components/site/forms";
import { TaskDetail } from "@/components/site/task-detail";
import { Badge, Button, Denied, Empty } from "@/components/site/ui";
import { PRIORITY_LABEL, STATUS_LABEL, formatDate, isOverdue, todayISO, type Task, type TaskStatus } from "@/lib/site/model";
import { useAppStore, useScope } from "@/lib/site/store";

const FILTERS = ["全部", "今日", "逾期", "待驗收", "受阻", "執漏"] as const;

export function TasksPage() {
  const { user, tasks, sites } = useScope();
  const focusTaskId = useAppStore((s) => s.focusTaskId);
  const setFocusTask = useAppStore((s) => s.setFocusTask);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("全部");
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"task" | "snag">("task");
  const [picked, setPicked] = useState<Task | null>(null);
  const today = todayISO();

  useEffect(() => {
    if (!focusTaskId) return;
    const task = tasks.find((item) => item.id === focusTaskId);
    if (task) setPicked(task);
    setFocusTask(null);
  }, [focusTaskId, tasks, setFocusTask]);

  if (!user || user.role === "platform_admin") return <Denied />;

  const live = picked ? tasks.find((t) => t.id === picked.id) ?? picked : null;
  const rows = tasks.filter((task) => {
    if (filter === "今日") return task.due === today && task.status !== "done";
    if (filter === "逾期") return isOverdue(task, today);
    if (filter === "待驗收") return task.status === "review";
    if (filter === "受阻") return task.blocked;
    if (filter === "執漏") return task.kind === "snag";
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">任務／執漏</h1>
          <p className="text-sm text-muted">{user.role === "subcontractor" ? "只顯示派咗畀你嘅單。" : "跟到邊張單卡喺邊。"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => { setKind("snag"); setOpen(true); }}>執漏</Button>
          <Button data-testid="new-task" onClick={() => { setKind("task"); setOpen(true); }}>開任務</Button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {FILTERS.map((item) => (
          <button key={item} type="button" className={item === filter ? "min-h-11 shrink-0 rounded-full bg-navy px-4 text-sm text-paper" : "min-h-11 shrink-0 rounded-full border border-line bg-card px-4 text-sm"} onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
      </div>
      {rows.length === 0 ? <Empty title="冇單" body="呢個篩選下面暫時冇嘢。" /> : null}
      <div className="space-y-2">
        {rows.map((task) => {
          const site = sites.find((s) => s.id === task.siteId);
          const tone: TaskStatus = task.status;
          return (
            <button key={task.id} type="button" data-testid={`task-${task.id}`} className="w-full rounded-3xl border border-line bg-card p-4 text-left shadow-card" onClick={() => setPicked(task)}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={tone === "done" ? "navy" : tone === "review" ? "gold" : "soft"}>{STATUS_LABEL[task.status]}</Badge>
                {task.kind === "snag" ? <Badge tone="gold">執漏</Badge> : null}
                {task.blocked ? <Badge tone="clay">受阻</Badge> : null}
                {isOverdue(task, today) ? <Badge tone="clay">逾期</Badge> : null}
              </div>
              <p className="mt-2 font-medium">{task.title}</p>
              <p className="text-sm text-muted">{site?.name ?? "工地"}{task.location ? ` · ${task.location}` : ""} · {PRIORITY_LABEL[task.priority]} · {formatDate(task.due)}</p>
            </button>
          );
        })}
      </div>
      <TaskDialog open={open} onOpenChange={setOpen} kind={kind} />
      <TaskDetail task={live} onClose={() => setPicked(null)} />
    </div>
  );
}
