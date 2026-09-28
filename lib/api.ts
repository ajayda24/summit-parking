import { db, resetDb } from "./db";
import { bookingCode, credit, getSetting, notify, payOwner, PLATFORM_ID, setSetting, transfer } from "./ledger";
import {
  fits,
  haversineKm,
  HERE,
  HOUR,
  MIN,
  overtime,
  quote,
  refundPolicy,
  surgeFor,
  ZONES,
  type SurgeRule,
  type VehicleType,
} from "./shared";

// ---------- types ----------
export type User = {
  id: number; name: string; role: "driver" | "owner" | "admin"; tagline: string; avatar_color: string;
  wallet: number; rating: number; rating_count: number; suspended: number; fraud_score: number;
};
type Spot = {
  id: number; owner_id: number; title: string; address: string; zone: string; lat: number; lng: number;
  photo: string | null; photo_hidden: number; spot_type: string; size: string; road_width: string; covered: number;
  amenities: string; price: number; open_from: number; open_to: number; open_days: string; blocked_dates: string;
  mode: string; status: string; reject_reason: string | null; paused: number; description: string | null; created_at: number;
};
type Booking = {
  id: number; spot_id: number; driver_id: number; vehicle_id: number | null; start_at: number; end_at: number;
  base: number; surge: number; fee: number; total: number; commission_pct: number; code: string; status: string;
  checked_in_at: number | null; checked_out_at: number | null; extended_min: number; overtime_min: number;
  overtime_amount: number; refund_amount: number; owner_payout: number; cancelled_by: string | null;
  driver_reviewed: number; owner_rated: number; created_at: number;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
const fail = (status: number, msg: string): never => {
  throw new ApiError(status, msg);
};

// ---------- helpers ----------
const d = () => db();
export const now = () => Date.now() + getSetting<number>(d(), "clock_offset", 0);
const commission = () => getSetting<number>(d(), "commission", 10);
const surgeRules = () => getSetting<SurgeRule[]>(d(), "surge_rules", []);

const getUser = (id: number) => d().prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
const getSpot = (id: number) => (d().prepare("SELECT * FROM spots WHERE id = ?").get(id) as Spot | undefined) ?? fail(404, "Spot not found");
const getBooking = (id: number) =>
  (d().prepare("SELECT * FROM bookings WHERE id = ?").get(id) as Booking | undefined) ?? fail(404, "Booking not found");

function parseSpot(s: Spot) {
  return {
    ...s,
    amenities: JSON.parse(s.amenities) as string[],
    open_days: JSON.parse(s.open_days) as number[],
    blocked_dates: JSON.parse(s.blocked_dates) as string[],
    photo: s.photo_hidden ? null : s.photo,
  };
}

function spotRating(spotId: number) {
  const r = d().prepare("SELECT AVG(stars) a, COUNT(*) n FROM reviews WHERE spot_id = ? AND hidden = 0").get(spotId) as { a: number | null; n: number };
  return { rating: r.a ? Math.round(r.a * 10) / 10 : 0, reviews: r.n };
}

function recomputeUserRating(userId: number) {
  const r = d().prepare("SELECT AVG(stars) a, COUNT(*) n FROM reviews WHERE to_user = ? AND hidden = 0").get(userId) as { a: number | null; n: number };
  d().prepare("UPDATE users SET rating = ?, rating_count = ? WHERE id = ?").run(r.a ?? 0, r.n, userId);
}

const overlaps = (spotId: number, start: number, end: number, exceptId = 0) =>
  d()
    .prepare("SELECT * FROM bookings WHERE spot_id = ? AND id != ? AND status IN ('requested','confirmed','live') AND start_at < ? AND end_at > ?")
    .get(spotId, exceptId, end, start) as Booking | undefined;

function dateKey(ms: number) {
  const x = new Date(ms);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function checkOpen(s: ReturnType<typeof parseSpot>, start: number, end: number) {
  const sd = new Date(start);
  if (!s.open_days.includes(sd.getDay())) fail(400, "The spot is closed on that day");
  if (s.blocked_dates.includes(dateKey(start))) fail(400, "The owner has blocked that date");
  const startH = sd.getHours() + sd.getMinutes() / 60;
  const endH = startH + (end - start) / HOUR;
  if (startH < s.open_from || endH > s.open_to) fail(400, `Open ${s.open_from}:00 – ${s.open_to === 24 ? "24:00" : s.open_to + ":00"} only`);
}

/** Applies time-based transitions against the (demo) clock. */
function sweep() {
  const t = now();
  const db_ = d();
  const stale = db_.prepare("SELECT * FROM bookings WHERE status = 'requested' AND (created_at + ? < ? OR start_at < ?)").all(15 * MIN, t, t) as Booking[];
  for (const b of stale) {
    const s = getSpot(b.spot_id);
    db_.prepare("UPDATE bookings SET status = 'declined', refund_amount = ?, cancelled_by = 'system' WHERE id = ?").run(b.total, b.id);
    transfer(db_, PLATFORM_ID, b.driver_id, b.total, "refund", b.id, "Auto-refund — owner did not respond in 15 min", t);
    notify(db_, b.driver_id, `${s.title} didn't respond in time. ${b.total} refunded to your wallet.`, "info", `/driver/pass/${b.id}`, t);
    notify(db_, s.owner_id, `Request #${b.id} expired and was auto-declined.`, "warning", "/owner", t);
  }
  const noShows = db_.prepare("SELECT * FROM bookings WHERE status = 'confirmed' AND start_at + ? < ?").all(30 * MIN, t) as Booking[];
  for (const b of noShows) {
    const s = getSpot(b.spot_id);
    const comp = Math.round(b.base / 2);
    const paid = payOwner(db_, b.id, s.owner_id, comp, b.commission_pct, `No-show compensation #${b.id}`, t);
    db_.prepare("UPDATE bookings SET status = 'no_show', owner_payout = ? WHERE id = ?").run(paid, b.id);
    notify(db_, b.driver_id, `Marked as no-show at ${s.title} (not checked in within 30 min). No refund.`, "error", `/driver/pass/${b.id}`, t);
    notify(db_, s.owner_id, `No-show on booking #${b.id}. You received ₹${paid} compensation.`, "info", "/owner/earnings", t);
  }
  // Overstay alerts (once per booking, when the grace period ends)
  const over = db_.prepare("SELECT * FROM bookings WHERE status = 'live' AND end_at + ? < ?").all(10 * MIN, t) as Booking[];
  for (const b of over) {
    const tag = `overstay:${b.id}`;
    if (getSetting(db_, tag, false)) continue;
    setSetting(db_, tag, true);
    const s = getSpot(b.spot_id);
    notify(db_, b.driver_id, `Your time at ${s.title} is up. Overtime is being charged at 1.5× until you check out.`, "warning", `/driver/pass/${b.id}`, t);
    const next = db_.prepare("SELECT id FROM bookings WHERE spot_id = ? AND id != ? AND status IN ('confirmed','requested') AND start_at < ?").get(b.spot_id, b.id, t + HOUR);
    notify(db_, s.owner_id, `Driver is overstaying at ${s.title}.${next ? " ⚠ The next booking starts soon." : ""}`, "warning", "/owner", t);
  }
}

function requireRole(u: User, ...roles: User["role"][]) {
  if (!roles.includes(u.role)) fail(403, `Switch to a ${roles.join("/")} account for this`);
}
function requireActive(u: User) {
  if (u.suspended) fail(403, "Your account is suspended. Contact support.");
}
function maybeFailPayment() {
  if (getSetting(d(), "fail_payment", false)) fail(402, "Payment failed (demo: 'Simulate payment failure' is ON). Nothing was charged.");
}

function bookingView(b: Booking) {
  const s = parseSpot(getSpot(b.spot_id));
  const driver = getUser(b.driver_id)!;
  const vehicle = b.vehicle_id ? d().prepare("SELECT * FROM vehicles WHERE id = ?").get(b.vehicle_id) : null;
  const t = now();
  const liveOt = b.status === "live" ? overtime(s.price, b.end_at, t) : null;
  const dispute = d().prepare("SELECT * FROM disputes WHERE booking_id = ? ORDER BY id DESC").get(b.id) ?? null;
  return {
    ...b,
    spot: { id: s.id, title: s.title, address: s.address, zone: s.zone, lat: s.lat, lng: s.lng, price: s.price, owner_id: s.owner_id, photo: s.photo, spot_type: s.spot_type, size: s.size },
    driver: { id: driver.id, name: driver.name, avatar_color: driver.avatar_color, rating: driver.rating },
    owner: (({ id, name, avatar_color }) => ({ id, name, avatar_color }))(getUser(s.owner_id)!),
    vehicle,
    overstay: !!liveOt && liveOt.minutes > 0,
    live_overtime: liveOt,
    dispute,
  };
}

// ---------- handlers ----------
type Ctx = { user: User; body: any; params: string[]; query: URLSearchParams; setUid: (id: number) => void };
type Handler = (c: Ctx) => unknown;

const routes: [string, RegExp, Handler][] = [];
const on = (method: string, pattern: string, h: Handler) =>
  routes.push([method, new RegExp("^" + pattern.replace(/:\w+/g, "([^/]+)") + "$"), h]);

// --- session / accounts
on("GET", "me", ({ user }) => {
  const db_ = d();
  return {
    user,
    vehicles: db_.prepare("SELECT * FROM vehicles WHERE user_id = ? ORDER BY active DESC, id").all(user.id),
    unread: (db_.prepare("SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND read = 0").get(user.id) as { n: number }).n,
    now: now(),
    offset: getSetting(db_, "clock_offset", 0),
    fail_payment: getSetting(db_, "fail_payment", false),
    commission: commission(),
    surge_rules: surgeRules(),
  };
});
on("GET", "users", () => d().prepare("SELECT id, name, role, tagline, avatar_color, wallet, suspended FROM users ORDER BY id").all());
on("POST", "switch", ({ body, setUid }) => {
  const u = getUser(Number(body.userId)) ?? fail(404, "No such user");
  setUid(u.id);
  return u;
});
on("POST", "users", ({ body, setUid }) => {
  const role = ["driver", "owner"].includes(body.role) ? body.role : "driver";
  const name = String(body.name || "").trim() || (role === "driver" ? "New Driver" : "New Owner");
  const colors = ["#CDE7FF", "#BDEBD6", "#FFD6BF", "#D9D2FF", "#FFF1B8", "#FFC9DE"];
  const t = now();
  const id = Number(
    d().prepare("INSERT INTO users (name, role, tagline, avatar_color, created_at) VALUES (?,?,?,?,?)").run(
      name, role, role === "driver" ? "New demo driver" : "New demo owner", colors[Math.floor(Math.random() * colors.length)], t
    ).lastInsertRowid
  );
  credit(d(), id, role === "driver" ? 1000 : 0, "topup", null, "Welcome demo balance", t);
  if (role === "driver") {
    d().prepare("INSERT INTO vehicles (user_id, label, plate, type, fuel, active) VALUES (?,?,?,?,?,1)").run(id, body.vehicleLabel || "My car", body.plate || "KA 01 AB 1234", body.vehicleType || "hatchback", body.fuel || "petrol");
  }
  notify(d(), id, `Welcome ${name}! ${role === "driver" ? "₹1,000 demo money added to your wallet." : "List your first spot to start earning."}`, "info", role === "driver" ? "/driver" : "/owner/new", t);
  setUid(id);
  return getUser(id);
});

// --- notifications
on("GET", "notifications", ({ user }) => d().prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 40").all(user.id));
on("POST", "notifications/read", ({ user }) => {
  d().prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(user.id);
  return { ok: true };
});

// --- wallet
on("GET", "wallet", ({ user }) => ({
  balance: getUser(user.id)!.wallet,
  transactions: d().prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100").all(user.id),
}));
on("POST", "wallet/topup", ({ user, body }) => {
  const amount = Math.round(Number(body.amount));
  if (!(amount > 0 && amount <= 50000)) fail(400, "Enter an amount between ₹1 and ₹50,000");
  maybeFailPayment();
  credit(d(), user.id, amount, "topup", null, `Added via ${body.method || "Demo UPI"}`, now());
  return { balance: getUser(user.id)!.wallet };
});
on("POST", "wallet/withdraw", ({ user, body }) => {
  const amount = Math.round(Number(body.amount));
  const u = getUser(user.id)!;
  if (!(amount > 0)) fail(400, "Enter an amount");
  if (amount > u.wallet) fail(400, "You can't withdraw more than your balance");
  credit(d(), user.id, -amount, "withdraw", null, `Withdrawn to ${body.bank || "Demo Bank ••4821"}`, now());
  notify(d(), user.id, `₹${amount} sent to ${body.bank || "Demo Bank ••4821"}. It will arrive instantly (demo).`, "success", "/wallet", now());
  return { balance: getUser(user.id)!.wallet };
});

// --- vehicles
on("POST", "vehicles", ({ user, body }) => {
  requireRole(user, "driver");
  d().prepare("UPDATE vehicles SET active = 0 WHERE user_id = ?").run(user.id);
  d().prepare("INSERT INTO vehicles (user_id, label, plate, type, fuel, active) VALUES (?,?,?,?,?,1)").run(user.id, body.label || "My vehicle", body.plate || "", body.type, body.fuel);
  return { ok: true };
});
on("POST", "vehicles/:id/activate", ({ user, params }) => {
  d().prepare("UPDATE vehicles SET active = (id = ?) WHERE user_id = ?").run(Number(params[0]), user.id);
  return { ok: true };
});

// --- spots (driver side)
on("GET", "spots", ({ user }) => {
  const rows = d().prepare("SELECT * FROM spots WHERE status = 'verified' AND paused = 0").all() as Spot[];
  const favs = new Set((d().prepare("SELECT spot_id FROM favourites WHERE user_id = ?").all(user.id) as { spot_id: number }[]).map((f) => f.spot_id));
  const t = now();
  const rules = surgeRules();
  return rows.map((s) => {
    const busy = d().prepare("SELECT COUNT(*) n FROM bookings WHERE spot_id = ? AND status = 'live'").get(s.id) as { n: number };
    return {
      ...parseSpot(s),
      ...spotRating(s.id),
      distance: Math.round(haversineKm(HERE, s) * 10) / 10,
      fav: favs.has(s.id),
      occupied: busy.n > 0,
      surge: surgeFor(rules, s.zone, t),
      owner_name: getUser(s.owner_id)?.name,
    };
  });
});
on("GET", "spots/:id", ({ user, params }) => {
  const s = parseSpot(getSpot(Number(params[0])));
  const t = now();
  const from = t - 2 * HOUR;
  return {
    ...s,
    ...spotRating(s.id),
    distance: Math.round(haversineKm(HERE, s) * 10) / 10,
    fav: !!d().prepare("SELECT 1 FROM favourites WHERE user_id = ? AND spot_id = ?").get(user.id, s.id),
    owner: (({ id, name, avatar_color, rating, rating_count }) => ({ id, name, avatar_color, rating, rating_count }))(getUser(s.owner_id)!),
    reviews: d()
      .prepare("SELECT r.*, u.name AS from_name, u.avatar_color FROM reviews r JOIN users u ON u.id = r.from_user WHERE r.spot_id = ? AND r.hidden = 0 ORDER BY r.created_at DESC")
      .all(s.id),
    busy: d().prepare("SELECT start_at, end_at, status FROM bookings WHERE spot_id = ? AND status IN ('requested','confirmed','live') AND end_at > ? ORDER BY start_at").all(s.id, from),
    surge_rules: surgeRules().filter((r) => r.zone === s.zone),
    surge_now: surgeFor(surgeRules(), s.zone, t),
  };
});
on("POST", "favourites/:id", ({ user, params }) => {
  const id = Number(params[0]);
  const has = d().prepare("SELECT 1 FROM favourites WHERE user_id = ? AND spot_id = ?").get(user.id, id);
  if (has) d().prepare("DELETE FROM favourites WHERE user_id = ? AND spot_id = ?").run(user.id, id);
  else d().prepare("INSERT INTO favourites (user_id, spot_id) VALUES (?, ?)").run(user.id, id);
  return { fav: !has };
});

// --- spots (owner side)
function saveSpot(user: User, body: any, id?: number) {
  requireRole(user, "owner");
  requireActive(user);
  const need = ["title", "address", "zone", "lat", "lng", "spot_type", "size", "road_width", "price"];
  for (const k of need) if (body[k] === undefined || body[k] === "") fail(400, `Missing ${k.replace("_", " ")}`);
  if (Number(body.price) <= 0) fail(400, "Price must be above ₹0");
  if (Number(body.open_to) <= Number(body.open_from)) fail(400, "Closing hour must be after opening hour");
  const docs: { kind: string; file_name: string; data_url?: string }[] = body.documents ?? [];
  const t = now();
  const vals = [
    body.title, body.address, body.zone, Number(body.lat), Number(body.lng), body.photo ?? null, body.spot_type, body.size,
    body.road_width, body.covered ? 1 : 0, JSON.stringify(body.amenities ?? []), Number(body.price), Number(body.open_from ?? 0),
    Number(body.open_to ?? 24), JSON.stringify(body.open_days ?? [0, 1, 2, 3, 4, 5, 6]), JSON.stringify(body.blocked_dates ?? []),
    body.mode === "request" ? "request" : "instant", body.description ?? "",
  ];
  let spotId = id;
  if (id) {
    const s = getSpot(id);
    if (s.owner_id !== user.id) fail(403, "Not your listing");
    const resubmit = s.status === "rejected" || docs.length > 0;
    d().prepare(`UPDATE spots SET title=?, address=?, zone=?, lat=?, lng=?, photo=?, spot_type=?, size=?, road_width=?, covered=?, amenities=?,
      price=?, open_from=?, open_to=?, open_days=?, blocked_dates=?, mode=?, description=?, photo_hidden = 0 WHERE id = ?`).run(...vals, id);
    if (resubmit) d().prepare("UPDATE spots SET status = 'pending', reject_reason = NULL WHERE id = ?").run(id);
  } else {
    const kinds = new Set(docs.map((x) => x.kind));
    if (!kinds.has("ownership") || !kinds.has("id")) fail(400, "Upload an ownership proof and an ID to submit for verification");
    spotId = Number(
      d().prepare(`INSERT INTO spots (title, address, zone, lat, lng, photo, spot_type, size, road_width, covered, amenities, price, open_from,
        open_to, open_days, blocked_dates, mode, description, owner_id, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?)`)
        .run(...vals, user.id, t).lastInsertRowid
    );
  }
  if (docs.length) {
    d().prepare("DELETE FROM documents WHERE spot_id = ?").run(spotId);
    for (const doc of docs)
      d().prepare("INSERT INTO documents (spot_id, kind, file_name, data_url, created_at) VALUES (?,?,?,?,?)").run(spotId, doc.kind, doc.file_name, doc.data_url ?? null, t);
  }
  const s = getSpot(spotId!);
  if (s.status === "pending") {
    notify(d(), PLATFORM_ID, `${user.name} submitted "${s.title}" for verification.`, "info", "/admin/verify", t);
    notify(d(), user.id, `"${s.title}" is under review. We'll notify you once it's verified.`, "info", "/owner/listings", t);
  }
  return parseSpot(s);
}
on("POST", "spots", ({ user, body }) => saveSpot(user, body));
on("POST", "spots/:id", ({ user, body, params }) => saveSpot(user, body, Number(params[0])));
on("POST", "spots/:id/pause", ({ user, params }) => {
  const s = getSpot(Number(params[0]));
  if (s.owner_id !== user.id) fail(403, "Not your listing");
  d().prepare("UPDATE spots SET paused = ? WHERE id = ?").run(s.paused ? 0 : 1, s.id);
  const upcoming = (d().prepare("SELECT COUNT(*) n FROM bookings WHERE spot_id = ? AND status IN ('confirmed','requested','live')").get(s.id) as { n: number }).n;
  return { paused: !s.paused, upcoming };
});
on("GET", "owner/spots", ({ user }) => {
  const rows = d().prepare("SELECT * FROM spots WHERE owner_id = ? ORDER BY created_at DESC").all(user.id) as Spot[];
  return rows.map((s) => ({
    ...parseSpot(s),
    ...spotRating(s.id),
    documents: d().prepare("SELECT id, kind, file_name, created_at FROM documents WHERE spot_id = ?").all(s.id),
    bookings: (d().prepare("SELECT COUNT(*) n FROM bookings WHERE spot_id = ?").get(s.id) as { n: number }).n,
    upcoming: (d().prepare("SELECT COUNT(*) n FROM bookings WHERE spot_id = ? AND status IN ('confirmed','requested','live')").get(s.id) as { n: number }).n,
  }));
});
on("GET", "owner/spots/:id", ({ user, params }) => {
  const s = getSpot(Number(params[0]));
  if (s.owner_id !== user.id) fail(403, "Not your listing");
  return { ...parseSpot(s), photo: s.photo, documents: d().prepare("SELECT kind, file_name, data_url FROM documents WHERE spot_id = ?").all(s.id) };
});
on("GET", "spots/:id/suggest-price", ({ params, query }) => {
  const zone = params[0] === "new" ? query.get("zone") || "Koramangala" : getSpot(Number(params[0])).zone;
  const size = query.get("size") || (params[0] === "new" ? "M" : getSpot(Number(params[0])).size);
  return suggestPrice(zone, size);
});
function suggestPrice(zone: string, size: string) {
  const t = now();
  const peers = d().prepare("SELECT AVG(price) a, COUNT(*) n FROM spots WHERE zone = ? AND status = 'verified'").get(zone) as { a: number | null; n: number };
  const sameSize = d().prepare("SELECT AVG(price) a FROM spots WHERE zone = ? AND size = ? AND status = 'verified'").get(zone, size) as { a: number | null };
  const bookings = (d().prepare("SELECT COUNT(*) n FROM bookings b JOIN spots s ON s.id = b.spot_id WHERE s.zone = ? AND b.created_at > ?").get(zone, t - 7 * 24 * HOUR) as { n: number }).n;
  const demand = peers.n ? bookings / peers.n : 0;
  const basePrice = sameSize.a ?? peers.a ?? 35;
  const boost = Math.max(-0.1, Math.min(0.3, (demand - 1) * 0.1));
  const price = Math.max(10, Math.round((basePrice * (1 + boost)) / 5) * 5);
  const surge = surgeRules().find((r) => r.zone === zone);
  return {
    price,
    reason: `${peers.n} verified spots in ${zone} average ₹${Math.round(basePrice)}/hr for size ${size}; demand is ${demand >= 1.5 ? "high" : demand >= 0.8 ? "steady" : "low"} (${bookings} bookings this week).${surge ? ` Surge ×${surge.mult} applies ${surge.from}:00–${surge.to}:00.` : ""}`,
  };
}

// --- owner board / earnings
on("GET", "owner/board", ({ user }) => {
  requireRole(user, "owner");
  const t = now();
  const spots = d().prepare("SELECT * FROM spots WHERE owner_id = ? ORDER BY id").all(user.id) as Spot[];
  const ids = spots.map((s) => s.id);
  const bookings = ids.length
    ? (d().prepare(`SELECT * FROM bookings WHERE spot_id IN (${ids.join(",")}) ORDER BY start_at DESC`).all() as Booking[]).map(bookingView)
    : [];
  const board = spots.map((s) => {
    const live = bookings.find((b) => b.spot_id === s.id && b.status === "live");
    const next = bookings.filter((b) => b.spot_id === s.id && b.status === "confirmed").sort((a, b) => a.start_at - b.start_at)[0];
    const state = s.status !== "verified" ? s.status : s.paused ? "paused" : live ? (live.overstay ? "overstay" : "live") : next && next.start_at - t < 2 * HOUR ? "upcoming" : "free";
    return { ...parseSpot(s), state, live: live ?? null, next: next ?? null };
  });
  const today = new Date(t);
  today.setHours(0, 0, 0, 0);
  const earned = (since: number) =>
    (d().prepare("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE user_id = ? AND type = 'payout' AND created_at >= ?").get(user.id, since) as { s: number }).s;
  return {
    board,
    requests: bookings.filter((b) => b.status === "requested"),
    upcoming: bookings.filter((b) => b.status === "confirmed").sort((a, b) => a.start_at - b.start_at),
    live: bookings.filter((b) => b.status === "live"),
    recent: bookings.filter((b) => ["completed", "cancelled", "declined", "no_show"].includes(b.status)).slice(0, 12),
    stats: {
      today: earned(today.getTime()),
      total: earned(0),
      wallet: getUser(user.id)!.wallet,
      occupancy: board.filter((b) => b.state === "live" || b.state === "overstay").length,
      spots: spots.length,
      rating: user.rating,
    },
  };
});
on("GET", "owner/earnings", ({ user }) => {
  requireRole(user, "owner");
  const t = now();
  const days: { day: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const s = new Date(t - i * 24 * HOUR);
    s.setHours(0, 0, 0, 0);
    const e = s.getTime() + 24 * HOUR;
    const sum = (d().prepare("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE user_id = ? AND type = 'payout' AND created_at >= ? AND created_at < ?").get(user.id, s.getTime(), e) as { s: number }).s;
    days.push({ day: s.toLocaleDateString("en-IN", { weekday: "short" }), amount: sum });
  }
  const rows = d()
    .prepare(`SELECT b.*, s.title FROM bookings b JOIN spots s ON s.id = b.spot_id WHERE s.owner_id = ? AND b.owner_payout > 0 ORDER BY COALESCE(b.checked_out_at, b.start_at) DESC`)
    .all(user.id) as (Booking & { title: string })[];
  const withdrawn = (d().prepare("SELECT COALESCE(SUM(-amount),0) s FROM transactions WHERE user_id = ? AND type = 'withdraw'").get(user.id) as { s: number }).s;
  return {
    days,
    total: rows.reduce((a, r) => a + r.owner_payout, 0),
    overtime: rows.reduce((a, r) => a + r.overtime_amount, 0),
    commission: rows.reduce((a, r) => a + (r.base + r.overtime_amount) * (r.commission_pct / 100), 0),
    withdrawn,
    wallet: getUser(user.id)!.wallet,
    rows: rows.map((r) => ({ id: r.id, title: r.title, when: r.checked_out_at ?? r.start_at, status: r.status, base: r.base, overtime: r.overtime_amount, commission_pct: r.commission_pct, payout: r.owner_payout, driver: getUser(r.driver_id)?.name })),
  };
});

// --- bookings
on("GET", "bookings", ({ user }) => {
  const rows = d().prepare("SELECT * FROM bookings WHERE driver_id = ? ORDER BY start_at DESC").all(user.id) as Booking[];
  return rows.map(bookingView);
});
on("GET", "bookings/:id", ({ user, params }) => {
  const b = getBooking(Number(params[0]));
  const s = getSpot(b.spot_id);
  if (user.role !== "admin" && b.driver_id !== user.id && s.owner_id !== user.id) fail(403, "Not your booking");
  return {
    ...bookingView(b),
    receipt: d().prepare("SELECT * FROM transactions WHERE booking_id = ? AND user_id = ? ORDER BY created_at, id").all(b.id, b.driver_id),
    policy: refundPolicy(b.status as never, b.start_at, now(), b.base, b.total),
    next_free: !overlaps(b.spot_id, b.end_at, b.end_at + 30 * MIN, b.id),
  };
});
on("POST", "bookings/quote", ({ body }) => {
  const s = parseSpot(getSpot(Number(body.spotId)));
  const surge = surgeFor(surgeRules(), s.zone, Number(body.start));
  return { ...quote(s.price, Number(body.start), Number(body.end), surge), surge };
});
on("POST", "bookings", ({ user, body }) => {
  requireRole(user, "driver");
  requireActive(user);
  const t = now();
  const s = parseSpot(getSpot(Number(body.spotId)));
  const start = Number(body.start);
  const end = Number(body.end);
  if (s.status !== "verified") fail(400, "This spot isn't verified yet");
  if (s.paused) fail(400, "The owner has paused this spot");
  if (!(end > start)) fail(400, "End time must be after start time");
  if (end - start < HOUR) fail(400, "Minimum booking is 1 hour");
  if (start < t - 5 * MIN) fail(400, "You can't book a time in the past");
  checkOpen(s, start, end);
  const vehicle = d().prepare("SELECT * FROM vehicles WHERE id = ? AND user_id = ?").get(Number(body.vehicleId), user.id) as { type: VehicleType } | undefined;
  if (vehicle && !fits(vehicle.type, s.size as never)) fail(400, "This spot is too small for your vehicle");
  const clash = overlaps(s.id, start, end);
  if (clash) {
    const after = new Date(clash.end_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    fail(409, `That slot was just taken. Next free from ${after}.`);
  }
  const surge = surgeFor(surgeRules(), s.zone, start);
  const q = quote(s.price, start, end, surge);
  const u = getUser(user.id)!;
  if (u.wallet < q.total) fail(402, `Insufficient wallet balance. Add ₹${Math.ceil(q.total - u.wallet)} to continue.`);
  maybeFailPayment();
  const status = s.mode === "request" ? "requested" : "confirmed";
  const id = Number(
    d().prepare(`INSERT INTO bookings (spot_id, driver_id, vehicle_id, start_at, end_at, base, surge, fee, total, commission_pct, code, status, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(s.id, user.id, body.vehicleId ?? null, start, end, q.base, surge, q.fee, q.total, commission(), bookingCode(), status, t).lastInsertRowid
  );
  transfer(d(), user.id, PLATFORM_ID, q.total, "booking_hold", id, `Booking #${id} at ${s.title}`, t);
  const when = new Date(start).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" });
  if (status === "requested") {
    notify(d(), s.owner_id, `New request from ${user.name} for ${s.title} (${when}). Accept within 15 min.`, "booking", "/owner", t);
    notify(d(), user.id, `Request sent to ${s.title}. ₹${q.total} is on hold until the owner accepts.`, "info", `/driver/pass/${id}`, t);
  } else {
    notify(d(), s.owner_id, `${user.name} booked ${s.title} for ${when}. ₹${q.base} booking.`, "booking", "/owner", t);
    notify(d(), user.id, `Booking confirmed at ${s.title} for ${when}.`, "success", `/driver/pass/${id}`, t);
  }
  return bookingView(getBooking(id));
});

function ownerOf(b: Booking, user: User) {
  const s = getSpot(b.spot_id);
  if (s.owner_id !== user.id) fail(403, "Not your spot");
  return s;
}
on("POST", "bookings/:id/accept", ({ user, params }) => {
  const b = getBooking(Number(params[0]));
  const s = ownerOf(b, user);
  if (b.status !== "requested") fail(400, "This request is no longer pending");
  if (overlaps(b.spot_id, b.start_at, b.end_at, b.id)) fail(409, "Another booking already holds that time");
  d().prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(b.id);
  notify(d(), b.driver_id, `${s.title} accepted your request. You're all set!`, "success", `/driver/pass/${b.id}`, now());
  return { ok: true };
});
on("POST", "bookings/:id/decline", ({ user, params, body }) => {
  const b = getBooking(Number(params[0]));
  const s = ownerOf(b, user);
  if (b.status !== "requested") fail(400, "This request is no longer pending");
  d().prepare("UPDATE bookings SET status = 'declined', refund_amount = ?, cancelled_by = 'owner' WHERE id = ?").run(b.total, b.id);
  transfer(d(), PLATFORM_ID, b.driver_id, b.total, "refund", b.id, "Full refund — owner declined the request", now());
  notify(d(), b.driver_id, `${s.title} declined your request${body.reason ? ` (“${body.reason}”)` : ""}. ₹${b.total} refunded.`, "error", `/driver/pass/${b.id}`, now());
  return { ok: true };
});
function checkIn(b: Booking, by: string) {
  const t = now();
  if (b.status !== "confirmed") fail(400, b.status === "live" ? "Already checked in" : `Can't check in a ${b.status} booking`);
  if (t < b.start_at - 15 * MIN) fail(400, "Check-in opens 15 min before your start time");
  d().prepare("UPDATE bookings SET status = 'live', checked_in_at = ? WHERE id = ?").run(t, b.id);
  const s = getSpot(b.spot_id);
  notify(d(), s.owner_id, `${getUser(b.driver_id)!.name} checked in at ${s.title}${by}.`, "info", "/owner", t);
  return bookingView(getBooking(b.id));
}
on("POST", "bookings/:id/checkin", ({ user, params }) => {
  const b = getBooking(Number(params[0]));
  if (b.driver_id !== user.id) fail(403, "Not your booking");
  return checkIn(b, " (self check-in with QR)");
});
on("POST", "owner/verify-code", ({ user, body }) => {
  requireRole(user, "owner");
  const code = String(body.code || "").trim().toUpperCase();
  const b = (d().prepare("SELECT * FROM bookings WHERE UPPER(code) = ?").get(code) as Booking | undefined) ?? fail(404, "No booking with that code");
  ownerOf(b, user);
  return checkIn(b, " (QR verified by you)");
});
on("POST", "bookings/:id/extend", ({ user, params, body }) => {
  const b = getBooking(Number(params[0]));
  if (b.driver_id !== user.id) fail(403, "Not your booking");
  if (!["confirmed", "live"].includes(b.status)) fail(400, "Only upcoming or live bookings can be extended");
  const minutes = Number(body.minutes) || 30;
  const s = parseSpot(getSpot(b.spot_id));
  const newEnd = b.end_at + minutes * MIN;
  if (overlaps(b.spot_id, b.end_at, newEnd, b.id)) fail(409, "Can't extend — the next booking starts right after yours");
  checkOpen(s, b.start_at, newEnd);
  const extra = Math.round((minutes / 60) * s.price);
  const u = getUser(user.id)!;
  if (u.wallet < extra) fail(402, `Add ₹${Math.ceil(extra - u.wallet)} to your wallet to extend`);
  maybeFailPayment();
  transfer(d(), user.id, PLATFORM_ID, extra, "extension", b.id, `Extended by ${minutes} min`, now());
  d().prepare("UPDATE bookings SET end_at = ?, base = base + ?, total = total + ?, extended_min = extended_min + ? WHERE id = ?").run(newEnd, extra, extra, minutes, b.id);
  notify(d(), s.owner_id, `${u.name} extended their booking at ${s.title} by ${minutes} min.`, "info", "/owner", now());
  return bookingView(getBooking(b.id));
});
on("POST", "bookings/:id/checkout", ({ user, params }) => {
  const b = getBooking(Number(params[0]));
  if (b.driver_id !== user.id) fail(403, "Not your booking");
  if (b.status !== "live") fail(400, "You're not checked in");
  const t = now();
  const s = getSpot(b.spot_id);
  const ot = overtime(s.price, b.end_at, t);
  const db_ = d();
  let payout = payOwner(db_, b.id, s.owner_id, b.base, b.commission_pct, `Payout for booking #${b.id}`, t);
  if (ot.amount > 0) {
    // Auto-pay: overtime is always debited, even if the wallet goes negative.
    transfer(db_, b.driver_id, PLATFORM_ID, ot.amount, "overtime", b.id, `Overtime ${ot.minutes} min auto-charged (1.5× rate)`, t);
    payout += payOwner(db_, b.id, s.owner_id, ot.amount, b.commission_pct, `Overtime payout for booking #${b.id}`, t);
  }
  db_.prepare("UPDATE bookings SET status = 'completed', checked_out_at = ?, overtime_min = ?, overtime_amount = ?, owner_payout = ? WHERE id = ?").run(t, ot.minutes, ot.amount, payout, b.id);
  notify(db_, b.driver_id, ot.amount > 0 ? `Checked out. ₹${ot.amount} overtime (${ot.minutes} min) was auto-paid from your wallet.` : `Checked out of ${s.title}. Thanks for parking with us!`, ot.amount ? "warning" : "success", `/driver/pass/${b.id}`, t);
  notify(db_, s.owner_id, `Booking #${b.id} completed. ₹${payout} credited${ot.amount ? " incl. overtime" : ""}.`, "success", "/owner/earnings", t);
  return bookingView(getBooking(b.id));
});
on("POST", "bookings/:id/cancel", ({ user, params }) => {
  const b = getBooking(Number(params[0]));
  const s = getSpot(b.spot_id);
  const t = now();
  const db_ = d();
  if (!["requested", "confirmed"].includes(b.status)) fail(400, "Only upcoming bookings can be cancelled");
  if (s.owner_id === user.id) {
    transfer(db_, PLATFORM_ID, b.driver_id, b.total, "refund", b.id, "Full refund — owner cancelled", t);
    db_.prepare("UPDATE bookings SET status = 'cancelled', refund_amount = ?, cancelled_by = 'owner' WHERE id = ?").run(b.total, b.id);
    db_.prepare("UPDATE users SET fraud_score = fraud_score + 1 WHERE id = ?").run(user.id);
    notify(db_, b.driver_id, `The owner cancelled your booking at ${s.title}. ₹${b.total} fully refunded. Sorry!`, "error", `/driver/pass/${b.id}`, t);
    return { refund: b.total };
  }
  if (b.driver_id !== user.id) fail(403, "Not your booking");
  const p = refundPolicy(b.status as never, b.start_at, t, b.base, b.total);
  if (p.refund > 0) transfer(db_, PLATFORM_ID, b.driver_id, p.refund, "refund", b.id, p.label, t);
  const paid = payOwner(db_, b.id, s.owner_id, p.owner, b.commission_pct, `Cancellation compensation #${b.id}`, t);
  db_.prepare("UPDATE bookings SET status = 'cancelled', refund_amount = ?, owner_payout = ?, cancelled_by = 'driver' WHERE id = ?").run(p.refund, paid, b.id);
  const recent = (db_.prepare("SELECT COUNT(*) n FROM bookings WHERE driver_id = ? AND cancelled_by = 'driver' AND created_at > ?").get(user.id, t - 24 * HOUR) as { n: number }).n;
  if (recent >= 3) db_.prepare("UPDATE users SET fraud_score = fraud_score + 1 WHERE id = ?").run(user.id);
  notify(db_, s.owner_id, `${user.name} cancelled booking #${b.id}${paid ? ` — you received ₹${paid} compensation` : ""}.`, "info", "/owner", t);
  return { refund: p.refund, label: p.label };
});
on("POST", "bookings/:id/review", ({ user, params, body }) => {
  const b = getBooking(Number(params[0]));
  const s = getSpot(b.spot_id);
  const stars = Math.max(1, Math.min(5, Number(body.stars) || 5));
  if (b.status !== "completed") fail(400, "You can review after the booking is completed");
  if (b.driver_id === user.id) {
    if (b.driver_reviewed) fail(400, "Already reviewed");
    d().prepare("INSERT INTO reviews (booking_id, from_user, to_user, spot_id, stars, text, created_at) VALUES (?,?,?,?,?,?,?)").run(b.id, user.id, s.owner_id, s.id, stars, body.text ?? "", now());
    d().prepare("UPDATE bookings SET driver_reviewed = 1 WHERE id = ?").run(b.id);
    recomputeUserRating(s.owner_id);
    notify(d(), s.owner_id, `${user.name} left a ${stars}★ review on ${s.title}.`, "info", "/owner", now());
  } else if (s.owner_id === user.id) {
    if (b.owner_rated) fail(400, "Already rated");
    d().prepare("INSERT INTO reviews (booking_id, from_user, to_user, spot_id, stars, text, created_at) VALUES (?,?,?,NULL,?,?,?)").run(b.id, user.id, b.driver_id, stars, body.text ?? "", now());
    d().prepare("UPDATE bookings SET owner_rated = 1 WHERE id = ?").run(b.id);
    recomputeUserRating(b.driver_id);
  } else fail(403, "Not your booking");
  return { ok: true };
});
on("POST", "bookings/:id/dispute", ({ user, params, body }) => {
  const b = getBooking(Number(params[0]));
  if (b.driver_id !== user.id && getSpot(b.spot_id).owner_id !== user.id) fail(403, "Not your booking");
  if (!String(body.reason || "").trim()) fail(400, "Tell us what went wrong");
  if (d().prepare("SELECT 1 FROM disputes WHERE booking_id = ? AND status = 'open'").get(b.id)) fail(400, "A dispute is already open for this booking");
  d().prepare("INSERT INTO disputes (booking_id, raised_by, reason, created_at) VALUES (?,?,?,?)").run(b.id, user.id, body.reason, now());
  notify(d(), PLATFORM_ID, `New dispute from ${user.name} on booking #${b.id}.`, "warning", "/admin/disputes", now());
  notify(d(), user.id, "Dispute received. Our team will review it shortly.", "info", `/driver/pass/${b.id}`, now());
  return { ok: true };
});

// --- admin
const admin = (u: User) => requireRole(u, "admin");
on("GET", "admin/stats", ({ user }) => {
  admin(user);
  const q = (sql: string, ...a: unknown[]) => (d().prepare(sql).get(...a) as { n: number }).n ?? 0;
  const t = now();
  const days: { day: string; gmv: number; bookings: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const s = new Date(t - i * 24 * HOUR);
    s.setHours(0, 0, 0, 0);
    const e = s.getTime() + 24 * HOUR;
    days.push({
      day: s.toLocaleDateString("en-IN", { weekday: "short" }),
      gmv: q("SELECT COALESCE(SUM(total + overtime_amount),0) n FROM bookings WHERE status = 'completed' AND start_at >= ? AND start_at < ?", s.getTime(), e),
      bookings: q("SELECT COUNT(*) n FROM bookings WHERE start_at >= ? AND start_at < ?", s.getTime(), e),
    });
  }
  const statusMix = d().prepare("SELECT status, COUNT(*) n FROM bookings GROUP BY status").all();
  return {
    spots: q("SELECT COUNT(*) n FROM spots WHERE status = 'verified'"),
    pending: q("SELECT COUNT(*) n FROM spots WHERE status = 'pending'"),
    live: q("SELECT COUNT(*) n FROM bookings WHERE status = 'live'"),
    bookings: q("SELECT COUNT(*) n FROM bookings"),
    gmv: q("SELECT COALESCE(SUM(total + overtime_amount - refund_amount),0) n FROM bookings WHERE status IN ('completed','cancelled','no_show','live','confirmed')"),
    commission:
      q("SELECT COALESCE(SUM(total + overtime_amount - refund_amount - owner_payout),0) n FROM bookings WHERE status IN ('completed','cancelled','declined','no_show')") -
      q("SELECT COALESCE(SUM(refund),0) n FROM disputes"),
    overstays: q("SELECT COUNT(*) n FROM bookings WHERE overtime_amount > 0") + q("SELECT COUNT(*) n FROM bookings WHERE status = 'live' AND end_at + ? < ?", 10 * MIN, t),
    cancellations: q("SELECT COUNT(*) n FROM bookings WHERE status IN ('cancelled','declined')"),
    no_shows: q("SELECT COUNT(*) n FROM bookings WHERE status = 'no_show'"),
    disputes: q("SELECT COUNT(*) n FROM disputes WHERE status = 'open'"),
    users: q("SELECT COUNT(*) n FROM users"),
    platform_wallet: getUser(PLATFORM_ID)!.wallet,
    days,
    statusMix,
    recent: (d().prepare("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 10").all() as Booking[]).map(bookingView),
  };
});
on("GET", "admin/verify", ({ user }) => {
  admin(user);
  const rows = d().prepare("SELECT * FROM spots ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, created_at DESC").all() as Spot[];
  return rows.map((s) => ({
    ...parseSpot(s),
    photo: s.photo,
    owner: getUser(s.owner_id),
    documents: d().prepare("SELECT * FROM documents WHERE spot_id = ?").all(s.id),
    duplicate_docs: (d().prepare("SELECT COUNT(*) n FROM documents a JOIN documents b ON a.file_name = b.file_name AND a.spot_id != b.spot_id JOIN spots sb ON sb.id = b.spot_id WHERE a.spot_id = ? AND sb.owner_id != ?").get(s.id, s.owner_id) as { n: number }).n,
  }));
});
on("POST", "admin/spots/:id/verify", ({ user, params, body }) => {
  admin(user);
  const s = getSpot(Number(params[0]));
  if (body.approve) {
    d().prepare("UPDATE spots SET status = 'verified', reject_reason = NULL WHERE id = ?").run(s.id);
    notify(d(), s.owner_id, `🎉 "${s.title}" is verified and now live for drivers!`, "success", "/owner/listings", now());
  } else {
    const reason = String(body.reason || "").trim() || "Documents could not be verified";
    d().prepare("UPDATE spots SET status = 'rejected', reject_reason = ? WHERE id = ?").run(reason, s.id);
    notify(d(), s.owner_id, `"${s.title}" was rejected: ${reason}`, "error", "/owner/listings", now());
  }
  return { ok: true };
});
on("POST", "admin/spots/:id/hide-photo", ({ user, params }) => {
  admin(user);
  const s = getSpot(Number(params[0]));
  d().prepare("UPDATE spots SET photo_hidden = ? WHERE id = ?").run(s.photo_hidden ? 0 : 1, s.id);
  if (!s.photo_hidden) notify(d(), s.owner_id, `A photo on "${s.title}" was hidden by moderation. Please upload a new one.`, "warning", "/owner/listings", now());
  return { hidden: !s.photo_hidden };
});
on("GET", "admin/users", ({ user }) => {
  admin(user);
  const rows = d().prepare("SELECT * FROM users ORDER BY id").all() as User[];
  return rows.map((u) => ({
    ...u,
    bookings: (d().prepare("SELECT COUNT(*) n FROM bookings WHERE driver_id = ?").get(u.id) as { n: number }).n,
    spots: (d().prepare("SELECT COUNT(*) n FROM spots WHERE owner_id = ?").get(u.id) as { n: number }).n,
  }));
});
on("POST", "admin/users/:id/suspend", ({ user, params }) => {
  admin(user);
  const u = getUser(Number(params[0])) ?? fail(404, "No such user");
  if (u.role === "admin") fail(400, "Admins can't be suspended");
  d().prepare("UPDATE users SET suspended = ? WHERE id = ?").run(u.suspended ? 0 : 1, u.id);
  notify(d(), u.id, u.suspended ? "Your account has been restored." : "Your account has been suspended by the trust team.", u.suspended ? "success" : "error", null, now());
  return { suspended: !u.suspended };
});
on("GET", "admin/settings", ({ user }) => {
  admin(user);
  return { commission: commission(), surge_rules: surgeRules(), zones: Object.keys(ZONES) };
});
on("POST", "admin/settings", ({ user, body }) => {
  admin(user);
  const c = Number(body.commission);
  if (!(c >= 0 && c <= 40)) fail(400, "Commission must be between 0% and 40%");
  const rules = (body.surge_rules as SurgeRule[]).map((r) => ({ zone: r.zone, from: Number(r.from), to: Number(r.to), mult: Number(r.mult) }));
  for (const r of rules) if (!(r.to > r.from && r.mult >= 1 && r.mult <= 3)) fail(400, "Each surge rule needs from < to and a multiplier between 1 and 3");
  setSetting(d(), "commission", c);
  setSetting(d(), "surge_rules", rules);
  return { ok: true };
});
on("GET", "admin/disputes", ({ user }) => {
  admin(user);
  const rows = d().prepare("SELECT * FROM disputes ORDER BY status = 'open' DESC, created_at DESC").all() as { booking_id: number; raised_by: number }[];
  return rows.map((r) => {
    const b = getBooking(r.booking_id);
    return {
      ...r,
      raised_by_name: getUser(r.raised_by)?.name,
      booking: bookingView(b),
      timeline: d().prepare("SELECT * FROM transactions WHERE booking_id = ? AND user_id != ? ORDER BY created_at, id").all(b.id, PLATFORM_ID),
    };
  });
});
on("POST", "admin/disputes/:id/resolve", ({ user, params, body }) => {
  admin(user);
  const dis = (d().prepare("SELECT * FROM disputes WHERE id = ?").get(Number(params[0])) as { id: number; booking_id: number; status: string } | undefined) ?? fail(404, "No such dispute");
  if (dis.status !== "open") fail(400, "Already resolved");
  const b = getBooking(dis.booking_id);
  const refund = Math.max(0, Math.min(Number(body.refund) || 0, b.total + b.overtime_amount));
  if (refund > 0) transfer(d(), PLATFORM_ID, b.driver_id, refund, "dispute_refund", b.id, `Dispute refund: ${body.resolution || "resolved by admin"}`, now());
  d().prepare("UPDATE disputes SET status = 'resolved', resolution = ?, refund = ? WHERE id = ?").run(body.resolution || "Resolved", refund, dis.id);
  notify(d(), b.driver_id, `Your dispute on booking #${b.id} was resolved${refund ? ` — ₹${refund} refunded` : ""}.`, "success", `/driver/pass/${b.id}`, now());
  notify(d(), getSpot(b.spot_id).owner_id, `Dispute on booking #${b.id} was resolved by the admin team.`, "info", "/owner", now());
  return { ok: true };
});
on("GET", "admin/moderation", ({ user }) => {
  admin(user);
  return {
    reviews: d().prepare(`SELECT r.*, f.name from_name, t.name to_name, s.title spot_title FROM reviews r JOIN users f ON f.id = r.from_user
      JOIN users t ON t.id = r.to_user LEFT JOIN spots s ON s.id = r.spot_id ORDER BY r.created_at DESC`).all(),
    photos: d().prepare("SELECT id, title, photo, photo_hidden, spot_type FROM spots WHERE photo IS NOT NULL").all(),
  };
});
on("POST", "admin/reviews/:id/hide", ({ user, params }) => {
  admin(user);
  const r = (d().prepare("SELECT * FROM reviews WHERE id = ?").get(Number(params[0])) as { id: number; hidden: number; to_user: number } | undefined) ?? fail(404, "No such review");
  d().prepare("UPDATE reviews SET hidden = ? WHERE id = ?").run(r.hidden ? 0 : 1, r.id);
  recomputeUserRating(r.to_user);
  return { hidden: !r.hidden };
});
on("GET", "admin/insights", ({ user }) => {
  admin(user);
  const t = now();
  const zones = Object.entries(ZONES).map(([zone, c]) => {
    const supply = (d().prepare("SELECT COUNT(*) n FROM spots WHERE zone = ? AND status = 'verified' AND paused = 0").get(zone) as { n: number }).n;
    const demand = (d().prepare("SELECT COUNT(*) n FROM bookings b JOIN spots s ON s.id = b.spot_id WHERE s.zone = ? AND b.created_at > ?").get(zone, t - 7 * 24 * HOUR) as { n: number }).n;
    return { zone, ...c, supply, demand, ratio: supply ? Math.round((demand / supply) * 10) / 10 : demand };
  });
  const flags: { user_id: number; name: string; role: string; reason: string; severity: "high" | "medium" }[] = [];
  const users = d().prepare("SELECT * FROM users").all() as User[];
  for (const u of users) {
    const cancels = (d().prepare("SELECT COUNT(*) n FROM bookings WHERE driver_id = ? AND cancelled_by = 'driver'").get(u.id) as { n: number }).n;
    const overs = (d().prepare("SELECT COUNT(*) n FROM bookings WHERE driver_id = ? AND overtime_amount > 0").get(u.id) as { n: number }).n;
    const noShows = (d().prepare("SELECT COUNT(*) n FROM bookings WHERE driver_id = ? AND status = 'no_show'").get(u.id) as { n: number }).n;
    const ownerCancels = (d().prepare("SELECT COUNT(*) n FROM bookings b JOIN spots s ON s.id = b.spot_id WHERE s.owner_id = ? AND b.cancelled_by = 'owner'").get(u.id) as { n: number }).n;
    const dupDocs = (d().prepare("SELECT COUNT(*) n FROM documents a JOIN spots sa ON sa.id = a.spot_id JOIN documents b ON a.file_name = b.file_name AND a.spot_id != b.spot_id JOIN spots sb ON sb.id = b.spot_id WHERE sa.owner_id = ? AND sb.owner_id != ? AND a.created_at <= b.created_at").get(u.id, u.id) as { n: number }).n;
    const push = (reason: string, severity: "high" | "medium") => flags.push({ user_id: u.id, name: u.name, role: u.role, reason, severity });
    if (cancels >= 2) push(`${cancels} cancellations by this driver`, cancels >= 3 ? "high" : "medium");
    if (noShows >= 1) push(`${noShows} no-show${noShows > 1 ? "s" : ""}`, "medium");
    if (overs >= 2) push(`Repeated overstays (${overs})`, "medium");
    if (ownerCancels >= 1) push(`Owner cancelled ${ownerCancels} confirmed booking(s)`, "high");
    if (dupDocs >= 1) push("Uploaded a document identical to another owner's", "high");
    if (u.wallet < 0) push(`Negative wallet balance (₹${Math.round(u.wallet)}) after overtime`, "medium");
  }
  return { zones, flags };
});
on("GET", "admin/export", ({ user, query }) => {
  admin(user);
  const type = query.get("type") === "transactions" ? "transactions" : "bookings";
  const rows = d().prepare(`SELECT * FROM ${type} ORDER BY created_at`).all() as Record<string, unknown>[];
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return { __csv: [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n"), filename: `summit-${type}.csv` };
});

// --- demo controls
on("POST", "demo/clock", ({ body }) => {
  const off = body.reset ? 0 : getSetting(d(), "clock_offset", 0) + Number(body.minutes || 0) * MIN;
  setSetting(d(), "clock_offset", off);
  return { offset: off, now: now() };
});
on("POST", "demo/fail", ({ body }) => {
  setSetting(d(), "fail_payment", !!body.on);
  return { on: !!body.on };
});
on("POST", "demo/reset", () => {
  resetDb();
  return { ok: true };
});

// ---------- dispatcher ----------
export function handle(method: string, path: string, uid: number | null, body: any, query: URLSearchParams) {
  let newUid: number | null = null;
  const database = d();
  let user = uid ? getUser(uid) : undefined;
  if (!user) {
    user = getUser(1)!;
    newUid = 1;
  }
  if (method === "POST" && path === "demo/reset") {
    resetDb();
    return { result: { ok: true }, newUid };
  }
  for (const [m, re, h] of routes) {
    if (m !== method) continue;
    const match = path.match(re);
    if (!match) continue;
    const result = database.transaction(() => {
      sweep();
      return h({ user: user!, body: body ?? {}, params: match.slice(1), query, setUid: (id) => (newUid = id) });
    })();
    return { result, newUid };
  }
  throw new ApiError(404, `No route ${method} /api/${path}`);
}
