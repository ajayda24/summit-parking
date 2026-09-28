"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BatteryCharging, List, Map as MapIcon, Plus, Scale, SlidersHorizontal, Star, Umbrella, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { RoleGate } from "@/components/AppShell";
import { EmptyRoad, SpotImage, VehicleArt } from "@/components/illustrations";
import { Map } from "@/components/Map";
import { SpotCard, type SpotLite } from "@/components/SpotCard";
import { Button, Chip, Field, inputCls, Modal, PageTitle, Skeleton, useLoader } from "@/components/ui";
import { api } from "@/lib/client";
import { AMENITY_LABEL, FUELS, fits, inr, narrowWarning, VEHICLES, type VehicleType } from "@/lib/shared";

type Sort = "distance" | "price" | "rating";

function VehicleStrip() {
  const { me, refresh, toast } = useApp();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "", plate: "", type: "hatchback", fuel: "petrol" });
  if (!me) return null;
  return (
    <div className="no-scrollbar -mx-4 mb-4 flex gap-3 overflow-x-auto px-4 pb-2">
      {me.vehicles.map((v) => (
        <motion.button
          key={v.id}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.96 }}
          onClick={async () => {
            await api(`vehicles/${v.id}/activate`, {});
            await refresh();
            toast(`Now searching for your ${v.label}`, "info");
          }}
          className={`relative flex shrink-0 items-center gap-3 rounded-3xl p-2.5 pr-4 text-left transition ${v.active ? "bg-white shadow-soft ring-2 ring-brand" : "bg-white/70 ring-1 ring-line"}`}
        >
          <motion.div animate={v.active ? { y: [0, -3, 0] } : {}} transition={{ repeat: Infinity, duration: 1.6 }} className={`grid h-11 w-14 place-items-center rounded-2xl ${v.active ? "bg-brand-soft" : "bg-cream opacity-60"}`}>
            <VehicleArt type={v.type} className="w-14" />
          </motion.div>
          <div>
            <div className="text-sm font-extrabold">{v.label}</div>
            <div className="text-[11px] font-bold capitalize text-muted">
              {v.type} · {v.fuel}
            </div>
          </div>
          {v.active ? <span className="absolute -top-2 right-3 rounded-full bg-brand px-2 text-[9px] font-extrabold text-white">ACTIVE</span> : null}
        </motion.button>
      ))}
      <button onClick={() => setAdding(true)} className="flex shrink-0 items-center gap-2 rounded-3xl border-2 border-dashed border-road-dark px-5 text-sm font-bold text-ink/60 hover:bg-white">
        <Plus className="h-4 w-4" /> Add vehicle
      </button>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a vehicle">
        <div className="grid grid-cols-5 gap-2">
          {VEHICLES.map((v) => (
            <motion.button key={v.type} whileTap={{ scale: 0.9 }} onClick={() => setForm({ ...form, type: v.type })} className={`rounded-2xl p-2 text-center ring-2 ${form.type === v.type ? "bg-brand-soft ring-brand" : "bg-white ring-transparent"}`}>
              <motion.div animate={form.type === v.type ? { y: [0, -6, 0] } : {}}>
                <VehicleArt type={v.type} className="w-full" />
              </motion.div>
              <div className="text-[10px] font-extrabold">{v.label}</div>
            </motion.button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Nickname">
            <input className={inputCls} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Swift" />
          </Field>
          <Field label="Plate">
            <input className={inputCls} value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} placeholder="KA 01 AB 1234" />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {FUELS.map((f) => (
            <Chip key={f.type} active={form.fuel === f.type} onClick={() => setForm({ ...form, fuel: f.type })}>
              {f.label}
            </Chip>
          ))}
        </div>
        <Button
          className="mt-5 w-full"
          onClick={async () => {
            await api("vehicles", form);
            await refresh();
            setAdding(false);
            toast("Vehicle added and set as active");
          }}
        >
          Save vehicle
        </Button>
      </Modal>
    </div>
  );
}

