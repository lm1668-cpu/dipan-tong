import { useState } from "react";
import { toast } from "sonner";
import { Banner, Button, Field, Modal, Select, TextArea, TextInput } from "@/components/site/ui";
import {
  MATERIAL_LABEL,
  PRIORITY_LABEL,
  WEATHERS,
  firstError,
  todayISO,
  validateLog,
  validateMaterial,
  validateTask,
  type DailyLog,
  type Headcount,
  type MaterialStatus,
  type Photo,
  type Priority,
  type Role,
  type Site,
  type TaskKind,
} from "@/lib/site/model";
import { fileToPhoto, useAppStore, useScope } from "@/lib/site/store";

function useFormState() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  return { error, setError, success, setSuccess, fields, setFields };
}

export function LogDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: DailyLog | null;
}) {
  const { sites, user } = useScope();
  const saveLog = useAppStore((s) => s.saveLog);
  const form = useFormState();
  const [siteId, setSiteId] = useState(initial?.siteId ?? sites[0]?.id ?? "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [weather, setWeather] = useState(initial?.weather ?? "天晴");
  const [authorName, setAuthorName] = useState(initial?.authorName ?? user?.name ?? "");
  const [noWork, setNoWork] = useState(initial?.noWork ?? false);
  const [work, setWork] = useState(initial?.work ?? "");
  const [deliveries, setDeliveries] = useState(initial?.deliveries ?? "");
  const [issues, setIssues] = useState(initial?.issues ?? "");
  const [headcount, setHeadcount] = useState<Headcount[]>(initial?.headcount.length ? initial.headcount : [{ trade: "", count: 1 }]);
  const [photos, setPhotos] = useState<Photo[]>(initial?.photos ?? []);
  const [busy, setBusy] = useState(false);

  function resetFrom(next?: DailyLog | null) {
    form.setError("");
    form.setSuccess("");
    form.setFields({});
    setSiteId(next?.siteId ?? sites[0]?.id ?? "");
    setDate(next?.date ?? todayISO());
    setWeather(next?.weather ?? "天晴");
    setAuthorName(next?.authorName ?? user?.name ?? "");
    setNoWork(next?.noWork ?? false);
    setWork(next?.work ?? "");
    setDeliveries(next?.deliveries ?? "");
    setIssues(next?.issues ?? "");
    setHeadcount(next?.headcount.length ? next.headcount : [{ trade: "", count: 1 }]);
    setPhotos(next?.photos ?? []);
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const photo = await fileToPhoto(file);
      setPhotos((list) => [...list, photo]);
    } catch (err) {
      form.setError(err instanceof Error ? err.message : "上載唔到");
    } finally {
      setBusy(false);
    }
  }

  function submit(asSubmit: boolean) {
    const input = {
      id: initial?.id,
      siteId,
      date,
      weather,
      authorName,
      headcount,
      noWork,
      work,
      deliveries,
      issues,
      photos,
      submit: asSubmit,
    };
    const errors = validateLog(input);
    form.setFields(errors);
    if (firstError(errors)) {
      form.setSuccess("");
      form.setError(firstError(errors));
      return;
    }
    const result = saveLog(input);
    if (!result.ok) {
      form.setSuccess("");
      form.setError(result.error);
      return;
    }
    const message = asSubmit ? "日誌已提交。示範模式，資料留喺呢部瀏覽器。" : "草稿已儲存。示範模式，資料留喺呢部瀏覽器。";
    form.setError("");
    form.setSuccess(message);
    toast.success(message);
    if (!initial) resetFrom(null);
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      title={initial ? "改日誌" : "每日地盤日誌"}
      onOpenChange={(next) => {
        if (next) resetFrom(initial);
        onOpenChange(next);
      }}
    >
      <div className="space-y-3">
        {form.error ? <Banner tone="bad">{form.error}</Banner> : null}
        {form.success ? <Banner tone="ok">{form.success}</Banner> : null}
        <Field label="工地" error={form.fields.siteId}>
          <Select value={siteId} onChange={(e) => setSiteId(e.target.value)} data-testid="log-site">
            <option value="">請揀</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.district} · {site.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="日期" error={form.fields.date}>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="天氣">
          <div className="flex flex-wrap gap-2">
            {WEATHERS.map((item) => (
              <button
                key={item}
                type="button"
                className={item === weather ? "min-h-11 rounded-full bg-navy px-3 text-sm text-paper" : "min-h-11 rounded-full bg-paper-2 px-3 text-sm"}
                onClick={() => setWeather(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </Field>
        <Field label="填寫人" error={form.fields.authorName}>
          <TextInput value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
        </Field>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="size-5" checked={noWork} onChange={(e) => setNoWork(e.target.checked)} />
          今日無施工
        </label>
        <Field label="當日工作" error={form.fields.work}>
          <TextArea value={work} disabled={noWork} onChange={(e) => setWork(e.target.value)} placeholder="今日做咗咩、做到邊" />
        </Field>
        <Field label="分判／工種人數">
          <div className="space-y-2">
            {headcount.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_5rem] gap-2">
                <TextInput
                  value={row.trade}
                  placeholder="例如水電"
                  onChange={(e) => setHeadcount((list) => list.map((item, i) => (i === index ? { ...item, trade: e.target.value } : item)))}
                />
                <TextInput
                  type="number"
                  min={0}
                  value={row.count}
                  onChange={(e) => setHeadcount((list) => list.map((item, i) => (i === index ? { ...item, count: Number(e.target.value) } : item)))}
                />
              </div>
            ))}
            <Button type="button" variant="soft" onClick={() => setHeadcount((list) => [...list, { trade: "", count: 1 }])}>
              加一行人數
            </Button>
          </div>
        </Field>
        <Field label="送貨">
          <TextArea value={deliveries} onChange={(e) => setDeliveries(e.target.value)} />
        </Field>
        <Field label="問題">
          <TextArea value={issues} onChange={(e) => setIssues(e.target.value)} />
        </Field>
        <Field label="相片">
          <input
            type="file"
            accept="image/*"
            className="block w-full text-sm"
            onChange={(e) => void onPhoto(e.target.files?.[0])}
          />
          {photos.length > 0 ? <p className="text-xs text-muted">已加 {photos.length} 張</p> : null}
        </Field>
        {initial && initial.revisions.length > 0 ? (
          <div className="rounded-2xl bg-paper-2 p-3 text-xs text-muted">
            {initial.revisions.map((rev) => (
              <p key={rev.at}>{rev.byName} · {rev.note}</p>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button type="button" variant="ghost" disabled={busy} data-testid="log-draft" onClick={() => submit(false)}>
            儲存草稿
          </Button>
          <Button type="button" disabled={busy} data-testid="log-submit" onClick={() => submit(true)}>
            提交
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function TaskDialog({
  open,
  onOpenChange,
  kind = "task",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind?: TaskKind;
}) {
  const { sites, people } = useScope();
  const saveTask = useAppStore((s) => s.saveTask);
  const form = useFormState();
  const [title, setTitle] = useState("");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [due, setDue] = useState(todayISO());
  const [photos, setPhotos] = useState<Photo[]>([]);

  function clear() {
    setTitle("");
    setLocation("");
    setDescription("");
    setAssigneeId("");
    setPhotos([]);
    form.setError("");
    form.setSuccess("");
    form.setFields({});
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      void fileToPhoto(file)
      .then((photo) => setPhotos((list) => [...list, photo]))
      .catch((err: unknown) => form.setError(err instanceof Error ? err.message : "上載唔到"));
    } catch (err) {
      form.setError(err instanceof Error ? err.message : "上載唔到");
    }
  }

  function submit() {
    const assignee = people.find((p) => p.id === assigneeId);
    const input = {
      kind,
      title,
      siteId,
      location,
      description,
      photos,
      assigneeId: assigneeId || null,
      subId: assignee?.role === "subcontractor" ? assignee.id : null,
      priority,
      due,
    };
    const errors = validateTask(input);
    form.setFields(errors);
    if (firstError(errors)) {
      form.setError(firstError(errors));
      form.setSuccess("");
      return;
    }
    const result = saveTask(input);
    if (!result.ok) {
      form.setError(result.error);
      form.setSuccess("");
      return;
    }
    const message = kind === "snag" ? "問題已開單。資料留喺呢部瀏覽器。" : "任務已開。資料留喺呢部瀏覽器。";
    toast.success(message);
    form.setSuccess(message);
    form.setError("");
    clear();
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={kind === "snag" ? "報問題／執漏" : "開任務"}>
      <div className="space-y-3">
        {form.error ? <Banner tone="bad">{form.error}</Banner> : null}
        <Field label="標題" error={form.fields.title}>
          <TextInput value={title} data-testid="task-title" onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="工地" error={form.fields.siteId}>
          <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">請揀</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="位置">
          <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="例如主人房" />
        </Field>
        <Field label="描述">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="負責人">
          <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">未分派</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.name} · {person.title}</option>
            ))}
          </Select>
        </Field>
        <Field label="優先">
          <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((key) => (
              <option key={key} value={key}>{PRIORITY_LABEL[key]}</option>
            ))}
          </Select>
        </Field>
        <Field label="期限" error={form.fields.due}>
          <TextInput type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <Field label="相片">
          <input type="file" accept="image/*" className="block w-full text-sm" onChange={(e) => void onPhoto(e.target.files?.[0])} />
        </Field>
        <Button type="button" data-testid="task-submit" onClick={submit}>儲存</Button>
      </div>
    </Modal>
  );
}

export function MaterialDialog({ open, onOpenChange, siteId }: { open: boolean; onOpenChange: (open: boolean) => void; siteId?: string }) {
  const { sites } = useScope();
  const saveMaterial = useAppStore((s) => s.saveMaterial);
  const form = useFormState();
  const [chosen, setChosen] = useState(siteId ?? sites[0]?.id ?? "");
  const [name, setName] = useState("");
  const [spec, setSpec] = useState("");
  const [qty, setQty] = useState("");
  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState<MaterialStatus>("to_order");
  const [neededBy, setNeededBy] = useState(todayISO());
  const [note, setNote] = useState("");

  function submit() {
    const input = { siteId: chosen, name, spec, qty, supplier, status, neededBy, note };
    const errors = validateMaterial(input);
    form.setFields(errors);
    if (firstError(errors)) {
      form.setError(firstError(errors));
      return;
    }
    const result = saveMaterial(input);
    if (!result.ok) {
      form.setError(result.error);
      return;
    }
    toast.success("材料跟進已儲存。資料留喺呢部瀏覽器。");
    form.setError("");
    setName("");
    setQty("");
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="材料跟進">
      <div className="space-y-3">
        {form.error ? <Banner tone="bad">{form.error}</Banner> : null}
        <Field label="工地" error={form.fields.siteId}>
          <Select value={chosen} onChange={(e) => setChosen(e.target.value)}>
            {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </Select>
        </Field>
        <Field label="材料" error={form.fields.name}>
          <TextInput value={name} data-testid="material-name" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="規格">
          <TextInput value={spec} onChange={(e) => setSpec(e.target.value)} />
        </Field>
        <Field label="數量" error={form.fields.qty}>
          <TextInput value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label="供應商">
          <TextInput value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </Field>
        <Field label="狀態">
          <Select value={status} onChange={(e) => setStatus(e.target.value as MaterialStatus)}>
            {(Object.keys(MATERIAL_LABEL) as MaterialStatus[]).map((key) => (
              <option key={key} value={key}>{MATERIAL_LABEL[key]}</option>
            ))}
          </Select>
        </Field>
        <Field label="要用到" error={form.fields.neededBy}>
          <TextInput type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
        </Field>
        <Field label="備註">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button type="button" data-testid="material-submit" onClick={submit}>儲存</Button>
      </div>
    </Modal>
  );
}

export function SiteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { people } = useScope();
  const saveSite = useAppStore((s) => s.saveSite);
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [client, setClient] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [stage, setStage] = useState("開工");
  const [error, setError] = useState("");
  const supervisors = people.filter((p) => p.role === "site_supervisor" || p.role === "company_admin" || p.role === "project_manager");

  function submit() {
    const result = saveSite({ name, district, address, client, supervisorId, targetDate, stage });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.warning) toast(result.warning);
    toast.success("工地已開。資料留喺呢部瀏覽器。");
    setError("");
    setName("");
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="開工地">
      <div className="space-y-3">
        {error ? <Banner tone="bad">{error}</Banner> : null}
        <Field label="工地名"><TextInput value={name} data-testid="site-name" onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="地區"><TextInput value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="例如紅磡" /></Field>
        <Field label="地址"><TextInput value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <Field label="客戶"><TextInput value={client} onChange={(e) => setClient(e.target.value)} /></Field>
        <Field label="工地主管">
          <Select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
            <option value="">請揀</option>
            {supervisors.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </Select>
        </Field>
        <Field label="目標完工"><TextInput type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></Field>
        <Field label="而家工序"><TextInput value={stage} onChange={(e) => setStage(e.target.value)} /></Field>
        <Button type="button" data-testid="site-submit" onClick={submit}>儲存</Button>
      </div>
    </Modal>
  );
}

export function PersonDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const addMember = useAppStore((s) => s.addMember);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("subcontractor");
  const [trade, setTrade] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  function submit() {
    const result = addMember({ name, role, trade, phone });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.warning) toast(result.warning);
    toast.success("帳戶已加。資料留喺呢部瀏覽器。");
    setName("");
    setError("");
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="加人手">
      <div className="space-y-3">
        {error ? <Banner tone="bad">{error}</Banner> : null}
        <Field label="姓名"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="身份">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="subcontractor">分判</option>
            <option value="site_supervisor">工地主管</option>
            <option value="project_manager">項目經理</option>
          </Select>
        </Field>
        <Field label="工種"><TextInput value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="水電、木器、油漆" /></Field>
        <Field label="電話"><TextInput value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Button type="button" onClick={submit}>儲存</Button>
      </div>
    </Modal>
  );
}

export function siteLabel(sites: Site[], id: string) {
  return sites.find((s) => s.id === id)?.name ?? "工地";
}
