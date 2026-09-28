"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, CircleDollarSign, Gauge, QrCode, ScanLine, Star, Timer, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { RoleGate } from "@/components/AppShell";
import { EmptyRoad, VehicleArt } from "@/components/illustrations";
import { Avatar, Button, Modal, PageTitle, Skeleton, StatCard, Stars, StatusBadge, useLoader } from "@/components/ui";
import { api, duration, fmtDateTime, fmtTime } from "@/lib/client";
import { inr, MIN } from "@/lib/shared";

type B = {
  id: number; code: string; status: string; start_at: number; end_at: number; base: number; total: number; overstay: boolean; created_at: number;
  checked_in_at: number | null; overtime_amount: number; owner_payout: number; owner_rated: number; refund_amount: number;
  live_overtime: { minutes: number; amount: number } | null;
  spot: { id: number; title: string; price: number }; driver: { id: number; name: string; avatar_color: string; rating: number };
  vehicle: { label: string; plate: string; type: string } | null;
};
type BoardSpot = { id: number; title: string; size: string; state: string; price: number; live: B | null; next: B | null };
type Board = { board: BoardSpot[]; requests: B[]; upcoming: B[]; live: B[]; recent: B[]; stats: { today: number; total: number; wallet: number; occupancy: number; spots: number; rating: number } };

const BAY: Record<string, string> = { free: "bg-white ring-1 ring-line", live: "bg-brand-soft ring-1 ring-brand/20", overstay: "bg-bad-soft ring-1 ring-bad/20", upcoming: "bg-warn-soft ring-1 ring-warn/15", paused: "bg-road", pending: "bg-road", rejected: "bg-road" };

