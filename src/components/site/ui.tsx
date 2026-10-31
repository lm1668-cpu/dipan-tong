import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { DEMO_NOTE } from "@/lib/site/model";

export function buttonClass(variant: "primary" | "gold" | "ghost" | "soft" | "danger" = "primary") {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-navy text-paper",
    variant === "gold" && "bg-gold text-ink",
    variant === "ghost" && "border border-line bg-card text-ink",
    variant === "soft" && "bg-paper-2 text-ink",
    variant === "danger" && "bg-clay text-paper",
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "gold" | "ghost" | "soft" | "danger" }) {
  return <button className={cn(buttonClass(variant), className)} {...props} />;
}

export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 overflow-hidden rounded-full ring-2 ring-gold",
        size === "lg" && "size-14",
        size === "md" && "size-11",
        size === "sm" && "size-9",
      )}
    >
      <img src="/photos/mascot.jpg" alt="" className="size-full scale-105 object-cover" />
    </span>
  );
}

export function Mark({ text, size = "md", tone = "navy" }: { text: string; size?: "sm" | "md" | "lg"; tone?: "navy" | "gold" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-black ring-2",
        tone === "navy" && "bg-navy text-card ring-gold",
        tone === "gold" && "bg-gold text-ink ring-card",
        size === "lg" && "size-14 text-lg",
        size === "md" && "size-11 text-sm",
        size === "sm" && "size-9 text-xs",
      )}
    >
      {text.slice(0, 1)}
    </span>
  );
}

export function DemoBanner() {
  return (
    <p className="bg-navy px-4 py-2 text-center text-xs leading-5 text-paper">{DEMO_NOTE}</p>
  );
}

export function NoticeList({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <p key={note} className="rounded-2xl bg-clay-soft px-4 py-3 text-sm text-clay">
          {note}
        </p>
      ))}
    </div>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error ? <span className="block text-sm text-clay">{error}</span> : null}
    </label>
  );
}

const control = "min-h-11 w-full rounded-2xl border border-line bg-card px-3 text-sm text-ink";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(control, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(control, "min-h-24 py-3", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(control, props.className)} />;
}

export function Modal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/50" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-card p-5 outline-none md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-xl">{title}</Dialog.Title>
            <Dialog.Close className="grid size-11 place-items-center rounded-full bg-paper-2" aria-label="關閉">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Banner({ tone, children }: { tone: "ok" | "bad"; children: ReactNode }) {
  return (
    <p
      role="status"
      data-testid={tone === "ok" ? "form-success" : "form-error"}
      className={cn(
        "rounded-2xl px-4 py-3 text-sm",
        tone === "ok" && "bg-navy text-paper",
        tone === "bad" && "bg-clay-soft text-clay",
      )}
    >
      {children}
    </p>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-paper-2" aria-hidden="true">
      <div className="h-full rounded-full bg-navy" style={{ width: `${width}%` }} />
    </div>
  );
}

export function Badge({
  children,
  tone = "soft",
}: {
  children: ReactNode;
  tone?: "soft" | "navy" | "gold" | "clay";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "soft" && "bg-paper-2 text-ink",
        tone === "navy" && "bg-navy text-paper",
        tone === "gold" && "bg-gold/25 text-ink",
        tone === "clay" && "bg-clay-soft text-clay",
      )}
    >
      {children}
    </span>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-card px-5 py-8 text-center">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  );
}

export function Denied() {
  return (
    <div className="rounded-3xl border border-line bg-card p-6">
      <h1 className="font-display text-2xl">呢度你入唔到</h1>
      <p className="mt-2 text-sm text-muted">
        你嘅身份只可以睇獲分派嘅工作。前端藏起個掣唔算安全，所以呢頁自己都會拒絕。
      </p>
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-3xl border border-line bg-card p-4 shadow-card", className)}>{children}</section>;
}
