export type Role =
  | "platform_admin"
  | "company_admin"
  | "project_manager"
  | "site_supervisor"
  | "subcontractor";

export type PlanId = "trial" | "starter" | "team" | "company";
export type TaskStatus = "unassigned" | "pending" | "in_progress" | "review" | "done";
export type TaskKind = "task" | "snag";
export type Priority = "low" | "normal" | "high" | "urgent";
export type LogStatus = "draft" | "submitted";
export type MaterialStatus = "to_order" | "ordered" | "delivered" | "issue";
export type FileKind = "drawing" | "photo" | "doc";
export type CompanyStatus = "trial" | "active" | "past_due";
export type SiteStatus = "active" | "handover" | "paused";

export interface Company {
  id: string;
  name: string;
  shortName: string;
  mark: string;
  trade: string;
  plan: PlanId;
  status: CompanyStatus;
  trialEnds: string | null;
  storageUsedGb: number;
}

export interface Member {
  id: string;
  companyId: string | null;
  name: string;
  role: Role;
  title: string;
  phone: string;
  trade: string | null;
  blurb: string;
  disabled?: boolean;
}

export interface TradeProgress {
  name: string;
  progress: number;
}

export interface Site {
  id: string;
  companyId: string;
  name: string;
  district: string;
  address: string;
  client: string;
  managerId: string;
  supervisorId: string;
  targetDate: string;
  stage: string;
  cover: string;
  trades: TradeProgress[];
  assignedSubIds: string[];
  status: SiteStatus;
}

export interface Photo {
  id: string;
  src: string;
  caption: string;
}

export interface Headcount {
  trade: string;
  count: number;
}

export interface Revision {
  at: string;
  byName: string;
  note: string;
}

export interface DailyLog {
  id: string;
  companyId: string;
  siteId: string;
  date: string;
  weather: string;
  authorName: string;
  authorId: string;
  headcount: Headcount[];
  noWork: boolean;
  work: string;
  deliveries: string;
  issues: string;
  photos: Photo[];
  status: LogStatus;
  revisions: Revision[];
  updatedAt: string;
}

export interface Activity {
  at: string;
  byName: string;
  action: string;
}

export interface Task {
  id: string;
  companyId: string;
  siteId: string;
  kind: TaskKind;
  title: string;
  location: string;
  description: string;
  photos: Photo[];
  donePhotos: Photo[];
  assigneeId: string | null;
  subId: string | null;
  priority: Priority;
  due: string;
  status: TaskStatus;
  blocked: boolean;
  blockReason: string;
  needsRework?: boolean;
  activity: Activity[];
  updatedAt: string;
}

export interface MaterialItem {
  id: string;
  companyId: string;
  siteId: string;
  name: string;
  spec: string;
  qty: string;
  supplier: string;
  status: MaterialStatus;
  neededBy: string;
  note: string;
  updatedAt: string;
}

export interface DocFile {
  id: string;
  companyId: string;
  siteId: string;
  name: string;
  kind: FileKind;
  note: string;
  src: string | null;
  updatedAt: string;
}

export interface PlatformTouch {
  id: string;
  companyId: string;
  byName: string;
  note: string;
  at: string;
}

export interface CheckIn {
  id: string;
  companyId: string;
  siteId: string;
  memberId: string;
  memberName: string;
  trade: string;
  date: string;
  arrivedAt: string;
  leftAt: string | null;
  note: string;
  absent?: boolean;
}

export interface Nudge {
  id: string;
  companyId: string;
  siteId: string;
  date: string;
  byName: string;
  note: string;
  at: string;
  resolvedAt: string | null;
}

export interface DayClose {
  id: string;
  companyId: string;
  siteId: string;
  date: string;
  byName: string;
  note: string;
  at: string;
  openReviews: number;
}

export interface Instruction {
  id: string;
  companyId: string;
  siteId: string;
  byName: string;
  text: string;
  at: string;
  ackByName: string | null;
  ackAt: string | null;
}

export interface Audit {
  id: string;
  at: string;
  companyId: string;
  byName: string;
  note: string;
}

export interface OptionCatalog {
  processes: string[];
  trades: string[];
}

