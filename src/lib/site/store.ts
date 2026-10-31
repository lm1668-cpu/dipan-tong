import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createDemoData } from "@/lib/site/seed";
import {
  can,
  canSeeSite,
  canSeeTask,
  firstError,
  nowStamp,
  PLANS,
  siteProgress,
  uid,
  usageNotices,
  validateLog,
  validateMaterial,
  validateTask,
  type Audit,
  type Company,
  type CompanyStatus,
  type DailyLog,
  type DemoData,
  type DocFile,
  type LogInput,
  type MaterialInput,
  type MaterialItem,
  type Member,
  type MutResult,
  type Photo,
  type PlanId,
  type Role,
  type Site,
  type Task,
  type TaskCommand,
  type TaskInput,
} from "@/lib/site/model";

interface Store extends DemoData {
  _hydrated: boolean;
  sessionUserId: string | null;
  focusTaskId: string | null;
  focusLogId: string | null;
  signIn: (id: string) => void;
  signOut: () => void;
  resetDemo: () => void;
  setFocusTask: (id: string | null) => void;
  setFocusLog: (id: string | null) => void;
  saveLog: (input: LogInput) => MutResult;
  saveTask: (input: TaskInput) => MutResult;
  actTask: (id: string, command: TaskCommand) => MutResult;
  saveMaterial: (input: MaterialInput) => MutResult;
  setMaterialStatus: (id: string, status: MaterialItem["status"]) => MutResult;
  addFile: (input: { siteId: string; name: string; kind: DocFile["kind"]; note: string; src: string | null }) => MutResult;
  saveSite: (input: {
    name: string;
    district: string;
    address: string;
    client: string;
    supervisorId: string;
    targetDate: string;
    stage: string;
  }) => MutResult;
  setTrades: (siteId: string, trades: Site["trades"]) => MutResult;
  toggleSub: (siteId: string, memberId: string) => MutResult;
  addMember: (input: { name: string; role: Role; trade: string; phone: string }) => MutResult;
  setSubscription: (companyId: string, plan: PlanId, status: CompanyStatus) => MutResult;
}

function currentUser(state: DemoData & { sessionUserId: string | null }) {
  return state.members.find((m) => m.id === state.sessionUserId) ?? null;
}

function fail(error: string): MutResult {
  return { ok: false, error };
}

function bumpStorage(company: Company, addGb: number): Company {
  const next = Math.round((company.storageUsedGb + addGb) * 10) / 10;
  return { ...company, storageUsedGb: next };
}