function OwnerBoard() {
  const { me, now, toast, refresh } = useApp();
  const { data, reload } = useLoader<Board>(() => api("owner/board"), [me?.user.id], 5000);
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [rateFor, setRateFor] = useState<B | null>(null);
  const [cancelFor, setCancelFor] = useState<B | null>(null);
  const [stars, setStars] = useState(5);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      await Promise.all([reload(), refresh()]);
      toast(msg);
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const verify = async (c = code) => {
    setScanning(true);
    await new Promise((r) => setTimeout(r, 900));
    const ok = await run(() => api("owner/verify-code", { code: c }), "✅ QR verified: driver checked in");
    setScanning(false);
    if (ok) setCode("");
  };

  if (!data) return <Skeleton className="h-[60vh]" />;
  const s = data.stats;
  const qrCard = (
            <div className="overflow-hidden rounded-[2rem] bg-ink p-5 text-white shadow-pop">
              <div className="flex items-center gap-2 font-extrabold"><QrCode className="h-5 w-5 text-mint" /> Check a driver in</div>
              <p className="mt-1 text-xs text-white/60">Scan the driver's QR, or type the code on their pass.</p>
              <div className="relative mx-auto mt-4 grid h-36 w-36 place-items-center rounded-3xl border-2 border-dashed border-white/30">
                <ScanLine className="h-10 w-10 text-white/40" />
                {scanning && <motion.div className="absolute inset-x-3 h-0.5 bg-white shadow-[0_0_12px_#C9D4F4]" initial={{ top: 12 }} animate={{ top: [12, 128, 12] }} transition={{ repeat: Infinity, duration: 1 }} />}
              </div>
              <div className="mt-4 flex gap-2">
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SP-XXXXXX" className="min-w-0 flex-1 rounded-2xl bg-white/10 px-3 py-2 font-mono text-sm font-bold tracking-widest placeholder:text-white/30" />
                <Button onClick={() => verify()} loading={scanning} disabled={!code}>Verify</Button>
              </div>
              {data.upcoming.filter((b) => b.start_at - now < 3 * 60 * MIN).length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">Arriving soon · tap to simulate a scan</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {data.upcoming.filter((b) => b.start_at - now < 3 * 60 * MIN).map((b) => (
                      <button key={b.id} onClick={() => { setCode(b.code); verify(b.code); }} className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-[11px] font-bold hover:bg-white/20">
                        {b.code} · {b.driver.name.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
  );
  return (
    <div>
      <PageTitle kicker={`Hi ${me?.user.name.split(" ")[0]}`} title="Your live parking board">
        <Link href="/owner/new" className="hidden lg:block"><Button>+ List a spot</Button></Link>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Earned today" value={s.today} money color="mint" icon={<CircleDollarSign className="h-4 w-4" />} />
        <StatCard label="Total earned" value={s.total} money color="lavender" icon={<Wallet className="h-4 w-4" />} hint={`Wallet ${inr(s.wallet)}`} />
        <StatCard label="Occupied now" value={s.occupancy} color="sky" icon={<Gauge className="h-4 w-4" />} hint={`of ${s.spots} spots`} />
        <StatCard label="Your rating" value={Math.round(s.rating * 10) / 10} color="butter" icon={<Star className="h-4 w-4" />} hint="from drivers" />
      </div>

      {data.board.length === 0 ? (
        <div className="mt-8 rounded-[2rem] bg-white shadow-soft">
          <EmptyRoad title="No spots listed yet" text="List your driveway or plot. Once it's verified, bookings will show up here live.">
            <Link href="/owner/new"><Button>List your first spot</Button></Link>
          </EmptyRoad>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr] lg:gap-6">
          <div className="space-y-5 lg:space-y-6">
            <div className="lg:hidden">{qrCard}</div>
            {/* Requests */}
            <AnimatePresence>
              {data.requests.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-[2rem] bg-white p-5 shadow-soft ring-2 ring-warn/20">
                  <div className="mb-3 flex items-center gap-2 font-extrabold"><Timer className="h-5 w-5" /> Booking requests</div>
                  <div className="space-y-2">
                    {data.requests.map((b) => (
                      <motion.div layout key={b.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3">
                        <Avatar name={b.driver.name} color={b.driver.avatar_color} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-extrabold">{b.driver.name} · {b.vehicle?.label}</div>
                          <div className="text-xs text-muted">{b.spot.title} · {fmtDateTime(b.start_at)}–{fmtTime(b.end_at)} · {inr(b.base)}</div>
                          <div className="text-[11px] font-bold text-coral-deep">Auto-declines in {duration(Math.max(0, b.created_at + 15 * MIN - now))}</div>
                        </div>
                        <Button size="sm" variant="soft" onClick={() => run(() => api(`bookings/${b.id}/decline`, { reason: "Not available" }), "Declined. Driver fully refunded.")}><X className="h-3.5 w-3.5" /> Decline</Button>
                        <Button size="sm" onClick={() => run(() => api(`bookings/${b.id}/accept`, {}), "Accepted! Driver notified.")}><Check className="h-3.5 w-3.5" /> Accept</Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Occupancy board */}
            <div className="rounded-[2rem] bg-white p-5 shadow-soft">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="font-extrabold">Live occupancy</div>
                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                  {[["bg-white ring-1 ring-line", "Free"], ["bg-warn-soft", "Soon"], ["bg-brand-soft", "Live"], ["bg-bad-soft", "Overstay"]].map(([c, l]) => (
                    <span key={l} className="flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded ${c}`} />{l}</span>
                  ))}
                </div>
              </div>
              <div className="road-strip mb-3 h-5 rounded-full" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data.board.map((spot, i) => (
                  <motion.div key={spot.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className={`bay relative flex min-h-40 flex-col justify-between rounded-2xl ${BAY[spot.state] ?? "bg-road"} p-3 ${spot.state === "overstay" ? "pulse-ring" : ""}`}>
                    <div className="flex items-start justify-between gap-1">
                      <div className="text-xs font-extrabold leading-tight">{spot.title}</div>
                      <span className="rounded-md bg-white/70 px-1.5 text-[10px] font-extrabold">{spot.size}</span>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                      {spot.live ? (
                        <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-20">
                          <VehicleArt type={spot.live.vehicle?.type ?? "sedan"} className="w-full" />
                        </motion.div>
                      ) : (
                        <div className="text-2xl font-black text-ink/20">P</div>
                      )}
                    </div>
                    <div className="text-[11px] font-bold">
                      {spot.live ? (
                        spot.live.overstay ? (
                          <span className="flex items-center gap-1 text-coral-deep"><AlertTriangle className="h-3 w-3" /> {spot.live.driver.name.split(" ")[0]} +{duration(now - spot.live.end_at)} · +{inr(spot.live.live_overtime?.amount ?? 0)}</span>
                        ) : (
                          <span>{spot.live.driver.name.split(" ")[0]} · {duration(spot.live.end_at - now)} left</span>
                        )
                      ) : spot.next ? (
                        <span>Next: {fmtTime(spot.next.start_at)} · {spot.next.driver.name.split(" ")[0]}</span>
                      ) : (
                        <StatusBadge status={spot.state} />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Upcoming */}
            <div className="rounded-[2rem] bg-white p-5 shadow-soft">
              <div className="mb-3 font-extrabold">Upcoming bookings</div>
              {data.upcoming.length === 0 && <div className="py-4 text-sm text-muted">Nothing coming up yet.</div>}
              <div className="divide-y divide-road">
                {data.upcoming.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 py-3">
                    <Avatar name={b.driver.name} color={b.driver.avatar_color} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold">{b.driver.name} <span className="text-xs text-muted">★ {b.driver.rating ? b.driver.rating.toFixed(1) : "new"}</span></div>
                      <div className="text-xs text-muted">{b.spot.title} · {fmtDateTime(b.start_at)} → {fmtTime(b.end_at)}</div>
                    </div>
                    <span className="hidden font-mono text-xs font-bold sm:inline">{b.code}</span>
                    <button onClick={() => setCancelFor(b)} className="text-xs font-bold text-coral-deep hover:underline">Cancel</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5 lg:space-y-6">
            <div className="hidden lg:block">{qrCard}</div>
            {/* Recent */}
            <div className="rounded-[2rem] bg-white p-5 shadow-soft">
              <div className="mb-3 flex items-center justify-between font-extrabold">
                Recent activity
                <Link href="/owner/earnings" className="text-xs font-bold text-coral">Earnings →</Link>
              </div>
              <div className="space-y-2">
                {data.recent.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                    <Avatar name={b.driver.name} color={b.driver.avatar_color} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold">{b.driver.name.split(" ")[0]} <StatusBadge status={b.status} /></div>
                      <div className="truncate text-[11px] text-muted">{b.spot.title} · {fmtDateTime(b.start_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-mint-deep">+{inr(b.owner_payout)}</div>
                      {b.overtime_amount > 0 && <div className="text-[10px] font-bold text-coral-deep">incl. overtime</div>}
                      {b.status === "completed" && !b.owner_rated && (
                        <button onClick={() => { setRateFor(b); setStars(5); }} className="text-[10px] font-extrabold text-lavender-deep hover:underline">Rate driver</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={!!rateFor} onClose={() => setRateFor(null)} title={`Rate ${rateFor?.driver.name}`}>
        <p className="text-sm text-muted">Was the driver on time and careful with your space?</p>
        <div className="my-4 flex justify-center"><Stars value={stars} onChange={setStars} size={36} /></div>
        <Button className="w-full" loading={busy} onClick={async () => { if (await run(() => api(`bookings/${rateFor!.id}/review`, { stars, text: "" }), "Thanks! Rating saved.")) setRateFor(null); }}>Save rating</Button>
      </Modal>
      <Modal open={!!cancelFor} onClose={() => setCancelFor(null)} title="Cancel this driver's booking?">
        <p className="text-sm text-muted">
          {cancelFor?.driver.name} gets a <b>full refund of {inr(cancelFor?.total ?? 0)}</b>. Owner cancellations are tracked by the trust team and can affect your listing.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="soft" className="flex-1" onClick={() => setCancelFor(null)}>Keep it</Button>
          <Button variant="danger" className="flex-1" loading={busy} onClick={async () => { if (await run(() => api(`bookings/${cancelFor!.id}/cancel`, {}), "Booking cancelled. Driver refunded.")) setCancelFor(null); }}>Cancel booking</Button>
        </div>
      </Modal>
    </div>
  );
}

export default function Page() {
  return (
    <RoleGate role="owner">
      <OwnerBoard />
    </RoleGate>
  );
}
