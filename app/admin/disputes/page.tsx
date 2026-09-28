"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, MessageSquareWarning } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { RoleGate } from "@/components/AppShell";
import { EmptyRoad } from "@/components/illustrations";
import { Avatar, Button, Modal, PageTitle, Skeleton, StatusBadge, useLoader } from "@/components/ui";
import { ago, api, fmtDateTime, fmtTime } from "@/lib/client";
import { inr } from "@/lib/shared";

type D = {
  id: number; reason: string; status: string; resolution: string | null; refund: number; created_at: number; raised_by_name: string;
  booking: { id: number; code: string; status: string; start_at: number; end_at: number; total: number; overtime_amount: number; overtime_min: number; checked_in_at: number | null; checked_out_at: number | null; spot: { title: string }; driver: { name: string; avatar_color: string }; owner: { name: string } };
  timeline: { id: number; user_id: number; type: string; amount: number; note: string; created_at: number }[];
};

function Disputes() {
  const { me, now, toast } = useApp();
  const { data, reload } = useLoader<D[]>(() => api("admin/disputes"), [me?.user.id], 8000);
  const [open, setOpen] = useState<D | null>(null);
  const [refund, setRefund] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const resolve = async () => {
    if (!open) return;
    setBusy(true);
    try {
      await api(`admin/disputes/${open.id}/resolve`, { refund, resolution: note || (refund ? "Partial refund issued" : "No refund. Booking was delivered as described.") });
      toast(refund ? `Resolved with ${inr(refund)} refund` : "Dispute closed");
      setOpen(null);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle kicker="Trust & safety" title="Disputes" />
      {!data && <Skeleton className="h-40" />}
      {data && data.length === 0 && <EmptyRoad title="No disputes 🕊️" text="When a driver or owner reports a problem, it lands here." />}
      <div className="space-y-3">
        <AnimatePresence>
          {data?.map((d, i) => (
            <motion.div key={d.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`flex flex-wrap items-center gap-4 rounded-[2rem] p-5 shadow-soft ${d.status === "open" ? "bg-white" : "bg-white/60"}`}>
              <div className={`grid h-12 w-12 place-items-center rounded-2xl ${d.status === "open" ? "bg-rose" : "bg-mint"}`}>
                {d.status === "open" ? <MessageSquareWarning className="h-5 w-5 text-coral-deep" /> : <CheckCircle2 className="h-5 w-5 text-mint-deep" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold">{d.booking.spot.title}</span>
                  <StatusBadge status={d.status} />
                  <span className="text-xs text-muted">#{d.booking.id} · raised by {d.raised_by_name} {ago(d.created_at, now)}</span>
                </div>
                <div className="mt-1 text-sm text-ink/80">“{d.reason}”</div>
                {d.resolution && <div className="mt-1 text-xs font-bold text-mint-deep">{d.resolution}{d.refund ? ` · ${inr(d.refund)} refunded` : ""}</div>}
              </div>
              {d.status === "open" && (
                <Button onClick={() => { setOpen(d); setRefund(Math.round(d.booking.total / 2)); setNote(""); }}>Review</Button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={`Dispute on booking #${open?.booking.id}`} wide>
        {open && (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <div className="rounded-2xl bg-white p-4 text-sm">
                <div className="flex items-center gap-2">
                  <Avatar name={open.booking.driver.name} color={open.booking.driver.avatar_color} size={28} />
                  <b>{open.booking.driver.name}</b> <span className="text-muted">at</span> <b>{open.booking.spot.title}</b>
                </div>
                <div className="mt-2 text-xs text-muted">Owner: {open.booking.owner.name} · code {open.booking.code}</div>
                <div className="mt-3 rounded-xl bg-rose/50 p-3 text-sm">“{open.reason}”</div>
              </div>
              <div className="mt-4 text-xs font-extrabold uppercase tracking-widest text-muted">Timeline</div>
              <ol className="mt-2 space-y-2 border-l-2 border-road pl-4 text-xs">
                <li><b>Booked</b> for {fmtDateTime(open.booking.start_at)}–{fmtTime(open.booking.end_at)}</li>
                {open.booking.checked_in_at && <li><b>Checked in</b> {fmtDateTime(open.booking.checked_in_at)}</li>}
                {open.booking.checked_out_at && <li><b>Checked out</b> {fmtDateTime(open.booking.checked_out_at)}{open.booking.overtime_min ? ` (${open.booking.overtime_min} min over)` : ""}</li>}
                {open.timeline.map((t) => (
                  <li key={t.id} className="text-muted">{fmtDateTime(t.created_at)} · {t.note} · <b className={t.amount < 0 ? "text-coral-deep" : "text-mint-deep"}>{inr(t.amount)}</b></li>
                ))}
              </ol>
            </div>
            <div>
              <div className="rounded-3xl bg-cream p-5">
                <div className="text-xs font-extrabold uppercase tracking-widest text-muted">Refund to driver (from platform)</div>
                <div className="mt-2 text-4xl font-black">{inr(refund)}</div>
                <input type="range" min={0} max={open.booking.total + open.booking.overtime_amount} value={refund} onChange={(e) => setRefund(Number(e.target.value))} className="mt-3 w-full accent-coral" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[0, 0.25, 0.5, 1].map((p) => (
                    <button key={p} onClick={() => setRefund(Math.round((open.booking.total + open.booking.overtime_amount) * p))} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold">{p * 100}%</button>
                  ))}
                </div>
              </div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Resolution note (shared with both sides)" className="mt-3 w-full rounded-2xl bg-white p-3 text-sm ring-1 ring-road-dark" />
              <Button className="mt-3 w-full" loading={busy} onClick={resolve}>
                {refund ? `Refund ${inr(refund)} & close` : "Close without refund"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function Page() {
  return (
    <RoleGate role="admin">
      <Disputes />
    </RoleGate>
  );
}
