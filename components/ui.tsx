"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Loader2, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { inr } from "@/lib/shared";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "soft" | "ghost" | "danger" | "dark";
  loading?: boolean;
  size?: "sm" | "md" | "lg";
};

export function Button({ variant = "primary", loading, size = "md", className = "", children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: "bg-coral text-white hover:bg-coral-deep shadow-[0_8px_20px_-8px_rgb(255_122_107/0.8)]",
    soft: "bg-white text-ink hover:bg-road/60 ring-1 ring-road-dark/60",
    ghost: "text-ink hover:bg-white/70",
    danger: "bg-rose text-coral-deep hover:bg-[#ffb3cf]",
    dark: "bg-ink text-white hover:bg-[#1c1d2e]",
  }[variant];
  const s = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3.5 text-base" }[size];
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${v} ${s} ${className}`}
      disabled={disabled || loading}
      {...(rest as any)}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </motion.button>
  );
}

export function Card({ className = "", children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-3xl bg-white/90 p-5 shadow-soft ring-1 ring-black/[0.04] backdrop-blur ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Badge({ color = "road", children, className = "" }: { color?: string; children: React.ReactNode; className?: string }) {
  const c: Record<string, string> = {
    road: "bg-road text-ink",
    mint: "bg-mint text-[#1f6b4f]",
    peach: "bg-peach text-[#8a4a22]",
    lavender: "bg-lavender text-lavender-deep",
    sky: "bg-sky text-[#1e5a94]",
    butter: "bg-butter text-[#7a5d05]",
    rose: "bg-rose text-coral-deep",
    coral: "bg-coral text-white",
    ink: "bg-ink text-white",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${c[color] ?? c.road} ${className}`}>{children}</span>;
}

const STATUS: Record<string, [string, string]> = {
  requested: ["butter", "Awaiting owner"],
  confirmed: ["sky", "Upcoming"],
  live: ["mint", "Live now"],
  overstay: ["coral", "Overstaying"],
  completed: ["lavender", "Completed"],
  cancelled: ["rose", "Cancelled"],
  declined: ["rose", "Declined"],
  no_show: ["peach", "No-show"],
  pending: ["butter", "Pending verification"],
  verified: ["mint", "Verified"],
  rejected: ["rose", "Rejected"],
  paused: ["road", "Paused"],
  free: ["mint", "Free"],
  upcoming: ["sky", "Booked soon"],
  open: ["butter", "Open"],
  resolved: ["mint", "Resolved"],
};
export function StatusBadge({ status }: { status: string }) {
  const [c, l] = STATUS[status] ?? ["road", status];
  return (
    <Badge color={c}>
      {(status === "live" || status === "overstay") && <span className={`h-1.5 w-1.5 rounded-full ${status === "live" ? "bg-mint-deep" : "bg-white"} animate-pulse`} />}
      {l}
    </Badge>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[900] flex items-end justify-center bg-ink/30 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className={`max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-cream p-6 shadow-pop sm:rounded-[2rem] ${wide ? "sm:max-w-3xl" : "sm:max-w-md"}`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="text-lg font-extrabold">{title}</div>
              <button onClick={onClose} className="rounded-full bg-white p-1.5 hover:bg-road" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CountUp({ value, money = true, className = "" }: { value: number; money?: boolean; className?: string }) {
  const mv = useMotionValue(0);
  const decimals = !money && !Number.isInteger(value);
  const text = useTransform(mv, (v) => (money ? inr(v) : decimals ? v.toFixed(1) : Math.round(v).toLocaleString("en-IN")));
  useEffect(() => {
    const c = animate(mv, value, { duration: 1.1, ease: "easeOut" });
    return () => c.stop();
  }, [mv, value]);
  return <motion.span className={className}>{text}</motion.span>;
}

export function StatCard({ label, value, money, icon, color = "sky", hint }: { label: string; value: number; money?: boolean; icon?: React.ReactNode; color?: string; hint?: string }) {
  const bg: Record<string, string> = { sky: "bg-sky", mint: "bg-mint", peach: "bg-peach", lavender: "bg-lavender", butter: "bg-butter", rose: "bg-rose" };
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`relative overflow-hidden rounded-3xl ${bg[color]} p-4`}>
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/30" />
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink/60">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold">
        <CountUp value={value} money={!!money} />
      </div>
      {hint && <div className="mt-1 text-xs font-medium text-ink/60">{hint}</div>}
    </motion.div>
  );
}

export function Stars({ value, onChange, size = 16 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button key={n} type="button" whileTap={{ scale: 1.4 }} disabled={!onChange} onClick={() => onChange?.(n)} className={onChange ? "cursor-pointer" : "cursor-default"}>
          <Star style={{ width: size, height: size }} className={n <= Math.round(value) ? "fill-butter-deep text-butter-deep" : "text-road-dark"} />
        </motion.button>
      ))}
    </div>
  );
}

export function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <div className="grid shrink-0 place-items-center rounded-full font-extrabold text-ink ring-2 ring-white" style={{ background: color, width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/60">{label}</div>
      {children}
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </label>
  );
}

export const inputCls = "w-full rounded-2xl border-2 border-transparent bg-white px-4 py-2.5 text-sm font-medium ring-1 ring-road-dark/60 transition focus:border-lavender-deep/50 focus:ring-0";

export function Chip({ active, onClick, children, color = "lavender" }: { active?: boolean; onClick?: () => void; children: React.ReactNode; color?: string }) {
  const on: Record<string, string> = { lavender: "bg-lavender-deep text-white", coral: "bg-coral text-white", mint: "bg-mint-deep text-white", sky: "bg-sky-deep text-white" };
  return (
    <motion.button type="button" whileTap={{ scale: 0.92 }} layout onClick={onClick} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${active ? on[color] : "bg-white text-ink ring-1 ring-road-dark/60 hover:bg-road/50"}`}>
      {children}
    </motion.button>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: React.ReactNode }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="inline-flex rounded-2xl bg-white p-1 ring-1 ring-road-dark/50">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} className="relative rounded-xl px-4 py-2 text-sm font-bold">
          {value === t.id && <motion.div layoutId={`tab-${tabs.map((x) => x.id).join()}`} className="absolute inset-0 rounded-xl bg-ink" transition={{ type: "spring", damping: 25, stiffness: 350 }} />}
          <span className={`relative ${value === t.id ? "text-white" : "text-ink/70"}`}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export function PageTitle({ kicker, title, children }: { kicker?: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker && <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-coral">{kicker}</div>}
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="inline-flex items-center gap-2 text-sm font-semibold">
      <span className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-mint-deep" : "bg-road-dark"}`}>
        <motion.span layout className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow" style={{ left: on ? 22 : 2 }} />
      </span>
      {label}
    </button>
  );
}

export function useLoader<T>(fn: () => Promise<T>, deps: unknown[] = [], pollMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    try {
      setData(await fn());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    load();
    if (!pollMs) return;
    const i = setInterval(load, pollMs);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error, reload: load, setData };
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-3xl bg-white/70 ${className}`} />;
}
