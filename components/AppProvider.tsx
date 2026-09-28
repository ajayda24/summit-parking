"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { Role, SurgeRule } from "@/lib/shared";

export type Me = {
  user: { id: number; name: string; role: Role; tagline: string; avatar_color: string; wallet: number; rating: number; rating_count: number; suspended: number };
  vehicles: { id: number; label: string; plate: string; type: string; fuel: string; active: number }[];
  unread: number;
  now: number;
  offset: number;
  fail_payment: boolean;
  commission: number;
  surge_rules: SurgeRule[];
};
export type UserLite = { id: number; name: string; role: Role; tagline: string; avatar_color: string; wallet: number; suspended: number };
type ToastKind = "success" | "error" | "info" | "warning";
type Toast = { id: number; kind: ToastKind; text: string };

type Ctx = {
  me: Me | null;
  users: UserLite[];
  now: number;
  refresh: () => Promise<void>;
  toast: (text: string, kind?: ToastKind) => void;
  switchTo: (id: number, go?: boolean) => Promise<void>;
  tick: number;
};

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => useContext(AppCtx)!;

export const homeFor = (role: Role) => (role === "driver" ? "/driver" : role === "owner" ? "/owner" : "/admin");

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [clock, setClock] = useState({ server: Date.now(), local: Date.now() });
  const [now, setNow] = useState(Date.now());
  const [tick, setTick] = useState(0);
  const router = useRouter();
  const idRef = useRef(0);

  const refresh = useCallback(async () => {
    const [m, u] = await Promise.all([api<Me>("me"), api<UserLite[]>("users")]);
    setMe(m);
    setUsers(u);
    setClock({ server: m.now, local: Date.now() });
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    const i = setInterval(() => refresh().catch(() => {}), 5000);
    return () => clearInterval(i);
  }, [refresh]);

  useEffect(() => {
    const i = setInterval(() => setNow(clock.server + (Date.now() - clock.local)), 1000);
    setNow(clock.server + (Date.now() - clock.local));
    return () => clearInterval(i);
  }, [clock]);

  const toast = useCallback((text: string, kind: ToastKind = "success") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const switchTo = useCallback(
    async (id: number, go = true) => {
      const u = await api<UserLite>("switch", { userId: id });
      await refresh();
      toast(`Switched to ${u.name} (${u.role})`, "info");
      if (go) router.push(homeFor(u.role));
    },
    [refresh, router, toast]
  );

  const icons = { success: CheckCircle2, error: XCircle, info: Info, warning: TriangleAlert };
  const colors = { success: "bg-white text-ok", error: "bg-white text-bad", info: "bg-white text-ink", warning: "bg-white text-warn" };

  return (
    <AppCtx.Provider value={{ me, users, now, refresh, toast, switchTo, tick }}>
      {children}
      <AnimatePresence>
        {!me && (
          <motion.div key="splash" exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="fixed inset-0 z-[2000] grid place-items-center bg-cream">
            <div className="flex flex-col items-center">
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="grid h-16 w-16 place-items-center rounded-2xl bg-brand text-3xl font-black text-white shadow-pop">
                P
              </motion.div>
              <div className="mt-4 text-xl font-extrabold">Summit Parking</div>
              <div className="road-strip mt-5 h-3 w-40 overflow-hidden rounded-full">
                <motion.div className="h-full w-10 rounded-full bg-brand" animate={{ x: [-40, 160] }} transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }} />
              </div>
              <div className="mt-3 text-xs font-bold text-muted">Setting up your parking lot…</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[1000] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = icons[t.kind];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl ${colors[t.kind]} px-4 py-3 text-sm font-semibold shadow-pop ring-1 ring-line`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {t.text}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </AppCtx.Provider>
  );
}
