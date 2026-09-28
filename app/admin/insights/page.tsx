"use client";

import { motion } from "framer-motion";
import { Download, EyeOff, Flag, ImageOff, RotateCcw } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { RoleGate } from "@/components/AppShell";
import { SpotImage } from "@/components/illustrations";
import { Map } from "@/components/Map";
import { Badge, Button, PageTitle, Skeleton, Stars, useLoader } from "@/components/ui";
import { ago, api } from "@/lib/client";

type I = {
  zones: { zone: string; lat: number; lng: number; supply: number; demand: number; ratio: number }[];
  flags: { user_id: number; name: string; role: string; reason: string; severity: "high" | "medium" }[];
};
type M = {
  reviews: { id: number; stars: number; text: string; hidden: number; from_name: string; to_name: string; spot_title: string | null; created_at: number }[];
  photos: { id: number; title: string; photo: string; photo_hidden: number; spot_type: string }[];
};

// Sequential scale for demand/supply pressure: one hue, light → dark.
const pressure = (r: number) => (r >= 2 ? "#E8574A" : r >= 1.2 ? "#FF7A6B" : r >= 0.6 ? "#FFB59E" : "#FFD6BF");
const BAD_WORDS = /scam|fraud|worst|call \d|\d{5,}/i;

function Insights() {
  const { me, now, toast, switchTo } = useApp();
  const { data } = useLoader<I>(() => api("admin/insights"), [me?.user.id], 10000);
  const { data: mod, reload } = useLoader<M>(() => api("admin/moderation"), [me?.user.id]);
  if (!data || !mod) return <Skeleton className="h-96" />;
  return (
    <div>
      <PageTitle kicker="Marketplace health" title="Insights & moderation">
        <div className="flex gap-2">
          <a href="/api/admin/export?type=bookings"><Button variant="soft"><Download className="h-4 w-4" /> Bookings CSV</Button></a>
          <a href="/api/admin/export?type=transactions"><Button variant="soft"><Download className="h-4 w-4" /> Payments CSV</Button></a>
        </div>
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-soft">
          <div className="p-5 pb-3">
            <div className="font-extrabold">Demand vs supply heatmap</div>
            <div className="text-xs text-muted">Bubble size = bookings this week · colour = bookings per available spot (darker = more pressure)</div>
          </div>
          <div className="h-80">
            <Map showHere={false} zoom={13} center={[12.945, 77.635]} circles={data.zones.map((z) => ({ lat: z.lat, lng: z.lng, radius: 400 + z.demand * 90, color: pressure(z.ratio), label: `${z.zone}: ${z.ratio}×` }))} />
          </div>
          <div className="grid grid-cols-3 divide-x divide-road border-t border-road">
            {data.zones.map((z) => (
              <div key={z.zone} className="p-4">
                <div className="flex items-center gap-2 text-sm font-extrabold"><span className="h-3 w-3 rounded-full" style={{ background: pressure(z.ratio) }} />{z.zone}</div>
                <div className="mt-1 text-xs text-muted">{z.demand} bookings · {z.supply} spots</div>
                <div className="mt-1 text-xs font-bold">{z.ratio >= 1.2 ? "🔥 Recruit more owners" : z.ratio < 0.6 ? "Room to grow demand" : "Balanced"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center gap-2 font-extrabold"><Flag className="h-4 w-4 text-coral" /> Fraud & risk flags</div>
          <div className="space-y-2">
            {data.flags.length === 0 && <div className="text-sm text-muted">No flags. Looking healthy.</div>}
            {data.flags.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className={`flex items-center gap-3 rounded-2xl p-3 ${f.severity === "high" ? "bg-rose/60" : "bg-butter/60"}`}>
                <Badge color={f.severity === "high" ? "coral" : "butter"}>{f.severity}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{f.name} <span className="text-xs font-medium capitalize text-muted">· {f.role}</span></div>
                  <div className="text-xs text-ink/70">{f.reason}</div>
                </div>
                <button onClick={() => switchTo(f.user_id)} className="text-[11px] font-bold text-lavender-deep hover:underline">View as</button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[2rem] bg-white p-5 shadow-soft">
          <div className="mb-3 font-extrabold">Review moderation</div>
          <div className="space-y-2">
            {mod.reviews.map((r) => {
              const suspicious = BAD_WORDS.test(r.text ?? "");
              return (
                <div key={r.id} className={`flex items-start gap-3 rounded-2xl p-3 ${r.hidden ? "bg-road/60 opacity-60" : suspicious ? "bg-rose/50" : "bg-cream"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <b>{r.from_name}</b> → {r.spot_title ?? r.to_name} <Stars value={r.stars} size={11} /> <span className="text-muted">{ago(r.created_at, now)}</span>
                      {suspicious && !r.hidden && <Badge color="coral">Auto-flagged</Badge>}
                      {r.hidden ? <Badge>Hidden</Badge> : null}
                    </div>
                    <div className="mt-0.5 text-sm">{r.text || <i className="text-muted">No text</i>}</div>
                  </div>
                  <Button
                    size="sm"
                    variant={r.hidden ? "soft" : "danger"}
                    onClick={async () => {
                      const x = await api(`admin/reviews/${r.id}/hide`, {});
                      toast(x.hidden ? "Review hidden, rating recalculated" : "Review restored", "info");
                      reload();
                    }}
                  >
                    {r.hidden ? <RotateCcw className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} {r.hidden ? "Restore" : "Hide"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-[2rem] bg-white p-5 shadow-soft">
          <div className="mb-3 font-extrabold">Photo moderation</div>
          {mod.photos.length === 0 && <div className="rounded-2xl bg-cream p-4 text-sm text-muted">No owner-uploaded photos yet. Seeded spots use illustrations. Photos uploaded in the listing wizard appear here.</div>}
          <div className="grid grid-cols-2 gap-2">
            {mod.photos.map((p) => (
              <div key={p.id} className="relative overflow-hidden rounded-2xl">
                <SpotImage spot={{ id: p.id, photo: p.photo, spot_type: p.spot_type }} className={`h-28 w-full ${p.photo_hidden ? "opacity-30 grayscale" : ""}`} />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-ink/70 p-2 text-[11px] font-bold text-white">
                  <span className="truncate">{p.title}</span>
                  <button
                    onClick={async () => {
                      const x = await api(`admin/spots/${p.id}/hide-photo`, {});
                      toast(x.hidden ? "Photo hidden" : "Photo restored", "info");
                      reload();
                    }}
                    className="rounded-full bg-white/90 p-1 text-ink"
                  >
                    {p.photo_hidden ? <RotateCcw className="h-3 w-3" /> : <ImageOff className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RoleGate role="admin">
      <Insights />
    </RoleGate>
  );
}
