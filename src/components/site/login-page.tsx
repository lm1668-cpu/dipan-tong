import { Link, useNavigate } from "@tanstack/react-router";
import { DemoBanner, BrandMark, Mark } from "@/components/site/ui";
import { ROLE_LABEL, assetUrl } from "@/lib/site/model";
import { useAppStore } from "@/lib/site/store";

export function LoginPage() {
  const hydrated = useAppStore((s) => s._hydrated);
  const members = useAppStore((s) => s.members);
  const companies = useAppStore((s) => s.companies);
  const signIn = useAppStore((s) => s.signIn);
  const navigate = useNavigate();

  function enter(id: string, role: string) {
    signIn(id);
    void navigate({ to: role === "platform_admin" ? "/app/admin" : "/app" });
  }

  const groups = [
    { title: "平台", ids: ["u-ops"] },
    { title: "裕安室內工程", ids: ["u-y-admin", "u-y-pm", "u-y-sup", "u-y-sup2", "u-y-elec", "u-y-wood"] },
    { title: "澄木設計工程", ids: ["u-c-admin"] },
  ];

  return (
    <div className="min-h-dvh bg-paper">
      <DemoBanner />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2">
          <BrandMark size="sm" />
          <span className="text-lg font-black">地盤通</span>
        </Link>
        <figure className="mt-5 overflow-hidden rounded-3xl shadow-card">
          <img
            src={assetUrl("/photos/crew-depart.jpg")}
            alt="一班裝修師傅由站口一齊行去屋苑開工"
            className="h-44 w-full object-cover object-[center_40%]"
          />
          <figcaption className="bg-navy px-4 py-2.5 text-sm font-bold text-card">一齊出發去裝修 · 由站口行去屋苑</figcaption>
        </figure>
        <h1 className="mt-6 font-display text-4xl">揀個身份入去。</h1>
        <p className="mt-2 text-sm text-muted">
          未有 Firebase 專案，所以呢度唔係真正登入。揀完之後，資料只留喺呢部瀏覽器。換公司就會睇到隔離：裕安睇唔到澄木。
        </p>
        {!hydrated ? <p className="mt-6 text-sm text-muted">身份準備緊…</p> : null}
        {hydrated ? (
        <div className="mt-6 space-y-6">
          {groups.map((group) => (
            <section key={group.title}>
              <h2 className="font-display text-xl">{group.title}</h2>
              <div className="mt-3 grid gap-3">
                {group.ids.map((id) => {
                  const member = members.find((m) => m.id === id);
                  if (!member) return null;
                  const company = companies.find((c) => c.id === member.companyId);
                  return (
                    <button
                      key={id}
                      type="button"
                      data-testid={`login-${id}`}
                      disabled={Boolean(member.disabled)}
                      className="flex min-h-16 items-center gap-3 rounded-3xl border border-line bg-card p-4 text-left shadow-card disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => { if (!member.disabled) enter(member.id, member.role); }}
                    >
                      <Mark text={company?.mark ?? "台"} size="sm" />
                      <span>
                        <span className="block font-medium">{member.name}{member.disabled ? "（已停用）" : ""}</span>
                        <span className="block text-sm text-muted">{ROLE_LABEL[member.role]} · {member.blurb}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        ) : null}
      </main>
    </div>
  );
}