function CompareSheet({ spots, vehicle, onClose, open }: { spots: SpotLite[]; vehicle?: VehicleType; onClose: () => void; open: boolean }) {
  const rows: [string, (s: SpotLite) => React.ReactNode][] = [
    ["Price / hr", (s) => <b>{inr(s.price)}</b>],
    ["Distance", (s) => `${s.distance} km`],
    ["Rating", (s) => (s.rating ? `★ ${s.rating} (${s.reviews})` : "New")],
    ["Size", (s) => `${s.size}${vehicle ? (fits(vehicle, s.size as never) ? " ✅" : " 🚫") : ""}`],
    ["Road", (s) => `${s.road_width}${vehicle && narrowWarning(vehicle, s.road_width as never) ? " ⚠️" : ""}`],
    ["Covered", (s) => (s.covered ? "Yes" : "No")],
    ["Amenities", (s) => s.amenities.map((a) => AMENITY_LABEL[a]).join(", ") || "—"],
    ["Hours", (s) => `${s.open_from}:00–${s.open_to}:00`],
    ["Booking", (s) => (s.mode === "request" ? "Owner approves" : "Instant")],
  ];
  const best = spots.length ? spots.reduce((a, b) => (a.price / Math.max(a.rating, 3) < b.price / Math.max(b.rating, 3) ? a : b)) : null;
  return (
    <Modal open={open} onClose={onClose} title="Compare spots" wide>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th />
              {spots.map((s) => (
                <th key={s.id} className="p-2 text-left align-bottom">
                  <SpotImage spot={s} className="mb-2 h-20 w-full rounded-2xl" />
                  <div className="font-extrabold">{s.title}</div>
                  {best?.id === s.id && <span className="mt-1 inline-block rounded-full bg-ok-soft px-2 text-[10px] font-extrabold text-ok">Best value</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, f]) => (
              <tr key={label} className="border-t border-road">
                <td className="p-2 text-xs font-bold uppercase text-muted">{label}</td>
                {spots.map((s) => (
                  <td key={s.id} className="p-2 capitalize">{f(s)}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td />
              {spots.map((s) => (
                <td key={s.id} className="p-2">
                  <Link href={`/driver/spot/${s.id}`}>
                    <Button size="sm" className="w-full">Book</Button>
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function Search() {
  const { me, toast } = useApp();
  const { data, setData } = useLoader<SpotLite[]>(() => api("spots"), [me?.user.id], 10000);
  const vehicle = me?.vehicles.find((v) => v.active);
  const vType = vehicle?.type as VehicleType | undefined;
  const [fitOnly, setFitOnly] = useState(true);
  const [ev, setEv] = useState(vehicle?.fuel === "ev");
  const [covered, setCovered] = useState(false);
  const [maxPrice, setMaxPrice] = useState(100);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<Sort>("distance");
  const [view, setView] = useState<"split" | "map" | "list">("list");
  useEffect(() => {
    if (window.innerWidth >= 1024) setView("split");
  }, []);
  const [hover, setHover] = useState<number | null>(null);
  const [compare, setCompare] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const list = useMemo(() => {
    if (!data) return [];
    const r = data.filter(
      (s) =>
        (!ev || s.amenities.includes("ev_charger")) &&
        (!covered || s.covered) &&
        s.price <= maxPrice &&
        s.rating >= minRating &&
        (!fitOnly || !vType || fits(vType, s.size as never))
    );
    const key = { distance: (s: SpotLite) => s.distance, price: (s: SpotLite) => s.price, rating: (s: SpotLite) => -s.rating }[sort];
    // Spots that don't fit sink to the bottom (still visible when "fits" is off).
    return r.sort((a, b) => Number(!!vType && !fits(vType, a.size as never)) - Number(!!vType && !fits(vType, b.size as never)) || key(a) - key(b));
  }, [data, ev, covered, maxPrice, minRating, fitOnly, vType, sort]);

  const hidden = (data?.length ?? 0) - list.length;
  const clear = () => {
    setFitOnly(false);
    setEv(false);
    setCovered(false);
    setMaxPrice(100);
    setMinRating(0);
  };

  const toggleFav = async (id: number) => {
    const r = await api(`favourites/${id}`, {});
    setData((d) => d && d.map((s) => (s.id === id ? { ...s, fav: r.fav } : s)));
    toast(r.fav ? "Saved to favourites ❤️" : "Removed from favourites", "info");
  };
  const toggleCompare = (id: number) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? (toast("Compare up to 3 spots", "warning"), c) : [...c, id]));

  return (
    <div>
      <PageTitle kicker="Find parking · Koramangala" title="Spots near you">
        <div className="hidden rounded-2xl bg-white p-1 ring-1 ring-line lg:inline-flex">
          {(
            [
              ["split", "Both", SlidersHorizontal],
              ["list", "List", List],
              ["map", "Map", MapIcon],
            ] as const
          ).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setView(id)} className={`items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${id === "split" ? "hidden lg:flex" : "flex"} ${view === id ? "bg-ink text-white" : "text-ink/60"}`}>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </PageTitle>

      <VehicleStrip />

      <div className="no-scrollbar -mx-4 mb-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
        <Chip active={fitOnly} onClick={() => setFitOnly(!fitOnly)} color="mint">
          ✅ Fits my {vType ?? "vehicle"}
        </Chip>
        <Chip active={ev} onClick={() => setEv(!ev)} color="mint">
          <BatteryCharging className="h-3.5 w-3.5" /> EV charger
        </Chip>
        <Chip active={covered} onClick={() => setCovered(!covered)} color="sky">
          <Umbrella className="h-3.5 w-3.5" /> Covered
        </Chip>
        <Chip active={minRating >= 4} onClick={() => setMinRating(minRating >= 4 ? 0 : 4)} color="lavender">
          <Star className="h-3.5 w-3.5" /> 4★+
        </Chip>
        <div className="flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-line">
          Max {inr(maxPrice)}/hr
          <input type="range" min={10} max={100} step={5} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-24 accent-coral" />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-bold ring-1 ring-line">
          <option value="distance">Nearest first</option>
          <option value="price">Cheapest first</option>
          <option value="rating">Top rated</option>
        </select>
        {hidden > 0 && (
          <button onClick={clear} className="shrink-0 whitespace-nowrap text-xs font-bold text-brand underline-offset-2 hover:underline">
            {hidden} hidden by filters · clear
          </button>
        )}
      </div>

      <div className={`grid gap-5 ${view === "split" ? "lg:grid-cols-[1fr_1.1fr]" : ""}`}>
        {view !== "map" && (
          <div className={`grid content-start gap-4 ${view === "list" ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
            {!data && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}
            <AnimatePresence mode="popLayout">
              {list.map((s, i) => (
                <SpotCard key={s.id} index={i} spot={s} vehicle={vType} active={hover === s.id} onHover={setHover} comparing={compare.includes(s.id)} onCompare={() => toggleCompare(s.id)} onFav={() => toggleFav(s.id)} />
              ))}
            </AnimatePresence>
            {data && list.length === 0 && (
              <div className="col-span-full">
                <EmptyRoad title="No spots match these filters" text="Try widening your price range or turning off a filter.">
                  <Button variant="soft" onClick={clear}>Clear filters</Button>
                </EmptyRoad>
              </div>
            )}
          </div>
        )}
        {view !== "list" && (
          <div className={`overflow-hidden rounded-[2rem] shadow-soft ring-4 ring-white ${view === "map" ? "h-[calc(100dvh-19rem)] min-h-[360px] lg:h-[70vh]" : "h-[420px] lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]"}`}>
            <Map
              pins={list.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, label: inr(s.price), tone: vType && !fits(vType, s.size as never) ? "grey" : s.surge > 1 ? "coral" : "mint" }))}
              activeId={hover}
              onHover={setHover}
              onSelect={(id) => (window.location.href = `/driver/spot/${id}`)}
            />
          </div>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => setView(view === "map" ? "list" : "map")}
        className={`fixed left-1/2 z-[660] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-extrabold text-white shadow-pop lg:hidden ${compare.length ? "bottom-[calc(9.5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]"}`}
      >
        {view === "map" ? <List className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
        {view === "map" ? "List" : "Map"}
      </motion.button>
      <AnimatePresence>
        {compare.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-[660] flex -translate-x-1/2 lg:bottom-6 items-center gap-3 rounded-full bg-ink py-2 pl-4 pr-2 text-white shadow-pop">
            <Scale className="h-4 w-4 text-white/70" />
            <div className="flex -space-x-2">
              {compare.map((id) => {
                const s = data?.find((x) => x.id === id);
                return s ? (
                  <button key={id} onClick={() => toggleCompare(id)} className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-ink">
                    <SpotImage spot={s} className="h-full w-full" />
                    <X className="absolute inset-0 m-auto h-4 w-4 opacity-0 hover:opacity-100" />
                  </button>
                ) : null;
              })}
            </div>
            <span className="text-sm font-bold">{compare.length}/3</span>
            <Button size="sm" onClick={() => setShowCompare(true)} disabled={compare.length < 2}>
              Compare
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <CompareSheet open={showCompare} onClose={() => setShowCompare(false)} spots={compare.map((id) => data!.find((s) => s.id === id)!).filter(Boolean)} vehicle={vType} />
    </div>
  );
}

export default function DriverHome() {
  return (
    <RoleGate role="driver">
      <Search />
    </RoleGate>
  );
}
