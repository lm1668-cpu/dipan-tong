import { useState } from "react";
import { toast } from "sonner";
import { Badge, Banner, Button, Card, Field, Select, TextArea, TextInput } from "@/components/site/ui";
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_LABELS,
  ROLE_LABEL,
  type FeatureFlags,
  type Role,
} from "@/lib/site/model";
import { useAppStore, useScope } from "@/lib/site/store";
import {
  formatEnvFile,
  getFirebaseConfig,
  isFirebaseConfigured,
  validateFirebaseConfig,
  type FirebaseWebConfig,
} from "@/lib/firebase/config";

const GH_TOKEN_KEY = "deitong-gh-pat-session";

export function SuperAdminPanels() {
  const [tab, setTab] = useState<"features" | "members" | "deploy" | "firebase">("features");
  const tabs: { id: typeof tab; label: string }[] = [
    { id: "features", label: "功能開關" },
    { id: "members", label: "全平台成員" },
    { id: "deploy", label: "一鍵部署 GitHub" },
    { id: "firebase", label: "Firebase 設定" },
  ];

  return (
    <section className="space-y-3" data-testid="super-admin-panel">
      <div>
        <h2 className="font-display text-2xl">超級管理員控制台</h2>
        <p className="text-sm text-muted">管理全站功能開關、跨公司成員角色、GitHub 一鍵發佈同 Firebase 接駁設定（仍保持工地日誌隔離）。</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`super-tab-${item.id}`}
            className={
              tab === item.id
                ? "min-h-11 rounded-full bg-navy px-4 text-sm font-bold text-paper"
                : "min-h-11 rounded-full border border-line bg-card px-4 text-sm font-medium"
            }
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "features" ? <FeatureFlagsPanel /> : null}
      {tab === "members" ? <MembersPanel /> : null}
      {tab === "deploy" ? <GitHubDeployPanel /> : null}
      {tab === "firebase" ? <FirebaseSetupPanel /> : null}
    </section>
  );
}

