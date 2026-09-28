"use client";

import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, CarFront, Clock4, Home, ShieldCheck, Sparkles, Timer, Wallet, Zap } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { RoadHero, VehicleArt } from "@/components/illustrations";
import { Avatar, Button } from "@/components/ui";

const ROLES = [
  {
    role: "driver" as const,
    title: "I need parking",
    text: "Find a spot that fits your car, book by the hour, pay from your wallet.",
    color: "bg-white",
    icon: CarFront,
    cta: "Find parking",
  },
  {
    role: "owner" as const,
    title: "I have space",
    text: "List your driveway or plot, get verified, and earn from unused hours.",
    color: "bg-white",
    icon: Home,
    cta: "Start earning",
  },
  {
    role: "admin" as const,
    title: "I run the platform",
    text: "Verify owners, settle disputes, tune pricing and watch demand.",
    color: "bg-white",
    icon: ShieldCheck,
    cta: "Open console",
  },
];

const STEPS = [
  { icon: CarFront, title: "Pick your ride", text: "Bike to van, petrol to EV. We hide spots that won't fit." },
  { icon: Sparkles, title: "Compare nearby", text: "Map or list, price, distance, road width and ratings." },
  { icon: Wallet, title: "Book & pay", text: "Choose a time, pay from your wallet, get a QR ticket." },
  { icon: Timer, title: "Park worry-free", text: "Live timer, extend in a tap, fair overtime auto-pay." },
];

export default function Landing() {
  const { users, switchTo } = useApp();
  const first = (role: string) => users.find((u) => u.role === role);
  return (
    <div>
      <section className="relative overflow-hidden">
        <RoadHero className="absolute inset-0 hidden h-full w-full md:block" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-cream/95 via-cream/40 to-transparent md:block" />
        <div className="relative mx-auto max-w-7xl px-4 pb-4 pt-8 md:pb-40 md:pt-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-brand ring-1 ring-line">
              <Zap className="h-3.5 w-3.5" /> Bengaluru beta · demo mode
            </span>
            <h1 className="mt-4 text-[44px] font-black leading-[1.02] tracking-tight sm:text-7xl">
              Stop circling.
              <br />
              <span className="text-brand">Start parking.</span>
            </h1>
            <p className="mt-4 max-w-lg text-base font-medium text-ink/70 sm:text-lg">
              Book idle driveways, plots and basements nearby. Spots that fit your car, prices up front, and a guaranteed slot when you arrive.
            </p>
            <div className="mt-6 flex gap-3">
              <Button size="lg" className="flex-1 sm:flex-none" onClick={() => first("driver") && switchTo(first("driver")!.id)}>
                Find parking <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="soft" className="flex-1 sm:flex-none" onClick={() => first("owner") && switchTo(first("owner")!.id)}>
                List my space
              </Button>
            </div>
          </motion.div>
        </div>
        <RoadHero className="block h-40 w-full md:hidden" />
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pt-4 md:-mt-24 md:pt-0">
        <div className="grid gap-4 md:grid-cols-3">
          {ROLES.map((r, i) => (
            <motion.div
              key={r.role}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
              whileHover={{ y: -6 }}
              className={`rounded-[1.75rem] ${r.color} p-5 shadow-soft ring-1 ring-line/60 sm:p-6`}
            >
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-soft text-brand">
                  <r.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink/50">{r.role}</span>
              </div>
              <h3 className="mt-4 text-2xl font-extrabold">{r.title}</h3>
              <p className="mt-1 text-sm font-medium text-ink/70">{r.text}</p>
              <div className="mt-5 space-y-2">
                {users
                  .filter((u) => u.role === r.role)
                  .slice(0, 3)
                  .map((u) => (
                    <button key={u.id} onClick={() => switchTo(u.id)} className="group flex w-full items-center gap-3 rounded-2xl bg-cream p-2 text-left transition hover:bg-road/60">
                      <Avatar name={u.name} color={u.avatar_color} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">Continue as {u.name.split(" ")[0]}</div>
                        <div className="truncate text-xs text-muted">{u.tagline}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 opacity-40 transition group-hover:translate-x-1 group-hover:opacity-100" />
                    </button>
                  ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 md:py-20">
        <div className="text-center">
          <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-coral">How it works</div>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">From “where do I park?” to parked, in four stops</h2>
        </div>
        <div className="relative mt-12">
          <div className="road-strip absolute left-0 right-0 top-9 hidden h-5 rounded-full md:block" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-6">
            {STEPS.map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="relative text-center">
                <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-white shadow-soft ring-4 ring-cream">
                  <s.icon className="h-6 w-6 text-brand" />
                  <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-black text-white">{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-extrabold">{s.title}</h3>
                <p className="mx-auto mt-1 max-w-[16rem] text-sm text-muted">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24">
        <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] bg-white p-6 shadow-soft md:grid-cols-2 md:p-12">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-coral">Fits your ride</div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Every vehicle, every spot, matched.</h2>
            <ul className="mt-5 space-y-3 text-sm font-medium">
              {[
                [BadgeCheck, "Verified owners. Every listing is checked against ownership proof and ID."],
                [CarFront, "Size-aware search, plus warnings for narrow lanes on SUVs and vans."],
                [Zap, "EV chargers, covered bays, CCTV and guards, all filterable."],
                [Clock4, "Fair rules: free cancellation 1 hr before, 10-min grace, auto overtime."],
              ].map(([Icon, text], i) => {
                const I = Icon as typeof BadgeCheck;
                return (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                      <I className="h-4 w-4" />
                    </span>
                    <span className="pt-1.5">{text as string}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["bike", "hatchback", "sedan", "suv", "van"].map((v, i) => (
              <motion.div key={v} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08, type: "spring" }} className={`floaty rounded-3xl p-3 bg-white ring-1 ring-line`} style={{ animationDelay: `${i * 0.4}s` }}>
                <VehicleArt type={v} className="w-full" />
                <div className="mt-1 text-center text-xs font-extrabold capitalize">{v}</div>
              </motion.div>
            ))}
            <div className="grid place-items-center rounded-3xl bg-cream p-3 text-center text-xs font-extrabold text-ink/60">+ EV, CNG, petrol & diesel</div>
          </div>
        </div>
      </section>
    </div>
  );
}
