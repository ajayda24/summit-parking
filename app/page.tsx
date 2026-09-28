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
    color: "bg-sky",
    icon: CarFront,
    cta: "Find parking",
  },
  {
    role: "owner" as const,
    title: "I have space",
    text: "List your driveway or plot, get verified, and earn from unused hours.",
    color: "bg-lavender",
    icon: Home,
    cta: "Start earning",
  },
  {
    role: "admin" as const,
    title: "I run the platform",
    text: "Verify owners, settle disputes, tune pricing and watch demand.",
    color: "bg-butter",
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
        <RoadHero className="absolute inset-0 h-full w-full opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-cream/95 via-cream/60 to-transparent md:via-cream/40" />
        <div className="relative mx-auto max-w-7xl px-4 pb-40 pt-14 sm:pt-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-extrabold text-coral shadow-soft">
              <Zap className="h-3.5 w-3.5" /> Bengaluru beta · demo mode
            </span>
            <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-tight sm:text-7xl">
              Stop circling.
              <br />
              <span className="bg-gradient-to-r from-coral via-peach-deep to-lavender-deep bg-clip-text text-transparent">Start parking.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg font-medium text-ink/70">
              Summit connects drivers with idle driveways, plots and basements nearby. Spots that fit your car, prices up front, and a guaranteed slot when you arrive.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => first("driver") && switchTo(first("driver")!.id)}>
                Find parking <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="soft" onClick={() => first("owner") && switchTo(first("owner")!.id)}>
                List my space
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative mx-auto -mt-24 max-w-7xl px-4">
        <div className="grid gap-4 md:grid-cols-3">
          {ROLES.map((r, i) => (
            <motion.div
              key={r.role}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
              whileHover={{ y: -6 }}
              className={`rounded-[2rem] ${r.color} p-6 shadow-soft`}
            >
              <div className="flex items-center justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/70">
                  <r.icon className="h-6 w-6" />
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
                    <button key={u.id} onClick={() => switchTo(u.id)} className="group flex w-full items-center gap-3 rounded-2xl bg-white/70 p-2 text-left transition hover:bg-white">
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

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="text-center">
          <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-coral">How it works</div>
          <h2 className="mt-2 text-4xl font-extrabold tracking-tight">From “where do I park?” to parked, in four stops</h2>
        </div>
        <div className="relative mt-12">
          <div className="road-strip absolute left-0 right-0 top-9 hidden h-5 rounded-full md:block" />
          <div className="grid gap-6 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="relative text-center">
                <div className="relative mx-auto grid h-[4.5rem] w-[4.5rem] place-items-center rounded-3xl bg-white shadow-soft ring-4 ring-cream">
                  <s.icon className="h-7 w-7 text-coral" />
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
        <div className="grid items-center gap-8 overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-soft md:grid-cols-2 md:p-12">
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
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-mint">
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
              <motion.div key={v} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08, type: "spring" }} className={`floaty rounded-3xl p-3 ${["bg-lavender", "bg-mint", "bg-sky", "bg-peach", "bg-butter"][i]}`} style={{ animationDelay: `${i * 0.4}s` }}>
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
