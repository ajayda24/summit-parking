"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BadgeCheck, Camera, FileCheck2, IdCard, Sparkles, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, fileToDataUrl } from "@/lib/client";
import { AMENITIES, AMENITY_LABEL, inr, SIZES, SPOT_TYPES, ZONES } from "@/lib/shared";
import { useApp } from "./AppProvider";
import { DocArt, RoadProgress, SpotArt, VehicleArt } from "./illustrations";
import { Map } from "./Map";
import { Button, Chip, Field, inputCls, Toggle } from "./ui";

type Doc = { kind: "ownership" | "id"; file_name: string; data_url?: string };
export type ListingForm = {
  title: string; address: string; zone: string; description: string; spot_type: string; lat: number | null; lng: number | null;
  photo: string | null; size: string; road_width: string; covered: boolean; amenities: string[]; open_from: number; open_to: number;
  open_days: number[]; blocked_dates: string[]; price: number; mode: "instant" | "request"; documents: Doc[];
};

const EMPTY: ListingForm = {
  title: "", address: "", zone: "Koramangala", description: "", spot_type: "driveway", lat: null, lng: null, photo: null,
  size: "M", road_width: "normal", covered: false, amenities: [], open_from: 0, open_to: 24, open_days: [0, 1, 2, 3, 4, 5, 6],
  blocked_dates: [], price: 40, mode: "instant", documents: [],
};
const STEPS = ["Basics", "Location & photo", "Space", "Price & hours", "Verify"];
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const SIZE_VEHICLE: Record<string, string> = { S: "bike", M: "hatchback", L: "suv", XL: "van" };

