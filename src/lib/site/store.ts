import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createDemoData } from "@/lib/site/seed";
import {
  can,
  canSeeSite,
  canSeeTask,
  firstError,
  logState,
  nowStamp,
  PLANS,
  siteProgress,
  todayISO,
  addDays,
  uid,
  usageNotices,
  validateLog,
  validateMaterial,
  validateTask,
  type Audit,
  type CheckIn,
  type Company,
  type CompanyStatus,
  type DailyLog,
  type DayClose,
  type DemoData,
  type DocFile,
  type Instruction,
  type LogInput,
  type MaterialInput,
  type MaterialItem,
  type Member,
  type MutResult,
  type Nudge,
  type OptionCatalog,
  type Photo,
  type PlanId,
  type PlatformTouch,
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
  arrive: (siteId: string) => MutResult;
  leave: (siteId: string, note?: string) => MutResult;
  markAbsent: (siteId: string, reason: string) => MutResult;
  nudgeLog: (siteId: string, note: string) => MutResult;
  closeDay: (siteId: string, note: string) => MutResult;
  addInstruction: (siteId: string, text: string) => MutResult;
  ackInstruction: (id: string) => MutResult;
  requestMaterial: (input: { siteId: string; name: string; qty: string; note: string }) => MutResult;
  confirmMaterial: (id: string) => MutResult;
  touchCompany: (companyId: string, note: string) => MutResult;
  extendTrial: (companyId: string) => MutResult;
  addCatalogItem: (kind: keyof OptionCatalog, label: string) => MutResult;
  removeCatalogItem: (kind: keyof OptionCatalog, label: string) => MutResult;
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
        if (input.id && !editing) return fail("搵唔到呢份日誌");
        if (editing && (editing.companyId !== site.companyId || editing.siteId !== site.id)) {
          return fail("你冇權限改呢份日誌");
        }
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
          set({
            logs: state.logs.map((l) => (l.id === editing.id ? next : l)),
            nudges: submittedNudges(state.nudges, site.id, input.date, stamp, Boolean(input.submit) || editing.status === "submitted"),
          });
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
        set({
          logs: [log, ...state.logs],
          companies,
          nudges: submittedNudges(state.nudges, site.id, input.date, stamp, input.submit),
        });
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
        let assigneeId = input.assigneeId;
        let subId = input.subId;
        if (user.role === "subcontractor") {
          if (assigneeId && assigneeId !== user.id) return fail("分判唔可以派單畀其他人");
          assigneeId = user.id;
          subId = user.id;
        }
        const assignee = assigneeId ? state.members.find((m) => m.id === assigneeId) : undefined;
        if (assigneeId && (!assignee || assignee.companyId !== site.companyId)) {
          return fail("呢個人唔係呢間公司");
        }
        const subMember = subId ? state.members.find((m) => m.id === subId) : undefined;
        if (subId && (!subMember || subMember.companyId !== site.companyId)) {
          return fail("呢個分判唔係呢間公司");
        }
        if (assignee?.role === "subcontractor") {
          subId = assignee.id;
        }
        let sitesNext = state.sites;
        let warning: string | undefined;
        const targetSub = assignee?.role === "subcontractor" ? assignee : subMember?.role === "subcontractor" ? subMember : undefined;
        if (targetSub && !site.assignedSubIds.includes(targetSub.id)) {
          sitesNext = state.sites.map((item) =>
            item.id === site.id ? { ...item, assignedSubIds: [...item.assignedSubIds, targetSub.id] } : item,
          );
          warning = `已將${targetSub.name}加入${site.name}。唔加入佢睇唔到張單。`;
        }
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
          subId,
          priority: input.priority,
          due: input.due,
          status: assigneeId ? "pending" : "unassigned",
          blocked: false,
          blockReason: "",
          needsRework: false,
          activity: [{ at: stamp, byName: user.name, action: assigneeId ? "開咗呢張單，並分派" : "開咗呢張單，未分派" }],
          updatedAt: stamp,
        };
        const companies = input.photos.length
          ? state.companies.map((c) => (c.id === site.companyId ? bumpStorage(c, input.photos.length * 0.1) : c))
          : state.companies;
        set({ tasks: [task, ...state.tasks], sites: sitesNext, companies });
        return { ok: true, id, warning };
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
        let next = { ...task, activity: [...task.activity], donePhotos: [...task.donePhotos], needsRework: task.needsRework };
        const push = (action: string) => next.activity.push({ at: stamp, byName: user.name, action });
        let sitesNext = state.sites;
        let warning: string | undefined;
        if (command.type === "assign") {
          if (!can(user, "approve_task", site)) return fail("分判唔可以改派");
          if (!command.assigneeId) return fail("請揀負責人");
          const person = state.members.find((m) => m.id === command.assigneeId);
          if (person && person.companyId !== site.companyId) return fail("呢個人唔係呢間公司");
          next.assigneeId = command.assigneeId;
          next.subId = command.subId ?? (person?.role === "subcontractor" ? person.id : next.subId);
          if (next.status === "unassigned") next.status = "pending";
          const name = person?.name ?? "同事";
          if (person?.role === "subcontractor" && !site.assignedSubIds.includes(person.id)) {
            sitesNext = state.sites.map((item) =>
              item.id === site.id ? { ...item, assignedSubIds: [...item.assignedSubIds, person.id] } : item,
            );
            warning = `已將${name}加入${site.name}。唔加入佢睇唔到張單。`;
            push(`改派畀${name}，並加入呢個盤`);
          } else {
            push(`改派畀${name}`);
          }
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
          next.needsRework = false;
          next.donePhotos = [...next.donePhotos, ...command.donePhotos];
          push(command.donePhotos.length ? "交去驗收，附上完工相" : "交去驗收");
        } else if (command.type === "approve") {
          if (!can(user, "approve_task", site)) return fail("驗收要主管、經理或者公司管理員先得");
          if (next.blocked) return fail("受阻緊，未可以驗收");
          if (next.status !== "review") return fail("未交到驗收");
          next.status = "done";
          next.needsRework = false;
          push("驗收完成");
        } else if (command.type === "return") {
          if (!can(user, "approve_task", site)) return fail("退回要主管、經理或者公司管理員先得");
          if (!command.note.trim()) return fail("請寫退回原因");
          if (next.status !== "review") return fail("呢張單唔係待驗收");
          next.status = "in_progress";
          next.needsRework = true;
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
        set({ tasks: state.tasks.map((t) => (t.id === id ? next : t)), sites: sitesNext });
        return { ok: true, id, warning };
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
        const sup = state.members.find((m) => m.id === input.supervisorId && m.companyId === company.id);
        if (!sup) return fail("負責人唔係呢間公司嘅人");
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
      arrive: (siteId) => {
        const state = get();
        const user = currentUser(state);
        if (!user) return fail("請先登入");
        const site = state.sites.find((s) => s.id === siteId);
        if (!site || !can(user, "check_in", site)) return fail("你唔係呢個盤嘅人");
        const date = todayISO();
        const stamp = nowStamp();
        const existing = state.checkins.find((row) => row.siteId === siteId && row.memberId === user.id && row.date === date);
        if (existing && !existing.leftAt && !existing.absent) return fail("你已經報到，未收工。");
        if (existing) {
          set({
            checkins: state.checkins.map((row) =>
              row.id === existing.id ? { ...row, leftAt: null, arrivedAt: stamp, absent: false, note: "" } : row,
            ),
          });
          return { ok: true, id: existing.id };
        }
        const row: CheckIn = {
          id: uid("in"),
          companyId: site.companyId,
          siteId,
          memberId: user.id,
          memberName: user.name,
          trade: user.trade || user.title,
          date,
          arrivedAt: stamp,
          leftAt: null,
          note: "",
          absent: false,
        };
        set({ checkins: [row, ...state.checkins] });
        return { ok: true, id: row.id };
      },
      leave: (siteId, note = "") => {
        const state = get();
        const user = currentUser(state);
        if (!user) return fail("請先登入");
        const site = state.sites.find((s) => s.id === siteId);
        if (!site || !can(user, "check_in", site)) return fail("你唔係呢個盤嘅人");
        const date = todayISO();
        const existing = state.checkins.find((row) => row.siteId === siteId && row.memberId === user.id && row.date === date && !row.leftAt && !row.absent);
        if (!existing) return fail("你今日未報到，或者已經收工。");
        const stamp = nowStamp();
        set({
          checkins: state.checkins.map((row) => (row.id === existing.id ? { ...row, leftAt: stamp, note: note.trim() } : row)),
        });
        return { ok: true, id: existing.id };
      },
      markAbsent: (siteId, reason) => {
        const state = get();
        const user = currentUser(state);
        if (!user) return fail("請先登入");
        const site = state.sites.find((s) => s.id === siteId);
        if (!site || !can(user, "check_in", site)) return fail("你唔係呢個盤嘅人");
        if (!reason.trim()) return fail("寫低點解今日去唔到");
        const date = todayISO();
        const stamp = nowStamp();
        const existing = state.checkins.find((row) => row.siteId === siteId && row.memberId === user.id && row.date === date);
        if (existing && !existing.leftAt && !existing.absent) return fail("你已經喺場。要走先收工，唔好標去唔到。");
        if (existing?.absent) return fail("你已經話過今日去唔到。");
        if (existing) return fail("你今日已經收過工。");
        const row: CheckIn = {
          id: uid("in"),
          companyId: site.companyId,
          siteId,
          memberId: user.id,
          memberName: user.name,
          trade: user.trade || user.title,
          date,
          arrivedAt: stamp,
          leftAt: stamp,
          note: reason.trim(),
          absent: true,
        };
        set({ checkins: [row, ...state.checkins] });
        return { ok: true, id: row.id };
      },
      nudgeLog: (siteId, note) => {
        const state = get();
        const user = currentUser(state);
        if (!user) return fail("請先登入");
        const site = state.sites.find((s) => s.id === siteId);
        if (!site || !can(user, "nudge_log", site)) return fail("只有老闆同項目經理可以催交日誌");
        if (!note.trim()) return fail("寫低想主管交咩");
        const date = todayISO();
        if (logState(state.logs, siteId, date) === "submitted") return fail("呢個盤今日日誌已交，唔使催。");
        if (state.nudges.some((row) => row.siteId === siteId && row.date === date && !row.resolvedAt)) {
          return fail("今日已經催過，等主管交。");
        }
        const row: Nudge = {
          id: uid("nudge"),
          companyId: site.companyId,
          siteId,
          date,
          byName: user.name,
          note: note.trim(),
          at: nowStamp(),
          resolvedAt: null,
        };
        set({ nudges: [row, ...state.nudges] });
        return { ok: true, id: row.id };
      },
      closeDay: (siteId, note) => {
        const state = get();
        const user = currentUser(state);
        if (!user) return fail("請先登入");
        const site = state.sites.find((s) => s.id === siteId);
        if (!site || !can(user, "close_day", site)) return fail("你冇權限幫呢個盤收工");
        if (!note.trim()) return fail("寫低今日有咩要交帶");
        const date = todayISO();
        if (logState(state.logs, siteId, date) !== "submitted") {
          return fail("未交今日日誌。寫低做咗咩，或者剔「今日無施工」，提交咗先算收工。");
        }
        const openReviews = state.tasks.filter((task) => task.siteId === siteId && task.status === "review").length;
        const stamp = nowStamp();
        const existing = state.dayCloses.find((row) => row.siteId === siteId && row.date === date);
        const row: DayClose = {
          id: existing?.id ?? uid("close"),
          companyId: site.companyId,
          siteId,
          date,
          byName: user.name,
          note: note.trim(),
          at: stamp,
          openReviews,
        };
        const dayCloses = existing
          ? state.dayCloses.map((item) => (item.id === existing.id ? row : item))
          : [row, ...state.dayCloses];
        set({ dayCloses });
        return {
          ok: true,
          id: row.id,
          warning: openReviews ? `已收工。仲有 ${openReviews} 張單等驗收，聽日第一時間收。` : undefined,
        };
      },
      addInstruction: (siteId, text) => {
        const state = get();
        const user = currentUser(state);
        if (!user) return fail("請先登入");
        const site = state.sites.find((s) => s.id === siteId);
        if (!site || !can(user, "instruct", site)) return fail("只有老闆同項目經理可以落指示");
        if (!text.trim()) return fail("寫低指示");
        const row: Instruction = {
          id: uid("ins"),
          companyId: site.companyId,
          siteId,
          byName: user.name,
          text: text.trim(),
          at: nowStamp(),
          ackByName: null,
          ackAt: null,
        };
        set({ instructions: [row, ...state.instructions] });
        return { ok: true, id: row.id };
      },
      ackInstruction: (id) => {
        const state = get();
        const user = currentUser(state);
        if (!user) return fail("請先登入");
        const item = state.instructions.find((row) => row.id === id);
        if (!item) return fail("搵唔到呢句指示");
        const site = state.sites.find((s) => s.id === item.siteId);
        if (!site || !can(user, "close_day", site)) return fail("指示由主管回覆");
        if (item.ackAt) return fail("已經有人回過。");
        const stamp = nowStamp();
        set({
          instructions: state.instructions.map((row) =>
            row.id === id ? { ...row, ackByName: user.name, ackAt: stamp } : row,
          ),
        });
        return { ok: true, id };
      },
      requestMaterial: (input) => {
        const state = get();
        const user = currentUser(state);
        if (!user) return fail("請先登入");
        const site = state.sites.find((s) => s.id === input.siteId);
        if (!site || !can(user, "request_material", site)) return fail("你冇權限喺呢個盤叫料");
        if (!input.name.trim()) return fail("寫低叫咩料");
        if (!input.qty.trim()) return fail("寫低數量");
        const item: MaterialItem = {
          id: uid("mat"),
          companyId: site.companyId,
          siteId: site.id,
          name: input.name.trim(),
          spec: "",
          qty: input.qty.trim(),
          supplier: "",
          status: "to_order",
          neededBy: todayISO(),
          note: `工人叫料：${user.name}${input.note.trim() ? ` · ${input.note.trim()}` : ""}`,
          updatedAt: nowStamp(),
        };
        set({ materials: [item, ...state.materials] });
        return { ok: true, id: item.id };
      },
      confirmMaterial: (id) => {
        const state = get();
        const user = currentUser(state);
        if (!user) return fail("請先登入");
        const item = state.materials.find((row) => row.id === id);
        if (!item) return fail("搵唔到呢張叫料");
        const site = state.sites.find((row) => row.id === item.siteId);
        if (!site || !canSeeSite(user, site)) return fail("你睇唔到呢張單");
        if (user.role !== "subcontractor") return fail("收貨由叫料嘅工人確認。公司改狀態就得。");
        if (!item.note.startsWith(`工人叫料：${user.name}`)) return fail("呢張唔係你叫嘅");
        if (item.status === "delivered") return fail("你已經確認收過");
        if (item.status !== "ordered") return fail("公司未落單。落咗單、貨到咗先確認。");
        const stamp = nowStamp();
        set({
          materials: state.materials.map((row) =>
            row.id === id ? { ...row, status: "delivered", note: `${row.note} · ${user.name}確認收到`, updatedAt: stamp } : row,
          ),
        });
        return { ok: true, id };
      },
      touchCompany: (companyId, note) => {
        const state = get();
        const user = currentUser(state);
        if (!user || !can(user, "manage_billing")) return fail("只有平台管理員可以記低跟進");
        if (!note.trim()) return fail("寫低你點樣跟進");
        const company = state.companies.find((item) => item.id === companyId);
        if (!company) return fail("搵唔到公司");
        const row: PlatformTouch = {
          id: uid("touch"),
          companyId,
          byName: user.name,
          note: note.trim(),
          at: nowStamp(),
        };
        const audit: Audit = {
          id: uid("audit"),
          at: row.at,
          companyId,
          byName: user.name,
          note: `跟進${company.shortName}：${note.trim()}`,
        };
        set({ touches: [row, ...state.touches], audits: [audit, ...state.audits] });
        return { ok: true, id: row.id };
      },
      extendTrial: (companyId) => {
        const state = get();
        const user = currentUser(state);
        if (!user || !can(user, "manage_billing")) return fail("試用日只可以由平台後端改");
        const company = state.companies.find((item) => item.id === companyId);
        if (!company) return fail("搵唔到公司");
        if (company.status !== "trial") return fail("呢間唔係試用。正式客戶請改套餐，唔好當試用加日。");
        const today = todayISO();
        const base = company.trialEnds && company.trialEnds > today ? company.trialEnds : today;
        const trialEnds = addDays(base, 7);
        const audit: Audit = {
          id: uid("audit"),
          at: nowStamp(),
          companyId,
          byName: user.name,
          note: `示範後端將${company.shortName}試用延長到${trialEnds}。資料冇鎖、冇刪。`,
        };
        set({
          companies: state.companies.map((item) => (item.id === companyId ? { ...item, trialEnds, status: "trial" } : item)),
          audits: [audit, ...state.audits],
        });
        return { ok: true };
      },
      addCatalogItem: (kind, label) => {
        const state = get();
        const user = currentUser(state);
        if (!user || !can(user, "view_admin")) return fail("常用選項只可以由平台管理員改");
        const name = label.trim();
        if (!name) return fail("寫低選項名");
        if (name.length > 16) return fail("選項最多十六個字");
        const base = state.catalog ?? { processes: [], trades: [] };
        const list = base[kind];
        if (list.includes(name)) return fail("呢項已經有");
        if (list.length >= 20) return fail("最多二十項，先刪走唔用嘅");
        set({ catalog: { ...base, [kind]: [...list, name] } });
        return { ok: true };
      },
      removeCatalogItem: (kind, label) => {
        const state = get();
        const user = currentUser(state);
        if (!user || !can(user, "view_admin")) return fail("常用選項只可以由平台管理員改");
        const base = state.catalog ?? { processes: [], trades: [] };
        const list = base[kind];
        if (!list.includes(label)) return fail("搵唔到呢項");
        set({ catalog: { ...base, [kind]: list.filter((item) => item !== label) } });
        return { ok: true };
      },
    }),
    {
      name: "deitong-demo-v1",
      skipHydration: true,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Store>;
        return {
          ...current,
          ...saved,
          checkins: saved.checkins ?? current.checkins,
          nudges: saved.nudges ?? current.nudges,
          dayCloses: saved.dayCloses ?? current.dayCloses,
          instructions: saved.instructions ?? current.instructions,
          touches: saved.touches ?? current.touches,
          catalog: saved.catalog && Array.isArray(saved.catalog.processes) && Array.isArray(saved.catalog.trades) ? saved.catalog : current.catalog,
        };
      },
      partialize: (state) => ({
        companies: state.companies,
        members: state.members,
        sites: state.sites,
        logs: state.logs,
        tasks: state.tasks,
        materials: state.materials,
        files: state.files,
        audits: state.audits,
        checkins: state.checkins,
        nudges: state.nudges,
        dayCloses: state.dayCloses,
        instructions: state.instructions,
        touches: state.touches,
        catalog: state.catalog,
        sessionUserId: state.sessionUserId,
      }),
    },
  ),
);