export const useAppStore = create<Store>()(
  persist(
    (set, get) => ({
      ...createDemoData(),
      _hydrated: false,
      sessionUserId: null,
      focusTaskId: null,
      focusLogId: null,
      signIn: (id) => set({ sessionUserId: id }),
      signOut: () => set({ sessionUserId: null, focusTaskId: null, focusLogId: null }),
      resetDemo: () => {
        const sessionUserId = get().sessionUserId;
        set({ ...createDemoData(), sessionUserId, focusTaskId: null, focusLogId: null });
      },
      setFocusTask: (id) => set({ focusTaskId: id }),
      setFocusLog: (id) => set({ focusLogId: id }),
      saveLog: (input) => {
        const state = get();
        const user = currentUser(state);
        if (!user) return fail("請先登入");
        const site = state.sites.find((s) => s.id === input.siteId);
        if (!site) return fail("搵唔到工地");
        const editing = input.id ? state.logs.find((l) => l.id === input.id) : undefined;
        const allowed = editing ? can(user, "edit_log", site) : can(user, "create_log", site);
        if (!allowed) return fail("你冇權限寫呢個工地嘅日誌");
        const errors = validateLog(input);
        if (firstError(errors)) return fail(firstError(errors));
        const stamp = nowStamp();
        const headcount = input.headcount.filter((h) => h.trade.trim() && h.count > 0);
        if (editing) {
          const revisions = [...editing.revisions];
          if (editing.status === "submitted" || input.submit) {
            revisions.push({ at: stamp, byName: user.name, note: input.submit && editing.status === "draft" ? "由草稿提交" : "改過內容" });
          }
          const next: DailyLog = {
            ...editing,
            date: input.date,
            weather: input.weather || "天晴",
            authorName: input.authorName.trim(),
            headcount,
            noWork: input.noWork,
            work: input.noWork ? "" : input.work.trim(),
            deliveries: input.deliveries.trim(),
            issues: input.issues.trim(),
            photos: input.photos,
            status: input.submit || editing.status === "submitted" ? "submitted" : "draft",
            revisions,
            updatedAt: stamp,
          };
          set({ logs: state.logs.map((l) => (l.id === editing.id ? next : l)) });
          return { ok: true, id: editing.id };
        }
        const id = uid("log");
        const log: DailyLog = {
          id,
          companyId: site.companyId,
          siteId: site.id,
          date: input.date,
          weather: input.weather || "天晴",
          authorName: input.authorName.trim(),
          authorId: user.id,
          headcount,
          noWork: input.noWork,
          work: input.noWork ? "" : input.work.trim(),
          deliveries: input.deliveries.trim(),
          issues: input.issues.trim(),
          photos: input.photos,
          status: input.submit ? "submitted" : "draft",
          revisions: [],
          updatedAt: stamp,
        };
        const companies = input.photos.length
          ? state.companies.map((c) => (c.id === site.companyId ? bumpStorage(c, input.photos.length * 0.1) : c))
          : state.companies;
        set({ logs: [log, ...state.logs], companies });
        return { ok: true, id };
      },
      saveTask: (input) => {
        const state = get();
        const user = currentUser(state);
        if (!user) return fail("請先登入");
        const site = state.sites.find((s) => s.id === input.siteId);
        if (!site || !can(user, "create_task", site)) return fail("你冇權限喺呢個工地開單");
        const errors = validateTask(input);
        if (firstError(errors)) return fail(firstError(errors));
        const stamp = nowStamp();
        const id = uid("task");
        const assigneeId = input.assigneeId;
        const task: Task = {
          id,
          companyId: site.companyId,
          siteId: site.id,
          kind: input.kind,
          title: input.title.trim(),
          location: input.location.trim(),
          description: input.description.trim(),
          photos: input.photos,
          donePhotos: [],
          assigneeId,
          subId: input.subId,
          priority: input.priority,
          due: input.due,
          status: assigneeId ? "pending" : "unassigned",
          blocked: false,
          blockReason: "",
          activity: [{ at: stamp, byName: user.name, action: assigneeId ? "開咗呢張單，並分派" : "開咗呢張單，未分派" }],
          updatedAt: stamp,
        };
        const companies = input.photos.length
          ? state.companies.map((c) => (c.id === site.companyId ? bumpStorage(c, input.photos.length * 0.1) : c))
          : state.companies;
        set({ tasks: [task, ...state.tasks], companies });
        return { ok: true, id };
      },
      actTask: (id, command) => {
        const state = get();
        const user = currentUser(state);
        if (!user) return fail("請先登入");
        const task = state.tasks.find((t) => t.id === id);
        if (!task) return fail("搵唔到呢張單");
        const site = state.sites.find((s) => s.id === task.siteId);
        if (!site || !canSeeTask(user, task, site)) return fail("你冇權限睇呢張單");
        const stamp = nowStamp();
        let next = { ...task, activity: [...task.activity], donePhotos: [...task.donePhotos] };
        const push = (action: string) => next.activity.push({ at: stamp, byName: user.name, action });
        if (command.type === "assign") {
          if (!can(user, "approve_task", site)) return fail("分判唔可以改派");
          if (!command.assigneeId) return fail("請揀負責人");
          next.assigneeId = command.assigneeId;
          next.subId = command.subId;
          if (next.status === "unassigned") next.status = "pending";
          const name = state.members.find((m) => m.id === command.assigneeId)?.name ?? "同事";
          push(`改派畀${name}`);
        } else if (command.type === "start") {
          if (!can(user, "update_task", site)) return fail("你冇權限更新呢張單");
          if (next.status === "done" || next.status === "review") return fail("呢張單而家唔可以重新開工");
          next.status = "in_progress";
          if (next.status === "in_progress" && !next.assigneeId) next.assigneeId = user.id;
          push("開始處理");
        } else if (command.type === "review") {
          if (!can(user, "update_task", site)) return fail("你冇權限更新呢張單");
          if (next.status !== "in_progress" && next.status !== "pending") return fail("未開始就交唔到去驗收");
          next.status = "review";
          next.donePhotos = [...next.donePhotos, ...command.donePhotos];
          push(command.donePhotos.length ? "交去驗收，附上完工相" : "交去驗收");
        } else if (command.type === "approve") {
          if (!can(user, "approve_task", site)) return fail("驗收要主管、經理或者公司管理員先得");
          if (next.blocked) return fail("受阻緊，未可以驗收");
          if (next.status !== "review") return fail("未交到驗收");
          next.status = "done";
          push("驗收完成");
        } else if (command.type === "return") {
          if (!can(user, "approve_task", site)) return fail("退回要主管、經理或者公司管理員先得");
          if (!command.note.trim()) return fail("請寫退回原因");
          if (next.status !== "review") return fail("呢張單唔係待驗收");
          next.status = "in_progress";
          push(`退回修改：${command.note.trim()}`);
        } else if (command.type === "block") {
          if (!can(user, "update_task", site)) return fail("你冇權限標記受阻");
          if (next.status === "done") return fail("已完成嘅單唔使標受阻");
          if (!command.reason.trim()) return fail("請寫受阻原因");
          next.blocked = true;
          next.blockReason = command.reason.trim();
          push(`標記受阻：${next.blockReason}`);
        } else if (command.type === "unblock") {
          if (!can(user, "update_task", site)) return fail("你冇權限解除受阻");
          next.blocked = false;
          next.blockReason = "";
          push("解除受阻");
        }
        next.updatedAt = stamp;
        set({ tasks: state.tasks.map((t) => (t.id === id ? next : t)) });
        return { ok: true, id };
      },
      saveMaterial: (input) => {
        const state = get();
        const user = currentUser(state);
        if (!user) return fail("請先登入");
        const site = state.sites.find((s) => s.id === input.siteId);
        if (!site || !can(user, "create_material", site)) return fail("你冇權限跟呢個工地嘅材料");
        const errors = validateMaterial(input);
        if (firstError(errors)) return fail(firstError(errors));
        const item: MaterialItem = {
          id: uid("mat"),
          companyId: site.companyId,
          siteId: site.id,
          name: input.name.trim(),
          spec: input.spec.trim(),
          qty: input.qty.trim(),
          supplier: input.supplier.trim(),
          status: input.status,
          neededBy: input.neededBy,
          note: input.note.trim(),
          updatedAt: nowStamp(),
        };
        set({ materials: [item, ...state.materials] });
        return { ok: true, id: item.id };
      },
      setMaterialStatus: (id, status) => {
        const state = get();
        const user = currentUser(state);
        if (!user) return fail("請先登入");
        const item = state.materials.find((m) => m.id === id);
        if (!item) return fail("搵唔到呢樣材料");
        const site = state.sites.find((s) => s.id === item.siteId);
        if (!site || !can(user, "edit_material", site)) return fail("你冇權限改材料狀態");
        set({
          materials: state.materials.map((m) => (m.id === id ? { ...m, status, updatedAt: nowStamp() } : m)),
        });
        return { ok: true, id };
      },
      addFile: (input) => {
        const state = get();
        const user = currentUser(state);
        if (!user) return fail("請先登入");
        const site = state.sites.find((s) => s.id === input.siteId);
        if (!site || !can(user, "upload_file", site)) return fail("你冇權限上載呢個工地嘅檔案");
        if (!input.name.trim()) return fail("請填檔名");
        const file: DocFile = {
          id: uid("file"),
          companyId: site.companyId,
          siteId: site.id,
          name: input.name.trim(),
          kind: input.kind,
          note: input.note.trim(),
          src: input.src,
          updatedAt: nowStamp(),
        };
        const companies = input.src
          ? state.companies.map((c) => (c.id === site.companyId ? bumpStorage(c, 0.2) : c))
          : state.companies;
        const company = companies.find((c) => c.id === site.companyId);
        const plan = company ? PLANS[company.plan] : null;
        const warning = company && plan && company.storageUsedGb > plan.gb
          ? "儲存已過套餐建議上限。檔案已保留，唔會刪走現有相。"
          : undefined;
        set({ files: [file, ...state.files], companies });
        return { ok: true, id: file.id, warning };
      },
      saveSite: (input) => {
        const state = get();
        const user = currentUser(state);
        if (!user || !user.companyId) return fail("請先登入");
        if (!can(user, "create_site")) return fail("只有公司管理員同項目經理可以開工地");
        if (!input.name.trim() || !input.address.trim() || !input.client.trim()) return fail("請填工地名、地址同客戶");
        if (!input.targetDate) return fail("請填目標完工日");
        if (!input.supervisorId) return fail("請揀負責人");
        const company = state.companies.find((c) => c.id === user.companyId);
        if (!company) return fail("搵唔到公司");
        const count = state.sites.filter((s) => s.companyId === company.id).length;
        const id = uid("site");
        const covers = ["/photos/site-home.jpg", "/photos/site-office.jpg", "/photos/site-duplex.jpg", "/photos/site-clinic.jpg"];
        const site: Site = {
          id,
          companyId: company.id,
          name: input.name.trim(),
          district: input.district.trim() || "香港",
          address: input.address.trim(),
          client: input.client.trim(),
          managerId: user.role === "project_manager" ? user.id : state.members.find((m) => m.companyId === company.id && m.role === "project_manager")?.id || user.id,
          supervisorId: input.supervisorId,
          targetDate: input.targetDate,
          stage: input.stage.trim() || "開工",
          cover: covers[count % covers.length] ?? "/photos/hero.jpg",
          trades: [
            { name: "拆建", progress: 0 },
            { name: "水電", progress: 0 },
            { name: "木作", progress: 0 },
            { name: "油漆", progress: 0 },
          ],
          assignedSubIds: [],
          status: "active",
        };
        set({ sites: [site, ...state.sites] });
        const notices = usageNotices(company, {
          sites: count + 1,
          seats: state.members.filter((m) => m.companyId === company.id).length,
        });
        const warning = notices.find((n) => n.startsWith("工地"));
        return { ok: true, id, warning };
      },
      setTrades: (siteId, trades) => {
        const state = get();
        const user = currentUser(state);
        const site = state.sites.find((s) => s.id === siteId);
        if (!user || !site || !can(user, "edit_site", site)) return fail("你冇權限改進度");
        const cleaned = trades.map((t) => ({
          name: t.name.trim() || "工序",
          progress: Math.max(0, Math.min(100, Math.round(t.progress))),
        }));
        set({
          sites: state.sites.map((s) => (s.id === siteId ? { ...s, trades: cleaned } : s)),
        });
        return { ok: true, id: siteId };
      },
      toggleSub: (siteId, memberId) => {
        const state = get();
        const user = currentUser(state);
        const site = state.sites.find((s) => s.id === siteId);
        if (!user || !site || !can(user, "assign_sub", site)) return fail("你冇權限改分判");
        const member = state.members.find((m) => m.id === memberId && m.companyId === site.companyId);
        if (!member) return fail("搵唔到呢個人");
        const has = site.assignedSubIds.includes(memberId);
        const assignedSubIds = has ? site.assignedSubIds.filter((id) => id !== memberId) : [...site.assignedSubIds, memberId];
        set({ sites: state.sites.map((s) => (s.id === siteId ? { ...s, assignedSubIds } : s)) });
        return { ok: true };
      },
      addMember: (input) => {
        const state = get();
        const user = currentUser(state);
        if (!user || !user.companyId || !can(user, "manage_people")) return fail("只有公司管理員可以加帳戶");
        if (!input.name.trim()) return fail("請填姓名");
        if (input.role === "subcontractor" && !input.trade.trim()) return fail("分判要請工種");
        if (input.role !== "subcontractor" && input.role !== "site_supervisor" && input.role !== "project_manager") {
          return fail("示範只可以加主管、經理或分判");
        }
        const company = state.companies.find((c) => c.id === user.companyId);
        if (!company) return fail("搵唔到公司");
        const seats = state.members.filter((m) => m.companyId === company.id).length;
        const member: Member = {
          id: uid("user"),
          companyId: company.id,
          name: input.name.trim(),
          role: input.role,
          title: input.role === "subcontractor" ? `${input.trade.trim()}分判` : input.role === "project_manager" ? "項目經理" : "工地主管",
          phone: input.phone.trim() || "未填",
          trade: input.role === "subcontractor" ? input.trade.trim() : null,
          blurb: "公司自己加嘅示範帳戶。",
        };
        set({ members: [...state.members, member] });
        const warning = seats + 1 >= PLANS[company.plan].seats
          ? "正式帳戶已到套餐建議上限。新帳戶已保留，現有帳戶唔會停用。"
          : undefined;
        return { ok: true, id: member.id, warning };
      },
      setSubscription: (companyId, plan, status) => {
        const state = get();
        const user = currentUser(state);
        if (!user || !can(user, "manage_billing")) return fail("套餐同付款狀態只可以由後端更新");
        const company = state.companies.find((c) => c.id === companyId);
        if (!company) return fail("搵唔到公司");
        const audit: Audit = {
          id: uid("audit"),
          at: nowStamp(),
          companyId,
          byName: user.name,
          note: `示範後端將${company.shortName}套餐改做${PLANS[plan].name}，狀態改做${statusLabel(status)}。`,
        };
        set({
          companies: state.companies.map((c) =>
            c.id === companyId
              ? { ...c, plan, status, trialEnds: status === "trial" ? c.trialEnds : null }
              : c,
          ),
          audits: [audit, ...state.audits],
        });
        return { ok: true };
      },
    }),
    {
      name: "deitong-demo-v1",
      skipHydration: true,
      partialize: (state) => ({
        companies: state.companies,
        members: state.members,
        sites: state.sites,
        logs: state.logs,
        tasks: state.tasks,
        materials: state.materials,
        files: state.files,
        audits: state.audits,
        sessionUserId: state.sessionUserId,
      }),
    },
  ),
);

