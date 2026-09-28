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
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-2xl bg-white py-1 pl-1 pr-1 ring-1 ring-line hover:bg-road/50 sm:pr-3">
        <Avatar name={me.user.name} color={me.user.avatar_color} size={32} />
        <div className="hidden text-left leading-tight sm:block">
          <div className="text-sm font-extrabold">{me.user.name.split(" ")[0]}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink/50">{ROLE_LABEL[me.user.role]}</div>
        </div>
        <ChevronDown className={`hidden h-4 w-4 transition sm:block ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            className="fixed left-3 right-3 top-[4.5rem] z-[800] overflow-hidden rounded-3xl bg-white p-2 shadow-pop ring-1 ring-black/5 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80"
          >
            <div className="px-3 pb-1 pt-2 text-[11px] font-extrabold uppercase tracking-widest text-brand">Switch account (demo)</div>
            <div className="max-h-[62dvh] overflow-y-auto">
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
              <button key={r} onClick={() => setRole(r)} className={`rounded-2xl p-3 text-sm font-bold ring-2 ${role === r ? "bg-brand-soft ring-brand" : "bg-white ring-transparent"}`}>
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
  const dot: Record<string, string> = { success: "bg-ok", error: "bg-bad", warning: "bg-warn", booking: "bg-brand", info: "bg-brand" };
  return (
    <div className="relative" ref={ref}>
      <motion.button whileTap={{ scale: 0.9 }} onClick={toggle} className="relative grid h-10 w-10 place-items-center rounded-2xl bg-white ring-1 ring-line hover:bg-road/50" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        <AnimatePresence>
          {!!me?.unread && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-bad px-1 text-[10px] font-extrabold text-white">
              {me.unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="fixed left-3 right-3 top-[4.5rem] z-[800] rounded-3xl bg-white p-2 shadow-pop ring-1 ring-black/5 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[22rem]">
            <div className="px-3 py-2 text-sm font-extrabold">Notifications</div>
            <div className="max-h-[62dvh] overflow-y-auto">
              {items.length === 0 && <div className="p-6 text-center text-sm text-muted">All caught up ✨</div>}
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setOpen(false);
                    if (n.link) router.push(n.link);
                  }}
                  className={`flex w-full gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-cream ${n.read ? "" : "bg-brand-soft/60"}`}
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
    <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-[700] lg:bottom-4 lg:right-4">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.95 }} className="mb-3 w-[min(18rem,calc(100vw-1.5rem))] rounded-3xl bg-white p-4 shadow-pop ring-1 ring-line">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-brand">Demo controls</div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-brand" /> {fmtDateTime(now)}
              {offsetMin !== 0 && <span className="rounded-full bg-warn-soft px-2 text-[10px] font-extrabold text-warn">+{offsetMin}m</span>}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {[15, 30, 60].map((m) => (
                <button key={m} onClick={() => skip(m)} className="flex items-center justify-center gap-1 rounded-xl bg-cream py-2 text-xs font-bold ring-1 ring-line hover:bg-road">
                  <FastForward className="h-3 w-3" />
                  {m}m
                </button>
              ))}
              <button onClick={() => skip(0, true)} className="grid place-items-center rounded-xl bg-cream py-2 ring-1 ring-line hover:bg-road" title="Reset clock">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-4">
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
              className="mt-4 w-full rounded-xl bg-bad-soft py-2 text-xs font-extrabold text-bad hover:bg-[#f8dcd8]"
            >
              {busy ? "Resetting…" : "Reset demo data"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setOpen(!open)} className="ml-auto flex items-center gap-2 rounded-full bg-white px-3.5 py-3 text-xs font-extrabold text-ink shadow-pop ring-1 ring-line sm:px-4">
        <FlaskConical className="h-4 w-4 text-brand" /> <span className="hidden sm:inline">Demo</span>
        {offsetMin !== 0 && <span className="rounded-full bg-warn-soft px-1.5 text-[10px] text-warn">+{offsetMin}m</span>}
      </motion.button>
    </div>
  );
}

const TAB_LABEL: Record<string, string> = {
  "Find parking": "Find",
  "My bookings": "Bookings",
  Favourites: "Saved",
  "Live board": "Board",
  "My spots": "Spots",
  "List a spot": "List",
  Verification: "Verify",
};

function BottomTabs({ role, pathname }: { role: "driver" | "owner" | "admin"; pathname: string }) {
  const items = role === "admin" ? NAV.admin.filter((n) => n.href !== "/admin/settings") : role === "owner" ? NAV.owner.filter((n) => n.href !== "/wallet") : NAV.driver;
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-[650] border-t border-line bg-white/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {items.map((n) => {
          const active = n.href === pathname || (!["/driver", "/owner", "/admin"].includes(n.href) && pathname.startsWith(n.href)) || (n.href === "/driver" && pathname.startsWith("/driver/spot"));
          const cta = n.href === "/owner/new";
          return (
            <Link key={n.href} href={n.href} className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold">
              {cta ? (
                <span className="-mt-5 grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white shadow-pop">
                  <n.icon className="h-5 w-5" />
                </span>
              ) : (
                <>
                  {active && <motion.span layoutId="tab-dot" className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" />}
                  <n.icon className={`h-5 w-5 ${active ? "text-brand" : "text-ink/45"}`} />
                </>
              )}
              <span className={active || cta ? "text-ink" : "text-ink/45"}>{TAB_LABEL[n.label] ?? n.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
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
      <header className="sticky top-0 z-[600] border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2">
            <motion.div whileHover={{ rotate: -8 }} className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-base font-black text-white">
              P
            </motion.div>
            <div className="leading-none">
              <div className="text-[15px] font-extrabold tracking-tight">Summit</div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{me ? ROLE_LABEL[role] : "Parking"}</div>
            </div>
          </Link>
          <nav className="ml-4 hidden flex-1 items-center gap-1 lg:flex">
            {!isLanding &&
              nav.map((n) => {
                const active = n.href === pathname || (n.href !== "/driver" && n.href !== "/owner" && n.href !== "/admin" && pathname.startsWith(n.href));
                return (
                  <Link key={n.href} href={n.href} className="relative rounded-xl px-3 py-2 text-sm font-bold text-ink/60 hover:text-ink">
                    {active && <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-white shadow-soft" transition={{ type: "spring", damping: 25, stiffness: 300 }} />}
                    <span className={`relative flex items-center gap-1.5 ${active ? "text-ink" : ""}`}>
                      <n.icon className="h-4 w-4" />
                      {n.label}
                    </span>
                  </Link>
                );
              })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {me && (
              <Link href="/wallet" className="flex h-10 items-center gap-1.5 rounded-2xl bg-white px-3 text-sm font-extrabold ring-1 ring-line hover:bg-road/50">
                <Wallet className="h-4 w-4 text-brand" />
                <span className={me.user.wallet < 0 ? "text-bad" : ""}>{inr(me.user.wallet)}</span>
              </Link>
            )}
            <NotificationBell />
            <AccountSwitcher />
          </div>
        </div>
      </header>
      {me?.user.suspended ? (
        <div className="bg-bad-soft px-4 py-2 text-center text-sm font-bold text-bad">
          Account suspended by the trust team. Booking and listing are disabled. Switch account to continue.
        </div>
      ) : null}
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className={isLanding ? "pb-10" : "mx-auto max-w-7xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 lg:pb-28 lg:pt-6"}
        >
          {children}
        </motion.main>
      </AnimatePresence>
      {me && !isLanding && <BottomTabs role={role} pathname={pathname} />}
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
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-brand-soft text-brand">
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
