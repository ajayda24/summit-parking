"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { RoleGate } from "@/components/AppShell";
import { EmptyRoad, SpotImage } from "@/components/illustrations";
import { Button, PageTitle, Skeleton, StatusBadge, Tabs, useLoader } from "@/components/ui";
import { api, duration, fmtDateTime, fmtTime } from "@/lib/client";
import { inr } from "@/lib/shared";
import type { BookingFull } from "../pass/[id]/page";

type Tab = "active" | "past";

function Bookings() {
  const { me, now } = useApp();
  const { data } = useLoader<BookingFull[]>(() => api("bookings"), [me?.user.id], 5000);
  const [tab, setTab] = useState<Tab>("active");
  const active = (data ?? []).filter((b) => ["requested", "confirmed", "live"].includes(b.status)).sort((a, b) => a.start_at - b.start_at);
  const past = (data ?? []).filter((b) => !["requested", "confirmed", "live"].includes(b.status));
  const list = tab === "active" ? active : past;
  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle kicker="Your trips" title="My bookings">
        <Tabs
          tabs={[
            { id: "active", label: `Upcoming & live (${active.length})` },
            { id: "past", label: `Past (${past.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />
      </PageTitle>
      {!data && <Skeleton className="h-40" />}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {list.map((b, i) => (
            <motion.div key={b.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}>
              <Link href={`/driver/pass/${b.id}`} className="group flex items-center gap-4 overflow-hidden rounded-3xl bg-white p-3 shadow-soft transition hover:shadow-pop">
                <SpotImage spot={b.spot} className="h-20 w-28 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-extrabold">{b.spot.title}</span>
                    <StatusBadge status={b.status === "live" && b.overstay ? "overstay" : b.status} />
                  </div>
                  <div className="mt-0.5 text-sm text-muted">
                    {fmtDateTime(b.start_at)} → {fmtTime(b.end_at)}
                  </div>
                  <div className="mt-1 text-xs font-bold">
                    {b.status === "live" && (b.overstay ? <span className="text-coral-deep">Overtime {duration(now - b.end_at)}</span> : <span className="text-mint-deep">{duration(b.end_at - now)} left</span>)}
                    {b.status === "confirmed" && <span className="text-sky-deep">Starts in {duration(b.start_at - now)}</span>}
                    {b.status === "requested" && <span className="text-butter-deep">Waiting for owner</span>}
                    {!["live", "confirmed", "requested"].includes(b.status) && (
                      <span className="text-muted">
                        Paid {inr(b.total + b.overtime_amount - b.refund_amount)}
                        {b.overtime_amount > 0 && ` · incl. ${inr(b.overtime_amount)} overtime`}
                        {b.refund_amount > 0 && ` · ${inr(b.refund_amount)} refunded`}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-ink/30 transition group-hover:translate-x-1" />
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {data && list.length === 0 && (
        <EmptyRoad title={tab === "active" ? "No upcoming trips" : "No past trips yet"} text="Find a spot nearby and your ticket will show up here.">
          <Link href="/driver">
            <Button>Find parking</Button>
          </Link>
        </EmptyRoad>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RoleGate role="driver">
      <Bookings />
    </RoleGate>
  );
}
