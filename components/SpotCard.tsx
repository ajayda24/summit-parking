"use client";

import { motion } from "framer-motion";
import { AlertTriangle, BatteryCharging, Heart, MapPin, Scale, Star, Umbrella } from "lucide-react";
import Link from "next/link";
import { fits, inr, narrowWarning, type VehicleType } from "@/lib/shared";
import { SpotImage } from "./illustrations";

export type SpotLite = {
  id: number; title: string; address: string; zone: string; lat: number; lng: number; photo: string | null; spot_type: string;
  size: string; road_width: string; covered: number; amenities: string[]; price: number; rating: number; reviews: number;
  distance: number; fav: boolean; occupied: boolean; surge: number; mode: string; owner_name?: string; open_from: number; open_to: number;
};

export function SpotCard({
  spot, vehicle, active, onHover, comparing, onCompare, onFav, index = 0,
}: {
  spot: SpotLite; vehicle?: VehicleType; active?: boolean; onHover?: (id: number | null) => void;
  comparing?: boolean; onCompare?: () => void; onFav?: () => void; index?: number;
}) {
  const ok = !vehicle || fits(vehicle, spot.size as never);
  const narrow = vehicle && narrowWarning(vehicle, spot.road_width as never);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: ok ? 1 : 0.55, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      onMouseEnter={() => onHover?.(spot.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`group relative overflow-hidden rounded-3xl bg-white shadow-soft ring-2 transition ${active ? "ring-ink" : "ring-transparent"} ${ok ? "" : "grayscale-[0.6]"}`}
    >
      <Link href={`/driver/spot/${spot.id}`} className="flex gap-0 sm:block">
        <div className="relative h-auto w-32 shrink-0 overflow-hidden sm:h-36 sm:w-full">
          <SpotImage spot={spot} className="h-full w-full transition duration-500 group-hover:scale-105" />
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {spot.surge > 1 && <span className="rounded-full bg-coral px-2 py-0.5 text-[10px] font-extrabold text-white">Surge ×{spot.surge}</span>}
            {spot.occupied && <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold">In use now</span>}
          </div>
        </div>
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-extrabold">{spot.title}</div>
              <div className="flex items-center gap-1 truncate text-xs text-muted">
                <MapPin className="h-3 w-3" /> {spot.distance} km · {spot.zone}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black leading-none">{inr(spot.price)}</div>
              <div className="text-[10px] font-bold text-muted">/hour</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
            <span className="rounded-full bg-road px-2 py-0.5">Size {spot.size}</span>
            {spot.covered ? (
              <span className="flex items-center gap-1 rounded-full bg-road px-2 py-0.5 text-ink/70"><Umbrella className="h-3 w-3" />Covered</span>
            ) : null}
            {spot.amenities.includes("ev_charger") && (
              <span className="flex items-center gap-1 rounded-full bg-road px-2 py-0.5 text-ink/70"><BatteryCharging className="h-3 w-3 text-ok" />EV</span>
            )}
            {spot.rating > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-road px-2 py-0.5 text-ink/70"><Star className="h-3 w-3 fill-[#E8B530] text-[#E8B530]" />{spot.rating} ({spot.reviews})</span>
            )}
            {spot.mode === "request" && <span className="rounded-full bg-road px-2 py-0.5 text-ink/70">On request</span>}
          </div>
          {!ok && <div className="mt-2 text-xs font-bold text-coral-deep">🚫 Too small for your {vehicle}</div>}
          {ok && narrow && (
            <div className="mt-2 flex items-center gap-1 text-xs font-bold text-peach-deep">
              <AlertTriangle className="h-3 w-3" /> Narrow lane: tricky for a {vehicle}
            </div>
          )}
        </div>
      </Link>
      <div className="absolute bottom-2 left-2 flex gap-1.5 sm:bottom-auto sm:left-auto sm:right-3 sm:top-3">
        {onCompare && (
          <motion.button whileTap={{ scale: 0.85 }} onClick={onCompare} title="Compare" className={`grid h-8 w-8 place-items-center rounded-full shadow ${comparing ? "bg-lavender-deep text-white" : "bg-white/90"}`}>
            <Scale className="h-4 w-4" />
          </motion.button>
        )}
        {onFav && (
          <motion.button whileTap={{ scale: 1.4 }} onClick={onFav} title="Favourite" className="grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow">
            <Heart className={`h-4 w-4 ${spot.fav ? "fill-coral text-coral" : ""}`} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
