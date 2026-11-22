import { useEffect, useState } from "react";
import { LogDialog } from "@/components/site/forms";
import { Badge, Button, Card, Denied, Empty } from "@/components/site/ui";
import { assetUrl, can, formatDate, formatWhen, logState, LOG_STATE_LABEL, todayISO, weekday, type DailyLog } from "@/lib/site/model";
import { useAppStore, useScope } from "@/lib/site/store";

export function LogsPage() {
  const { user, logs, sites } = useScope();
  const focusLogId = useAppStore((s) => s.focusLogId);
  const setFocusLog = useAppStore((s) => s.setFocusLog);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailyLog | null>(null);
  const canWrite = user ? sites.some((site) => can(user, "create_log", site)) : false;

  useEffect(() => {
    if (!focusLogId) return;
    const log = logs.find((item) => item.id === focusLogId);
    if (log && canWrite) {
      setEditing(log);
      setOpen(true);
    }
    setFocusLog(null);
  }, [focusLogId, logs, setFocusLog, canWrite]);

  if (!user || user.role === "platform_admin") return <Denied />;

  if (user.role === "subcontractor") {
    const today = todayISO();
    return (
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-3xl">每日紀錄</h1>
          <p className="text-sm text-muted">正式日誌由主管寫。你只睇到今日開唔開工，睇唔到成份紀錄。</p>
        </div>
        {sites.map((site) => (
          <Card key={site.id}>
            <p className="font-medium">{site.name}</p>
            <p className="text-sm text-muted">今日{LOG_STATE_LABEL[logState(logs, site.id, today)]}</p>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">每日紀錄</h1>
          <p className="text-sm text-muted">草稿可以改，提交之後改過都會留痕。</p>
        </div>
        {canWrite ? <Button data-testid="new-log" onClick={() => { setEditing(null); setOpen(true); }}>寫紀錄</Button> : null}
      </div>
      {logs.length === 0 ? <Empty title="未有日誌" body="你睇到嘅工地未有紀錄。" /> : null}
      <div className="space-y-3">
        {logs.map((log) => {
          const site = sites.find((s) => s.id === log.siteId);
          return (
            <Card key={log.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">{site?.name}</p>
                  <p className="font-medium">{formatDate(log.date)} 星期{weekday(log.date)} · {log.weather}</p>
                </div>
                <Badge tone={log.status === "draft" ? "gold" : "navy"}>{log.status === "draft" ? "草稿" : "已提交"}</Badge>
              </div>
              <p className="mt-2 text-sm">{log.noWork ? "今日無施工。" : log.work}</p>
              {log.deliveries ? <p className="mt-1 text-sm text-muted">送貨：{log.deliveries}</p> : null}
              {log.issues ? <p className="mt-1 text-sm text-clay">問題：{log.issues}</p> : null}
              {log.headcount.length > 0 ? (
                <p className="mt-2 text-xs text-muted">人數：{log.headcount.map((h) => `${h.trade} ${h.count}`).join("、")}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted">填寫人 {log.authorName}</p>
              {log.revisions.map((rev) => (
                <p key={rev.at} className="text-xs text-muted">{formatWhen(rev.at)} · {rev.byName} · {rev.note}</p>
              ))}
              {log.photos.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {log.photos.map((photo) => <img key={photo.id} src={assetUrl(photo.src)} alt={photo.caption} className="aspect-square rounded-2xl object-cover" />)}
                </div>
              ) : null}
              {canWrite ? (
                <Button variant="ghost" className="mt-3" onClick={() => { setEditing(log); setOpen(true); }}>修改</Button>
              ) : null}
            </Card>
          );
        })}
      </div>
      <LogDialog
        key={editing?.id ?? "new"}
        open={open}
        initial={editing}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEditing(null);
        }}
      />
    </div>
  );
}
