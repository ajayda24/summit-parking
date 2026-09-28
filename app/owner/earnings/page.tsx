"use client";

import { motion } from "framer-motion";
import { Landmark, Percent, Timer, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { RoleGate } from "@/components/AppShell";
import { BarChart } from "@/components/BarChart";
import { EmptyRoad } from "@/components/illustrations";
import { Button, PageTitle, Skeleton, StatCard, StatusBadge, useLoader } from "@/components/ui";
import { api, fmtDateTime } from "@/lib/client";
import { inr } from "@/lib/shared";

type E = {
  days: { day: string; amount: number }[]; total: number; overtime: number; commission: number; withdrawn: number; wallet: number;
  rows: { id: number; title: string; when: number; status: string; base: number; overtime: number; commission_pct: number; payout: number; driver: string }[];
};

function Earnings() {
  const { me } = useApp();
  const { data } = useLoader<E>(() => api("owner/earnings"), [me?.user.id], 10000);
  if (!data) return <Skeleton className="h-96" />;
  const week = data.days.reduce((a, d) => a + d.amount, 0);
  return (
    <div>
      <PageTitle kicker="Money from unused space" title="Earnings">
        <Link href="/wallet">
          <Button variant="dark">
            <Landmark className="h-4 w-4" /> Withdraw {inr(data.wallet)}
          </Button>
        </Link>
      </PageTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Lifetime payouts" value={data.total} money color="mint" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="This week" value={week} money color="lavender" icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="From overtime" value={data.overtime * 0.9} money color="peach" icon={<Timer className="h-4 w-4" />} hint="drivers who stayed longer" />
        <StatCard label="Platform fees" value={data.commission} money color="butter" icon={<Percent className="h-4 w-4" />} hint={`Withdrawn ${inr(data.withdrawn)}`} />
      </div>
      <div className="mt-6 rounded-[2rem] bg-white p-5 shadow-soft">
        <div className="font-extrabold">Payouts, last 7 days</div>
        <div className="text-xs text-muted">What landed in your wallet each day after commission</div>
        <div className="mt-4">
          <BarChart data={data.days} x="day" y="amount" label="Payout" />
        </div>
      </div>
      <div className="mt-6 rounded-[2rem] bg-white p-5 shadow-soft">
        <div className="mb-3 font-extrabold">Per-booking breakdown</div>
        {data.rows.length === 0 ? (
          <EmptyRoad title="No payouts yet" text="As soon as a driver checks out, your earnings show up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-extrabold uppercase tracking-widest text-muted">
                  <th className="p-2">Booking</th>
                  <th className="p-2">Driver</th>
                  <th className="p-2">Status</th>
                  <th className="p-2 text-right">Base</th>
                  <th className="p-2 text-right">Overtime</th>
                  <th className="p-2 text-right">Fee</th>
                  <th className="p-2 text-right">You got</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.4) }} className="border-t border-road">
                    <td className="p-2">
                      <div className="font-bold">{r.title}</div>
                      <div className="text-xs text-muted">#{r.id} · {fmtDateTime(r.when)}</div>
                    </td>
                    <td className="p-2">{r.driver}</td>
                    <td className="p-2"><StatusBadge status={r.status} /></td>
                    <td className="p-2 text-right">{r.status === "completed" ? inr(r.base) : "—"}</td>
                    <td className="p-2 text-right">{r.overtime ? inr(r.overtime) : "—"}</td>
                    <td className="p-2 text-right text-muted">{r.commission_pct}%</td>
                    <td className="p-2 text-right font-black text-mint-deep">+{inr(r.payout)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RoleGate role="owner">
      <Earnings />
    </RoleGate>
  );
}
