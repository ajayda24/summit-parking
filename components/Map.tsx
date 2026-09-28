"use client";

import dynamic from "next/dynamic";

/** Leaflet needs `window`, so the map is only rendered on the client. */
export const Map = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-[#f3f1ec] text-sm font-bold text-ink/40">
      <div className="road-strip h-3 w-40 animate-pulse rounded-full" />
    </div>
  ),
});
export type { Pin } from "./MapView";
