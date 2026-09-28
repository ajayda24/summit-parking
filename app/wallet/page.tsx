"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Building2, CreditCard, Landmark, Plus, Smartphone, Wallet } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Button, CountUp, Modal, PageTitle, Skeleton, useLoader } from "@/components/ui";
import { ago, api, fmtDateTime } from "@/lib/client";
import { inr } from "@/lib/shared";

type Tx = { id: number; type: string; amount: number; balance_after: number; note: string; created_at: number; booking_id: number | null };

const TYPE_LABEL: Record<string, string> = {
  topup: "Money added",
  withdraw: "Bank withdrawal",
  booking_hold: "Booking payment",
  extension: "Extension",
  overtime: "Overtime",
  payout: "Payout",
  refund: "Refund",
  compensation: "Compensation",
  dispute_refund: "Dispute refund",
};

export default function WalletPage() {
  const { me, now, refresh, toast } = useApp();
  const { data, reload } = useLoader<{ balance: number; transactions: Tx[] }>(() => api("wallet"), [me?.user.id]);
  const [mode, setMode] = useState<"add" | "withdraw" | null>(null);
  const [amount, setAmount] = useState(500);
  const [method, setMethod] = useState("upi");
  const [stage, setStage] = useState<"form" | "processing" | "done">("form");
  if (!me) return <Skeleton className="h-96" />;
  const isOwner = me.user.role !== "driver";

  const submit = async () => {
    setStage("processing");
    try {
      await new Promise((r) => setTimeout(r, mode === "withdraw" ? 2200 : 1200));
      if (mode === "add") await api("wallet/topup", { amount, method: method === "upi" ? "Demo UPI" : "Demo card ••4242" });
      else await api("wallet/withdraw", { amount, bank: "Demo Bank ••4821" });
      setStage("done");
      await Promise.all([reload(), refresh()]);
      setTimeout(() => {
        setMode(null);
        setStage("form");
      }, 1100);
      toast(mode === "add" ? `${inr(amount)} added to wallet` : `${inr(amount)} sent to your bank`);
    } catch (e) {
      toast((e as Error).message, "error");
      setStage("form");
    }
  };

  const inflow = (data?.transactions ?? []).filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);
  const outflow = (data?.transactions ?? []).filter((t) => t.amount < 0).reduce((a, t) => a - t.amount, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle kicker="Payments" title="Wallet" />
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr] md:gap-5">
        <motion.div initial={{ rotateX: 20, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} className="relative overflow-hidden rounded-[2rem] bg-brand p-6 text-white shadow-pop sm:p-7">
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-0 right-0 h-5 bg-white/10 [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.5)_0_18px,transparent_18px_36px)] [background-position:center] [background-repeat:repeat-x] [background-size:100%_2px]" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-white/70">
                <Wallet className="h-4 w-4" /> Summit wallet
              </div>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold">DEMO MONEY</span>
            </div>
            <div className={`mt-6 text-5xl font-black ${me.user.wallet < 0 ? "text-[#FFD9D4]" : ""}`}>
              <CountUp value={data?.balance ?? me.user.wallet} />
            </div>
            <div className="mt-1 text-sm font-bold text-white/70">{me.user.name}</div>
            {me.user.wallet < 0 && <div className="mt-2 rounded-xl bg-white/70 px-3 py-1.5 text-xs font-bold text-coral-deep">Negative balance from overtime. Top up to book again.</div>}
            <div className="mt-6 flex gap-2">
              <Button variant="soft" onClick={() => { setMode("add"); setAmount(500); }}>
                <Plus className="h-4 w-4" /> Add money
              </Button>
              {isOwner && (
                <Button variant="dark" className="!bg-white/15 hover:!bg-white/25" onClick={() => { setMode("withdraw"); setAmount(Math.max(0, Math.floor(me.user.wallet))); }} disabled={me.user.wallet <= 0}>
                  <Landmark className="h-4 w-4" /> Withdraw
                </Button>
              )}
            </div>
          </div>
        </motion.div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
          <div className="rounded-[2rem] bg-white p-5 shadow-soft">
            <ArrowDownLeft className="h-5 w-5 text-ok" />
            <div className="mt-2 text-xs font-extrabold uppercase tracking-widest text-ink/50">Money in</div>
            <div className="text-2xl font-black"><CountUp value={inflow} /></div>
          </div>
          <div className="rounded-[2rem] bg-white p-5 shadow-soft">
            <ArrowUpRight className="h-5 w-5 text-muted" />
            <div className="mt-2 text-xs font-extrabold uppercase tracking-widest text-ink/50">Money out</div>
            <div className="text-2xl font-black"><CountUp value={outflow} /></div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-[2rem] bg-white p-5 shadow-soft">
        <div className="mb-3 text-lg font-extrabold">Transactions</div>
        {!data && <Skeleton className="h-40" />}
        <div className="divide-y divide-road">
          <AnimatePresence>
            {data?.transactions.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.4) }} className="flex items-center gap-3 py-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${t.amount >= 0 ? "bg-ok-soft text-ok" : "bg-road text-muted"}`}>
                  {t.amount >= 0 ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{TYPE_LABEL[t.type] ?? t.type}</div>
                  <div className="truncate text-xs text-muted">{t.note}</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-extrabold ${t.amount >= 0 ? "text-mint-deep" : "text-ink"}`}>{t.amount >= 0 ? "+" : "−"}{inr(Math.abs(t.amount))}</div>
                  <div className="text-[11px] text-muted" title={fmtDateTime(t.created_at)}>{ago(t.created_at, now)} · bal {inr(t.balance_after)}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <Modal open={!!mode} onClose={() => stage !== "processing" && setMode(null)} title={mode === "add" ? "Add money" : "Withdraw to bank"}>
        {stage === "form" && (
          <>
            <div className="rounded-3xl bg-white p-5 text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-muted">Amount</div>
              <div className="mt-1 flex items-center justify-center text-4xl font-black">
                ₹<input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-40 bg-transparent text-center" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {(mode === "add" ? [200, 500, 1000, 2000] : [Math.floor(me.user.wallet / 2), Math.floor(me.user.wallet)]).map((v) => (
                <button key={v} onClick={() => setAmount(v)} className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${amount === v ? "bg-ink text-white" : "bg-white"}`}>{inr(v)}</button>
              ))}
            </div>
            {mode === "add" ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {([["upi", "UPI", Smartphone], ["card", "Card ••4242", CreditCard]] as const).map(([id, label, Icon]) => (
                  <button key={id} onClick={() => setMethod(id)} className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold ring-2 ${method === id ? "bg-white ring-ink" : "bg-white/60 ring-transparent"}`}>
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3">
                <Building2 className="h-8 w-8 rounded-xl bg-brand-soft p-1.5 text-brand" />
                <div className="text-sm">
                  <div className="font-bold">Demo Bank ••4821</div>
                  <div className="text-xs text-muted">IFSC DEMO0001234 · instant (demo)</div>
                </div>
              </div>
            )}
            <Button size="lg" className="mt-5 w-full" onClick={submit} disabled={amount <= 0}>
              {mode === "add" ? `Add ${inr(amount)}` : `Withdraw ${inr(amount)}`}
            </Button>
          </>
        )}
        {stage !== "form" && (
          <div className="py-8 text-center">
            {mode === "withdraw" ? (
              <div className="relative mx-auto h-16 w-64">
                <Wallet className="absolute left-0 top-3 h-10 w-10" />
                <Landmark className="absolute right-0 top-3 h-10 w-10" />
                <motion.div className="absolute top-5 text-2xl" initial={{ left: 40 }} animate={{ left: stage === "done" ? 200 : [40, 200] }} transition={{ repeat: stage === "done" ? 0 : Infinity, duration: 1 }}>💸</motion.div>
              </div>
            ) : (
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="text-5xl">💳</motion.div>
            )}
            <div className="mt-4 font-extrabold">{stage === "done" ? "Done! ✅" : mode === "add" ? "Adding money…" : "Sending to your bank…"}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