function submittedNudges(nudges: Nudge[], siteId: string, date: string, stamp: string, submit: boolean) {
  if (!submit) return nudges;
  return nudges.map((row) => (row.siteId === siteId && row.date === date && !row.resolvedAt ? { ...row, resolvedAt: stamp } : row));
}

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
  const checkinsAll = useAppStore((s) => s.checkins ?? []);
  const nudgesAll = useAppStore((s) => s.nudges ?? []);
  const dayClosesAll = useAppStore((s) => s.dayCloses ?? []);
  const instructionsAll = useAppStore((s) => s.instructions ?? []);
  const touchesAll = useAppStore((s) => s.touches ?? []);
  const sessionUserId = useAppStore((s) => s.sessionUserId);
  const hydrated = useAppStore((s) => s._hydrated);
  const user = members.find((m) => m.id === sessionUserId) ?? null;
  const company = companies.find((c) => c.id === user?.companyId) ?? null;
  const visibleSites = user ? sites.filter((s) => canSeeSite(user, s)) : [];
  const siteById = new Map(sites.map((s) => [s.id, s]));
  const visibleTasks = user ? tasks.filter((t) => canSeeTask(user, t, siteById.get(t.siteId))) : [];
  const siteIds = new Set(visibleSites.map((s) => s.id));
  const visibleLogs = logs
    .filter((l) => siteIds.has(l.siteId))
    .map((l) =>
      user?.role === "subcontractor"
        ? { ...l, work: "", deliveries: "", issues: "", headcount: [], photos: [], revisions: [] }
        : l,
    );
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
    checkins: checkinsAll.filter((row) => siteIds.has(row.siteId)),
    nudges: nudgesAll.filter((row) => siteIds.has(row.siteId)),
    dayCloses: dayClosesAll.filter((row) => siteIds.has(row.siteId)),
    instructions: instructionsAll.filter((row) => siteIds.has(row.siteId)),
    touches: user?.role === "platform_admin" ? touchesAll : touchesAll.filter((row) => row.companyId === user?.companyId),
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
