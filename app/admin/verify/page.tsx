"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Eye, MapPin, X } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { RoleGate } from "@/components/AppShell";
import { DocArt, EmptyRoad, SpotImage } from "@/components/illustrations";
import { Map } from "@/components/Map";
import { Avatar, Button, Modal, PageTitle, Skeleton, StatusBadge, Tabs, useLoader } from "@/components/ui";
import { ago, api } from "@/lib/client";
import { AMENITY_LABEL, inr } from "@/lib/shared";

type V = {
  id: number; title: string; address: string; zone: string; lat: number; lng: number; photo: string | null; spot_type: string; size: string;
  road_width: string; covered: number; amenities: string[]; price: number; status: string; reject_reason: string | null; created_at: number;
  owner: { id: number; name: string; avatar_color: string; fraud_score: number; rating: number };
  documents: { id: number; kind: string; file_name: string; data_url: string | null; created_at: number }[];
  duplicate_docs: number;
};

const REASONS = ["Document is blurry or unreadable", "Name on document doesn't match the owner", "Address doesn't match the listing", "Document matches another owner's upload"];

function Verify() {
  const { me, now, toast } = useApp();
  const { data, reload } = useLoader<V[]>(() => api("admin/verify"), [me?.user.id], 8000);
  const [tab, setTab] = useState<"pending" | "rejected" | "verified">("pending");
  const [open, setOpen] = useState<V | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const decide = async (v: V, approve: boolean) => {
    setBusy(true);
    try {
      await api(`admin/spots/${v.id}/verify`, { approve, reason });
      toast(approve ? `✅ ${v.title} verified. It's live for drivers.` : `Rejected. ${v.owner.name} has been notified.`, approve ? "success" : "info");
      setOpen(null);
      reload();
    } finally {
      setBusy(false);
    }
  };
  const hidePhoto = async (v: V) => {
    const r = await api(`admin/spots/${v.id}/hide-photo`, {});
    toast(r.hidden ? "Photo hidden from drivers" : "Photo restored", "info");
    reload();
  };

  const list = (data ?? []).filter((v) => v.status === tab);
  const count = (s: string) => (data ?? []).filter((v) => v.status === s).length;
  return (
    <div>
      <PageTitle kicker="Trust & safety" title="Listing verification">
        <Tabs tabs={[{ id: "pending", label: `Pending (${count("pending")})` }, { id: "rejected", label: `Rejected (${count("rejected")})` }, { id: "verified", label: `Verified (${count("verified")})` }]} value={tab} onChange={setTab} />
      </PageTitle>
      {!data && <Skeleton className="h-64" />}
      {data && list.length === 0 && <EmptyRoad title={tab === "pending" ? "Queue is clear 🎉" : "Nothing here"} text="New listings show up here as owners submit them." />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((v, i) => (
            <motion.div key={v.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.04 }} className="overflow-hidden rounded-[2rem] bg-white shadow-soft">
              <SpotImage spot={v} className="h-32 w-full" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-extrabold">{v.title}</div>
                    <div className="truncate text-xs text-muted">{v.address}</div>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <Avatar name={v.owner.name} color={v.owner.avatar_color} size={24} />
                  <span className="font-bold">{v.owner.name}</span>
                  <span className="text-muted">· submitted {ago(v.created_at, now)}</span>
                </div>
                {v.duplicate_docs > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-rose px-2.5 py-1.5 text-[11px] font-extrabold text-coral-deep">
                    <AlertTriangle className="h-3.5 w-3.5" /> Document matches another owner's upload
                  </div>
                )}
                {v.reject_reason && <div className="mt-2 text-xs text-coral-deep">“{v.reject_reason}”</div>}
                <Button size="sm" variant={v.status === "pending" ? "primary" : "soft"} className="mt-4 w-full" onClick={() => { setOpen(v); setReason(v.duplicate_docs ? REASONS[3] : REASONS[0]); }}>
                  <Eye className="h-3.5 w-3.5" /> {v.status === "pending" ? "Review documents" : "Open"}
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title} wide>
        {open && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3">
              <div className="relative">
                <SpotImage spot={open} className="h-40 w-full rounded-2xl" />
                {open.photo && (
                  <button onClick={() => hidePhoto(open)} className="absolute right-2 top-2 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold shadow">Hide photo</button>
                )}
              </div>
              <div className="h-40 overflow-hidden rounded-2xl">
                <Map pins={[{ id: open.id, lat: open.lat, lng: open.lng, label: inr(open.price) }]} center={[open.lat, open.lng]} zoom={15} activeId={open.id} showHere={false} />
              </div>
              <div className="flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> {open.address} · {open.zone}</div>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                <span className="rounded-full bg-road px-2 py-0.5">Size {open.size}</span>
                <span className="rounded-full bg-road px-2 py-0.5 capitalize">{open.road_width} road</span>
                <span className="rounded-full bg-road px-2 py-0.5 capitalize">{open.spot_type}</span>
                <span className="rounded-full bg-road px-2 py-0.5">{inr(open.price)}/hr</span>
                {open.amenities.map((a) => <span key={a} className="rounded-full bg-road px-2 py-0.5">{AMENITY_LABEL[a]}</span>)}
              </div>
            </div>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-widest text-muted">Submitted documents</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {open.documents.map((d) => (
                  <button key={d.id} onClick={() => d.data_url && setPreview(d.data_url)} className="text-left">
                    {d.data_url ? <img src={d.data_url} alt="" className="h-28 w-full rounded-2xl object-cover" /> : <DocArt kind={d.kind} name={d.file_name} />}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-white p-3 text-xs">
                <div className="font-extrabold">Checklist</div>
                {["Name on ID matches owner account", "Address on proof matches the pin", "Document is legible and recent", "Photo shows a real parking space"].map((c) => (
                  <label key={c} className="mt-1.5 flex items-center gap-2"><input type="checkbox" className="accent-mint-deep" /> {c}</label>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-cream p-3 text-xs">
                <Avatar name={open.owner.name} color={open.owner.avatar_color} size={28} />
                <div>
                  <div className="font-bold">{open.owner.name}</div>
                  <div className="text-muted">Risk score {open.owner.fraud_score} · rating {open.owner.rating ? open.owner.rating.toFixed(1) : "new"}</div>
                </div>
              </div>
              <>
                  <div className="mt-4 text-xs font-extrabold uppercase tracking-widest text-muted">If rejecting, why?</div>
                  <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-2xl bg-white px-3 py-2 text-sm font-medium ring-1 ring-road-dark">
                    {REASONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <div className="mt-4 flex gap-2">
                    <Button variant="danger" className="flex-1" loading={busy} onClick={() => decide(open, false)}><X className="h-4 w-4" /> Reject</Button>
                    <Button className="flex-1 !bg-mint-deep" loading={busy} onClick={() => decide(open, true)} disabled={open.status === "verified"}><Check className="h-4 w-4" /> Approve</Button>
                  </div>
                </>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Document preview" wide>
        {preview && <img src={preview} alt="" className="w-full rounded-2xl" />}
      </Modal>
    </div>
  );
}

export default function Page() {
  return (
    <RoleGate role="admin">
      <Verify />
    </RoleGate>
  );
}