export const DEFAULT_CATALOG: OptionCatalog = {
  processes: ["泥水批盪", "水電拉線", "木器安裝", "鋪磚", "油漆"],
  trades: ["泥水", "水電", "木器", "油漆", "雜工"],
};

export interface FeatureFlags {
  logs: boolean;
  tasks: boolean;
  materials: boolean;
  files: boolean;
  reports: boolean;
  billing: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  logs: true,
  tasks: true,
  materials: true,
  files: true,
  reports: true,
  billing: true,
};

export const FEATURE_LABELS: Record<keyof FeatureFlags, { label: string; hint: string }> = {
  logs: { label: "每日紀錄／日誌", hint: "開關公司日誌與工人今日開工狀態入口" },
  tasks: { label: "任務／執漏", hint: "開關任務分派、完工相與退回驗收模組" },
  materials: { label: "材料跟進", hint: "開關工人叫料、落單與確認收貨流程" },
  files: { label: "文件／相片", hint: "開關圖則同現場相片紀錄入口" },
  reports: { label: "報表", hint: "開關今日未埋口同工地進度圖表" },
  billing: { label: "套餐展示頁", hint: "開關公司端睇套餐與用量提示入口" },
};

export interface DemoData {
  companies: Company[];
  members: Member[];
  sites: Site[];
  logs: DailyLog[];
  tasks: Task[];
  materials: MaterialItem[];
  files: DocFile[];
  audits: Audit[];
  checkins: CheckIn[];
  nudges: Nudge[];
  dayCloses: DayClose[];
  instructions: Instruction[];
  touches: PlatformTouch[];
  catalog: OptionCatalog;
  featureFlags: FeatureFlags;
}

export const DEMO_NOTE =
  "示範模式：未連接 Firebase。資料只存在呢部瀏覽器，冇雲端，亦未做真正公司隔離。";

export const PRICE_NOTE =
  "以上價錢只供展示同討論，未批准作正式定價，未接通真正付款。";

export const SECURITY_NOTE =
  "而家嘅身份同權限只喺呢部瀏覽器示範。正式環境要由後端強制執行：前端藏起個掣，唔等於安全。付款狀態、套餐同用量只可以由後端改。";

export const PLANS: Record<
  PlanId,
  { name: string; price: number; sites: number; seats: number; gb: number; blurb: string }
> = {
  trial: {
    name: "十四日試用",
    price: 0,
    sites: 3,
    seats: 5,
    gb: 20,
    blurb: "試用跟入門一樣上限，試完先決定開唔開。",
  },
  starter: {
    name: "入門",
    price: 498,
    sites: 3,
    seats: 5,
    gb: 20,
    blurb: "細公司、兩三個盤同時開。",
  },
  team: {
    name: "團隊",
    price: 1280,
    sites: 10,
    seats: 20,
    gb: 100,
    blurb: "幾個盤一起走，主管同分判都入嚟。",
  },
  company: {
    name: "公司",
    price: 2680,
    sites: 30,
    seats: 50,
    gb: 300,
    blurb: "盤多、人多，報表要一次過睇晒。",
  },
};

export const ROLE_LABEL: Record<Role, string> = {
  platform_admin: "平台管理員",
  company_admin: "公司管理員",
  project_manager: "項目經理",
  site_supervisor: "工地主管",
  subcontractor: "分判／工人",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  unassigned: "待分派",
  pending: "待處理",
  in_progress: "處理中",
  review: "待驗收",
  done: "已完成",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "低",
  normal: "一般",
  high: "急",
  urgent: "即刻",
};

export const MATERIAL_LABEL: Record<MaterialStatus, string> = {
  to_order: "未落單",
  ordered: "已落單",
  delivered: "已到場",
  issue: "有問題",
};

export const WEATHERS = ["天晴", "陰天", "落雨", "驟雨", "酷熱"] as const;

export const PLAN_ORDER: PlanId[] = ["starter", "team", "company"];

