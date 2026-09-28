"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CarFront,
  ChevronDown,
  Clock,
  FastForward,
  FlaskConical,
  Heart,
  LayoutDashboard,
  ListChecks,
  MapPinned,
  PlusCircle,
  RotateCcw,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ago, api, fmtDateTime } from "@/lib/client";
import { inr } from "@/lib/shared";
import { homeFor, useApp } from "./AppProvider";
import { Avatar, Button, Field, inputCls, Modal, Toggle } from "./ui";

const NAV = {
  driver: [
    { href: "/driver", label: "Find parking", icon: MapPinned },
    { href: "/driver/bookings", label: "My bookings", icon: Ticket },
    { href: "/driver/favourites", label: "Favourites", icon: Heart },
    { href: "/wallet", label: "Wallet", icon: Wallet },
  ],
  owner: [
    { href: "/owner", label: "Live board", icon: LayoutDashboard },
    { href: "/owner/listings", label: "My spots", icon: ListChecks },
    { href: "/owner/new", label: "List a spot", icon: PlusCircle },
    { href: "/owner/earnings", label: "Earnings", icon: TrendingUp },
    { href: "/wallet", label: "Wallet", icon: Wallet },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/verify", label: "Verification", icon: ShieldCheck },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/disputes", label: "Disputes", icon: Scale },
    { href: "/admin/insights", label: "Insights", icon: Sparkles },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
};

const ROLE_TINT = { driver: "from-sky/90", owner: "from-lavender/90", admin: "from-butter/90" };
const ROLE_LABEL = { driver: "Driver", owner: "Parking owner", admin: "Admin" };

function useClickAway(cb: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && cb();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [cb]);
  return ref;
}

