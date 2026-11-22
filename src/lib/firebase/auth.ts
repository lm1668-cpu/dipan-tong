import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import type { Member, Role } from "@/lib/site/model";

export interface CloudProfile {
  uid: string;
  email: string;
  name: string;
  role: Role;
  companyId: string | null;
  title: string;
  phone: string;
  trade: string | null;
}

const VALID_ROLES: Role[] = [
  "platform_admin",
  "company_admin",
  "project_manager",
  "site_supervisor",
  "subcontractor",
];

function asRole(v: unknown): Role | null {
  return typeof v === "string" && VALID_ROLES.includes(v as Role) ? (v as Role) : null;
}

export async function resolveCloudProfile(fbUser: User): Promise<CloudProfile | null> {
  const token = await fbUser.getIdTokenResult();
  let role = asRole(token.claims.role);
  let companyId = typeof token.claims.companyId === "string" ? token.claims.companyId : null;
  let name = fbUser.displayName || fbUser.email?.split("@")[0] || "用戶";
  let title = "成員";
  let phone = "未填";
  let trade: string | null = null;

  const db = getFirebaseDb();
  if (db) {
    try {
      const snap = await getDoc(doc(db, "users", fbUser.uid));
      if (snap.exists()) {
        const d = snap.data() as Record<string, unknown>;
        if (!role) role = asRole(d.role);
        if (!companyId && typeof d.companyId === "string") companyId = d.companyId;
        if (typeof d.name === "string" && d.name.trim()) name = d.name.trim();
        if (typeof d.title === "string" && d.title.trim()) title = d.title.trim();
        if (typeof d.phone === "string" && d.phone.trim()) phone = d.phone.trim();
        if (typeof d.trade === "string" && d.trade.trim()) trade = d.trade.trim();
      }
    } catch {
      // If rules deny or doc missing, rely on custom claims
    }
  }

  if (!role) return null;
  return {
    uid: fbUser.uid,
    email: fbUser.email ?? "",
    name,
    role,
    companyId: role === "platform_admin" ? null : companyId,
    title,
    phone,
    trade,
  };
}

export function cloudProfileToMember(profile: CloudProfile): Member {
  return {
    id: profile.uid,
    companyId: profile.companyId,
    name: profile.name,
    role: profile.role,
    title: profile.title,
    phone: profile.phone,
    trade: profile.trade,
    blurb: `Firebase 雲端帳戶（${profile.email}）`,
  };
}

export async function cloudSignIn(
  email: string,
  password: string,
): Promise<{ ok: true; profile: CloudProfile } | { ok: false; error: string }> {
  const auth = getFirebaseAuth();
  if (!auth) return { ok: false, error: "未設定 Firebase 環境變數。" };
  if (!email.trim() || !password) return { ok: false, error: "請輸入電郵同密碼。" };
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const profile = await resolveCloudProfile(cred.user);
    if (!profile) {
      await firebaseSignOut(auth);
      return {
        ok: false,
        error: "此帳戶尚未設定角色（Custom Claims 或 Firestore /users/{uid}）。請聯絡平台管理員設定 role 同 companyId。",
      };
    }
    return { ok: true, profile };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "登入失敗";
    if (msg.includes("invalid-credential") || msg.includes("wrong-password") || msg.includes("user-not-found")) {
      return { ok: false, error: "電郵或密碼唔啱，請再試。" };
    }
    if (msg.includes("too-many-requests")) {
      return { ok: false, error: "嘗試太多次，請稍等一陣再試。" };
    }
    return { ok: false, error: `Firebase 登入失敗：${msg}` };
  }
}

export async function cloudSignOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) await firebaseSignOut(auth);
}

export function subscribeFirebaseAuth(cb: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) return () => {};
  return onAuthStateChanged(auth, cb);
}
