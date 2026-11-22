import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogDialog } from "@/components/site/forms";
import { Badge, Button, Card, Field, TextArea, TextInput } from "@/components/site/ui";
import {
  LOG_STATE_LABEL,
  can,
  isoOffset,
  logState,
  todayISO,
  type Site,
  type Task,
} from "@/lib/site/model";
import { progressOf, useAppStore, useScope } from "@/lib/site/store";
import { cn } from "@/lib/utils";

type LoopState = "done" | "now" | "wait";
type LoopStep = { label: string; hint: string; state: LoopState };

function sequence(items: { label: string; hint: string; pass: boolean }[]): LoopStep[] {
  const firstFail = items.findIndex((item) => !item.pass);
  return items.map((item, index) => ({
    label: item.label,
    hint: item.hint,
    state: firstFail === -1 || index < firstFail ? "done" : index === firstFail ? "now" : "wait",
  }));
}

export function LoopRail({ kicker, steps }: { kicker: string; steps: LoopStep[] }) {
  const current = steps.find((step) => step.state === "now");
  return (
    <div className="rounded-3xl border-2 border-navy bg-card p-4" data-testid="loop-rail">
      <p className="text-xs font-bold text-gold-2">今日閉環</p>
      <p className="font-display text-xl">{kicker}</p>
      <ol className="mt-3">
        {steps.map((step, index) => {
          const last = index === steps.length - 1;
          return (
            <li key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-xs font-black",
                    step.state === "done" && "bg-navy text-paper",
                    step.state === "now" && "bg-gold text-ink",
                    step.state === "wait" && "bg-paper-2 text-muted",
                  )}
                >
                  {step.state === "done" ? "✓" : index + 1}
                </span>
                {last ? null : <span className={cn("min-h-4 w-0.5 flex-1", step.state === "done" ? "bg-navy" : "bg-line")} />}
              </div>
              <div className="pb-3">
                <p className={cn("text-sm font-bold", step.state === "wait" && "text-muted")}>{step.label}</p>
                <p className="text-xs text-muted">{step.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-sm font-medium">{current ? `而家做：${current.label}` : "今日呢圈埋咗口。"}</p>
    </div>
  );
}

export function platformLoop(companyIds: string[], touchedIds: string[]) {
  const ids = [...new Set(companyIds)];
  const contacted = ids.length === 0 || ids.every((id) => touchedIds.includes(id));
  return sequence([
    { label: "睇今日要跟", hint: ids.length ? `${ids.length} 間要你聯絡` : "今日冇公司卡喺度", pass: true },
    { label: "記低已聯絡", hint: "打完電話或者 WhatsApp 要留低", pass: contacted },
    { label: "資料繼續留低", hint: "可以加試用日或者改狀態，唔鎖、唔刪", pass: true },
  ]);
}

function toastResult(result: { ok: boolean; error?: string; warning?: string }, ok: string) {
  if (!result.ok) {
    toast.error(result.error ?? "儲存唔到");
    return;
  }
  toast.success(result.warning || ok);
}

export function RoleLoop() {
  const { user } = useScope();
  if (!user || user.role === "platform_admin") return null;
  if (user.role === "subcontractor") return <WorkerLoop />;
  return <DeskLoop />;
}

function WorkerLoop() {
  const { user, sites, tasks, materials, checkins, instructions } = useScope();
  const arrive = useAppStore((s) => s.arrive);
  const leave = useAppStore((s) => s.leave);
  const markAbsent = useAppStore((s) => s.markAbsent);
  const requestMaterial = useAppStore((s) => s.requestMaterial);
  const confirmMaterial = useAppStore((s) => s.confirmMaterial);
  const setFocusTask = useAppStore((s) => s.setFocusTask);
  const navigate = useNavigate();
  const today = todayISO();
  const [ask, setAsk] = useState(false);
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [aside, setAside] = useState<{ siteId: string; mode: "leave" | "absent" } | null>(null);
  const [asideNote, setAsideNote] = useState("");
  useEffect(() => {
    if (!sites.some((s) => s.id === siteId)) setSiteId(sites[0]?.id ?? "");
  }, [sites, siteId]);
  if (!user) return null;

  const openTask = (task: Task) => {
    setFocusTask(task.id);
    void navigate({ to: "/app/tasks" });
  };
  const rework = tasks.filter((task) => task.needsRework && task.status !== "done" && task.status !== "review");
  const doing = tasks.filter((task) => task.status === "in_progress" && !task.needsRework);
  const waiting = tasks.filter((task) => task.status === "review");
  const fresh = tasks.filter((task) => task.status === "pending" || task.status === "unassigned");
  const calls = materials.filter((item) => item.note.startsWith(`工人叫料：${user.name}`) && item.status !== "delivered");
  const notes = instructions.filter((item) => !item.ackAt);
  const mineToday = checkins.filter((row) => row.memberId === user.id && row.date === today);
  const reported = (siteId: string) => mineToday.find((row) => row.siteId === siteId);
  const allReported = sites.length === 0 || sites.every((site) => reported(site.id));
  const stillHere = sites.some((site) => {
    const row = reported(site.id);
    return row && !row.absent && !row.leftAt;
  });
  const allFinished = sites.length > 0 && sites.every((site) => {
    const row = reported(site.id);
    return row && (row.absent || row.leftAt);
  });
  const workerSteps = sequence([
    { label: "到場", hint: allReported ? "每個盤都報過到，或者話咗去唔到" : "仲有盤未報到", pass: allReported },
    { label: "開工", hint: fresh.length ? `仲有 ${fresh.length} 張未開始` : "未開始嘅單已清空", pass: fresh.length === 0 },
    { label: "做完交相", hint: rework.length ? `${rework.length} 張退回要改` : doing.length ? `${doing.length} 張做緊` : "冇單留喺你手", pass: rework.length === 0 && doing.length === 0 },
    { label: "等主管收", hint: waiting.length ? `${waiting.length} 張等驗收` : "冇單卡喺驗收", pass: waiting.length === 0 },
    { label: "收工", hint: sites.length === 0 ? "未有派盤" : allFinished ? "每個盤都收工或者去唔到" : stillHere ? "人未離開" : "先報到先算收工", pass: sites.length === 0 || allFinished },
  ]);

  return (
    <section className="space-y-3" data-testid="role-loop">
      <div>
        <h2 className="font-display text-2xl">你今日嘅單</h2>
        <p className="text-sm text-muted">跟住金黃嗰步做。做完先去下一步，退回就返去交相。</p>
      </div>
      <LoopRail kicker="工人一日" steps={workerSteps} />
      <TomorrowStrip tasks={tasks} materials={materials} />
      {sites.map((site) => {
        const mine = reported(site.id);
        const here = Boolean(mine && !mine.absent && !mine.leftAt);
        const status = mine?.absent ? "今日去唔到" : here ? "已到場" : mine ? "今日已收工" : "未報到";
        return (
          <Card key={site.id} className="space-y-2">
            <p className="font-medium">{site.name}</p>
            <p className="text-xs text-muted">{status}{mine?.note ? ` · ${mine.note}` : ""}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" data-testid={`arrive-${site.id}`} onClick={() => toastResult(arrive(site.id), "已報到。主管寫日誌會見到你。")}>我到場</Button>
              <Button type="button" variant="soft" data-testid={`leave-${site.id}`} onClick={() => { setAside({ siteId: site.id, mode: "leave" }); setAsideNote(""); }}>我收工</Button>
            </div>
            <Button type="button" variant="ghost" data-testid={`absent-${site.id}`} onClick={() => { setAside({ siteId: site.id, mode: "absent" }); setAsideNote(""); }}>今日去唔到</Button>
          </Card>
        );
      })}
      {aside ? (
        <Card className="space-y-3">
          <Field label={aside.mode === "leave" ? "走之前交帶，冇就留空" : "點解去唔到"}>
            <TextInput value={asideNote} onChange={(e) => setAsideNote(e.target.value)} placeholder={aside.mode === "leave" ? "例如線槽未封" : "例如聽日先有料"} />
          </Field>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                const result = aside.mode === "leave" ? leave(aside.siteId, asideNote) : markAbsent(aside.siteId, asideNote);
                toastResult(result, aside.mode === "leave" ? "已收工。交帶主管睇到。" : "已話俾主管知你今日去唔到。");
                if (result.ok) setAside(null);
              }}
            >
              {aside.mode === "leave" ? "確認收工" : "話俾主管知"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAside(null)}>取消</Button>
          </div>
        </Card>
      ) : null}
      {notes.length > 0 ? (
        <Card className="space-y-2">
          <h3 className="font-medium">地盤指示</h3>
          {notes.map((item) => (
            <p key={item.id} className="text-sm">{item.byName}：{item.text}</p>
          ))}
        </Card>
      ) : null}
      <TaskLane title="退回要改" tasks={rework} tone="clay" onOpen={openTask} />
      <TaskLane title="做緊" tasks={doing} onOpen={openTask} />
      <TaskLane title="等主管收" tasks={waiting} onOpen={openTask} />
      <TaskLane title="未開始" tasks={fresh} onOpen={openTask} />
      {calls.length > 0 ? (
        <Card className="space-y-1">
          <h3 className="font-medium">你叫過嘅料</h3>
          {calls.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted">{item.name} · {item.qty} · {item.status === "ordered" ? "公司已落單" : item.status === "issue" ? "有問題" : "等公司落單"}</p>
              {item.status === "ordered" ? (
                <Button type="button" variant="soft" data-testid={`confirm-mat-${item.id}`} onClick={() => toastResult(confirmMaterial(item.id), "已確認收到。呢張叫料埋口。")}>我收到</Button>
              ) : null}
            </div>
          ))}
        </Card>
      ) : null}
      <Button type="button" variant="gold" data-testid="ask-material" onClick={() => setAsk(true)}>叫料</Button>
      {ask ? (
        <Card className="space-y-3">
          <Field label="工地">
            <select className="min-h-11 w-full rounded-2xl border border-line bg-card px-3 text-sm" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
          </Field>
          <Field label="叫咩">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="例如防水料" />
          </Field>
          <Field label="數量">
            <TextInput value={qty} onChange={(e) => setQty(e.target.value)} placeholder="例如兩桶" />
          </Field>
          <Field label="點解要">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="聽日鋪磚要用" />
          </Field>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                const result = requestMaterial({ siteId, name, qty, note });
                toastResult(result, "已交畀公司跟。你睇到狀態，自己改唔到單。");
                if (result.ok) {
                  setAsk(false);
                  setName("");
                  setQty("");
                  setNote("");
                }
              }}
            >
              交出去
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAsk(false)}>取消</Button>
          </div>
        </Card>
      ) : null}
    </section>
  );
}

