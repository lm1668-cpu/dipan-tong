import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MaterialDialog, PersonDialog } from "@/components/site/forms";
import { Badge, Banner, Button, Card, Denied, Empty, Field, NoticeList, ProgressBar, Select } from "@/components/site/ui";
import {
  MATERIAL_LABEL,
  PLANS,
  PLAN_ORDER,
  PRICE_NOTE,
  ROLE_LABEL,
  SECURITY_NOTE,
  STATUS_LABEL,
  can,
  formatDate,
  formatWhen,
  type CompanyStatus,
  type FileKind,
  type MaterialStatus,
  type PlanId,
} from "@/lib/site/model";
import { fileToPhoto, progressOf, useAppStore, useScope } from "@/lib/site/store";

export function PeoplePage() {
  const { user, people, sites } = useScope();
  const [open, setOpen] = useState(false);
  if (!user || !can(user, "view_people")) return <Denied />;
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">人手／分判</h1>
          <p className="text-sm text-muted">邊個負責邊個盤，呢度睇到。</p>
        </div>
        {can(user, "manage_people") ? <Button onClick={() => setOpen(true)}>加人手</Button> : null}
      </div>
      <div className="space-y-2">
        {people.map((person) => {
          const assigned = sites.filter((site) => site.supervisorId === person.id || site.assignedSubIds.includes(person.id) || site.managerId === person.id);
          return (
            <Card key={person.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{person.name}</p>
                  <p className="text-sm text-muted">{ROLE_LABEL[person.role]} · {person.trade ?? person.title}</p>
                  <p className="text-sm text-muted">{person.phone}</p>
                </div>
                <Badge>{assigned.length} 個盤</Badge>
              </div>
            </Card>
          );
        })}
      </div>
      <PersonDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

export function MaterialsPage() {
  const { user, materials, sites } = useScope();
  const setMaterialStatus = useAppStore((s) => s.setMaterialStatus);
  const [open, setOpen] = useState(false);
  const canEdit = user ? sites.some((site) => can(user, "edit_material", site)) : false;
  if (!user || user.role === "platform_admin") return <Denied />;
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">材料</h1>
          <p className="text-sm text-muted">到未到、邊樣有問題，唔好靠記憶。</p>
        </div>
        {canEdit ? <Button data-testid="new-material" onClick={() => setOpen(true)}>加跟進</Button> : null}
      </div>
      {materials.length === 0 ? <Empty title="未有材料" body="要落單或者追貨先至喺度開。" /> : null}
      <div className="space-y-3">
        {materials.map((item) => {
          const site = sites.find((s) => s.id === item.siteId);
          return (
            <Card key={item.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted">{site?.name} · {item.qty}{item.spec ? ` · ${item.spec}` : ""}</p>
                  <p className="text-xs text-muted">{item.supplier || "供應商未定"} · 要喺 {formatDate(item.neededBy)}</p>
                  {item.note ? <p className="text-sm">{item.note}</p> : null}
                </div>
                <Badge tone={item.status === "issue" ? "clay" : item.status === "delivered" ? "navy" : "gold"}>{MATERIAL_LABEL[item.status]}</Badge>
              </div>
              {canEdit ? (
                <Select
                  value={item.status}
                  aria-label={`${item.name}狀態`}
                  onChange={(e) => {
                    const result = setMaterialStatus(item.id, e.target.value as MaterialStatus);
                    if (!result.ok) toast.error(result.error);
                    else toast.success("材料狀態已更新。");
                  }}
                >
                  {(Object.keys(MATERIAL_LABEL) as MaterialStatus[]).map((key) => <option key={key} value={key}>{MATERIAL_LABEL[key]}</option>)}
                </Select>
              ) : null}
            </Card>
          );
        })}
      </div>
      <MaterialDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

export function FilesPage() {
  const { user, files, sites } = useScope();
  const addFile = useAppStore((s) => s.addFile);
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<FileKind>("photo");
  const [error, setError] = useState("");
  const canUpload = user ? sites.some((site) => can(user, "upload_file", site)) : false;
  if (!user || user.role === "platform_admin") return <Denied />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">文件／相片</h1>
        <p className="text-sm text-muted">圖則同現場相放同一處。大檔喺示範模式只記檔名。</p>
      </div>
      {canUpload ? (
        <Card className="space-y-3">
          {error ? <Banner tone="bad">{error}</Banner> : null}
          <Field label="工地">
            <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </Select>
          </Field>
          <Field label="檔名">
            <input value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 w-full rounded-2xl border border-line bg-card px-3 text-sm" placeholder="例如主人房圖則" />
          </Field>
          <Field label="種類">
            <Select value={kind} onChange={(e) => setKind(e.target.value as FileKind)}>
              <option value="photo">相片</option>
              <option value="drawing">圖則</option>
              <option value="doc">文件</option>
            </Select>
          </Field>
          <input
            type="file"
            data-testid="file-input"
            className="block w-full text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const label = name.trim() || file.name;
              if (file.type.startsWith("image/")) {
                void fileToPhoto(file).then((photo) => {
                  const result = addFile({ siteId, name: label, kind, note: "由呢部瀏覽器上載", src: photo.src });
                  if (!result.ok) setError(result.error);
                  else {
                    setError("");
                    setName("");
                    toast.success(result.warning ?? "檔案已儲存。資料留喺呢部瀏覽器。");
                  }
                }).catch((err: unknown) => setError(err instanceof Error ? err.message : "上載唔到"));
              } else {
                const result = addFile({ siteId, name: label, kind, note: `已記低檔名「${file.name}」。示範模式唔保存大檔內容。`, src: null });
                if (!result.ok) setError(result.error);
                else {
                  setError("");
                  toast.success("已記錄檔名。示範模式唔保存大檔內容。");
                }
              }
            }}
          />
        </Card>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {files.map((file) => {
          const site = sites.find((s) => s.id === file.siteId);
          return (
            <Card key={file.id}>
              {file.src ? <img src={file.src} alt={file.name} className="mb-3 h-36 w-full rounded-2xl object-cover" /> : null}
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-muted">{site?.name} · {file.kind === "drawing" ? "圖則" : file.kind === "photo" ? "相片" : "文件"}</p>
              {file.note ? <p className="mt-1 text-sm">{file.note}</p> : null}
            </Card>
          );
        })}
      </div>
      {files.length === 0 ? <Empty title="未有檔案" body="上載相片或者記低圖則名。" /> : null}
    </div>
  );
}

function ProgressChart({ data }: { data: { name: string; 進度: number }[] }) {
  const [chart, setChart] = useState<typeof import("recharts") | null>(null);
  useEffect(() => {
    let live = true;
    void import("recharts").then((mod) => {
      if (live) setChart(mod);
    });
    return () => {
      live = false;
    };
  }, []);
  if (!chart) return <div className="mt-4 h-48 rounded-2xl bg-paper-2" />;
  const { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } = chart;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="進度" fill="var(--color-navy)" radius={6} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportsPage() {
  const { user, sites, tasks, logs } = useScope();
  if (!user || !can(user, "view_reports")) return <Denied />;
  const data = sites.map((site) => ({ name: site.district, 進度: progressOf(site) }));
  const byStatus = (Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((key) => ({
    name: STATUS_LABEL[key],
    count: tasks.filter((t) => t.status === key).length,
  }));
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">報表</h1>
        <p className="text-sm text-muted">只計你有權睇嘅工地。分判睇唔到成間公司嘅數。</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card><p className="text-xs text-muted">工地</p><p className="font-display text-3xl tabular-nums">{sites.length}</p></Card>
        <Card><p className="text-xs text-muted">未完成</p><p className="font-display text-3xl tabular-nums">{tasks.filter((t) => t.status !== "done").length}</p></Card>
        <Card><p className="text-xs text-muted">日誌</p><p className="font-display text-3xl tabular-nums">{logs.length}</p></Card>
      </div>
      <Card>
        <h2 className="font-display text-xl">工地進度</h2>
        <ProgressChart data={data} />
      </Card>
      <Card className="space-y-3">
        <h2 className="font-display text-xl">任務狀態</h2>
        {byStatus.map((row) => (
          <div key={row.name} className="space-y-1">
            <div className="flex justify-between text-sm"><span>{row.name}</span><span className="tabular-nums">{row.count}</span></div>
            <ProgressBar value={tasks.length ? (row.count / tasks.length) * 100 : 0} />
          </div>
        ))}
      </Card>
    </div>
  );
}

export function BillingPage() {
  const { user, company, notices, seats, companySiteCount, audits } = useScope();
  const [note, setNote] = useState("");
  if (!user || !can(user, "view_billing")) return <Denied />;
  const plan = company ? PLANS[company.plan] : null;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">套餐</h1>
        <p className="text-sm text-muted">{PRICE_NOTE}</p>
      </div>
      {company && plan ? (
        <Card className="space-y-3">
          <p className="text-xs text-gold-2">而家用緊</p>
          <h2 className="font-display text-2xl">{plan.name}</h2>
          <p className="text-sm tabular-nums">工地 {companySiteCount}/{plan.sites} · 帳戶 {seats}/{plan.seats} · 儲存 {company.storageUsedGb}/{plan.gb} GB</p>
          <ProgressBar value={Math.min(100, (company.storageUsedGb / plan.gb) * 100)} />
          <p className="text-xs text-muted">付款狀態、套餐同用量只可以由後端更新。呢頁改唔到數。</p>
        </Card>
      ) : <p className="text-sm text-muted">你係平台身份，改客戶套餐請去客戶公司。</p>}
      <NoticeList notes={notices} />
      <div className="grid gap-3 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const item = PLANS[id];
          return (
            <Card key={id}>
              <h3 className="font-display text-xl">{item.name}</h3>
              <p className="mt-1 font-display text-3xl tabular-nums">HK${item.price}</p>
              <p className="text-xs text-muted">每月 · 討論價</p>
              <p className="mt-2 text-sm">{item.blurb}</p>
              <p className="mt-2 text-xs text-muted">{item.sites} 個工地 · {item.seats} 個帳戶 · {item.gb} GB</p>
            </Card>
          );
        })}
      </div>
      {note ? <Banner tone="ok">{note}</Banner> : null}
      <Button variant="gold" onClick={() => setNote("未接通付款。呢個價錢只供討論，未作實，唔會扣錢。")}>
        想升級？而家未開真正付款
      </Button>
      {company ? (
        <Card className="space-y-2">
          <h2 className="font-display text-xl">後端紀錄</h2>
          {audits.filter((a) => a.companyId === company.id).map((audit) => (
            <p key={audit.id} className="text-sm text-muted">{formatWhen(audit.at)} · {audit.byName} · {audit.note}</p>
          ))}
        </Card>
      ) : null}
    </div>
  );
}

