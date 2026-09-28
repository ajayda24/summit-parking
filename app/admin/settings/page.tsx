"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Percent, Plus, Trash2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { RoleGate } from "@/components/AppShell";
import { Button, PageTitle, Skeleton, useLoader } from "@/components/ui";
import { api } from "@/lib/client";
import { inr, type SurgeRule } from "@/lib/shared";

function Settings() {
  const { me, toast, refresh } = useApp();
  const { data } = useLoader<{ commission: number; surge_rules: SurgeRule[]; zones: string[] }>(() => api("admin/settings"), [me?.user.id]);
  const [commission, setCommission] = useState(10);
  const [rules, setRules] = useState<SurgeRule[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) {
      setCommission(data.commission);
      setRules(data.surge_rules);
    }
  }, [data]);
  if (!data) return <Skeleton className="h-96" />;

  const save = async () => {
    setBusy(true);
    try {
      await api("admin/settings", { commission, surge_rules: rules });
      await refresh();
      toast("Settings saved. New bookings use them right away.");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const upd = (i: number, patch: Partial<SurgeRule>) => setRules((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle kicker="Pricing levers" title="Platform settings" />
      <div className="rounded-[2rem] bg-white p-6 shadow-soft">
        <div className="flex items-center gap-2 font-extrabold"><Percent className="h-4 w-4 text-coral" /> Commission</div>
        <p className="mt-1 text-sm text-muted">Taken from each owner payout (base + overtime). Drivers also pay a flat ₹5 convenience fee.</p>
        <div className="mt-4 flex items-center gap-4">
          <input type="range" min={0} max={30} value={commission} onChange={(e) => setCommission(Number(e.target.value))} className="flex-1 accent-coral" />
          <motion.div key={commission} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="w-20 text-right text-3xl font-black">{commission}%</motion.div>
        </div>
        <div className="mt-3 rounded-2xl bg-cream p-3 text-xs">On a {inr(100)} booking the owner gets <b>{inr(100 - commission)}</b> and the platform keeps <b>{inr(commission + 5)}</b> incl. fee.</div>
      </div>

      <div className="mt-6 rounded-[2rem] bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold"><Zap className="h-4 w-4 text-coral" /> Zone surge rules</div>
          <Button size="sm" variant="soft" onClick={() => setRules([...rules, { zone: data.zones[0], from: 17, to: 21, mult: 1.2 }])}>
            <Plus className="h-3.5 w-3.5" /> Add rule
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted">Bookings that start inside a window are priced × multiplier. Drivers see a “Surge” tag.</p>
        <div className="mt-4 space-y-2">
          <AnimatePresence>
            {rules.map((r, i) => (
              <motion.div key={i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap items-center gap-2 rounded-2xl bg-cream p-3 text-sm">
                <select value={r.zone} onChange={(e) => upd(i, { zone: e.target.value })} className="rounded-xl bg-white px-2 py-1.5 font-bold">
                  {data.zones.map((z) => <option key={z}>{z}</option>)}
                </select>
                <span className="text-muted">from</span>
                <select value={r.from} onChange={(e) => upd(i, { from: Number(e.target.value) })} className="rounded-xl bg-white px-2 py-1.5 font-bold">
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}:00</option>)}
                </select>
                <span className="text-muted">to</span>
                <select value={r.to} onChange={(e) => upd(i, { to: Number(e.target.value) })} className="rounded-xl bg-white px-2 py-1.5 font-bold">
                  {Array.from({ length: 24 }, (_, h) => <option key={h + 1} value={h + 1}>{h + 1}:00</option>)}
                </select>
                <span className="text-muted">×</span>
                <input type="number" step={0.1} min={1} max={3} value={r.mult} onChange={(e) => upd(i, { mult: Number(e.target.value) })} className="w-20 rounded-xl bg-white px-2 py-1.5 font-bold" />
                <button onClick={() => setRules(rules.filter((_, j) => j !== i))} className="ml-auto rounded-xl p-2 text-coral-deep hover:bg-rose">
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {rules.length === 0 && <div className="rounded-2xl bg-cream p-4 text-center text-sm text-muted">No surge rules. Prices are flat all day.</div>}
        </div>
      </div>
      <Button size="lg" className="mt-6 w-full" loading={busy} onClick={save}>Save settings</Button>
    </div>
  );
}

export default function Page() {
  return (
    <RoleGate role="admin">
      <Settings />
    </RoleGate>
  );
}
