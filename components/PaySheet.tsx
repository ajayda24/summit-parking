"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CreditCard, Smartphone, Wallet, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { api, HttpError } from "@/lib/client";
import { inr } from "@/lib/shared";
import { useApp } from "./AppProvider";
import { Button, Modal } from "./ui";

type Line = { label: string; amount: number; muted?: boolean };

/**
 * Demo wallet checkout: shows the breakdown, tops up inline when the wallet is short,
 * plays a processing animation and then runs `onPay` (the real API call).
 */
export function PaySheet<T>({
  open, onClose, title, lines, total, onPay, onDone, cta = "Pay",
}: {
  open: boolean; onClose: () => void; title: string; lines: Line[]; total: number;
  onPay: () => Promise<T>; onDone: (r: T) => void; cta?: string;
}) {
  const { me, refresh, toast } = useApp();
  const [stage, setStage] = useState<"review" | "processing" | "done" | "failed">("review");
  const [error, setError] = useState("");
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const balance = me?.user.wallet ?? 0;
  const short = Math.max(0, Math.ceil(total - balance));
  const [topup, setTopup] = useState(0);

  useEffect(() => {
    if (open) {
      setStage("review");
      setError("");
      setTopup(short > 0 ? Math.ceil(short / 50) * 50 : 0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pay = async () => {
    setStage("processing");
    const started = Date.now();
    try {
      if (short > 0) {
        await api("wallet/topup", { amount: Math.max(topup, short), method: method === "upi" ? "Demo UPI (summit@okbank)" : "Demo card ••4242" });
      }
      const r = await onPay();
      await new Promise((res) => setTimeout(res, Math.max(0, 1400 - (Date.now() - started))));
      setStage("done");
      await refresh();
      setTimeout(() => onDone(r), 900);
    } catch (e) {
      await new Promise((res) => setTimeout(res, Math.max(0, 900 - (Date.now() - started))));
      setError((e as Error).message);
      setStage("failed");
      await refresh();
      if (e instanceof HttpError && e.status === 409) toast((e as Error).message, "error");
    }
  };

  return (
    <Modal open={open} onClose={stage === "processing" ? () => {} : onClose} title={title}>
      <AnimatePresence mode="wait">
        {stage === "review" && (
          <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="relative overflow-hidden rounded-3xl bg-brand p-5 text-white">
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-white/70">
                <Wallet className="h-4 w-4" /> Summit wallet
              </div>
              <div className="mt-2 text-3xl font-black">{inr(balance)}</div>
              <div className="mt-1 text-xs font-bold text-white/70">{me?.user.name} · demo money</div>
            </div>
            <div className="mt-4 space-y-2 rounded-3xl bg-white p-4">
              {lines.map((l) => (
                <div key={l.label} className={`flex justify-between text-sm ${l.muted ? "text-muted" : "font-semibold"}`}>
                  <span>{l.label}</span>
                  <span>{inr(l.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-dashed border-road-dark pt-2 text-lg font-black">
                <span>Total</span>
                <span>{inr(total)}</span>
              </div>
            </div>
            {short > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-3xl bg-warn-soft p-4">
                <div className="text-sm font-extrabold">You're {inr(short)} short. Add money and pay in one go.</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[short, Math.ceil(short / 100) * 100 + 100, 500, 1000].filter((v, i, a) => v >= short && a.indexOf(v) === i).map((v) => (
                    <button key={v} onClick={() => setTopup(v)} className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${topup === v ? "bg-ink text-white" : "bg-white"}`}>
                      + {inr(v)}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(
                    [
                      ["upi", "UPI", Smartphone],
                      ["card", "Card ••4242", CreditCard],
                    ] as const
                  ).map(([id, label, Icon]) => (
                    <button key={id} onClick={() => setMethod(id)} className={`flex items-center justify-center gap-2 rounded-2xl py-2 text-xs font-bold ring-2 ${method === id ? "bg-white ring-ink" : "bg-white/60 ring-transparent"}`}>
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
            {me?.fail_payment && <div className="mt-3 rounded-2xl bg-rose px-3 py-2 text-xs font-bold text-coral-deep">Demo: payment failure simulation is ON</div>}
            <Button size="lg" className="mt-5 w-full" onClick={pay}>
              {short > 0 ? `Add ${inr(Math.max(topup, short))} & ${cta.toLowerCase()}` : `${cta} ${inr(total)}`}
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted">Demo payment · no real money moves</p>
          </motion.div>
        )}
        {stage === "processing" && (
          <motion.div key="proc" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-8 text-center">
            <motion.div animate={{ rotateY: [0, 180, 360] }} transition={{ repeat: Infinity, duration: 1.4 }} className="mx-auto h-24 w-40 rounded-2xl bg-brand p-3 text-left text-white shadow-pop">
              <div className="h-5 w-7 rounded bg-white/40" />
              <div className="mt-6 text-xs font-bold tracking-widest">•••• 4242</div>
            </motion.div>
            <div className="mt-6 font-extrabold">Processing payment…</div>
            <div className="mx-auto mt-3 h-2 w-48 overflow-hidden rounded-full bg-road">
              <motion.div className="h-full bg-coral" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.4 }} />
            </div>
          </motion.div>
        )}
        {stage === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="py-10 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10 }}>
              <CheckCircle2 className="mx-auto h-20 w-20 text-mint-deep" />
            </motion.div>
            <div className="mt-4 text-xl font-extrabold">Payment successful</div>
          </motion.div>
        )}
        {stage === "failed" && (
          <motion.div key="fail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6 text-center">
            <motion.div className="shake">
              <XCircle className="mx-auto h-16 w-16 text-coral" />
            </motion.div>
            <div className="mt-3 text-lg font-extrabold">That didn't go through</div>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{error}</p>
            <div className="mt-5 flex gap-2">
              <Button variant="soft" className="flex-1" onClick={onClose}>
                Back
              </Button>
              <Button className="flex-1" onClick={() => setStage("review")}>
                Try again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
