"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, BatteryCharging, CalendarDays, Clock, Heart, MapPin, Navigation, Ruler, ShieldCheck, Umbrella, Zap } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { RoleGate } from "@/components/AppShell";
import { SpotImage } from "@/components/illustrations";
import { Map } from "@/components/Map";
import { PaySheet } from "@/components/PaySheet";
import { Avatar, Badge, Button, CountUp, Skeleton, Stars, useLoader } from "@/components/ui";
import { ago, api, fmtTime } from "@/lib/client";
import { AMENITY_LABEL, fits, HOUR, inr, MIN, narrowWarning, quote, surgeFor, type VehicleType } from "@/lib/shared";

type Detail = {
  id: number; title: string; address: string; zone: string; lat: number; lng: number; photo: string | null; spot_type: string; size: string;
  road_width: string; covered: number; amenities: string[]; price: number; open_from: number; open_to: number; open_days: number[];
  blocked_dates: string[]; mode: string; description: string; rating: number; reviews: { id: number; stars: number; text: string; from_name: string; avatar_color: string; created_at: number }[];
  distance: number; fav: boolean; owner: { id: number; name: string; avatar_color: string; rating: number; rating_count: number };
  busy: { start_at: number; end_at: number; status: string }[]; surge_rules: { from: number; to: number; mult: number }[]; surge_now: number; status: string; paused: number;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function Booker({ spot }: { spot: Detail }) {
  const { me, now, toast } = useApp();
  const router = useRouter();
  const vehicle = me?.vehicles.find((v) => v.active);
  const days = useMemo(() => {
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => new Date(base.getTime() + i * 24 * HOUR));
  }, [Math.floor(now / (24 * HOUR))]); // eslint-disable-line react-hooks/exhaustive-deps
  const [day, setDay] = useState(0);
  const nextSlot = () => {
    const t = new Date(now + 30 * MIN);
    return t.getHours() + (t.getMinutes() >= 30 ? 1 : 0.5);
  };
  const [startH, setStartH] = useState<number>(() => Math.min(nextSlot(), 22));
  const [hours, setHours] = useState(2);
  const [shake, setShake] = useState(false);
  const [paying, setPaying] = useState(false);

  const dayStart = days[day].getTime();
  const start = dayStart + startH * HOUR;
  const end = start + hours * HOUR;
  const surge = surgeFor(me?.surge_rules ?? [], spot.zone, start);
  const q = quote(spot.price, start, end, surge);
  const blocked = spot.blocked_dates.includes(dateKey(days[day]));
  const closedDay = !spot.open_days.includes(days[day].getDay());
  const clash = spot.busy.find((b) => b.start_at < end && b.end_at > start);
  const past = start < now - 5 * MIN;
  const outside = startH < spot.open_from || startH + hours > spot.open_to;
  const tooSmall = vehicle && !fits(vehicle.type as VehicleType, spot.size as never);
  const unavailable = spot.status !== "verified" || !!spot.paused;
  const problem = unavailable
    ? "This spot isn't taking bookings right now"
    : tooSmall
      ? `Too small for your ${vehicle!.type}`
      : closedDay || blocked
        ? "Closed on this date"
        : past
          ? "That time has already passed"
          : outside
            ? `Open ${spot.open_from}:00 – ${spot.open_to}:00`
            : clash
              ? `Booked ${fmtTime(clash.start_at)}–${fmtTime(clash.end_at)}. Pick another time.`
              : me?.user.suspended
                ? "Your account is suspended"
                : null;

  useEffect(() => {
    if (clash) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(t);
    }
  }, [clash?.start_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const slots = [];
  for (let h = 0; h < 24; h += 0.5) slots.push(h);
  const label = (h: number) => `${Math.floor(h) % 12 || 12}:${h % 1 ? "30" : "00"} ${h < 12 ? "am" : "pm"}`;
  const dayBusy = spot.busy.filter((b) => b.end_at > dayStart && b.start_at < dayStart + 24 * HOUR);

  return (
    <div className={`rounded-[2rem] bg-white p-5 shadow-soft ${shake ? "shake" : ""}`}>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-black">
            {inr(spot.price)}
            <span className="text-sm font-bold text-muted"> /hr</span>
          </div>
          {surge > 1 && <Badge color="coral" className="mt-1"><Zap className="h-3 w-3" /> Surge ×{surge} at this time</Badge>}
        </div>
        <Badge color={spot.mode === "request" ? "lavender" : "mint"}>{spot.mode === "request" ? "Owner approves" : "Instant booking"}</Badge>
      </div>

      <div className="mt-5 text-xs font-extrabold uppercase tracking-widest text-ink/50">
        <CalendarDays className="mr-1 inline h-3.5 w-3.5" /> Date
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d, i) => {
          const closed = !spot.open_days.includes(d.getDay()) || spot.blocked_dates.includes(dateKey(d));
          return (
            <motion.button whileTap={{ scale: 0.9 }} key={i} onClick={() => setDay(i)} className={`min-w-[3.4rem] rounded-2xl py-2 text-center ${day === i ? "bg-ink text-white" : closed ? "bg-road/50 text-ink/30 line-through" : "bg-cream hover:bg-road"}`}>
              <div className="text-[10px] font-bold uppercase">{i === 0 ? "Today" : DAY_NAMES[d.getDay()]}</div>
              <div className="text-lg font-black">{d.getDate()}</div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label>
          <div className="text-xs font-extrabold uppercase tracking-widest text-ink/50">
            <Clock className="mr-1 inline h-3.5 w-3.5" /> Start
          </div>
          <select value={startH} onChange={(e) => setStartH(Number(e.target.value))} className="mt-2 w-full rounded-2xl bg-cream px-3 py-2.5 text-sm font-bold">
            {slots.map((h) => (
              <option key={h} value={h}>{label(h)}</option>
            ))}
          </select>
        </label>
        <div>
          <div className="text-xs font-extrabold uppercase tracking-widest text-ink/50">Duration</div>
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-cream p-1">
            <button onClick={() => setHours(Math.max(1, hours - 0.5))} className="h-9 w-9 rounded-xl bg-white text-lg font-black">−</button>
            <motion.span key={hours} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="text-sm font-black">{hours} hr</motion.span>
            <button onClick={() => setHours(Math.min(12, hours + 0.5))} className="h-9 w-9 rounded-xl bg-white text-lg font-black">+</button>
          </div>
        </div>
      </div>

      {/* day timeline */}
      <div className="mt-4">
        <div className="relative h-7 overflow-hidden rounded-full bg-road">
          <div className="absolute inset-y-0 bg-mint/70" style={{ left: `${(spot.open_from / 24) * 100}%`, width: `${((spot.open_to - spot.open_from) / 24) * 100}%` }} />
          {dayBusy.map((b, i) => (
            <div key={i} className="absolute inset-y-0 bg-[repeating-linear-gradient(45deg,#c9ccd8_0_6px,#e6e8ef_6px_12px)]" style={{ left: `${Math.max(0, (b.start_at - dayStart) / (24 * HOUR)) * 100}%`, width: `${((Math.min(b.end_at, dayStart + 24 * HOUR) - Math.max(b.start_at, dayStart)) / (24 * HOUR)) * 100}%` }} />
          ))}
          <motion.div layout className={`absolute inset-y-1 rounded-full ${problem ? "bg-coral" : "bg-ink"}`} style={{ left: `${(startH / 24) * 100}%`, width: `${Math.min((hours / 24) * 100, 100 - (startH / 24) * 100)}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] font-bold text-muted">
          <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>12am</span>
        </div>
        <div className="mt-1 flex gap-3 text-[10px] font-bold text-muted">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-mint" />Open</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-road-dark" />Booked</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-ink" />Your slot</span>
        </div>
      </div>

      <div className="mt-5 space-y-1.5 rounded-3xl bg-cream p-4 text-sm">
        <div className="flex justify-between"><span className="text-muted">{hours} hr × {inr(spot.price)}{surge > 1 ? ` × ${surge}` : ""}</span><span className="font-bold">{inr(q.base)}</span></div>
        <div className="flex justify-between"><span className="text-muted">Convenience fee</span><span className="font-bold">{inr(q.fee)}</span></div>
        <div className="flex items-center justify-between border-t border-dashed border-road-dark pt-2">
          <span className="font-extrabold">Total</span>
          <CountUp value={q.total} className="text-2xl font-black" />
        </div>
        <div className="text-[11px] text-muted">
          {fmtTime(start)} → {fmtTime(end)} · free cancellation until {fmtTime(start - HOUR)}
        </div>
      </div>

      {problem && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2 rounded-2xl bg-rose px-3 py-2 text-xs font-bold text-coral-deep">
          <AlertTriangle className="h-4 w-4" /> {problem}
        </motion.div>
      )}
      <Button size="lg" className="mt-4 w-full" disabled={!!problem} onClick={() => setPaying(true)}>
        {spot.mode === "request" ? "Request to book" : "Book & pay"} · {inr(q.total)}
      </Button>
      <div className="mt-2 text-center text-[11px] text-muted">Wallet balance {inr(me?.user.wallet ?? 0)}</div>

      <PaySheet
        open={paying}
        onClose={() => setPaying(false)}
        title={spot.mode === "request" ? "Hold payment & request" : "Confirm & pay"}
        lines={[
          { label: `${spot.title} · ${hours} hr`, amount: q.base },
          { label: "Convenience fee", amount: q.fee, muted: true },
        ]}
        total={q.total}
        cta={spot.mode === "request" ? "Hold" : "Pay"}
        onPay={() => api("bookings", { spotId: spot.id, start, end, vehicleId: vehicle?.id })}
        onDone={(b: any) => {
          toast(spot.mode === "request" ? "Request sent! Money is on hold until the owner accepts." : "Booked! Here's your ticket 🎟️");
          router.push(`/driver/pass/${b.id}?new=1`);
        }}
      />
    </div>
  );
}

function SpotDetail() {
  const { id } = useParams<{ id: string }>();
  const { me, now, toast } = useApp();
  const { data: s, setData } = useLoader<Detail>(() => api(`spots/${id}`), [id], 15000);
  if (!s) return <Skeleton className="h-[70vh]" />;
  const vehicle = me?.vehicles.find((v) => v.active);
  const narrow = vehicle && narrowWarning(vehicle.type as VehicleType, s.road_width as never);
  return (
    <div>
      <Link href="/driver" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-ink/60 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to search
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <motion.div layoutId={`spot-${s.id}`} className="relative h-72 overflow-hidden rounded-[2rem] shadow-soft sm:h-96">
            <SpotImage spot={s} className="h-full w-full" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-6 text-white">
              <div className="flex flex-wrap gap-2">
                <Badge color="mint"><ShieldCheck className="h-3 w-3" /> Verified owner</Badge>
                <Badge color="butter" className="capitalize">{s.spot_type}</Badge>
              </div>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">{s.title}</h1>
              <div className="mt-1 flex items-center gap-1 text-sm font-semibold opacity-90"><MapPin className="h-4 w-4" /> {s.address} · {s.distance} km away</div>
            </div>
            <motion.button
              whileTap={{ scale: 1.3 }}
              onClick={async () => {
                const r = await api(`favourites/${s.id}`, {});
                setData({ ...s, fav: r.fav });
                toast(r.fav ? "Saved to favourites ❤️" : "Removed from favourites", "info");
              }}
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white shadow"
            >
              <Heart className={`h-5 w-5 ${s.fav ? "fill-coral text-coral" : ""}`} />
            </motion.button>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Ruler, label: "Size", value: `${s.size} · ${{ S: "2-wheeler", M: "Hatch/Sedan", L: "SUV", XL: "Van" }[s.size]}`, c: "bg-sky" },
              { icon: Navigation, label: "Road", value: `${s.road_width} lane`, c: narrow ? "bg-peach" : "bg-mint" },
              { icon: Umbrella, label: "Cover", value: s.covered ? "Covered" : "Open air", c: "bg-lavender" },
              { icon: Clock, label: "Hours", value: s.open_from === 0 && s.open_to === 24 ? "24 × 7" : `${s.open_from}:00–${s.open_to}:00`, c: "bg-butter" },
            ].map((x, i) => (
              <motion.div key={x.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={`rounded-3xl ${x.c} p-4`}>
                <x.icon className="h-5 w-5" />
                <div className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-ink/50">{x.label}</div>
                <div className="text-sm font-extrabold capitalize">{x.value}</div>
              </motion.div>
            ))}
          </div>
          {narrow && (
            <div className="flex items-center gap-2 rounded-2xl bg-peach px-4 py-3 text-sm font-bold">
              <AlertTriangle className="h-4 w-4" /> Heads up: the access lane is narrow. Fine for smaller cars, tricky for your {vehicle!.type}.
            </div>
          )}

          <div className="rounded-[2rem] bg-white p-6 shadow-soft">
            <p className="text-sm leading-relaxed text-ink/80">{s.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {s.amenities.map((a) => (
                <Badge key={a} color="mint">{a === "ev_charger" && <BatteryCharging className="h-3 w-3" />}{AMENITY_LABEL[a]}</Badge>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-cream p-3">
              <Avatar name={s.owner.name} color={s.owner.avatar_color} size={40} />
              <div className="flex-1">
                <div className="text-sm font-extrabold">Hosted by {s.owner.name}</div>
                <div className="flex items-center gap-1 text-xs text-muted">
                  <Stars value={s.owner.rating} size={12} /> {s.owner.rating ? s.owner.rating.toFixed(1) : "New"} · ID & ownership verified
                </div>
              </div>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`} target="_blank" rel="noreferrer">
                <Button variant="soft" size="sm"><Navigation className="h-3.5 w-3.5" /> Directions</Button>
              </a>
            </div>
          </div>

          <div className="h-56 overflow-hidden rounded-[2rem] shadow-soft ring-4 ring-white">
            <Map pins={[{ id: s.id, lat: s.lat, lng: s.lng, label: inr(s.price) }]} activeId={s.id} center={[s.lat, s.lng]} zoom={15} />
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold">Reviews</h3>
              <div className="flex items-center gap-2 text-sm font-bold"><Stars value={s.rating} /> {s.rating || "—"} · {s.reviews.length}</div>
            </div>
            <div className="mt-4 space-y-4">
              {s.reviews.length === 0 && <div className="text-sm text-muted">No reviews yet. Be the first!</div>}
              {s.reviews.map((r) => (
                <div key={r.id} className="flex gap-3">
                  <Avatar name={r.from_name} color={r.avatar_color} size={34} />
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold">{r.from_name} <Stars value={r.stars} size={12} /> <span className="text-xs font-medium text-muted">{ago(r.created_at, now)}</span></div>
                    <div className="text-sm text-ink/80">{r.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Booker spot={s} />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RoleGate role="driver">
      <SpotDetail />
    </RoleGate>
  );
}