function FeatureFlagsPanel() {
  const flags = useAppStore((s) => s.featureFlags) ?? DEFAULT_FEATURE_FLAGS;
  const setFeatureFlag = useAppStore((s) => s.setFeatureFlag);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  return (
    <Card className="space-y-3" data-testid="feature-flags-panel">
      <div>
        <h3 className="font-display text-xl">網頁功能開關</h3>
        <p className="text-sm text-muted">即時開關各模組入口，方便逐個功能驗收或暫停未開放頁面。示範模式下只存於呢部瀏覽器。</p>
      </div>
      {feedback ? <Banner tone={feedback.tone}>{feedback.text}</Banner> : null}
      <div className="space-y-2">
        {(Object.keys(FEATURE_LABELS) as (keyof FeatureFlags)[]).map((key) => {
          const on = flags[key] ?? true;
          const meta = FEATURE_LABELS[key];
          return (
            <div key={key} className="flex items-center justify-between gap-3 rounded-2xl bg-paper-2 p-3">
              <div>
                <p className="font-medium">{meta.label}</p>
                <p className="text-xs text-muted">{meta.hint}</p>
              </div>
              <Button
                type="button"
                variant={on ? "primary" : "ghost"}
                data-testid={`flag-${key}`}
                onClick={() => {
                  const res = setFeatureFlag(key, !on);
                  if (!res.ok) setFeedback({ tone: "bad", text: res.error });
                  else {
                    setFeedback({ tone: "ok", text: `已${!on ? "開啟" : "關閉"}「${meta.label}」。` });
                    toast.success(`已${!on ? "開啟" : "關閉"}「${meta.label}」`);
                  }
                }}
              >
                {on ? "已開啟" : "已關閉"}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MembersPanel() {
  const { companies, members, user } = useScope();
  const adminAddMember = useAppStore((s) => s.adminAddMember);
  const adminUpdateMember = useAppStore((s) => s.adminUpdateMember);
  const [filterCompany, setFilterCompany] = useState("all");
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [role, setRole] = useState<Role>("site_supervisor");
  const [trade, setTrade] = useState("");
  const [phone, setPhone] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const visible = members.filter((m) => {
    if (filterCompany === "all") return true;
    if (filterCompany === "platform") return m.companyId === null;
    return m.companyId === filterCompany;
  });

  return (
    <div className="space-y-3" data-testid="super-members-panel">
      {feedback ? <Banner tone={feedback.tone}>{feedback.text}</Banner> : null}
      <Card className="space-y-3">
        <h3 className="font-display text-xl">新增成員</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <Field label="姓名">
            <TextInput value={name} data-testid="super-member-name" onChange={(e) => setName(e.target.value)} placeholder="例如林志明" />
          </Field>
          <Field label="所屬公司">
            <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">平台（無公司）</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.shortName} · {c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="角色">
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </Select>
          </Field>
          <Field label="工種（分判必填）">
            <TextInput value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="水電、木器、油漆" />
          </Field>
          <Field label="電話">
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="例如 9123 4567" />
          </Field>
        </div>
        <Button
          type="button"
          variant="gold"
          data-testid="super-member-add"
          onClick={() => {
            const res = adminAddMember({
              name,
              companyId: role === "platform_admin" ? null : companyId || null,
              role,
              trade,
              phone,
            });
            if (!res.ok) setFeedback({ tone: "bad", text: res.error });
            else {
              setFeedback({ tone: "ok", text: res.warning || `已加入新成員「${name.trim()}」。` });
              setName("");
              setTrade("");
              setPhone("");
            }
          }}
        >
          加入成員
        </Button>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-xl">全部成員（{visible.length}）</h3>
          <Select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} className="w-auto min-w-40">
            <option value="all">全部公司</option>
            <option value="platform">平台管理員</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.shortName}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          {visible.map((m) => {
            const comp = companies.find((c) => c.id === m.companyId);
            const isSelf = m.id === user?.id;
            return (
              <div key={m.id} className="space-y-2 rounded-2xl bg-paper-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {m.name} {m.disabled ? <Badge tone="clay">已停用</Badge> : null}
                    </p>
                    <p className="text-xs text-muted">
                      {comp?.shortName ?? "平台"} · {ROLE_LABEL[m.role]} · {m.phone}
                    </p>
                  </div>
                  {!isSelf ? (
                    <Button
                      type="button"
                      variant={m.disabled ? "gold" : "ghost"}
                      data-testid={`toggle-member-${m.id}`}
                      onClick={() => {
                        const res = adminUpdateMember(m.id, { disabled: !m.disabled });
                        if (!res.ok) setFeedback({ tone: "bad", text: res.error });
                        else setFeedback({ tone: "ok", text: `已${m.disabled ? "重新啟用" : "停用"}${m.name}（現有紀錄保留）。` });
                      }}
                    >
                      {m.disabled ? "啟用" : "停用"}
                    </Button>
                  ) : (
                    <Badge tone="navy">目前身份</Badge>
                  )}
                </div>
                {!isSelf && m.companyId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">更改角色：</span>
                    <Select
                      value={m.role}
                      aria-label={`${m.name}角色`}
                      className="w-auto"
                      onChange={(e) => {
                        const nextRole = e.target.value as Role;
                        const res = adminUpdateMember(m.id, { role: nextRole });
                        if (!res.ok) setFeedback({ tone: "bad", text: res.error });
                        else setFeedback({ tone: "ok", text: `已將${m.name}改做${ROLE_LABEL[nextRole]}。` });
                      }}
                    >
                      <option value="company_admin">公司管理員</option>
                      <option value="project_manager">項目經理</option>
                      <option value="site_supervisor">工地主管</option>
                      <option value="subcontractor">分判／工人</option>
                    </Select>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function GitHubDeployPanel() {
  const [owner, setOwner] = useState("lm1668-cpu");
  const [repo, setRepo] = useState("dipan-tong");
  const [branch, setBranch] = useState("main");
  const [workflow, setWorkflow] = useState("deploy-pages.yml");
  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem(GH_TOKEN_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [lastRun, setLastRun] = useState<{ status: string; conclusion: string | null; url: string; updatedAt: string } | null>(null);

  function saveToken(val: string) {
    setToken(val);
    try {
      if (val.trim()) sessionStorage.setItem(GH_TOKEN_KEY, val.trim());
      else sessionStorage.removeItem(GH_TOKEN_KEY);
    } catch {
      // ignore storage errors
    }
  }

  async function triggerDeploy() {
    if (!token.trim()) {
      setFeedback({ tone: "bad", text: "請先貼上 GitHub Personal Access Token（需 Actions: Read & Write 權限）。Token 只暫存於呢個分頁，唔會寫入程式碼。" });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/actions/workflows/${encodeURIComponent(workflow.trim())}/dispatches`,
        {
          method: "POST",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token.trim()}`,
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({ ref: branch.trim() || "main" }),
        },
      );
      if (res.status === 204) {
        setFeedback({ tone: "ok", text: "已觸發 GitHub Actions 重新打包並部署！等大概 1 分鐘可撳「查最新部署狀態」。" });
        toast.success("已發送一鍵部署指令到 GitHub");
      } else {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setFeedback({ tone: "bad", text: `GitHub 回覆失敗（${res.status}）：${body.message ?? "請確認 Token 權限及倉庫名稱"}` });
      }
    } catch (err) {
      setFeedback({ tone: "bad", text: err instanceof Error ? err.message : "連線 GitHub 失敗" });
    } finally {
      setBusy(false);
    }
  }

  async function checkStatus() {
    setBusy(true);
    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };
      if (token.trim()) headers.Authorization = `Bearer ${token.trim()}`;
      const res = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/actions/workflows/${encodeURIComponent(workflow.trim())}/runs?per_page=1`,
        { headers },
      );
      if (!res.ok) {
        setFeedback({ tone: "bad", text: `查唔到狀態（HTTP ${res.status}）。` });
        return;
      }
      const data = (await res.json()) as {
        workflow_runs?: { status: string; conclusion: string | null; html_url: string; updated_at: string }[];
      };
      const run = data.workflow_runs?.[0];
      if (!run) {
        setFeedback({ tone: "bad", text: "暫時未有部署紀錄。" });
        return;
      }
      setLastRun({ status: run.status, conclusion: run.conclusion, url: run.html_url, updatedAt: run.updated_at });
      setFeedback({ tone: "ok", text: `最新狀態：${run.status}${run.conclusion ? `（${run.conclusion}）` : ""}` });
    } catch (err) {
      setFeedback({ tone: "bad", text: err instanceof Error ? err.message : "查詢失敗" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3" data-testid="github-deploy-panel">
      <div>
        <h3 className="font-display text-xl">一鍵部署到 GitHub Pages</h3>
        <p className="text-sm text-muted">直接觸發你倉庫嘅 GitHub Actions（`deploy-pages.yml`）重新建置同上線。Token 只暫存喺呢個瀏覽器分頁，關閉即清。</p>
      </div>
      {feedback ? <Banner tone={feedback.tone}>{feedback.text}</Banner> : null}
      <div className="grid gap-2 md:grid-cols-2">
        <Field label="GitHub 帳號">
          <TextInput value={owner} onChange={(e) => setOwner(e.target.value)} />
        </Field>
        <Field label="倉庫名稱">
          <TextInput value={repo} onChange={(e) => setRepo(e.target.value)} />
        </Field>
        <Field label="分支">
          <TextInput value={branch} onChange={(e) => setBranch(e.target.value)} />
        </Field>
        <Field label="Workflow 檔名">
          <TextInput value={workflow} onChange={(e) => setWorkflow(e.target.value)} />
        </Field>
      </div>
      <Field label="GitHub Personal Access Token（需 Actions: Write 權限）">
        <TextInput
          type="password"
          value={token}
          data-testid="gh-token-input"
          placeholder="github_pat_..."
          onChange={(e) => saveToken(e.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="gold" disabled={busy} data-testid="gh-deploy-btn" onClick={() => void triggerDeploy()}>
          {busy ? "發送緊…" : "一鍵部署到 GitHub"}
        </Button>
        <Button type="button" variant="soft" disabled={busy} data-testid="gh-status-btn" onClick={() => void checkStatus()}>
          查最新部署狀態
        </Button>
        {token ? (
          <Button type="button" variant="ghost" onClick={() => { saveToken(""); setFeedback({ tone: "ok", text: "已清除暫存 Token。" }); }}>
            清除 Token
          </Button>
        ) : null}
        <a
          href={`https://github.com/${owner}/${repo}/actions`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm font-medium"
        >
          開 GitHub Actions 頁面
        </a>
      </div>
      {lastRun ? (
        <div className="rounded-2xl bg-paper-2 p-3 text-xs text-muted">
          <p>狀態：{lastRun.status} · 結果：{lastRun.conclusion ?? "執行中"} · 更新：{lastRun.updatedAt}</p>
          <a href={lastRun.url} target="_blank" rel="noreferrer" className="mt-1 inline-block font-bold text-navy underline">
            查看今次建置紀錄
          </a>
        </div>
      ) : null}
    </Card>
  );
}

function FirebaseSetupPanel() {
  const envConfig = getFirebaseConfig();
  const connected = isFirebaseConfigured(envConfig);
  const [cfg, setCfg] = useState<FirebaseWebConfig>(envConfig);
  const [rawJson, setRawJson] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  function parseSnippet() {
    const pick = (key: keyof FirebaseWebConfig) => {
      const m = rawJson.match(new RegExp(`${key}\\s*[:=]\\s*["']([^"']+)["']`));
      return m?.[1] ?? "";
    };
    const next: FirebaseWebConfig = {
      apiKey: pick("apiKey") || cfg.apiKey,
      authDomain: pick("authDomain") || cfg.authDomain,
      projectId: pick("projectId") || cfg.projectId,
      storageBucket: pick("storageBucket") || cfg.storageBucket,
      messagingSenderId: pick("messagingSenderId") || cfg.messagingSenderId,
      appId: pick("appId") || cfg.appId,
    };
    setCfg(next);
    const missing = validateFirebaseConfig(next);
    if (missing.length > 0) setFeedback({ tone: "bad", text: `已解析部分欄位，仲欠：${missing.join("、")}` });
    else setFeedback({ tone: "ok", text: "已成功解析全部 6 個 Firebase 設定欄位！下面可以一鍵複製 .env 設定。" });
  }

  const envPreview = formatEnvFile(cfg);

  return (
    <Card className="space-y-3" data-testid="firebase-setup-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-xl">Firebase 雲端接駁設定</h3>
          <p className="text-sm text-muted">
            {connected
              ? "已偵測到環境變數設定，可按遷移藍圖切換正式 Firebase Auth / Firestore。"
              : "目前尚未連接 Firebase（示範模式，資料只存於呢部瀏覽器）。填好 Firebase Console 設定即可生成環境檔並部署安全規則。"}
          </p>
        </div>
        <Badge tone={connected ? "navy" : "gold"}>{connected ? "已配置環境變數" : "未連接（示範）"}</Badge>
      </div>
      {feedback ? <Banner tone={feedback.tone}>{feedback.text}</Banner> : null}
      <Field label="貼上 Firebase Console 嘅 firebaseConfig 程式碼（自動解析）">
        <TextArea
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
          placeholder='例如 const firebaseConfig = { apiKey: "...", projectId: "...", ... };'
        />
      </Field>
      <Button type="button" variant="soft" data-testid="firebase-parse-btn" onClick={parseSnippet}>
        自動解析設定
      </Button>
      <div className="grid gap-2 md:grid-cols-2">
        {(["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"] as (keyof FirebaseWebConfig)[]).map((k) => (
          <Field key={k} label={k}>
            <TextInput value={cfg[k]} onChange={(e) => setCfg((all) => ({ ...all, [k]: e.target.value }))} />
          </Field>
        ))}
      </div>
      <div className="rounded-2xl bg-paper-2 p-3 text-xs">
        <p className="font-bold text-navy">已預備好嘅 Firebase 規則檔（跟專案一齊放上倉庫）</p>
        <p className="mt-1 text-muted">• `firestore.rules`（`companyId` 租戶隔離、平台禁入工地、客戶端禁改套餐/用量）</p>
        <p className="text-muted">• `storage.rules`（路徑隔離、分判禁列全公司檔）</p>
        <p className="text-muted">• `firebase.json` 及 `firestore.indexes.json`</p>
        <p className="mt-2 font-mono text-ink">firebase deploy --only firestore:rules,firestore:indexes,storage</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="gold"
          data-testid="firebase-copy-env"
          onClick={() => {
            const missing = validateFirebaseConfig(cfg);
            if (missing.length > 0) {
              setFeedback({ tone: "bad", text: `仲有未填欄位：${missing.join("、")}` });
              return;
            }
            void navigator.clipboard?.writeText(envPreview);
            setFeedback({ tone: "ok", text: "已複製 .env 設定！放落本機 .env.local 或 GitHub Repository Secrets 即可。" });
            toast.success("已複製 Firebase .env 設定");
          }}
        >
          複製 .env 設定
        </Button>
      </div>
    </Card>
  );
}