function statusLabel(status: CompanyStatus) {
  if (status === "trial") return "試用";
  if (status === "past_due") return "逾期";
  return "有效";
}

export function useHydrated() {
  return useAppStore((s) => s._hydrated);
}

export function useSessionUser() {
  const members = useAppStore((s) => s.members);
  const sessionUserId = useAppStore((s) => s.sessionUserId);
  return members.find((m) => m.id === sessionUserId) ?? null;
}

export function useScope() {
  const companies = useAppStore((s) => s.companies);
  const members = useAppStore((s) => s.members);
  const sites = useAppStore((s) => s.sites);
  const logs = useAppStore((s) => s.logs);
  const tasks = useAppStore((s) => s.tasks);
  const materials = useAppStore((s) => s.materials);
  const files = useAppStore((s) => s.files);
  const audits = useAppStore((s) => s.audits);
  const sessionUserId = useAppStore((s) => s.sessionUserId);
  const hydrated = useAppStore((s) => s._hydrated);
  const user = members.find((m) => m.id === sessionUserId) ?? null;
  const company = companies.find((c) => c.id === user?.companyId) ?? null;
  const visibleSites = user ? sites.filter((s) => canSeeSite(user, s)) : [];
  const siteById = new Map(sites.map((s) => [s.id, s]));
  const visibleTasks = user ? tasks.filter((t) => canSeeTask(user, t, siteById.get(t.siteId))) : [];
  const siteIds = new Set(visibleSites.map((s) => s.id));
  const visibleLogs = logs.filter((l) => siteIds.has(l.siteId));
  const visibleMaterials = materials.filter((m) => siteIds.has(m.siteId));
  const visibleFiles = files.filter((f) => siteIds.has(f.siteId));
  const people = !user
    ? []
    : user.role === "subcontractor"
      ? members.filter((m) => m.id === user.id)
      : members.filter((m) => m.companyId === user.companyId);
  const companySites = company ? sites.filter((s) => s.companyId === company.id) : [];
  const seats = company ? members.filter((m) => m.companyId === company.id).length : 0;
  const notices = company ? usageNotices(company, { sites: companySites.length, seats }) : [];
  return {
    hydrated,
    user,
    company,
    sites: visibleSites,
    tasks: visibleTasks,
    logs: visibleLogs,
    materials: visibleMaterials,
    files: visibleFiles,
    people,
    members,
    companies,
    audits,
    allSites: sites,
    notices,
    seats,
    companySiteCount: companySites.length,
  };
}

export function progressOf(site: Site) {
  return siteProgress(site);
}

export function resizeImage(file: File, max = 960, quality = 0.72) {
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("讀唔到張相"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("讀唔到張相"));
    };
    img.src = url;
  });
}

export async function fileToPhoto(file: File): Promise<Photo> {
  if (!file.type.startsWith("image/")) throw new Error("請上載圖片");
  const src = await resizeImage(file);
  return { id: uid("ph"), src, caption: file.name.replace(/\.[^.]+$/, "") };
}