export function addDays(iso: string, days: number) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(y || 2000, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function logState(logs: DailyLog[], siteId: string, date: string): "none" | "draft" | "submitted" {
  const rows = logs.filter((log) => log.siteId === siteId && log.date === date);
  if (rows.some((log) => log.status === "submitted")) return "submitted";
  if (rows.some((log) => log.status === "draft")) return "draft";
  return "none";
}

export const LOG_STATE_LABEL = {
  none: "未寫",
  draft: "草稿未交",
  submitted: "已交",
} as const;

export function platformAlerts(
  company: Company,
  counts: { sites: number; seats: number },
  today = todayISO(),
) {
  const plan = PLANS[company.plan];
  const alerts: string[] = [];
  if (company.status === "past_due") alerts.push("付款逾期。先聯絡，唔好鎖走佢哋嘅資料。");
  if (company.status === "trial") {
    if (!company.trialEnds) alerts.push("試用未寫完結日。");
    else if (company.trialEnds < today) alerts.push("試用已過。問佢開唔開正式，而家嘅資料保留。");
    else if (company.trialEnds <= addDays(today, 14)) alerts.push(`試用到 ${formatDate(company.trialEnds)}。`);
  }
  if (counts.sites >= plan.sites) alerts.push("工地去到建議上限。");
  if (counts.seats >= plan.seats) alerts.push("帳戶去到建議上限。");
  if (company.storageUsedGb >= plan.gb * 0.8) alerts.push(`儲存約 ${company.storageUsedGb}/${plan.gb} GB，去到八成。提醒就得，唔好刪相。`);
  return alerts;
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isoOffset(days: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function atOffset(days: number, hm = "09:30") {
  return `${isoOffset(days)}T${hm}:00`;
}

export function nowStamp() {
  const d = new Date();
  const date = todayISO();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${date}T${hm}:00`;
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${y}年${m}月${d}日`;
}

export function weekday(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return "日一二三四五六"[dt.getDay()] ?? "";
}

export function formatWhen(iso: string) {
  return `${formatDate(iso)} ${iso.slice(11, 16)}`.trim();
}

export function uid(prefix: string) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function siteProgress(site: Site) {
  if (site.trades.length === 0) return 0;
  const sum = site.trades.reduce((n, t) => n + t.progress, 0);
  return Math.round(sum / site.trades.length);
}

export function memberName(members: Member[], id: string | null) {
  if (!id) return "未指定";
  return members.find((m) => m.id === id)?.name ?? "已離場";
}

export function isOverdue(task: Task, today = todayISO()) {
  return task.status !== "done" && task.due < today;
}

export type Action =
  | "create_site"
  | "edit_site"
  | "create_log"
  | "edit_log"
  | "create_task"
  | "update_task"
  | "approve_task"
  | "create_material"
  | "edit_material"
  | "upload_file"
  | "manage_people"
  | "assign_sub"
  | "view_reports"
  | "view_billing"
  | "manage_billing"
  | "view_admin"
  | "view_people"
  | "request_material"
  | "check_in"
  | "nudge_log"
  | "instruct"
  | "close_day";

/**
 * 示範模式嘅權限表。正式環境必須由後端再做一次，
 * 唔可以信前端傳來嘅角色。
 */
export function can(user: Member, action: Action, site?: Site): boolean {
  if (user.role === "platform_admin") return action === "manage_billing" || action === "view_admin" || action === "view_billing";
  if (site && user.companyId !== site.companyId) return false;
  const role = user.role;
  const onSite = !site || canSeeSite(user, site);
  if (!onSite) return false;
  switch (action) {
    case "view_admin":
    case "manage_billing":
      return false;
    case "view_billing":
      return role === "company_admin" || role === "project_manager" || role === "site_supervisor";
    case "view_reports":
      return role === "company_admin" || role === "project_manager" || role === "site_supervisor";
    case "view_people":
      return role !== "subcontractor";
    case "manage_people":
      return role === "company_admin";
    case "assign_sub":
    case "create_site":
      return role === "company_admin" || role === "project_manager";
    case "edit_site":
    case "create_log":
    case "edit_log":
    case "approve_task":
    case "create_material":
    case "edit_material":
    case "upload_file":
      return role === "company_admin" || role === "project_manager" || role === "site_supervisor";
    case "create_task":
    case "update_task":
    case "request_material":
    case "check_in":
      return true;
    case "nudge_log":
    case "instruct":
      return role === "company_admin" || role === "project_manager";
    case "close_day":
      return role === "company_admin" || role === "project_manager" || role === "site_supervisor";
    default:
      return false;
  }
}

export function canSeeSite(user: Member, site: Site) {
  if (user.role === "platform_admin") return false;
  if (user.companyId !== site.companyId) return false;
  if (user.role === "company_admin" || user.role === "project_manager") return true;
  if (user.role === "site_supervisor") return site.supervisorId === user.id;
  return site.assignedSubIds.includes(user.id);
}

export function canSeeTask(user: Member, task: Task, site: Site | undefined) {
  if (!site || !canSeeSite(user, site)) return false;
  if (user.role === "subcontractor") return task.assigneeId === user.id || task.subId === user.id;
  return true;
}

export interface LogInput {
  id?: string;
  siteId: string;
  date: string;
  weather: string;
  authorName: string;
  headcount: Headcount[];
  noWork: boolean;
  work: string;
  deliveries: string;
  issues: string;
  photos: Photo[];
  submit: boolean;
}

export interface TaskInput {
  kind: TaskKind;
  title: string;
  siteId: string;
  location: string;
  description: string;
  photos: Photo[];
  assigneeId: string | null;
  subId: string | null;
  priority: Priority;
  due: string;
}

export interface MaterialInput {
  siteId: string;
  name: string;
  spec: string;
  qty: string;
  supplier: string;
  status: MaterialStatus;
  neededBy: string;
  note: string;
}

export function validateLog(input: LogInput) {
  const errors: Record<string, string> = {};
  if (!input.siteId) errors.siteId = "請揀工地";
  if (!input.date) errors.date = "請填日期";
  if (!input.authorName.trim()) errors.authorName = "請填填寫人";
  if (!input.noWork && !input.work.trim()) errors.work = "請寫今日做咗咩，或者剔「今日無施工」";
  return errors;
}

export function validateTask(input: TaskInput) {
  const errors: Record<string, string> = {};
  if (!input.title.trim()) errors.title = "請寫標題";
  if (!input.siteId) errors.siteId = "請揀工地";
  if (!input.due) errors.due = "請填期限";
  return errors;
}

export function validateMaterial(input: MaterialInput) {
  const errors: Record<string, string> = {};
  if (!input.siteId) errors.siteId = "請揀工地";
  if (!input.name.trim()) errors.name = "請寫材料名";
  if (!input.qty.trim()) errors.qty = "請寫數量";
  if (!input.neededBy) errors.neededBy = "請填要用到嘅日子";
  return errors;
}

export function firstError(errors: Record<string, string>) {
  return Object.values(errors)[0] ?? "";
}

export function usageNotices(company: Company, counts: { sites: number; seats: number }) {
  const plan = PLANS[company.plan];
  const notes: string[] = [];
  if (counts.sites >= plan.sites) {
    notes.push(`工地 ${counts.sites}/${plan.sites}，已到套餐建議上限。現有工地同紀錄會保留，唔會鎖、唔會刪。`);
  }
  if (counts.seats >= plan.seats) {
    notes.push(`正式帳戶 ${counts.seats}/${plan.seats}，已到建議上限。現有帳戶唔會停用。`);
  }
  if (company.storageUsedGb >= plan.gb * 0.8) {
    notes.push(`儲存約 ${company.storageUsedGb}/${plan.gb} GB。快滿都會先提醒，唔會突然刪相。`);
  }
  if (company.status === "past_due") notes.push("訂閱顯示逾期。示範模式唔會鎖現有資料。");
  if (company.status === "trial" && company.trialEnds) {
    notes.push(`試用到 ${formatDate(company.trialEnds)}。試用完，而家嘅資料都仲喺度。`);
  }
  return notes;
}

export type TaskCommand =
  | { type: "assign"; assigneeId: string; subId: string | null }
  | { type: "start" }
  | { type: "review"; donePhotos: Photo[] }
  | { type: "approve" }
  | { type: "return"; note: string }
  | { type: "block"; reason: string }
  | { type: "unblock" };

export type MutResult = { ok: true; id?: string; warning?: string } | { ok: false; error: string };

export function assetUrl(path: string) {
  if (!path.startsWith("/")) return path;
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL || "/";
  return base === "/" ? path : `${base.replace(/\/$/, "")}${path}`;
}
