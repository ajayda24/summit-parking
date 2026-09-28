"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, ArrowLeft, CalendarPlus, Flag, LogIn, LogOut, Navigation, Receipt, Star, Timer, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Suspense, useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { RoleGate } from "@/components/AppShell";
import { CarSide, SpotImage } from "@/components/illustrations";
import { PaySheet } from "@/components/PaySheet";
import { Button, Modal, Skeleton, Stars, StatusBadge, useLoader } from "@/components/ui";
import { api, duration, fmtDateTime, fmtTime } from "@/lib/client";
import { GRACE_MIN, HOUR, inr, MIN, overtime } from "@/lib/shared";

type Tx = { id: number; type: string; amount: number; note: string; created_at: number };
export type BookingFull = {
  id: number; code: string; status: string; start_at: number; end_at: number; base: number; surge: number; fee: number; total: number;
  checked_in_at: number | null; checked_out_at: number | null; overtime_min: number; overtime_amount: number; refund_amount: number;
  extended_min: number; cancelled_by: string | null; driver_reviewed: number; commission_pct: number; created_at: number;
  spot: { id: number; title: string; address: string; lat: number; lng: number; price: number; photo: string | null; spot_type: string; size: string };
  owner: { name: string }; vehicle: { label: string; plate: string; type: string } | null;
  overstay: boolean; receipt: Tx[]; policy: { refund: number; owner: number; label: string };
  dispute: { status: string; reason: string; resolution: string | null; refund: number } | null; next_free: boolean;
};

function ParkingCelebration() {
  return (
    <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 2.4, duration: 0.6 }} className="pointer-events-none fixed inset-0 z-[950] grid place-items-center bg-cream/80 backdrop-blur-sm">
      <div className="relative w-80">
        <div className="road-strip h-20 rounded-3xl" />
        <div className="absolute right-6 top-[-60px] h-24 w-24 rounded-xl border-4 border-dashed border-mint-deep bg-mint/60" />
        <motion.div initial={{ x: -120 }} animate={{ x: 190, y: -55 }} transition={{ duration: 1.4, ease: "easeInOut" }} className="absolute left-0 top-4 w-24">
          <CarSide />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }} className="mt-8 text-center text-2xl font-black">
          Spot reserved! 🎉
        </motion.div>
      </div>
    </motion.div>
  );
}

function TimerRing({ b, now }: { b: BookingFull; now: number }) {
  const total = b.end_at - (b.checked_in_at ?? b.start_at);
  const elapsed = now - (b.checked_in_at ?? b.start_at);
  const over = now - b.end_at;
  const pct = Math.min(1, Math.max(0, elapsed / total));
  const R = 88;
  const C = 2 * Math.PI * R;
  const ot = overtime(b.spot.price, b.end_at, now);
  const inGrace = over > 0 && over <= GRACE_MIN * MIN;
  const color = over > GRACE_MIN * MIN ? "#FF7A6B" : over > 0 ? "#C99A12" : "#3FAE83";
  return (
    <div className="flex flex-col items-center">
      <div className={`relative h-56 w-56 rounded-full ${over > 0 ? "pulse-ring" : ""}`}>
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx="100" cy="100" r={R} stroke="#E6E8EF" strokeWidth="14" fill="none" />
          <motion.circle cx="100" cy="100" r={R} stroke={color} strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray={C} animate={{ strokeDashoffset: C * (1 - pct) }} transition={{ duration: 0.8 }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color }}>
            {over > 0 ? (inGrace ? "Grace period" : "Overtime") : "Time left"}
          </div>
          <div className="text-4xl font-black tabular-nums">{duration(over > 0 ? over : b.end_at - now)}</div>
          {over > GRACE_MIN * MIN ? (
            <div className="mt-1 text-sm font-extrabold text-coral-deep">+{inr(ot.amount)} so far</div>
          ) : (
            <div className="mt-1 text-xs font-bold text-muted">until {fmtTime(b.end_at)}</div>
          )}
        </div>
      </div>
      {over > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 max-w-xs rounded-2xl bg-rose px-4 py-2 text-center text-xs font-bold text-coral-deep">
          {inGrace
            ? `You have ${GRACE_MIN} min of grace. After that, overtime is charged at 1.5× per 15 min.`
            : `Overtime: ${ot.minutes} min → ${ot.blocks} × 15-min blocks at 1.5× rate. It will be auto-paid from your wallet on check-out.`}
        </motion.div>
      )}
    </div>
  );
}

