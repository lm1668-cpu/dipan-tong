import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge, Banner, Button, Field, Modal, Select, TextArea, TextInput } from "@/components/site/ui";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  can,
  formatDate,
  formatWhen,
  isOverdue,
  memberName,
  todayISO,
  type Task,
} from "@/lib/site/model";
import { fileToPhoto, useAppStore, useScope } from "@/lib/site/store";

export function TaskDetail({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { user, allSites, members, people } = useScope();
  const actTask = useAppStore((s) => s.actTask);
  const site = allSites.find((s) => s.id === task?.siteId);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? "");
  const [error, setError] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<Task["donePhotos"]>([]);

  useEffect(() => {
    setAssigneeId(task?.assigneeId ?? "");
    setNote("");
    setReason("");
    setError("");
    setPendingPhotos([]);
  }, [task?.id, task?.assigneeId]);

  function run(result: { ok: boolean; error?: string; warning?: string }, after?: () => void) {
    if (!result.ok) {
      setError(result.error ?? "儲存唔到");
      return;
    }
    setError("");
    after?.();
    toast.success(result.warning || "已更新。操作人同時間已留低。");
  }

  if (!task || !site || !user) {
    return <Modal open={Boolean(task)} onOpenChange={(open) => { if (!open) onClose(); }} title="任務">{null}</Modal>;
  }

  const overdue = isOverdue(task, todayISO());
  const canApprove = can(user, "approve_task", site);
  const subs = people.filter((p) => p.role === "subcontractor");

  return (
    <Modal open onOpenChange={(open) => { if (!open) onClose(); }} title={task.kind === "snag" ? "執漏" : "任務"}>
      <div className="space-y-3 text-sm">
        {error ? <Banner tone="bad">{error}</Banner> : null}
        {task.needsRework ? <Banner tone="bad">主管退回。改完再交去驗收，張單先算埋口。</Banner> : null}
        <div className="flex flex-wrap gap-2">
          <Badge tone="navy">{STATUS_LABEL[task.status]}</Badge>
          {task.blocked ? <Badge tone="clay">受阻</Badge> : null}
          {overdue ? <Badge tone="clay">逾期</Badge> : null}
          <Badge tone={task.priority === "urgent" || task.priority === "high" ? "gold" : "soft"}>{PRIORITY_LABEL[task.priority]}</Badge>
        </div>
        <h3 className="font-display text-2xl">{task.title}</h3>
        <p className="text-muted">{site.district} · {site.name}{task.location ? ` · ${task.location}` : ""}</p>
        <p>{task.description || "未寫描述。"}</p>
        <p>負責人：{memberName(members, task.assigneeId)}</p>
        <p>分判：{memberName(members, task.subId)}</p>
        <p>期限：{formatDate(task.due)}</p>
        {task.blocked && task.blockReason ? <p className="text-clay">受阻原因：{task.blockReason}</p> : null}
        {task.photos.length + task.donePhotos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {[...task.photos, ...task.donePhotos].map((photo) => (
              <img key={photo.id} src={photo.src} alt={photo.caption} className="aspect-square w-full rounded-2xl object-cover" />
            ))}
          </div>
        ) : null}
        {canApprove && task.status !== "done" ? (
          <Field label="改派">
            <div className="flex gap-2">
              <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">請揀</option>
                {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </Select>
              <Button
                type="button"
                variant="soft"
                onClick={() => {
                  const person = people.find((p) => p.id === assigneeId);
                  run(actTask(task.id, { type: "assign", assigneeId, subId: person?.role === "subcontractor" ? person.id : task.subId }));
                }}
              >
                分派
              </Button>
            </div>
          </Field>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          {task.status !== "done" && task.status !== "review" ? (
            <Button type="button" variant="soft" data-testid="task-start" onClick={() => run(actTask(task.id, { type: "start" }))}>開始處理</Button>
          ) : null}
          {task.status === "in_progress" || task.status === "pending" ? (
            <Button
              type="button"
              data-testid="task-review"
              onClick={() => run(actTask(task.id, { type: "review", donePhotos: pendingPhotos }), () => setPendingPhotos([]))}
            >
              交去驗收
            </Button>
          ) : null}
          {canApprove && task.status === "review" ? (
            <Button type="button" data-testid="task-approve" onClick={() => run(actTask(task.id, { type: "approve" }))}>驗收完成</Button>
          ) : null}
        </div>
        {(task.status === "in_progress" || task.status === "pending" || task.status === "review") ? (
          <Field label="完工相">
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void fileToPhoto(file).then((photo) => {
                  setPendingPhotos((list) => [...list, photo]);
                  toast.success("完工相已附上，交驗收時會一併儲存。");
                }).catch((err: unknown) => setError(err instanceof Error ? err.message : "上載唔到"));
              }}
            />
            {pendingPhotos.length > 0 ? <p className="text-xs text-muted">新相 {pendingPhotos.length} 張，撳交去驗收先會入紀錄。</p> : null}
          </Field>
        ) : null}
        {canApprove && task.status === "review" ? (
          <Field label="退回修改">
            <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="邊度未得" />
            <Button type="button" variant="ghost" className="mt-2" data-testid="task-return" onClick={() => run(actTask(task.id, { type: "return", note }), () => setNote(""))}>退回</Button>
          </Field>
        ) : null}
        {task.status !== "done" ? (
          task.blocked ? (
            <Button type="button" variant="soft" onClick={() => run(actTask(task.id, { type: "unblock" }))}>解除受阻</Button>
          ) : (
            <Field label="標記受阻">
              <div className="flex gap-2">
                <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例如等料" />
                <Button type="button" variant="danger" onClick={() => run(actTask(task.id, { type: "block", reason }))}>受阻</Button>
              </div>
            </Field>
          )
        ) : null}
        {subs.length > 0 && canApprove ? null : null}
        <div className="space-y-2 rounded-2xl bg-paper-2 p-3">
          <p className="font-medium">留痕</p>
          {task.activity.slice().reverse().map((item) => (
            <p key={`${item.at}-${item.action}`} className="text-xs text-muted">
              {formatWhen(item.at)} · {item.byName} · {item.action}
            </p>
          ))}
        </div>
      </div>
    </Modal>
  );
}
