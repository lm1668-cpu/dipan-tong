import { Link } from "@tanstack/react-router";
import {
  Building2,
  HardHat,
  KeyRound,
  NotebookPen,
  Package,
  Users,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { DemoBanner, BrandMark, buttonClass } from "@/components/site/ui";
import { PLANS, PLAN_ORDER, PRICE_NOTE, assetUrl } from "@/lib/site/model";
import { useAppStore } from "@/lib/site/store";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: NotebookPen, title: "每日地盤日誌", body: "天氣、人數、做咗咩、送貨、問題、相片。草稿可以改，提交之後留痕。" },
  { icon: HardHat, title: "多個工地", body: "地址、客戶、負責人、目標完工日、工序進度，一張卡睇晒。" },
  { icon: Package, title: "材料跟進", body: "未落單、已落單、已到場、有問題。快要用先提醒，唔好等現場先發現。" },
];

function MonthBar() {
  const [day, setDay] = useState("—");
  const [label, setLabel] = useState("本月實時");
  useEffect(() => {
    const now = new Date();
    setDay(String(now.getDate()));
    setLabel(`${now.getFullYear()}年${now.getMonth() + 1}月（本月實時）`);
  }, []);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-gold px-3 py-2 text-ink">
      <span className="grid size-10 place-items-center rounded-xl bg-card text-sm font-black text-navy">{day}</span>
      <span className="text-lg font-black">{label}</span>
    </div>
  );
}

function Pill({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", className)}>
      {children}
    </span>
  );
}