export function AccountPage() {
  const { user, company } = useScope();
  const signOut = useAppStore((s) => s.signOut);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState("");
  if (!user) return null;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">帳戶</h1>
      <Card className="space-y-1">
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-muted">{ROLE_LABEL[user.role]} · {user.title}</p>
        <p className="text-sm text-muted">{company?.name ?? "平台"} · {user.phone}</p>
      </Card>
      <Card><p className="text-sm">{SECURITY_NOTE}</p></Card>
      {done ? <Banner tone="ok">{done}</Banner> : null}
      <div className="flex flex-wrap gap-2">
        <Link to="/login" className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm">換個身份試</Link>
        <Button variant="ghost" onClick={() => { signOut(); void navigate({ to: "/" }); }}>登出</Button>
        <Button variant="soft" onClick={() => setConfirm(true)}>重設示範資料</Button>
      </div>
      {confirm ? (
        <Card className="space-y-3">
          <p className="text-sm">重設會返到原本示範資料，你自己加嘅紀錄會冇咗。登入身份會保留。</p>
          <div className="flex gap-2">
            <Button onClick={() => { resetDemo(); setConfirm(false); setDone("已返到原本示範資料。"); toast.success("示範資料已重設。"); }}>確認重設</Button>
            <Button variant="ghost" onClick={() => setConfirm(false)}>取消</Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

const STATUS_OPTIONS: { id: CompanyStatus; label: string }[] = [
  { id: "trial", label: "試用" },
  { id: "active", label: "有效" },
  { id: "past_due", label: "逾期" },
];

export function AdminPage() {
  const { user, companies, allSites, members, audits } = useScope();
  const setSubscription = useAppStore((s) => s.setSubscription);
  const [drafts, setDrafts] = useState<Record<string, { plan: PlanId; status: CompanyStatus }>>({});
  const [message, setMessage] = useState("");
  if (!user || !can(user, "view_admin")) return <Denied />;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">客戶公司</h1>
        <p className="text-sm text-muted">平台只管理訂閱。入唔到客人工地日誌。示範數據其實喺同一部瀏覽器，正式環境要後端按公司隔離。</p>
      </div>
      {message ? <Banner tone="ok">{message}</Banner> : null}
      {companies.map((company) => {
        const siteCount = allSites.filter((s) => s.companyId === company.id).length;
        const seats = members.filter((m) => m.companyId === company.id).length;
        const draft = drafts[company.id] ?? { plan: company.plan, status: company.status };
        const plan = PLANS[company.plan];
        return (
          <Card key={company.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">{company.name}</h2>
                <p className="text-sm text-muted">{company.trade}</p>
              </div>
              <Badge tone="navy">{plan.name}</Badge>
            </div>
            <p className="text-sm tabular-nums">工地 {siteCount}/{plan.sites} · 帳戶 {seats}/{plan.seats} · 儲存 {company.storageUsedGb}/{plan.gb} GB</p>
            <p className="text-xs text-muted">只顯示用量。工地名稱、日誌同相片唔會喺平台頁打開。</p>
            <div className="grid gap-2 md:grid-cols-2">
              <Field label="套餐（示範後端）">
                <Select value={draft.plan} onChange={(e) => setDrafts((all) => ({ ...all, [company.id]: { ...draft, plan: e.target.value as PlanId } }))}>
                  <option value="trial">十四日試用</option>
                  {PLAN_ORDER.map((id) => <option key={id} value={id}>{PLANS[id].name}</option>)}
                </Select>
              </Field>
              <Field label="付款狀態">
                <Select value={draft.status} onChange={(e) => setDrafts((all) => ({ ...all, [company.id]: { ...draft, status: e.target.value as CompanyStatus } }))}>
                  {STATUS_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </Select>
              </Field>
            </div>
            <Button
              data-testid={`save-plan-${company.id}`}
              onClick={() => {
                const result = setSubscription(company.id, draft.plan, draft.status);
                if (!result.ok) setMessage(result.error);
                else setMessage(`已更新${company.shortName}。呢個操作模擬後端，公司頁唔可以自己改。`);
              }}
            >
              用示範後端更新
            </Button>
            <div className="space-y-1">
              {audits.filter((a) => a.companyId === company.id).map((audit) => (
                <p key={audit.id} className="text-xs text-muted">{formatWhen(audit.at)} · {audit.note}</p>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
