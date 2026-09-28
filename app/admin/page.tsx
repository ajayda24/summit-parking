"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Ban, CalendarCheck, CircleDollarSign, Landmark, MapPinned, Scale, ShieldCheck, Timer, Users } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { RoleGate } from "@/components/AppShell";
import { BarChart } from "@/components/BarChart";
import { Avatar, PageTitle, Skeleton, StatCard, StatusBadge, useLoader } from "@/components/ui";
import { api, fmtDateTime } from "@/lib/client";
import { inr } from "@/lib/shared";

type Stats = {
  spots: number; pending: number; live: number; bookings: number; gmv: number; commission: number; overstays: number; cancellations: number;
  no_shows: number; disputes: number; users: number; platform_wallet: number; days: { day: string; gmv: number; bookings: number }[];
  statusMix: { status: string; n: number }[];
  recent: { id: number; status: string; start_at: number; total: number; overstay: boolean; spot: { title: string }; driver: { name: string; avatar_color: string } }[];
};

function Overview() {
  const { me } = useApp();
  const { data: s } = useLoader<Stats>(() => api("admin/stats"), [me?.user.id], 6000);
  if (!s) return <Skeleton className="h-96" />;
  return (
    <div>
      <PageTitle kicker="Admin console" title="Platform overview" />
      {(s.pending > 0 || s.disputes > 0) && (
        <div className="mb-5 flex flex-wrap gap-3">
          {s.pending > 0 && (
            <Link href="/admin/verify">
              <motion.div whileHover={{ y: -2 }} className="flex items-center gap-2 rounded-2xl bg-butter px-4 py-3 text-sm font-extrabold">
                <ShieldCheck className="h-4 w-4" /> {s.pending} listing{s.pending > 1 ? "s" : ""} waiting for verification →
              </motion.div>
            </Link>
          )}
          {s.disputes > 0 && (
            <Link href="/admin/disputes">
              <motion.div whileHover={{ y: -2 }} className="flex items-center gap-2 rounded-2xl bg-rose px-4 py-3 text-sm font-extrabold text-coral-deep">
                <Scale className="h-4 w-4" /> {s.disputes} open dispute{s.disputes > 1 ? "s" : ""} →
              </motion.div>
            </Link>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Gross booking value" value={s.gmv} money color="mint" icon={<CircleDollarSign className="h-4 w-4" />} />
        <StatCard label="Platform revenue" value={s.commission} money color="lavender" icon={<Landmark className="h-4 w-4" />} hint="fees + commission" />
        <StatCard label="Live now" value={s.live} color="sky" icon={<Timer className="h-4 w-4" />} hint={`${s.bookings} bookings all-time`} />
        <StatCard label="Verified spots" value={s.spots} color="butter" icon={<MapPinned className="h-4 w-4" />} hint={`${s.users} users`} />
        <StatCard label="Overstays" value={s.overstays} color="peach" icon={<AlertTriangle className="h-4 w-4" />} hint="auto-charged" />
        <StatCard label="Cancellations" value={s.cancellations} color="rose" icon={<Ban className="h-4 w-4" />} />
        <StatCard label="No-shows" value={s.no_shows} color="peach" icon={<CalendarCheck className="h-4 w-4" />} />
        <StatCard label="Open disputes" value={s.disputes} color="rose" icon={<Scale className="h-4 w-4" />} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] bg-white p-5 shadow-soft">
          <div className="font-extrabold">Completed booking value, last 7 days</div>
          <BarChart data={s.days} x="day" y="gmv" label="Booking value" color="#3A86D1" />
        </div>
        <div className="rounded-[2rem] bg-white p-5 shadow-soft">
          <div className="font-extrabold">Bookings started, last 7 days</div>
          <BarChart data={s.days} x="day" y="bookings" label="Bookings" color="#6F5FD6" money={false} />
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="rounded-[2rem] bg-white p-5 shadow-soft">
          <div className="mb-3 font-extrabold">Bookings by state</div>
          <div className="space-y-2">
            {s.statusMix.sort((a, b) => b.n - a.n).map((m) => (
              <div key={m.status} className="flex items-center gap-3">
                <div className="w-32"><StatusBadge status={m.status} /></div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-road">
                  <motion.div className="h-full rounded-full bg-ink" initial={{ width: 0 }} animate={{ width: `${(m.n / s.bookings) * 100}%` }} />
                </div>
                <div className="w-6 text-right text-sm font-extrabold">{m.n}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-cream p-3 text-xs">
            <div className="font-bold">Platform wallet (escrow + revenue)</div>
            <div className="text-xl font-black">{inr(s.platform_wallet)}</div>
          </div>
        </div>
        <div className="rounded-[2rem] bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between font-extrabold">
            Latest bookings
            <a href="/api/admin/export?type=bookings" className="text-xs font-bold text-coral">Export CSV ↓</a>
          </div>
          <div className="divide-y divide-road">
            {s.recent.map((b) => (
              <div key={b.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={b.driver.name} color={b.driver.avatar_color} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{b.driver.name} → {b.spot.title}</div>
                  <div className="text-xs text-muted">#{b.id} · {fmtDateTime(b.start_at)}</div>
                </div>
                <StatusBadge status={b.status === "live" && b.overstay ? "overstay" : b.status} />
                <div className="w-16 text-right text-sm font-extrabold">{inr(b.total)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2 text-xs text-muted">
        <Users className="h-3.5 w-3.5" /> Tip: use the account switcher (top right) to jump into any driver or owner and see their side.
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RoleGate role="admin">
      <Overview />
    </RoleGate>
  );
}