export function MarketingPage() {
  const hydrated = useAppStore((s) => s._hydrated);
  const session = useAppStore((s) => s.sessionUserId);
  const sites = useAppStore((s) => s.sites);
  const tasks = useAppStore((s) => s.tasks);
  const logs = useAppStore((s) => s.logs);
  const members = useAppStore((s) => s.members);
  const enter = hydrated && session ? "/app" : "/login";
  const enterLabel = hydrated && session ? "返去今日工作" : "入去試用";
  const openTasks = tasks.filter((task) => task.status !== "done").length;
  const submitted = logs.filter((log) => log.status === "submitted").length;
  const crew = members.filter((member) => member.companyId).length;

  const actions = [
    { label: enterLabel, icon: HardHat, className: "bg-gold text-ink", href: enter, kind: "route" as const },
    { label: "睇月費", icon: Building2, className: "border border-line bg-card text-ink", href: "#pricing", kind: "anchor" as const },
    { label: "點樣跟一個盤", icon: NotebookPen, className: "bg-leaf text-card", href: "#how", kind: "anchor" as const },
    { label: "材料同執漏", icon: Package, className: "bg-mint text-navy", href: "#how", kind: "anchor" as const },
    { label: "登入示範", icon: KeyRound, className: "bg-azure text-card", href: "/login", kind: "route" as const },
    { label: "邊個睇到咩", icon: Users, className: "bg-clay text-card", href: "#access", kind: "anchor" as const },
  ];

  const tiles = [
    {
      label: "示範工地",
      value: String(sites.length),
      unit: "個盤",
      note: "裕安同澄木各睇各",
      box: "border-line bg-card",
      num: "text-leaf",
    },
    {
      label: "未完成任務",
      value: String(openTasks),
      unit: "項待跟",
      note: "逾期同今日都會標出",
      box: "border-clay/50 bg-blush",
      num: "text-clay",
    },
    {
      label: "已提交日誌",
      value: String(submitted),
      unit: "份留痕",
      note: "提交之後唔當草稿",
      box: "border-leaf/40 bg-leaf-soft",
      num: "text-leaf",
    },
    {
      label: "登記人手",
      value: String(crew),
      unit: "位",
      note: "分判只睇獲分派工地",
      box: "border-navy/10 bg-ice",
      num: "text-gold-2",
    },
  ];

  return (
    <div className="min-h-dvh bg-paper pb-10">
      <DemoBanner />
      <header className="sticky top-0 z-20 border-b border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <a href="#top" className="flex items-center gap-2">
            <BrandMark size="md" />
            <span className="text-lg font-black">地盤通</span>
          </a>
          <Link to="/login" className={buttonClass("gold")}>登入示範</Link>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-5xl space-y-4 px-4 py-4">
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <figure className="relative overflow-hidden rounded-3xl shadow-card lg:min-h-80">
          <img
            src={assetUrl("/photos/crew-depart.jpg")}
            alt="一班裝修師傅、哥基同貓由地鐵站口一齊行去屋苑開工"
            className="h-64 w-full object-cover object-[center_40%] sm:h-80 lg:absolute lg:inset-0 lg:h-full"
          />
          <figcaption className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gold px-3 py-1.5 text-xs font-black text-ink">一齊出發去裝修</span>
            <span className="rounded-full bg-navy/90 px-3 py-1.5 text-xs font-bold text-card">由站口行去屋苑</span>
          </figcaption>
        </figure>

        <section className="overflow-hidden rounded-3xl border border-line bg-card shadow-card">
          <div className="h-1.5 bg-gold" />
          <div className="p-4">
          <div className="flex flex-wrap gap-2">
            <Pill className="bg-navy text-card">
              <HardHat className="size-3.5" />
              地盤通專屬工地台
            </Pill>
            <Pill className="bg-leaf-soft text-leaf">
              工程公司示範 · 日誌、執漏、材料同一個位
            </Pill>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <BrandMark />
            <div>
              <h1 className="text-xl text-navy">裕安 · 澄木 — 各公司自己一份紀錄</h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                換公司就隔離。主管睇自己嘅盤，分判只見到獲分派嘅工地。示範資料留喺呢部瀏覽器，未連雲端。
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {actions.map((action) => {
              const inner = (
                <>
                  <action.icon className="size-4 shrink-0" />
                  <span>{action.label}</span>
                </>
              );
              const className = cn(
                "flex min-h-12 items-center justify-center gap-1.5 rounded-2xl px-2 text-sm font-black",
                action.className,
              );
              return action.kind === "route" ? (
                <Link
                  key={action.label}
                  to={action.href === "/login" ? "/login" : enter}
                  className={className}
                  data-testid={action.label === enterLabel ? "cta-enter" : undefined}
                >
                  {inner}
                </Link>
              ) : (
                <a key={action.label} href={action.href} className={className}>
                  {inner}
                </a>
              );
            })}
          </div>
          </div>
        </section>
        </div>

        <section className="rounded-3xl border border-line bg-card p-4 shadow-card">
          <p className="text-sm font-bold leading-6">
            按本月睇開緊幾多個盤、未完成任務、已交日誌同登記人手：
          </p>
          <div className="mt-3">
            <MonthBar />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {tiles.map((tile) => (
              <article key={tile.label} className={cn("rounded-3xl border-2 p-3", tile.box)}>
                <p className="text-xs font-bold text-muted">{tile.label}</p>
                <p className={cn("mt-1 text-3xl font-black tabular-nums leading-none", tile.num)}>{tile.value}</p>
                <p className={cn("mt-1 text-sm font-black", tile.num)}>{tile.unit}</p>
                <p className="mt-1 text-xs text-muted">{tile.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="grid gap-2 md:grid-cols-3">
          <h2 className="px-1 text-2xl md:col-span-3">一個盤，點樣跟</h2>
          {FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-3xl border border-line bg-card p-4 shadow-card">
              <div className="flex items-center gap-2">
                <span className="grid size-10 place-items-center rounded-2xl bg-gold text-ink">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="text-lg">{feature.title}</h3>
              </div>
              <p className="mt-2 text-sm text-muted">{feature.body}</p>
            </article>
          ))}
        </section>

        <section id="access" className="rounded-3xl bg-navy p-5 text-card">
          <h2 className="text-2xl text-gold">邊個睇到咩，分得清。</h2>
          <p className="mt-3 text-sm leading-6 text-card/80">
            公司管理員睇晒自己公司。項目經理跟進度。工地主管只睇自己負責嘅盤。分判只睇獲分派嘅工作，入唔到成間公司。平台管理員只管客戶同訂閱，唔翻工地日誌。
          </p>
        </section>

        <section id="pricing">
          <h2 className="px-1 text-2xl">月費，先傾住</h2>
          <p className="mt-2 px-1 text-sm text-muted">十四日試用，上限跟入門。到咗上限會先提醒，唔會突然刪走或者鎖住你而家嘅工地同紀錄。</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {PLAN_ORDER.map((id, index) => {
              const plan = PLANS[id];
              return (
                <article
                  key={id}
                  className={cn(
                    "rounded-3xl border-2 bg-card p-4",
                    index === 1 ? "border-gold shadow-card" : "border-line",
                  )}
                >
                  <div className="flex items-end justify-between gap-3">
                    <h3 className="text-xl">{plan.name}</h3>
                    <p className="text-3xl font-black tabular-nums text-leaf">HK${plan.price}</p>
                  </div>
                  <p className="text-xs font-bold text-muted">每月</p>
                  <p className="mt-2 text-sm">{plan.blurb}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill className="bg-ice text-navy">{plan.sites} 個工地</Pill>
                    <Pill className="bg-leaf-soft text-leaf">{plan.seats} 個帳戶</Pill>
                    <Pill className="bg-gold/30 text-ink">{plan.gb} GB</Pill>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="mt-3 text-sm font-medium text-clay">{PRICE_NOTE}</p>
          <Link to="/login" className={cn(buttonClass("gold"), "mt-4 w-full font-black")}>用示範身份行一次</Link>
        </section>
      </main>
      <footer className="px-4 py-6 text-center text-xs text-muted">
        地盤通 · 香港室內設計同工程公司嘅工地管理 · 示範版未連雲端
      </footer>
    </div>
  );
}
