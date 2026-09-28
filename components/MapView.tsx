"use client";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { AttributionControl, Circle, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { HERE } from "@/lib/shared";

export type Pin = { id: number; lat: number; lng: number; label: string; tone?: "mint" | "coral" | "grey" | "lavender"; title?: string };

function pinIcon(p: Pin, active: boolean) {
  const bg = { mint: "#FFFFFF", coral: "#FFFFFF", grey: "#EEEEE9", lavender: "#EEF2FD" }[p.tone ?? "mint"];
  const fg = p.tone === "grey" ? "#9AA0B0" : p.tone === "coral" ? "#C4473B" : "#1F2330";
  return L.divIcon({
    className: "price-pin",
    iconSize: [0, 0],
    html: `<div style="transform:translate(-50%,-100%) scale(${active ? 1.18 : 1});transition:transform .25s cubic-bezier(.34,1.56,.64,1);display:flex;flex-direction:column;align-items:center;${active ? "z-index:999;position:relative" : ""}">
      <div style="background:${active ? "#4263D6" : bg};color:${active ? "#fff" : fg};font:800 12px 'Plus Jakarta Sans',sans-serif;padding:6px 10px;border-radius:999px;box-shadow:0 8px 18px -8px rgba(43,45,66,.5);border:2px solid #fff;white-space:nowrap">${p.label}</div>
      <div style="width:10px;height:10px;background:${active ? "#4263D6" : bg};transform:rotate(45deg);margin-top:-6px;border-right:2px solid #fff;border-bottom:2px solid #fff"></div>
    </div>`,
  });
}

const hereIcon = L.divIcon({
  className: "price-pin",
  iconSize: [0, 0],
  html: `<div style="transform:translate(-50%,-50%);width:18px;height:18px;border-radius:99px;background:#4263D6;border:4px solid #fff;box-shadow:0 0 0 8px rgba(66,99,214,.18)"></div>`,
});

function FlyTo({ center }: { center?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [center, map]);
  return null;
}

function ClickPicker({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function MapView({
  pins = [],
  activeId,
  onSelect,
  onHover,
  center,
  zoom = 14,
  showHere = true,
  onPick,
  picked,
  circles,
  className = "",
}: {
  pins?: Pin[];
  activeId?: number | null;
  onSelect?: (id: number) => void;
  onHover?: (id: number | null) => void;
  center?: [number, number];
  zoom?: number;
  showHere?: boolean;
  onPick?: (lat: number, lng: number) => void;
  picked?: [number, number] | null;
  circles?: { lat: number; lng: number; radius: number; color: string; label: string }[];
  className?: string;
}) {
  const start = useMemo<[number, number]>(() => center ?? [HERE.lat, HERE.lng], []); // eslint-disable-line react-hooks/exhaustive-deps
  const active = pins.find((p) => p.id === activeId);
  return (
    <MapContainer center={start} zoom={zoom} scrollWheelZoom className={`h-full w-full ${className}`} zoomControl={false} attributionControl={false}>
      <AttributionControl prefix={false} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {showHere && (
        <Marker position={[HERE.lat, HERE.lng]} icon={hereIcon}>
          <Tooltip direction="top" offset={[0, -12]}>You are here</Tooltip>
        </Marker>
      )}
      {pins.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pinIcon(p, p.id === activeId)}
          zIndexOffset={p.id === activeId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect?.(p.id), mouseover: () => onHover?.(p.id), mouseout: () => onHover?.(null) }}
        />
      ))}
      {circles?.map((c) => (
        <Circle key={c.label} center={[c.lat, c.lng]} radius={c.radius} pathOptions={{ color: c.color, fillColor: c.color, fillOpacity: 0.35, weight: 2 }}>
          <Tooltip permanent direction="center" className="!rounded-xl !border-0 !font-bold">
            {c.label}
          </Tooltip>
        </Circle>
      ))}
      {picked && <Marker position={picked} icon={pinIcon({ id: -1, lat: picked[0], lng: picked[1], label: "📍 Your spot", tone: "coral" }, true)} />}
      <ClickPicker onPick={onPick} />
      <FlyTo center={active ? [active.lat, active.lng] : picked ?? undefined} />
    </MapContainer>
  );
}