function TaskLane({ title, tasks, onOpen, tone }: { title: string; tasks: Task[]; onOpen: (task: Task) => void; tone?: "clay" }) {
  if (tasks.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold">{title}</h3>
      {tasks.map((task) => (
        <button key={task.id} type="button" className="flex w-full items-center justify-between rounded-2xl border border-line bg-card px-4 py-3 text-left" onClick={() => onOpen(task)}>
          <span className="text-sm font-medium">{task.title}</span>
          <Badge tone={tone ?? (task.blocked ? "clay" : "gold")}>{task.blocked ? "受阻" : title}</Badge>
        </button>
      ))}
    </div>
  );
}

function DeskLoop() {
  const { user, sites, tasks, logs, materials, checkins, nudges, dayCloses, instructions } = useScope();
  const nudgeLog = useAppStore((s) => s.nudgeLog);
  const closeDay = useAppStore((s) => s.closeDay);
  const addInstruction = useAppStore((s) => s.addInstruction);
  const ackInstruction = useAppStore((s) => s.ackInstruction);
  const setFocusTask = useAppStore((s) => s.setFocusTask);
  const navigate = useNavigate();
  const today = todayISO();
  const soon = isoOffset(21);
  const [logSite, setLogSite] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"nudge" | "instruct" | "close">("nudge");
  if (!user) return null;

  const boss = user.role === "company_admin";
  const manager = user.role === "project_manager";
  const supervisor = user.role === "site_supervisor";
  const selfRun = boss && sites.length > 0 && sites.every((site) => site.supervisorId === user.id);
  const title = selfRun ? "你兼管地盤，今日自己埋口" : boss ? "成間公司，今日齊唔齊" : manager ? "邊個盤會拖" : "你管嘅盤，今日點";
  const lead = selfRun
    ? "冇第二個主管代你寫。日誌、驗收、收工都要自己做完。"
    : boss
    ? "未交日誌就催。有指示就寫低。人同料未齊，唔好當個盤收得工。"
    : manager
      ? "快交樓但進度未埋尾、受阻、未交日誌，都係你要推嘅位。"
      : "人到齊、日誌交、單有人跟、驗收完，先算呢個盤收工。";

  const missing = sites.filter((site) => logState(logs, site.id, today) !== "submitted");
  const reviews = tasks.filter((task) => task.status === "review");
  const blocked = tasks.filter((task) => task.blocked && task.status !== "done");
  const calls = materials.filter((item) => item.note.startsWith("工人叫料") && item.status === "to_order");
  const pendingNotes = instructions.filter((row) => !row.ackAt);
  const closedCount = sites.filter((site) => dayCloses.some((row) => row.siteId === site.id && row.date === today)).length;
  const nudged = missing.every((site) => nudges.some((row) => row.siteId === site.id && row.date === today && !row.resolvedAt));
  const slips = sites.filter((site) => site.status !== "paused" && site.targetDate <= soon && progressOf(site) < 90).length;
  const onSite = checkins.filter((row) => row.date === today && !row.leftAt).length;
  const loose = tasks.filter((task) => task.status === "unassigned");
  const deskSteps = selfRun
    ? sequence([
        { label: "自己交日誌", hint: missing.length ? `${missing.length} 個盤未交` : "你管嘅盤都交咗", pass: missing.length === 0 },
        { label: "驗收", hint: reviews.length ? `${reviews.length} 張等你收` : "冇單等驗收", pass: reviews.length === 0 },
        { label: "等自己回指示", hint: pendingNotes.length ? `${pendingNotes.length} 句未回` : "冇指示吊住", pass: pendingNotes.length === 0 },
        { label: "收工", hint: closedCount === sites.length ? "每個盤都交過帶" : `收咗 ${closedCount}/${sites.length} 個盤`, pass: sites.length > 0 && closedCount === sites.length },
      ])
    : supervisor
    ? sequence([
        { label: "點人", hint: onSite ? `而家 ${onSite} 人未收工` : checkins.some((row) => row.date === today) || logs.some((row) => row.date === today) ? "今日有人報到，或者日誌已經開咗" : "未有人報到，日誌都未開", pass: sites.length === 0 || checkins.some((row) => row.date === today) || logs.some((row) => row.date === today) },
        { label: "交日誌", hint: missing.length ? `${missing.length} 個盤未交` : "你管嘅盤都交咗", pass: missing.length === 0 },
        { label: "分派", hint: loose.length ? `${loose.length} 張未有主人` : "張張有人跟", pass: loose.length === 0 },
        { label: "驗收", hint: reviews.length ? `${reviews.length} 張等你收` : "冇單等驗收", pass: reviews.length === 0 },
        { label: "回指示", hint: pendingNotes.length ? `${pendingNotes.length} 句未回` : "指示都回過", pass: pendingNotes.length === 0 },
        { label: "收工", hint: closedCount === sites.length ? "每個盤都交過帶" : `收咗 ${closedCount}/${sites.length} 個盤`, pass: sites.length > 0 && closedCount === sites.length },
      ])
    : manager
      ? sequence([
          { label: "睇邊個拖", hint: slips || blocked.length ? `${slips} 個盤快交樓未埋尾，${blocked.length} 張受阻` : "睇落未有明顯拖期", pass: slips === 0 && blocked.length === 0 },
          { label: "催未交日誌", hint: missing.length ? (nudged ? "催過，等主管交" : `${missing.length} 個盤未催`) : "日誌齊", pass: missing.length === 0 || nudged },
          { label: "等現場回指示", hint: pendingNotes.length ? `${pendingNotes.length} 句未回` : "指示都有人回", pass: pendingNotes.length === 0 },
          { label: "等現場收工", hint: `${closedCount}/${sites.length} 個盤收咗工`, pass: sites.length > 0 && closedCount === sites.length },
        ])
      : sequence([
          { label: "數未交日誌", hint: missing.length ? `${missing.length} 個盤未交` : "日誌齊", pass: missing.length === 0 },
          { label: "催主管", hint: missing.length === 0 ? "唔使催" : nudged ? "催過" : "未交嘅盤未催", pass: missing.length === 0 || nudged },
          { label: "等現場回指示", hint: pendingNotes.length ? `${pendingNotes.length} 句未回` : "指示都有人回", pass: pendingNotes.length === 0 },
          { label: "等各盤收工", hint: `${closedCount}/${sites.length} 個盤收咗工`, pass: sites.length > 0 && closedCount === sites.length && reviews.length === 0 },
        ]);

  function openNote(siteId: string, next: "nudge" | "instruct" | "close") {
    setMode(next);
    setNoteFor(siteId);
    setNote(next === "nudge" ? "請今日收工前交日誌。" : "");
  }

  function send() {
    if (!noteFor) return;
    const result = mode === "nudge"
      ? nudgeLog(noteFor, note)
      : mode === "instruct"
        ? addInstruction(noteFor, note)
        : closeDay(noteFor, note);
    toastResult(result, mode === "close" ? "呢個盤今日收工。" : mode === "nudge" ? "已催主管。" : "指示已落。等主管回。");
    if (result.ok) {
      setNoteFor(null);
      setNote("");
    }
  }

  return (
    <section className="space-y-3" data-testid="role-loop">
      <div>
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="text-sm text-muted">{lead}</p>
      </div>
      <LoopRail kicker={selfRun ? "老闆兼主管" : boss ? "老闆一日" : manager ? "經理一日" : "主管一日"} steps={deskSteps} />
      <TomorrowStrip tasks={tasks} materials={materials} />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Card><p className="text-xs text-muted">未交日誌</p><p className="text-3xl font-black tabular-nums text-clay" data-testid="loop-missing">{missing.length}</p></Card>
        <Card><p className="text-xs text-muted">等驗收</p><p className="text-3xl font-black tabular-nums">{reviews.length}</p></Card>
        <Card><p className="text-xs text-muted">受阻</p><p className="text-3xl font-black tabular-nums">{blocked.length}</p></Card>
        <Card><p className="text-xs text-muted">工人叫料</p><p className="text-3xl font-black tabular-nums">{calls.length}</p></Card>
      </div>
      {sites.map((site) => (
        <SiteDay
          key={site.id}
          site={site}
          soon={soon}
          showSlip={manager || boss}
          canNudge={can(user, "nudge_log", site)}
          canInstruct={can(user, "instruct", site)}
          canClose={can(user, "close_day", site)}
          canAck={supervisor || boss || manager}
          log={logState(logs, site.id, today)}
          arrived={checkins.filter((row) => row.siteId === site.id && row.date === today && !row.absent).length}
          onSite={checkins.filter((row) => row.siteId === site.id && row.date === today && !row.leftAt && !row.absent).length}
          reviews={tasks.filter((task) => task.siteId === site.id && task.status === "review")}
          blocked={tasks.filter((task) => task.siteId === site.id && task.blocked && task.status !== "done").length}
          calls={materials.filter((item) => item.siteId === site.id && item.note.startsWith("工人叫料") && item.status === "to_order").length}
          loose={tasks.filter((task) => task.siteId === site.id && task.status === "unassigned")}
          blockedId={tasks.find((task) => task.siteId === site.id && task.blocked && task.status !== "done")?.id}
          roster={checkins.filter((row) => row.siteId === site.id && row.date === today)}
          nudge={nudges.find((row) => row.siteId === site.id && row.date === today && !row.resolvedAt)}
          closed={dayCloses.find((row) => row.siteId === site.id && row.date === today)}
          pendingNotes={instructions.filter((row) => row.siteId === site.id && !row.ackAt)}
          onLog={() => setLogSite(site.id)}
          onNote={openNote}
          onAck={(id) => toastResult(ackInstruction(id), "已回覆。老闆同經理睇到。")}
          onReview={(id) => {
            setFocusTask(id);
            void navigate({ to: "/app/tasks" });
          }}
        />
      ))}
      {noteFor ? (
        <Card className="space-y-3">
          <Field label={mode === "nudge" ? "催交" : mode === "instruct" ? "落指示" : "收工交帶"}>
            <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button type="button" data-testid="loop-send" onClick={send}>{mode === "close" ? "確認收工" : "送出"}</Button>
            <Button type="button" variant="ghost" onClick={() => setNoteFor(null)}>取消</Button>
          </div>
        </Card>
      ) : null}
      <LogDialog open={Boolean(logSite)} presetSiteId={logSite} onOpenChange={(open) => { if (!open) setLogSite(null); }} />
    </section>
  );
}