export function ListingWizard({ initial, spotId, status, rejectReason }: { initial?: Partial<ListingForm>; spotId?: number; status?: string; rejectReason?: string | null }) {
  const { me, toast, refresh } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<ListingForm>({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const [suggest, setSuggest] = useState<{ price: number; reason: string } | null>(null);
  const [blockInput, setBlockInput] = useState("");
  const [error, setError] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    api(`spots/${spotId ?? "new"}/suggest-price?zone=${f.zone}&size=${f.size}`).then(setSuggest).catch(() => {});
  }, [f.zone, f.size, spotId]);

  const validate = (s: number) => {
    if (s === 0 && (!f.title.trim() || !f.address.trim())) return "Give your spot a name and address";
    if (s === 1 && (f.lat == null || f.lng == null)) return "Tap the map to drop a pin on your spot";
    if (s === 3 && (f.price <= 0 || f.open_to <= f.open_from)) return "Check your price and opening hours";
    if (s === 4 && !spotId && (!f.documents.some((d) => d.kind === "ownership") || !f.documents.some((d) => d.kind === "id"))) return "Upload both an ownership proof and an ID";
    return "";
  };
  const next = () => {
    const e = validate(step);
    setError(e);
    if (!e) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const addDoc = async (kind: Doc["kind"], file?: File, sample?: string) => {
    try {
      const doc: Doc = file ? { kind, file_name: file.name, data_url: file.type.startsWith("image/") ? await fileToDataUrl(file) : undefined } : { kind, file_name: sample! };
      set("documents", [...f.documents.filter((d) => d.kind !== kind), doc]);
      toast(`${kind === "id" ? "ID" : "Ownership proof"} attached`, "info");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const submit = async () => {
    const e = validate(4);
    if (e) return setError(e);
    setBusy(true);
    try {
      const body = { ...f, documents: f.documents.length ? f.documents : undefined };
      await api(spotId ? `spots/${spotId}` : "spots", body);
      await refresh();
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 }, colors: ["#D9D2FF", "#BDEBD6", "#FFD6BF", "#FF7A6B"] });
      toast(spotId ? (status === "rejected" || f.documents.length ? "Resubmitted for verification" : "Listing updated") : "Submitted! We'll verify your documents shortly.");
      router.push("/owner/listings");
    } catch (err) {
      setError((err as Error).message);
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const center: [number, number] = f.lat && f.lng ? [f.lat, f.lng] : [ZONES[f.zone].lat, ZONES[f.zone].lng];

  return (
    <div className="mx-auto max-w-4xl">
      {rejectReason && (
        <div className="mb-5 rounded-3xl bg-rose p-4 text-sm font-bold text-coral-deep">
          Rejected by admin: “{rejectReason}”. Fix it and upload fresh documents to resubmit.
        </div>
      )}
      <RoadProgress steps={STEPS} current={step} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-soft">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="space-y-4">
              {step === 0 && (
                <>
                  <h2 className="text-xl font-extrabold">Tell drivers about your space</h2>
                  <Field label="Listing name">
                    <input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Kiran's shady driveway" />
                  </Field>
                  <Field label="Address">
                    <input className={inputCls} value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="House no, street, area" />
                  </Field>
                  <Field label="Area">
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(ZONES).map((z) => (
                        <Chip key={z} active={f.zone === z} onClick={() => setF((x) => ({ ...x, zone: z, lat: null, lng: null }))}>{z}</Chip>
                      ))}
                    </div>
                  </Field>
                  <Field label="Type of space">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {SPOT_TYPES.map((t) => (
                        <motion.button whileTap={{ scale: 0.95 }} key={t} onClick={() => set("spot_type", t)} className={`overflow-hidden rounded-2xl ring-2 ${f.spot_type === t ? "ring-lavender-deep" : "ring-transparent"}`}>
                          <SpotArt type={t} className="h-16 w-full" />
                          <div className="bg-cream py-1 text-xs font-extrabold capitalize">{t === "shopfront" ? "Shop front" : t}</div>
                        </motion.button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Description (optional)">
                    <textarea className={inputCls} rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Gate code after booking, landmarks, anything useful…" />
                  </Field>
                </>
              )}
              {step === 1 && (
                <>
                  <h2 className="text-xl font-extrabold">Pin it on the map</h2>
                  <p className="text-sm text-muted">Tap exactly where drivers should park. (Map search is mocked. Just tap.)</p>
                  <div className="h-72 overflow-hidden rounded-3xl ring-4 ring-cream">
                    <Map key={f.zone} center={center} zoom={15} showHere={false} onPick={(lat, lng) => setF((x) => ({ ...x, lat, lng }))} picked={f.lat && f.lng ? [f.lat, f.lng] : null} />
                  </div>
                  {f.lat && <div className="text-xs font-bold text-mint-deep">📍 Pinned at {f.lat.toFixed(4)}, {f.lng!.toFixed(4)}</div>}
                  <Field label="Photo">
                    <div className="flex items-center gap-3">
                      <div className="h-24 w-36 overflow-hidden rounded-2xl bg-cream">
                        {f.photo ? <img src={f.photo} alt="" className="h-full w-full object-cover" /> : <SpotArt type={f.spot_type} className="h-full w-full" />}
                      </div>
                      <div className="space-y-2">
                        <input ref={photoRef} type="file" accept="image/*" hidden onChange={async (e) => { const file = e.target.files?.[0]; if (file) set("photo", await fileToDataUrl(file)); }} />
                        <Button variant="soft" size="sm" onClick={() => photoRef.current?.click()}>
                          <Camera className="h-4 w-4" /> {f.photo ? "Change photo" : "Upload photo"}
                        </Button>
                        {f.photo && (
                          <Button variant="ghost" size="sm" onClick={() => set("photo", null)}>
                            <Trash2 className="h-4 w-4" /> Use illustration
                          </Button>
                        )}
                        <div className="text-[11px] text-muted">No photo? We'll show a friendly illustration.</div>
                      </div>
                    </div>
                  </Field>
                </>
              )}
              {step === 2 && (
                <>
                  <h2 className="text-xl font-extrabold">What fits in your space?</h2>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {SIZES.map((s) => (
                      <motion.button whileTap={{ scale: 0.95 }} key={s.size} onClick={() => set("size", s.size)} className={`rounded-2xl p-3 text-center ring-2 ${f.size === s.size ? "bg-lavender ring-lavender-deep" : "bg-cream ring-transparent"}`}>
                        <motion.div animate={f.size === s.size ? { y: [0, -5, 0] } : {}}>
                          <VehicleArt type={SIZE_VEHICLE[s.size]} className="mx-auto w-16" />
                        </motion.div>
                        <div className="text-sm font-extrabold">{s.size} · {s.label}</div>
                        <div className="text-[10px] text-muted">{s.hint}</div>
                      </motion.button>
                    ))}
                  </div>
                  <Field label="Access road width" hint="Helps SUVs and vans avoid tight lanes.">
                    <div className="flex gap-2">
                      {["narrow", "normal", "wide"].map((w) => (
                        <Chip key={w} active={f.road_width === w} onClick={() => set("road_width", w)}>
                          <span className="capitalize">{w}</span>
                        </Chip>
                      ))}
                    </div>
                  </Field>
                  <Toggle on={f.covered} onChange={(v) => set("covered", v)} label="Covered parking (roof / basement)" />
                  <Field label="Amenities">
                    <div className="flex flex-wrap gap-2">
                      {AMENITIES.map((a) => (
                        <Chip key={a} color="mint" active={f.amenities.includes(a)} onClick={() => set("amenities", f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a])}>
                          {AMENITY_LABEL[a]}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                </>
              )}
              {step === 3 && (
                <>
                  <h2 className="text-xl font-extrabold">Set your price & hours</h2>
                  <div className="rounded-3xl bg-cream p-5">
                    <div className="flex items-end justify-between">
                      <div className="text-xs font-extrabold uppercase tracking-widest text-muted">Hourly price</div>
                      <motion.div key={f.price} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-4xl font-black">
                        {inr(f.price)}<span className="text-sm text-muted">/hr</span>
                      </motion.div>
                    </div>
                    <input type="range" min={10} max={150} step={5} value={f.price} onChange={(e) => set("price", Number(e.target.value))} className="mt-3 w-full accent-coral" />
                    {suggest && (
                      <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} onClick={() => set("price", suggest.price)} className="mt-3 flex w-full items-start gap-2 rounded-2xl bg-butter p-3 text-left">
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <div className="text-sm font-extrabold">Smart price: {inr(suggest.price)}/hr · tap to apply</div>
                          <div className="text-xs text-ink/70">{suggest.reason}</div>
                        </div>
                      </motion.button>
                    )}
                    <div className="mt-3 text-xs text-muted">
                      You earn about <b>{inr(f.price * 0.9)}</b> per booked hour after the {me?.commission ?? 10}% platform fee.
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Opens at">
                      <select className={inputCls} value={f.open_from} onChange={(e) => set("open_from", Number(e.target.value))}>
                        {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}:00</option>)}
                      </select>
                    </Field>
                    <Field label="Closes at">
                      <select className={inputCls} value={f.open_to} onChange={(e) => set("open_to", Number(e.target.value))}>
                        {Array.from({ length: 24 }, (_, h) => <option key={h + 1} value={h + 1}>{h + 1 === 24 ? "Midnight" : `${h + 1}:00`}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Open on">
                    <div className="flex gap-1.5">
                      {DAYS.map((d, i) => (
                        <motion.button whileTap={{ scale: 0.9 }} key={i} onClick={() => set("open_days", f.open_days.includes(i) ? f.open_days.filter((x) => x !== i) : [...f.open_days, i].sort())} className={`h-10 w-10 rounded-2xl text-sm font-extrabold ${f.open_days.includes(i) ? "bg-ink text-white" : "bg-cream text-ink/40"}`}>
                          {d}
                        </motion.button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Blocked dates" hint="Holidays or days you need the space yourself.">
                    <div className="flex gap-2">
                      <input type="date" className={inputCls} value={blockInput} onChange={(e) => setBlockInput(e.target.value)} />
                      <Button variant="soft" onClick={() => { if (blockInput && !f.blocked_dates.includes(blockInput)) set("blocked_dates", [...f.blocked_dates, blockInput].sort()); setBlockInput(""); }}>Block</Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {f.blocked_dates.map((d) => (
                        <button key={d} onClick={() => set("blocked_dates", f.blocked_dates.filter((x) => x !== d))} className="rounded-full bg-rose px-2.5 py-1 text-xs font-bold text-coral-deep">{d} ✕</button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Booking mode">
                    <div className="grid grid-cols-2 gap-2">
                      {([["instant", "⚡ Instant", "Drivers book straight away"], ["request", "✋ On request", "You accept each booking"]] as const).map(([id, t, d]) => (
                        <button key={id} onClick={() => set("mode", id)} className={`rounded-2xl p-3 text-left ring-2 ${f.mode === id ? "bg-lavender ring-lavender-deep" : "bg-cream ring-transparent"}`}>
                          <div className="text-sm font-extrabold">{t}</div>
                          <div className="text-xs text-muted">{d}</div>
                        </button>
                      ))}
                    </div>
                  </Field>
                </>
              )}
              {step === 4 && (
                <>
                  <h2 className="text-xl font-extrabold">Prove it's yours</h2>
                  <p className="text-sm text-muted">
                    To keep drivers safe, every listing is checked by our trust team. Upload an ownership or rental proof and a government ID.
                    {spotId && " Uploading new documents sends the listing back for review."}
                  </p>
                  {(
                    [
                      ["ownership", "Ownership / rental proof", "Sale deed, property tax receipt, rent agreement or electricity bill", FileCheck2, "property_tax_receipt.pdf"],
                      ["id", "Government ID", "Aadhaar, PAN, passport or driving licence", IdCard, "aadhaar_card.jpg"],
                    ] as const
                  ).map(([kind, title, hint, Icon, sample]) => {
                    const doc = f.documents.find((d) => d.kind === kind);
                    return (
                      <div key={kind} className={`rounded-3xl p-4 ring-2 ${doc ? "bg-mint/40 ring-mint-deep/40" : "bg-cream ring-transparent"}`}>
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white">
                            {doc ? <BadgeCheck className="h-5 w-5 text-mint-deep" /> : <Icon className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold">{title}</div>
                            <div className="text-xs text-muted">{hint}</div>
                            {doc && <div className="mt-1 truncate text-xs font-bold text-mint-deep">✓ {doc.file_name}</div>}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-road-dark hover:bg-road/40">
                                <Upload className="h-3.5 w-3.5" /> Upload file
                                <input type="file" accept="image/*,.pdf" hidden onChange={(e) => e.target.files?.[0] && addDoc(kind, e.target.files[0])} />
                              </label>
                              <button onClick={() => addDoc(kind, undefined, `${me?.user.name.split(" ")[0].toLowerCase()}_${sample}`)} className="rounded-xl px-3 py-1.5 text-xs font-bold text-lavender-deep hover:bg-white">
                                Use sample (demo)
                              </button>
                            </div>
                          </div>
                          {doc?.data_url && <img src={doc.data_url} alt="" className="h-16 w-16 rounded-xl object-cover" />}
                        </div>
                      </div>
                    );
                  })}
                  <div className="rounded-2xl bg-sky/50 p-3 text-xs font-medium">
                    🔒 Documents are only visible to the verification team. Most listings are reviewed within a few hours (instantly in this demo).
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          {error && <div className="shake mt-4 rounded-2xl bg-rose px-3 py-2 text-sm font-bold text-coral-deep">{error}</div>}
          <div className="mt-6 flex justify-between gap-2">
            <Button variant="ghost" onClick={() => { setError(""); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} loading={busy}>
                {spotId ? "Save changes" : "Submit for verification"} <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* live preview */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted">Live preview</div>
          <motion.div layout className="overflow-hidden rounded-[2rem] bg-white shadow-soft">
            <div className="h-40">{f.photo ? <img src={f.photo} alt="" className="h-full w-full object-cover" /> : <SpotArt type={f.spot_type} className="h-full w-full" />}</div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-extrabold">{f.title || "Your spot name"}</div>
                  <div className="text-xs text-muted">{f.address || "Address"} · {f.zone}</div>
                </div>
                <div className="text-right text-xl font-black">{inr(f.price)}<div className="text-[10px] font-bold text-muted">/hour</div></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
                <span className="rounded-full bg-road px-2 py-0.5">Size {f.size}</span>
                <span className="rounded-full bg-road px-2 py-0.5 capitalize">{f.road_width} road</span>
                {f.covered && <span className="rounded-full bg-sky px-2 py-0.5">Covered</span>}
                {f.amenities.map((a) => <span key={a} className="rounded-full bg-mint px-2 py-0.5">{AMENITY_LABEL[a]}</span>)}
                <span className="rounded-full bg-lavender px-2 py-0.5">{f.mode === "request" ? "On request" : "Instant"}</span>
              </div>
              <div className="mt-3 text-xs text-muted">
                {f.open_from}:00–{f.open_to === 24 ? "24:00" : `${f.open_to}:00`} · {f.open_days.length === 7 ? "every day" : f.open_days.map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")}
              </div>
              {f.documents.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {f.documents.map((d) => <DocArt key={d.kind} kind={d.kind} name={d.file_name} />)}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
