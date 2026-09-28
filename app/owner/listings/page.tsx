"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileText, Pause, Pencil, Play, Plus, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { RoleGate } from "@/components/AppShell";
import { EmptyRoad, SpotImage } from "@/components/illustrations";
import { Button, Modal, PageTitle, Skeleton, StatusBadge, useLoader } from "@/components/ui";
import { api } from "@/lib/client";
import { inr } from "@/lib/shared";

type MySpot = {
  id: number; title: string; address: string; zone: string; photo: string | null; spot_type: string; size: string; price: number; status: string;
  reject_reason: string | null; paused: number; rating: number; reviews: number; bookings: number; upcoming: number; mode: string;
  documents: { id: number; kind: string; file_name: string }[];
};

function Listings() {
  const { me, toast } = useApp();
  const { data, reload } = useLoader<MySpot[]>(() => api("owner/spots"), [me?.user.id], 8000);
  const [confirmPause, setConfirmPause] = useState<MySpot | null>(null);

  const togglePause = async (s: MySpot) => {
    const r = await api(`spots/${s.id}/pause`, {});
    toast(r.paused ? `Paused. ${r.upcoming ? `${r.upcoming} existing booking(s) will still be honoured.` : "Hidden from search."}` : "Live again for drivers 🚗", "info");
    setConfirmPause(null);
    reload();
  };

  return (
    <div>
      <PageTitle kicker="Your spaces" title="My spots">
        <Link href="/owner/new">
          <Button>
            <Plus className="h-4 w-4" /> List a new spot
          </Button>
        </Link>
      </PageTitle>
      {!data && <Skeleton className="h-64" />}
      {data && data.length === 0 && (
        <EmptyRoad title="No spots yet" text="Your driveway could be earning right now. It takes about 2 minutes to list.">
          <Link href="/owner/new">
            <Button>List your first spot</Button>
          </Link>
        </EmptyRoad>
      )}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence>
          {data?.map((s, i) => (
            <motion.div key={s.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="overflow-hidden rounded-[2rem] bg-white shadow-soft">
              <div className="relative h-36">
                <SpotImage spot={s} className={`h-full w-full ${s.paused ? "grayscale" : ""}`} />
                <div className="absolute left-3 top-3 flex gap-1.5">
                  <StatusBadge status={s.status} />
                  {s.paused ? <StatusBadge status="paused" /> : null}
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-extrabold">{s.title}</div>
                    <div className="truncate text-xs text-muted">{s.address}</div>
                  </div>
                  <div className="text-right font-black">{inr(s.price)}<div className="text-[10px] text-muted">/hr</div></div>
                </div>
                {s.status === "rejected" && s.reject_reason && <div className="mt-3 rounded-2xl bg-rose px-3 py-2 text-xs font-bold text-coral-deep">Why: {s.reject_reason}</div>}
                {s.status === "pending" && (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-butter px-3 py-2 text-xs font-bold">
                    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>⏳</motion.span>
                    Under review by our trust team
                  </div>
                )}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-cream py-2">
                    <div className="text-lg font-black">{s.bookings}</div>
                    <div className="text-[10px] font-bold text-muted">bookings</div>
                  </div>
                  <div className="rounded-2xl bg-cream py-2">
                    <div className="text-lg font-black">{s.upcoming}</div>
                    <div className="text-[10px] font-bold text-muted">active</div>
                  </div>
                  <div className="rounded-2xl bg-cream py-2">
                    <div className="flex items-center justify-center gap-1 text-lg font-black">{s.rating || "—"}{s.rating ? <Star className="h-3.5 w-3.5 fill-butter-deep text-butter-deep" /> : null}</div>
                    <div className="text-[10px] font-bold text-muted">{s.reviews} reviews</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.documents.map((d) => (
                    <span key={d.id} className="inline-flex items-center gap-1 rounded-full bg-road px-2 py-0.5 text-[10px] font-bold">
                      <FileText className="h-3 w-3" /> {d.file_name}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={`/owner/listings/${s.id}/edit`} className="flex-1">
                    <Button variant={s.status === "rejected" ? "primary" : "soft"} size="sm" className="w-full">
                      <Pencil className="h-3.5 w-3.5" /> {s.status === "rejected" ? "Fix & resubmit" : "Edit"}
                    </Button>
                  </Link>
                  {s.status === "verified" && (
                    <Button variant="soft" size="sm" className="flex-1" onClick={() => (s.paused || !s.upcoming ? togglePause(s) : setConfirmPause(s))}>
                      {s.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />} {s.paused ? "Resume" : "Pause"}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Modal open={!!confirmPause} onClose={() => setConfirmPause(null)} title="Pause this spot?">
        <p className="text-sm text-muted">
          <b>{confirmPause?.title}</b> has {confirmPause?.upcoming} upcoming or live booking(s). Pausing hides it from new searches, but existing bookings are still honoured.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="soft" className="flex-1" onClick={() => setConfirmPause(null)}>Keep live</Button>
          <Button className="flex-1" onClick={() => confirmPause && togglePause(confirmPause)}>Pause anyway</Button>
        </div>
      </Modal>
    </div>
  );
}

export default function Page() {
  return (
    <RoleGate role="owner">
      <Listings />
    </RoleGate>
  );
}