function Pass() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const { now, refresh, toast } = useApp();
  const { data: b, reload } = useLoader<BookingFull>(() => api(`bookings/${id}`), [id], 5000);
  const [celebrate, setCelebrate] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [extendMin, setExtendMin] = useState<number | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (search.get("new")) {
      setCelebrate(true);
      setTimeout(() => confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ["#FF7A6B", "#BDEBD6", "#D9D2FF", "#FFF1B8", "#CDE7FF"] }), 1300);
      setTimeout(() => setCelebrate(false), 3000);
      window.history.replaceState(null, "", `/driver/pass/${id}`);
    }
  }, [search, id]);

  if (!b) return <Skeleton className="h-[70vh]" />;

  const act = async (path: string, body: object, msg: string) => {
    setBusy(true);
    try {
      const r = await api(`bookings/${b.id}/${path}`, body);
      await Promise.all([reload(), refresh()]);
      toast(msg);
      return r;
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const canCheckIn = b.status === "confirmed" && now >= b.start_at - 15 * MIN;
  const liveOt = b.status === "live" ? overtime(b.spot.price, b.end_at, now) : null;
  const tone = { requested: "bg-butter", confirmed: "bg-sky", live: b.overstay ? "bg-rose" : "bg-mint", completed: "bg-lavender", cancelled: "bg-road", declined: "bg-road", no_show: "bg-peach" }[b.status] ?? "bg-sky";

  return (
    <div className="mx-auto max-w-5xl">
      {celebrate && <ParkingCelebration />}
      <Link href="/driver/bookings" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-ink/60 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> My bookings
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Ticket */}
        <motion.div initial={{ rotate: -2, y: 30, opacity: 0 }} animate={{ rotate: 0, y: 0, opacity: 1 }} transition={{ type: "spring", damping: 16 }} className="overflow-hidden rounded-[2rem] bg-white shadow-pop">
          <div className={`${tone} p-6`}>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink/60">Parking pass</div>
              <StatusBadge status={b.status === "live" && b.overstay ? "overstay" : b.status} />
            </div>
            <div className="mt-3 text-2xl font-black">{b.spot.title}</div>
            <div className="text-sm font-semibold text-ink/70">{b.spot.address}</div>
          </div>
          <div className="perforation h-3.5 bg-white" style={{ backgroundPositionY: "-7px" }} />
          <div className="grid grid-cols-2 gap-4 px-6 pt-2 text-sm">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">From</div>
              <div className="font-extrabold">{fmtDateTime(b.start_at)}</div>
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">To</div>
              <div className="font-extrabold">{fmtDateTime(b.end_at)}</div>
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Vehicle</div>
              <div className="font-extrabold">{b.vehicle?.label ?? "—"}</div>
              <div className="text-xs text-muted">{b.vehicle?.plate}</div>
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Paid</div>
              <div className="font-extrabold">{inr(b.total + b.overtime_amount - b.refund_amount)}</div>
              {b.extended_min > 0 && <div className="text-xs text-muted">incl. +{b.extended_min} min extension</div>}
            </div>
          </div>
          <div className="mt-5 flex flex-col items-center border-t-2 border-dashed border-road px-6 py-6">
            <div className={`rounded-3xl bg-cream p-4 ${["cancelled", "declined", "no_show"].includes(b.status) ? "opacity-30 grayscale" : ""}`}>
              <QRCodeSVG value={`SUMMIT:${b.code}`} size={150} bgColor="transparent" fgColor="#2B2D42" />
            </div>
            <div className="mt-3 font-mono text-xl font-black tracking-[0.25em]">{b.code}</div>
            <div className="mt-1 text-xs text-muted">Show this at the spot, or tell the owner the code</div>
          </div>
        </motion.div>

        {/* State + actions */}
        <div className="space-y-4">
          <div className="rounded-[2rem] bg-white p-6 shadow-soft">
            <AnimatePresence mode="wait">
              {b.status === "requested" && (
                <motion.div key="req" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                  <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-butter">
                    <Timer className="h-8 w-8" />
                  </motion.div>
                  <h2 className="mt-3 text-xl font-extrabold">Waiting for {b.owner.name.split(" ")[0]} to accept</h2>
                  <p className="mt-1 text-sm text-muted">
                    {inr(b.total)} is on hold. If there's no answer in {Math.max(0, Math.ceil((b.created_at + 15 * MIN - now) / MIN))} min, it's auto-refunded.
                  </p>
                </motion.div>
              )}
              {b.status === "confirmed" && (
                <motion.div key="conf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-sky-deep">Starts in</div>
                  <div className="text-5xl font-black tabular-nums">{duration(Math.max(0, b.start_at - now))}</div>
                  <p className="mt-2 text-sm text-muted">
                    {canCheckIn ? "Check-in is open. Scan the QR at the spot or tap below." : `Check-in opens at ${fmtTime(b.start_at - 15 * MIN)}.`} No-show after {fmtTime(b.start_at + 30 * MIN)}.
                  </p>
                </motion.div>
              )}
              {b.status === "live" && (
                <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <TimerRing b={b} now={now} />
                </motion.div>
              )}
              {b.status === "completed" && (
                <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                  <div className="text-4xl">🏁</div>
                  <h2 className="mt-2 text-xl font-extrabold">Trip complete</h2>
                  <p className="mt-1 text-sm text-muted">
                    Checked out at {b.checked_out_at ? fmtTime(b.checked_out_at) : "—"}
                    {b.overtime_amount > 0 ? ` · ${b.overtime_min} min over, ${inr(b.overtime_amount)} overtime auto-paid` : " · right on time"}
                  </p>
                </motion.div>
              )}
              {["cancelled", "declined", "no_show"].includes(b.status) && (
                <motion.div key="x" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                  <XCircle className="mx-auto h-12 w-12 text-coral" />
                  <h2 className="mt-2 text-xl font-extrabold">
                    {b.status === "no_show" ? "Marked as no-show" : b.status === "declined" ? "Request declined" : `Cancelled by ${b.cancelled_by === "owner" ? "owner" : b.cancelled_by === "system" ? "system" : "you"}`}
                  </h2>
                  <p className="mt-1 text-sm text-muted">{b.refund_amount > 0 ? `${inr(b.refund_amount)} refunded to your wallet.` : "No refund for this booking."}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {b.status === "confirmed" && (
                <Button size="lg" className="sm:col-span-2" disabled={!canCheckIn} loading={busy} onClick={() => act("checkin", {}, "Checked in. Enjoy your parking!")}>
                  <LogIn className="h-4 w-4" /> Check in
                </Button>
              )}
              {b.status === "live" && (
                <Button size="lg" className="sm:col-span-2" variant={b.overstay ? "primary" : "dark"} loading={busy} onClick={async () => { const r = await act("checkout", {}, liveOt && liveOt.amount > 0 ? `Checked out · ${inr(liveOt.amount)} overtime auto-paid` : "Checked out. See you next time!"); if (r) setReceiptOpen(true); }}>
                  <LogOut className="h-4 w-4" /> Check out{liveOt && liveOt.amount > 0 ? ` & pay ${inr(liveOt.amount)} overtime` : ""}
                </Button>
              )}
              {(b.status === "live" || b.status === "confirmed") && (
                <>
                  <Button variant="soft" onClick={() => setExtendMin(30)} disabled={!b.next_free}>
                    <CalendarPlus className="h-4 w-4" /> Extend 30 min
                  </Button>
                  <Button variant="soft" onClick={() => setExtendMin(60)} disabled={!b.next_free}>
                    <CalendarPlus className="h-4 w-4" /> Extend 1 hr
                  </Button>
                  {!b.next_free && <div className="text-xs font-bold text-coral-deep sm:col-span-2">Can't extend: the next booking starts right after yours.</div>}
                </>
              )}
              {(b.status === "requested" || b.status === "confirmed") && (
                <Button variant="danger" onClick={() => setCancelOpen(true)}>
                  <XCircle className="h-4 w-4" /> Cancel booking
                </Button>
              )}
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${b.spot.lat},${b.spot.lng}`} target="_blank" rel="noreferrer" className="contents">
                <Button variant="soft">
                  <Navigation className="h-4 w-4" /> Directions
                </Button>
              </a>
              {b.status === "completed" && !b.driver_reviewed && (
                <Button onClick={() => setReviewOpen(true)}>
                  <Star className="h-4 w-4" /> Rate this spot
                </Button>
              )}
              {["completed", "live", "no_show", "cancelled"].includes(b.status) && !b.dispute && (
                <Button variant="soft" onClick={() => setDisputeOpen(true)}>
                  <Flag className="h-4 w-4" /> Report a problem
                </Button>
              )}
              <Button variant="soft" onClick={() => setReceiptOpen(true)}>
                <Receipt className="h-4 w-4" /> Receipt
              </Button>
            </div>
          </div>

          {b.dispute && (
            <div className="flex gap-3 rounded-[2rem] bg-butter p-5">
              <AlertOctagon className="h-5 w-5 shrink-0" />
              <div className="text-sm">
                <div className="font-extrabold">Dispute {b.dispute.status}</div>
                <div className="text-ink/70">“{b.dispute.reason}”</div>
                {b.dispute.resolution && <div className="mt-1 font-bold">Resolution: {b.dispute.resolution}{b.dispute.refund ? ` · ${inr(b.dispute.refund)} refunded` : ""}</div>}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-[2rem] bg-white shadow-soft">
            <SpotImage spot={b.spot} className="h-32 w-full" />
            <div className="p-5 text-sm">
              <div className="font-extrabold">Rules for this booking</div>
              <ul className="mt-2 space-y-1 text-muted">
                <li>• Free cancellation until {fmtTime(b.start_at - HOUR)} · 50% refund after that</li>
                <li>• {GRACE_MIN}-min grace after {fmtTime(b.end_at)}, then 1.5× per 15 min (auto-paid)</li>
                <li>• No check-in by {fmtTime(b.start_at + 30 * MIN)} → no-show, no refund</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this booking?">
        <div className="rounded-3xl bg-cream p-4">
          <div className="text-sm text-muted">{b.policy.label}</div>
          <div className="mt-2 flex items-end justify-between">
            <span className="font-bold">You get back</span>
            <span className="text-3xl font-black text-mint-deep">{inr(b.policy.refund)}</span>
          </div>
          {b.policy.owner > 0 && <div className="mt-1 text-xs text-muted">{inr(b.policy.owner)} goes to the owner as a late-cancellation fee.</div>}
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="soft" className="flex-1" onClick={() => setCancelOpen(false)}>Keep booking</Button>
          <Button variant="danger" className="flex-1" loading={busy} onClick={async () => { await act("cancel", {}, `Cancelled. ${inr(b.policy.refund)} refunded to wallet.`); setCancelOpen(false); }}>
            Yes, cancel
          </Button>
        </div>
      </Modal>

      <PaySheet
        open={extendMin !== null}
        onClose={() => setExtendMin(null)}
        title={`Extend by ${extendMin} min`}
        lines={[{ label: `${extendMin} min × ${inr(b.spot.price)}/hr`, amount: Math.round(((extendMin ?? 0) / 60) * b.spot.price) }]}
        total={Math.round(((extendMin ?? 0) / 60) * b.spot.price)}
        onPay={() => api(`bookings/${b.id}/extend`, { minutes: extendMin })}
        onDone={() => {
          setExtendMin(null);
          reload();
          toast(`Extended until ${fmtTime(b.end_at + (extendMin ?? 0) * MIN)} ⏰`);
        }}
      />

      <Modal open={receiptOpen} onClose={() => setReceiptOpen(false)} title="Receipt">
        <div className="rounded-3xl bg-white p-4">
          <div className="text-xs text-muted">Booking #{b.id} · {b.code}</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>Parking ({Math.round(((b.end_at - b.start_at) / HOUR) * 10) / 10} hr{b.surge > 1 ? `, surge ×${b.surge}` : ""})</span><b>{inr(b.base)}</b></div>
            <div className="flex justify-between"><span>Convenience fee</span><b>{inr(b.fee)}</b></div>
            {b.overtime_amount > 0 && <div className="flex justify-between text-coral-deep"><span>Overtime ({b.overtime_min} min, auto-paid)</span><b>{inr(b.overtime_amount)}</b></div>}
            {b.refund_amount > 0 && <div className="flex justify-between text-mint-deep"><span>Refund</span><b>−{inr(b.refund_amount)}</b></div>}
            {b.dispute?.refund ? <div className="flex justify-between text-mint-deep"><span>Dispute refund</span><b>−{inr(b.dispute.refund)}</b></div> : null}
            <div className="flex justify-between border-t border-dashed border-road-dark pt-2 text-lg font-black"><span>Net paid</span><span>{inr(b.total + b.overtime_amount - b.refund_amount - (b.dispute?.refund ?? 0))}</span></div>
          </div>
        </div>
        <div className="mt-4 text-xs font-extrabold uppercase tracking-widest text-muted">Wallet activity</div>
        <div className="mt-2 space-y-1.5">
          {b.receipt.map((t) => (
            <div key={t.id} className="flex justify-between rounded-2xl bg-white px-3 py-2 text-xs">
              <span>{t.note}</span>
              <b className={t.amount < 0 ? "text-coral-deep" : "text-mint-deep"}>{t.amount < 0 ? "−" : "+"}{inr(Math.abs(t.amount))}</b>
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title={`How was ${b.spot.title}?`}>
        <div className="flex justify-center py-2">
          <Stars value={stars} onChange={setStars} size={36} />
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {["Easy to find", "Safe & secure", "Great value", "Friendly owner", "Tight entry"].map((t) => (
            <button key={t} onClick={() => setText((x) => (x ? `${x}. ${t}` : t))} className="rounded-full bg-white px-3 py-1 text-xs font-bold ring-1 ring-road-dark">{t}</button>
          ))}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Tell other drivers…" className="mt-3 w-full rounded-2xl bg-white p-3 text-sm ring-1 ring-road-dark" />
        <Button className="mt-4 w-full" loading={busy} onClick={async () => { await act("review", { stars, text }, "Thanks for the review! ⭐"); setReviewOpen(false); }}>
          Submit review
        </Button>
      </Modal>

      <Modal open={disputeOpen} onClose={() => setDisputeOpen(false)} title="Report a problem">
        <div className="flex flex-wrap gap-2">
          {["Spot was occupied", "Gate was locked", "Overcharged for overtime", "Owner was rude", "Spot didn't match listing"].map((t) => (
            <button key={t} onClick={() => setText(t)} className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-road-dark ${text === t ? "bg-ink text-white" : "bg-white"}`}>{t}</button>
          ))}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="What happened?" className="mt-3 w-full rounded-2xl bg-white p-3 text-sm ring-1 ring-road-dark" />
        <p className="mt-2 text-xs text-muted">Our trust team reviews every dispute and can refund you from the platform.</p>
        <Button className="mt-4 w-full" loading={busy} onClick={async () => { await act("dispute", { reason: text }, "Dispute submitted. We'll look into it."); setDisputeOpen(false); setText(""); }}>
          Submit dispute
        </Button>
      </Modal>
    </div>
  );
}

export default function Page() {
  return (
    <RoleGate role="driver">
      <Suspense>
        <Pass />
      </Suspense>
    </RoleGate>
  );
}