function TomorrowStrip({ tasks, materials }: { tasks: Task[]; materials: { id: string; name: string; neededBy: string; status: string }[] }) {
  const today = todayISO();
  const soon = isoOffset(2);
  const due = tasks.filter((task) => task.status !== "done" && task.due > today && task.due <= soon);
  const mats = materials.filter((item) => item.status !== "delivered" && item.neededBy > today && item.neededBy <= soon);
  if (due.length + mats.length === 0) return null;
  return (
    <Card className="space-y-1">
      <h3 className="font-medium">兩日內要跟</h3>
      {due.map((task) => <p key={task.id} className="text-sm">{task.title} · {task.due.slice(5)}</p>)}
      {mats.map((item) => <p key={item.id} className="text-sm text-muted">料 · {item.name} · {item.neededBy.slice(5)}</p>)}
    </Card>
  );
}

function SiteDay({
  site,
  soon,
  showSlip,
  canNudge,
  canInstruct,
  canClose,
  canAck,
  log,
  arrived,
  onSite,
  reviews,
  blocked,
  calls,
  loose,
  blockedId,
  roster,
  nudge,
  closed,
  pendingNotes,
  onLog,
  onNote,
  onAck,
  onReview,
}: {
  site: Site;
  soon: string;
  showSlip: boolean;
  canNudge: boolean;
  canInstruct: boolean;
  canClose: boolean;
  canAck: boolean;
  log: "none" | "draft" | "submitted";
  arrived: number;
  onSite: number;
  reviews: Task[];
  blocked: number;
  calls: number;
  loose: Task[];
  blockedId?: string;
  roster: { memberName: string; absent?: boolean; leftAt: string | null; note?: string }[];
  nudge?: { id: string; byName: string; note: string };
  closed?: { byName: string; note: string; openReviews: number };
  pendingNotes: { id: string; byName: string; text: string }[];
  onLog: () => void;
  onNote: (siteId: string, mode: "nudge" | "instruct" | "close") => void;
  onAck: (id: string) => void;
  onReview: (id: string) => void;
}) {
  const slip = showSlip && site.status !== "paused" && site.targetDate <= soon && progressOf(site) < 90;
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{site.name}</p>
          <p className="text-xs text-muted">{site.district} · 進度 {progressOf(site)}%</p>
        </div>
        <Badge tone={log === "submitted" ? "navy" : "gold"}>{LOG_STATE_LABEL[log]}</Badge>
      </div>
      <p className="text-sm text-muted">到場 {arrived} 人，而家仲有 {onSite} 人未收工。等驗收 {reviews.length} · 受阻 {blocked} · 叫料 {calls}</p>
      {roster.map((row) => (
        <p key={`${row.memberName}-${row.leftAt ?? "in"}`} className="text-sm">
          {row.absent ? "去唔到" : row.leftAt ? "已走" : "在場"} · {row.memberName}{row.note ? ` · ${row.note}` : ""}
        </p>
      ))}
      {slip ? <p className="text-sm text-clay">目標 {site.targetDate} 就到，進度未埋尾。</p> : null}
      {nudge ? <p className="text-sm">催交 · {nudge.byName}：{nudge.note}</p> : null}
      {pendingNotes.map((item) => (
        <div key={item.id} className="rounded-2xl bg-paper-2 p-3 text-sm">
          <p>{item.byName}：{item.text}</p>
          {canAck ? <Button type="button" variant="soft" className="mt-2" onClick={() => onAck(item.id)}>收到</Button> : null}
        </div>
      ))}
      {closed ? <p className="text-sm">已收工 · {closed.byName}：{closed.note}{closed.openReviews ? `（仲有 ${closed.openReviews} 張等驗收）` : ""}</p> : null}
      <div className="flex flex-wrap gap-2">
        {canClose && log !== "submitted" ? <Button type="button" onClick={onLog}>寫今日日誌</Button> : null}
        {loose[0] ? <Button type="button" variant="gold" onClick={() => onReview(loose[0].id)}>去分派</Button> : null}
        {reviews[0] ? <Button type="button" variant="gold" onClick={() => onReview(reviews[0].id)}>去驗收</Button> : null}
        {blockedId ? <Button type="button" variant="ghost" onClick={() => onReview(blockedId)}>去處理受阻</Button> : null}
        {canNudge && log !== "submitted" ? <Button type="button" variant="ghost" onClick={() => onNote(site.id, "nudge")}>催交</Button> : null}
        {canInstruct ? <Button type="button" variant="soft" onClick={() => onNote(site.id, "instruct")}>落指示</Button> : null}
        {canClose ? <Button type="button" variant="soft" onClick={() => onNote(site.id, "close")}>{closed ? "改收工交帶" : "今日收工"}</Button> : null}
      </div>
    </Card>
  );
}