function AccountSwitcher() {
  const { me, users, switchTo } = useApp();
  const [open, setOpen] = useState(false);
  const [create, setCreate] = useState(false);
  const ref = useClickAway(() => setOpen(false));
  if (!me) return <div className="h-10 w-40 animate-pulse rounded-2xl bg-white/60" />;
  const groups: ("driver" | "owner" | "admin")[] = ["driver", "owner", "admin"];
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-2xl bg-white/80 py-1 pl-1 pr-3 ring-1 ring-black/5 hover:bg-white">
        <Avatar name={me.user.name} color={me.user.avatar_color} size={32} />
        <div className="hidden text-left leading-tight sm:block">
          <div className="text-sm font-extrabold">{me.user.name.split(" ")[0]}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink/50">{ROLE_LABEL[me.user.role]}</div>
        </div>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            className="absolute right-0 z-[800] mt-2 w-80 overflow-hidden rounded-3xl bg-white p-2 shadow-pop ring-1 ring-black/5"
          >
            <div className="px-3 pb-1 pt-2 text-[11px] font-extrabold uppercase tracking-widest text-coral">Switch account (demo)</div>
            <div className="max-h-[60vh] overflow-y-auto">
              {groups.map((g) => (
                <div key={g}>
                  <div className="px-3 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-widest text-ink/40">{ROLE_LABEL[g]}s</div>
                  {users
                    .filter((u) => u.role === g)
                    .map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setOpen(false);
                          switchTo(u.id);
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-cream ${u.id === me.user.id ? "bg-cream" : ""}`}
                      >
                        <Avatar name={u.name} color={u.avatar_color} size={34} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-sm font-bold">
                            {u.name}
                            {u.suspended ? <span className="rounded-full bg-rose px-1.5 text-[9px] text-coral-deep">SUSPENDED</span> : null}
                          </div>
                          <div className="truncate text-xs text-muted">{u.tagline}</div>
                        </div>
                        <div className="text-xs font-bold text-ink/60">{inr(u.wallet)}</div>
                      </button>
                    ))}
                </div>
              ))}
            </div>
            <button onClick={() => { setOpen(false); setCreate(true); }} className="mt-1 flex w-full items-center gap-2 rounded-2xl bg-cream px-3 py-2.5 text-sm font-bold hover:bg-road/60">
              <UserPlus className="h-4 w-4" /> Create a demo account
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <CreateAccount open={create} onClose={() => setCreate(false)} />
    </div>
  );
}

function CreateAccount({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { refresh, toast } = useApp();
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState<"driver" | "owner">("driver");
  const [vehicleType, setVehicleType] = useState("hatchback");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const u = await api("users", { name, role, vehicleType, fuel: "petrol" });
      await refresh();
      toast(`Welcome ${u.name}! You're signed in.`);
      onClose();
      router.push(homeFor(role));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Create a demo account">
      <div className="space-y-4">
        <Field label="Name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Nair" />
        </Field>
        <Field label="I am a">
          <div className="grid grid-cols-2 gap-2">
            {(["driver", "owner"] as const).map((r) => (
              <button key={r} onClick={() => setRole(r)} className={`rounded-2xl p-3 text-sm font-bold ring-2 ${role === r ? "bg-lavender ring-lavender-deep" : "bg-white ring-transparent"}`}>
                {r === "driver" ? "🚗 Driver" : "🏠 Parking owner"}
              </button>
            ))}
          </div>
        </Field>
        {role === "driver" && (
          <Field label="Vehicle">
            <select className={inputCls} value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
              {["bike", "hatchback", "sedan", "suv", "van"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
        )}
        <p className="text-xs text-muted">{role === "driver" ? "Drivers start with ₹1,000 demo money." : "Owners start at ₹0 and earn from bookings."}</p>
        <Button className="w-full" onClick={submit} loading={busy}>
          Create & switch
        </Button>
      </div>
    </Modal>
  );
}

function NotificationBell() {
  const { me, now, refresh } = useApp();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ id: number; text: string; kind: string; link: string | null; read: number; created_at: number }[]>([]);
  const ref = useClickAway(() => setOpen(false));
  const router = useRouter();
  const toggle = async () => {
    if (!open) {
      setItems(await api("notifications"));
      api("notifications/read", {}).then(refresh);
    }
    setOpen(!open);
  };
  const dot: Record<string, string> = { success: "bg-mint-deep", error: "bg-coral", warning: "bg-butter-deep", booking: "bg-lavender-deep", info: "bg-sky-deep" };
  return (
    <div className="relative" ref={ref}>
      <motion.button whileTap={{ scale: 0.9 }} onClick={toggle} className="relative grid h-10 w-10 place-items-center rounded-2xl bg-white/80 ring-1 ring-black/5 hover:bg-white" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        <AnimatePresence>
          {!!me?.unread && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] font-extrabold text-white">
              {me.unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-0 z-[800] mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-3xl bg-white p-2 shadow-pop ring-1 ring-black/5">
            <div className="px-3 py-2 text-sm font-extrabold">Notifications</div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 && <div className="p-6 text-center text-sm text-muted">All caught up ✨</div>}
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setOpen(false);
                    if (n.link) router.push(n.link);
                  }}
                  className={`flex w-full gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-cream ${n.read ? "" : "bg-sky/30"}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot[n.kind] ?? "bg-sky-deep"}`} />
                  <div>
                    <div className="text-sm font-medium leading-snug">{n.text}</div>
                    <div className="mt-0.5 text-[11px] text-muted">{ago(n.created_at, now)}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DemoPill() {
  const { me, now, refresh, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  if (!me) return null;
  const skip = async (minutes: number, reset = false) => {
    await api("demo/clock", { minutes, reset });
    await refresh();
    toast(reset ? "Clock back to real time" : `⏩ Jumped ${minutes} min ahead`, "info");
  };
  const offsetMin = Math.round(me.offset / 60000);
  return (
    <div className="fixed bottom-4 right-4 z-[700]">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.95 }} className="mb-3 w-72 rounded-3xl bg-ink p-4 text-white shadow-pop">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-butter">Demo controls</div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-butter" /> {fmtDateTime(now)}
              {offsetMin !== 0 && <span className="rounded-full bg-butter px-2 text-[10px] font-extrabold text-ink">+{offsetMin}m</span>}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {[15, 30, 60].map((m) => (
                <button key={m} onClick={() => skip(m)} className="flex items-center justify-center gap-1 rounded-xl bg-white/10 py-2 text-xs font-bold hover:bg-white/20">
                  <FastForward className="h-3 w-3" />
                  {m}m
                </button>
              ))}
              <button onClick={() => skip(0, true)} className="grid place-items-center rounded-xl bg-white/10 py-2 hover:bg-white/20" title="Reset clock">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-4 [&_span]:text-white">
              <Toggle
                on={me.fail_payment}
                onChange={async (on) => {
                  await api("demo/fail", { on });
                  await refresh();
                  toast(on ? "Payments will now fail" : "Payments back to normal", on ? "warning" : "info");
                }}
                label="Simulate payment failure"
              />
            </div>
            <button
              disabled={busy}
              onClick={async () => {
                if (!confirm("Reset all demo data back to the seed?")) return;
                setBusy(true);
                await api("demo/reset", {});
                await refresh();
                setBusy(false);
                toast("Demo data reset ✨");
                router.refresh();
              }}
              className="mt-4 w-full rounded-xl bg-coral py-2 text-xs font-extrabold hover:bg-coral-deep"
            >
              {busy ? "Resetting…" : "Reset demo data"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setOpen(!open)} className="ml-auto flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-xs font-extrabold text-white shadow-pop">
        <FlaskConical className="h-4 w-4 text-butter" /> Demo
        {offsetMin !== 0 && <span className="rounded-full bg-butter px-1.5 text-[10px] text-ink">+{offsetMin}m</span>}
      </motion.button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { me } = useApp();
  const pathname = usePathname();
  const role = me?.user.role ?? "driver";
  const nav = NAV[role];
  const isLanding = pathname === "/";
  return (
    <>
      <header className={`sticky top-0 z-[600] bg-gradient-to-b ${ROLE_TINT[role]} to-cream/80 backdrop-blur-md transition-colors`}>
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <motion.div whileHover={{ rotate: -8 }} className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-deep text-lg font-black text-white shadow-soft">
              P
            </motion.div>
            <div className="hidden leading-none md:block">
              <div className="text-lg font-extrabold tracking-tight">Summit Parking</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/50">park it. earn it.</div>
            </div>
          </Link>
          <nav className="ml-2 hidden flex-1 items-center gap-1 lg:flex">
            {!isLanding &&
              nav.map((n) => {
                const active = n.href === pathname || (n.href !== "/driver" && n.href !== "/owner" && n.href !== "/admin" && pathname.startsWith(n.href));
                return (
                  <Link key={n.href} href={n.href} className="relative rounded-xl px-3 py-2 text-sm font-bold text-ink/70 hover:text-ink">
                    {active && <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-white shadow-soft" transition={{ type: "spring", damping: 25, stiffness: 300 }} />}
                    <span className="relative flex items-center gap-1.5">
                      <n.icon className="h-4 w-4" />
                      {n.label}
                    </span>
                  </Link>
                );
              })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {me && (
              <Link href="/wallet" className="hidden items-center gap-1.5 rounded-2xl bg-white/80 px-3 py-2 text-sm font-extrabold ring-1 ring-black/5 hover:bg-white sm:flex">
                <Wallet className="h-4 w-4 text-mint-deep" />
                <span className={me.user.wallet < 0 ? "text-coral-deep" : ""}>{inr(me.user.wallet)}</span>
              </Link>
            )}
            <NotificationBell />
            <AccountSwitcher />
          </div>
        </div>
        {!isLanding && (
          <div className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ${pathname === n.href ? "bg-white shadow-soft" : "text-ink/60"}`}>
                <n.icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            ))}
          </div>
        )}
      </header>
      {me?.user.suspended ? (
        <div className="bg-rose px-4 py-2 text-center text-sm font-bold text-coral-deep">
          Your account is suspended by the trust team. Booking and listing are disabled. Switch account to continue the demo.
        </div>
      ) : null}
      <AnimatePresence mode="wait">
        <motion.main key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className={isLanding ? "" : "mx-auto max-w-7xl px-4 pb-28 pt-6"}>
          {children}
        </motion.main>
      </AnimatePresence>
      <DemoPill />
    </>
  );
}

export function RoleGate({ role, children }: { role: "driver" | "owner" | "admin"; children: React.ReactNode }) {
  const { me, users, switchTo } = useApp();
  if (!me) return <div className="h-64 animate-pulse rounded-3xl bg-white/60" />;
  if (me.user.role === role) return <>{children}</>;
  const candidates = users.filter((u) => u.role === role);
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-butter">
        <CarFront className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-extrabold">This page is for {ROLE_LABEL[role].toLowerCase()}s</h2>
      <p className="mt-2 text-muted">You're signed in as {me.user.name}. Switch to one of these accounts:</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {candidates.map((u) => (
          <Button key={u.id} variant="soft" onClick={() => switchTo(u.id, false)}>
            <Avatar name={u.name} color={u.avatar_color} size={22} /> {u.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
